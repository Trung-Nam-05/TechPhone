import express from 'express';
import Order from '../models/Order.js';
import OrderEvent from '../models/OrderEvent.js';
import { verifyVnpayCallback, isVnpayConfigured } from '../services/vnpay.js';

const router = express.Router();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

function redirectWithStatus(res, { success, orderId, message }) {
  const u = new URL(`${clientOrigin}/checkout/vnpay-result`);
  u.searchParams.set('success', success ? '1' : '0');
  if (orderId) u.searchParams.set('orderId', String(orderId));
  if (message) u.searchParams.set('message', String(message).slice(0, 200));
  return res.redirect(302, u.toString());
}

/**
 * @returns {{ ok: boolean, order?: import('mongoose').Document, paid?: boolean, reason?: string, code?: string }}
 */
async function processVnpayQuery(query) {
  const orderId = String(query.vnp_TxnRef || '').trim();
  const responseCode = String(query.vnp_ResponseCode || '').trim();
  const amount = Number(query.vnp_Amount);

  if (!orderId) return { ok: false, reason: 'missing_txn' };

  const order = await Order.findById(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };

  if (order.paymentMethod !== 'vnpay') {
    return { ok: false, reason: 'wrong_payment_method' };
  }

  const expectedAmount = Math.floor(Number(order.total) || 0) * 100;
  if (amount !== expectedAmount) {
    return { ok: false, reason: 'amount_mismatch' };
  }

  if (responseCode === '00') {
    const alreadyPaid = order.paymentStatus === 'paid';
    const previousStatus = order.status;
    order.paymentStatus = 'paid';
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
    await order.save();

    if (!alreadyPaid) {
      await OrderEvent.create({
        order: order._id,
        fromStatus: previousStatus,
        toStatus: order.status,
        note: 'VNPAY: payment successful (auto-confirmed).',
        actor: null,
      });
    }

    const fresh = await Order.findById(orderId);
    return { ok: true, order: fresh || order, paid: true };
  }

  if (order.paymentStatus === 'pending') {
    const previousStatus = order.status;
    order.paymentStatus = 'failed';
    await order.save();
    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: previousStatus,
      note: `VNPAY: payment failed (responseCode=${responseCode || 'unknown'}).`,
      actor: null,
    });
  }

  return { ok: true, order, paid: false, code: responseCode };
}

router.get('/return', async (req, res) => {
  try {
    if (!isVnpayConfigured()) {
      return redirectWithStatus(res, { success: false, message: 'VNPAY not configured' });
    }
    const verified = verifyVnpayCallback(req.query);
    if (!verified.ok) {
      return redirectWithStatus(res, { success: false, message: verified.reason || 'invalid' });
    }

    const result = await processVnpayQuery(req.query);
    const orderId = req.query.vnp_TxnRef;

    if (!result.ok) {
      return redirectWithStatus(res, { success: false, orderId, message: result.reason });
    }
    if (result.paid) {
      return redirectWithStatus(res, { success: true, orderId });
    }
    return redirectWithStatus(res, { success: false, orderId, message: result.code || 'declined' });
  } catch (err) {
    console.error(err);
    return redirectWithStatus(res, { success: false, message: 'server_error' });
  }
});

/**
 * VNPAY IPN (server-to-server).
 */
router.get('/ipn', async (req, res) => {
  try {
    if (!isVnpayConfigured()) {
      return res.status(200).json({ RspCode: '99', Message: 'Not configured' });
    }
    const verified = verifyVnpayCallback(req.query);
    if (!verified.ok) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const result = await processVnpayQuery(req.query);
    if (!result.ok) {
      if (result.reason === 'order_not_found') {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }
      if (result.reason === 'amount_mismatch') {
        return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
      }
      return res.status(200).json({ RspCode: '01', Message: result.reason || 'Rejected' });
    }

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ RspCode: '99', Message: 'Exception' });
  }
});

export default router;
