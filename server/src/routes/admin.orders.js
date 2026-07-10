import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import OrderEvent from '../models/OrderEvent.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';
import { INSTALLMENT_STATUS } from '../utils/installment.js';
import { restoreInventoryForCancelledOrder } from '../services/orderCancel.js';
import { ORDER_STATUS_SET } from '../constants/orderStatus.js';
import {
  createGhtkShipmentForOrder,
  cancelGhtkShipmentForOrder,
} from '../services/ghtkShipment.js';
import ShipmentEvent from '../models/ShipmentEvent.js';
import { validateAdminStatusChange } from '../services/orderStateMachine.js';

const router = express.Router();

const ALLOWED_ORDER_STATUS = ORDER_STATUS_SET;
const ALLOWED_SUPPORT_STATUS = new Set(['none', 'customer_contacted', 'awaiting_response', 'resolved']);
const ALLOWED_INSTALLMENT_STATUS = new Set(INSTALLMENT_STATUS);

router.use(requireAuth, requireAdmin);

function escapeCsvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get('/export/csv', async (req, res, next) => {
  try {
    const items = await Order.find({}).sort({ createdAt: -1 }).limit(5000).lean();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
    res.write('\uFEFF');
    const header = ['orderId', 'status', 'paymentStatus', 'total', 'createdAt', 'customerEmail', 'customerPhone', 'cancelRequestStatus'];
    res.write(`${header.map(escapeCsvCell).join(',')}\n`);
    for (const o of items) {
      const row = [
        o._id,
        o.status,
        o.paymentStatus,
        o.total,
        o.createdAt ? new Date(o.createdAt).toISOString() : '',
        o.shippingInfo?.email || '',
        o.shippingInfo?.phone || '',
        o.cancelRequestStatus || 'none',
      ];
      res.write(`${row.map(escapeCsvCell).join(',')}\n`);
    }
    res.end();
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const supportStatus = String(req.query.supportStatus || '').trim();
    const cancelRequestStatus = String(req.query.cancelRequestStatus || '').trim();

    const query = {};
    if (status && ALLOWED_ORDER_STATUS.has(status)) query.status = status;
    if (supportStatus && ALLOWED_SUPPORT_STATUS.has(supportStatus)) query.supportStatus = supportStatus;
    if (cancelRequestStatus && ['none', 'pending', 'approved', 'rejected'].includes(cancelRequestStatus)) {
      query.cancelRequestStatus = cancelRequestStatus;
    }

    const items = await Order.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/shipment-events', async (req, res, next) => {
  try {
    const items = await ShipmentEvent.find({ order: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/ghtk/retry', async (req, res, next) => {
  try {
    const result = await createGhtkShipmentForOrder(req.params.id, { force: true });
    if (!result.ok) {
      return res.status(400).json({ message: result.reason || 'GHTK submit failed', error: result.error });
    }
    return res.json({ order: result.order, labelId: result.labelId });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/ghtk/cancel', async (req, res, next) => {
  try {
    const result = await cancelGhtkShipmentForOrder(req.params.id);
    if (!result.ok) {
      return res.status(400).json({ message: result.reason || 'GHTK cancel failed', error: result.error });
    }
    return res.json({ order: result.order });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/events', async (req, res, next) => {
  try {
    const items = await OrderEvent.find({ order: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || '').trim();
    const supportStatus = String(req.body?.supportStatus || '').trim();
    const note = String(req.body?.note || '').trim();
    const override = Boolean(req.body?.override);
    const reason = String(req.body?.reason || '').trim();

    if (!status && !supportStatus) {
      return res.status(400).json({ message: 'status or supportStatus is required.' });
    }
    if (status && !ALLOWED_ORDER_STATUS.has(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }
    if (supportStatus && !ALLOWED_SUPPORT_STATUS.has(supportStatus)) {
      return res.status(400).json({ message: 'Invalid support status.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const previousOrderStatus = order.status;
    const previousSupportStatus = order.supportStatus;
    let statusValidation = null;

    if (status && status !== previousOrderStatus) {
      statusValidation = validateAdminStatusChange(previousOrderStatus, status, { override, reason });
      if (!statusValidation.ok) {
        const messages = {
          OVERRIDE_REASON_REQUIRED: 'Override requires a reason (min 10 characters).',
          INVALID_OVERRIDE_TARGET: 'Invalid override target status.',
          CANNOT_REVERT_TERMINAL: 'Cannot revert from a terminal status.',
          INVALID_ADMIN_TRANSITION: 'Invalid status transition. Use override with reason for exceptions.',
        };
        return res.status(400).json({
          message: messages[statusValidation.reason] || 'Invalid status change.',
          code: statusValidation.reason,
        });
      }
      order.status = status;
    }
    if (supportStatus) order.supportStatus = supportStatus;
    await order.save();

    if (status && status !== previousOrderStatus) {
      const eventNote = statusValidation?.override
        ? `[ADMIN OVERRIDE] ${reason}${note ? ` — ${note}` : ''}`
        : note || 'Order status updated by admin.';
      await OrderEvent.create({
        order: order._id,
        fromStatus: previousOrderStatus,
        toStatus: status,
        note: eventNote,
        actor: req.auth.userId,
      });
    }

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: override ? 'order.status_override' : 'order.update_status',
      entityType: 'order',
      entityId: order._id,
      metadata: {
        previousOrderStatus,
        nextOrderStatus: order.status,
        previousSupportStatus,
        nextSupportStatus: order.supportStatus,
        override,
        reason: override ? reason : undefined,
      },
    });

    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/installment', async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!status || !ALLOWED_INSTALLMENT_STATUS.has(status)) {
      return res.status(400).json({ message: 'Invalid installment status.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (order.paymentMethod !== 'installment') {
      return res.status(400).json({ message: 'Order is not installment type.' });
    }

    const previousStatus = order.installment?.status || 'draft';
    if (previousStatus === status) {
      return res.json(order);
    }

    order.installment.status = status;
    order.installment.note = note || order.installment.note || '';
    order.installment.reviewedAt = new Date();
    order.installment.reviewedBy = req.auth.userId;
    await order.save();

    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: `installment_${status}`,
      note: note || 'Installment status updated by admin.',
      actor: req.auth.userId,
    });

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'order.installment_update',
      entityType: 'order',
      entityId: order._id,
      metadata: {
        previousStatus,
        nextStatus: status,
      },
    });

    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/cancellation', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }
    const action = String(req.body?.action || '').trim();
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be approve or reject.' });
    }

    let payload = null;
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);
      if (!order) {
        throw new Error('NOT_FOUND');
      }
      if (order.cancelRequestStatus !== 'pending') {
        throw new Error('NO_PENDING');
      }
      if (action === 'reject') {
        order.cancelRequestStatus = 'rejected';
        order.cancelResolvedAt = new Date();
        await order.save({ session });
        await OrderEvent.create(
          [
            {
              order: order._id,
              fromStatus: order.status,
              toStatus: order.status,
              note: 'Admin tu choi yeu cau huy don.',
              actor: req.auth.userId,
            },
          ],
          { session },
        );
        await writeAdminAuditLog({
          actor: req.auth.userId,
          action: 'order.cancellation_reject',
          entityType: 'order',
          entityId: order._id,
          metadata: {},
        });
        payload = order.toObject();
        return;
      }

      const previous = order.status;
      await restoreInventoryForCancelledOrder(order, {
        session,
        actorUserId: req.auth.userId,
        note: 'Hoan kho sau khi admin dong y huy don.',
      });
      order.status = 'cancelled';
      order.cancelRequestStatus = 'approved';
      order.cancelResolvedAt = new Date();
      await order.save({ session });
      await OrderEvent.create(
        [
          {
            order: order._id,
            fromStatus: previous,
            toStatus: 'cancelled',
            note: 'Admin dong y huy don.',
            actor: req.auth.userId,
          },
        ],
        { session },
      );
      await writeAdminAuditLog({
        actor: req.auth.userId,
        action: 'order.cancellation_approve',
        entityType: 'order',
        entityId: order._id,
        metadata: {},
      });
      payload = order.toObject();
    });

    if (action === 'approve' && payload?.shipment?.labelId) {
      try {
        await cancelGhtkShipmentForOrder(id);
      } catch (err) {
        console.error(`[admin] GHTK cancel after approve failed for ${id}:`, err.message);
      }
      const refreshed = await Order.findById(id).lean();
      if (refreshed) payload = refreshed;
    }

    return res.json({ order: payload });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (error.message === 'NO_PENDING') {
      return res.status(400).json({ message: 'No pending cancellation request for this order.' });
    }
    return next(error);
  } finally {
    await session.endSession();
  }
});

export default router;
