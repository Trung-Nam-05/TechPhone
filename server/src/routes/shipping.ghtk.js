import express from 'express';
import { applyGhtkStatusUpdate } from '../services/ghtkShipment.js';

const router = express.Router();

/**
 * GHTK webhook — public endpoint (no JWT).
 * Register at GHTK portal: {API_PUBLIC_URL}/api/shipping/ghtk/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await applyGhtkStatusUpdate(payload);
    if (!result.ok && result.reason === 'order_not_found') {
      console.warn('[ghtk-webhook] order not found:', payload.partner_id, payload.label_id);
    }
    return res.status(200).json({ success: true, received: true });
  } catch (err) {
    console.error('[ghtk-webhook]', err);
    return res.status(200).json({ success: true, received: true, note: 'processed with errors' });
  }
});

export default router;
