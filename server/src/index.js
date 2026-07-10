import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/db.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import authRoutes from './routes/auth.js';
import adminProductRoutes from './routes/admin.products.js';
import { optionalAuth } from './middleware/auth.js';
import analyticsRoutes from './routes/analytics.js';
import adminOrderRoutes from './routes/admin.orders.js';
import adminInventoryRoutes from './routes/admin.inventory.js';
import couponRoutes from './routes/coupons.js';
import installmentWebhookRoutes from './routes/installment.webhook.js';
import adminFlashSaleRoutes from './routes/admin.flashsales.js';
import adminUserRoutes from './routes/admin.users.js';
import vnpayPaymentRoutes from './routes/payments.vnpay.js';
import ghtkShippingRoutes from './routes/shipping.ghtk.js';
import { startFulfillmentDemoJob } from './services/orderFulfillment.js';
import { startGhtkSyncJob } from './services/ghtkSync.js';
import { startGhtkRetryJob } from './services/ghtkRetry.js';
import { startGhtkDemoProgressJob } from './services/ghtkDemoProgress.js';

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowLocalhostOrigins = process.env.ALLOW_LOCALHOST_ORIGINS !== 'false';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === clientOrigin) return callback(null, true);
      if (allowLocalhostOrigins && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: false,
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'techphone-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use(optionalAuth);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/flash-sales', adminFlashSaleRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks/installment', installmentWebhookRoutes);
app.use('/api/payments/vnpay', vnpayPaymentRoutes);
app.use('/api/shipping/ghtk', ghtkShippingRoutes);

app.use((err, _req, res, _next) => {
  // Centralized error response for easier debugging in early phase.
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

async function start() {
  await connectDatabase();
  if (process.env.GHTK_ENABLED === 'true') {
    startGhtkSyncJob();
    startGhtkRetryJob();
    startGhtkDemoProgressJob();
  } else {
    startFulfillmentDemoJob();
  }
  app.listen(port, () => {
    console.log(`TechPhone API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
