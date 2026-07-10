import express from 'express';
import Order from '../models/Order.js';
import OrderEvent from '../models/OrderEvent.js';
import { verifyWebhookSignature } from '../services/installment/providerAdapter.js';

const router = express.Router();

router.post('/provider/callback', async (req, res, next) => {
  try {
    const signature = req.header('x-installment-signature');
    const secret = process.env.INSTALLMENT_WEBHOOK_SECRET || '';
    const payload = req.body;

    const isValid = verifyWebhookSignature({
      payload: JSON.stringify(payload || {}),
      signature,
      secret,
    });
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid webhook signature.' });
    }

    const orderId = String(payload?.orderId || '').trim();
    const providerStatus = String(payload?.status || '').trim();
    if (!orderId || !providerStatus) {
      return res.status(400).json({ message: 'orderId and status are required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (order.paymentMethod !== 'installment') {
      return res.status(400).json({ message: 'Order is not installment type.' });
    }

    const previous = order.installment?.status || 'draft';
    order.installment.status = providerStatus;
    order.installment.reviewedAt = new Date();
    await order.save();

    await OrderEvent.create({
      order: order._id,
      fromStatus: previous,
      toStatus: `installment_${providerStatus}`,
      note: 'Webhook callback from installment provider.',
      actor: null,
    });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
