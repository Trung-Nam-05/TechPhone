import express from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import FlashSale from '../models/FlashSale.js';
import InventoryMovement from '../models/InventoryMovement.js';
import OrderEvent from '../models/OrderEvent.js';
import { getOwnershipFilter, getOwnershipForWrite } from '../utils/ownership.js';
import { calculatePricing, consumeCouponsUsage, PricingError } from '../services/pricing.js';
import { calculateInstallmentPlan, normalizeInstallmentInput } from '../utils/installment.js';
import { restoreInventoryForCancelledOrder } from '../services/orderCancel.js';
import { buildVnpayPaymentUrl, isVnpayConfigured } from '../services/vnpay.js';
import { ensureGhnShipmentForOrder, syncGhnOrderFromApi } from '../services/ghnShipment.js';
import { isGhnConfigured } from '../services/ghn.js';
import ShipmentEvent from '../models/ShipmentEvent.js';
import { requireAuth } from '../middleware/auth.js';
import { buildOrderTimeline } from '../services/orderTimeline.js';
import {
  validateCustomerRequestCancel,
  canCustomerCancelImmediate,
} from '../services/orderStateMachine.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const ownershipFilter = getOwnershipFilter(req);
    const ownershipForWrite = getOwnershipForWrite(req);
    if (!ownershipFilter || !ownershipForWrite) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }

    const clientIp =
      (typeof req.headers['x-forwarded-for'] === 'string' && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const shippingInfo = req.body?.shippingInfo || {};
    const { fullName, phone, email = '', province = '', district = '', ward = '', address, note = '' } = shippingInfo;
    const rawPaymentMethod = String(req.body?.paymentMethod || 'cod').trim();
    let paymentMethod = 'cod';
    if (rawPaymentMethod === 'installment') paymentMethod = 'installment';
    else if (rawPaymentMethod === 'vnpay') paymentMethod = 'vnpay';
    else if (rawPaymentMethod !== 'cod') {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    if (paymentMethod === 'vnpay' && !isVnpayConfigured()) {
      return res.status(503).json({
        message: 'VNPAY is not configured. Set VNPAY_TMN_CODE and VNPAY_HASH_SECRET (and API_PUBLIC_URL for callbacks).',
      });
    }

    const installmentPayload = req.body?.installment || null;
    const idempotencyKey = String(req.header('x-idempotency-key') || '').trim() || null;
    if (!fullName?.trim() || !phone?.trim() || !address?.trim()) {
      return res.status(400).json({
        message: 'shippingInfo.fullName, shippingInfo.phone, shippingInfo.address are required.',
      });
    }
    if (!province?.trim() || !district?.trim()) {
      if (paymentMethod !== 'installment') {
        return res.status(400).json({
          message: 'shippingInfo.province and shippingInfo.district are required for delivery.',
        });
      }
    }
    if (idempotencyKey && idempotencyKey.length > 80) {
      return res.status(400).json({ message: 'x-idempotency-key is too long.' });
    }

    if (idempotencyKey) {
      const existed = await Order.findOne({
        ...(ownershipForWrite.user ? { user: ownershipForWrite.user } : { sessionId: ownershipForWrite.sessionId }),
        idempotencyKey,
      }).lean();
      if (existed) {
        let paymentUrl = null;
        if (existed.paymentMethod === 'vnpay' && existed.paymentStatus === 'pending') {
          try {
            paymentUrl = buildVnpayPaymentUrl({
              amountVnd: existed.total,
              orderId: String(existed._id),
              orderInfo: `TechPhone ${String(existed._id).slice(-8)}`,
              ipAddr: clientIp,
            });
          } catch (e) {
            console.error(e);
          }
        }
        return res.status(200).json({
          message: 'Order already created.',
          order: existed,
          duplicated: true,
          paymentUrl,
          paymentProvider: existed.paymentMethod === 'vnpay' ? 'vnpay' : undefined,
        });
      }
    }

    let createdOrder = null;

    await session.withTransaction(async () => {
      const now = new Date();
      const cart = await Cart.findOne(ownershipFilter).populate('items.product').session(session);
      if (!cart || cart.items.length === 0) {
        throw new Error('CART_EMPTY');
      }

      const orderItems = [];
      for (const item of cart.items) {
        const product = item.product;
        if (!product || !product.isActive) {
          throw new Error('PRODUCT_UNAVAILABLE');
        }

        // Atomic stock decrement to reduce oversell risk on concurrent checkouts.
        const freshProduct = await Product.findOneAndUpdate(
          {
            _id: product._id,
            isActive: true,
            stock: { $gte: item.quantity },
          },
          { $inc: { stock: -item.quantity } },
          { new: true, session },
        );
        if (!freshProduct) {
          throw new Error(`OUT_OF_STOCK:${product._id}`);
        }

        let finalUnitPrice = Number(freshProduct.price || 0);
        let priceSource = 'regular';
        let flashSaleId = null;
        let originalPrice = null;

        const activeSale = await FlashSale.findOne({
          product: product._id,
          isDeleted: false,
          isEnabled: true,
          startsAt: { $lte: now },
          endsAt: { $gt: now },
          $expr: { $lt: ['$soldCount', '$quota'] },
        })
          .sort({ flashPrice: 1, startsAt: 1 })
          .session(session);

        if (activeSale) {
          if (activeSale.maxPerOrderQty && item.quantity > activeSale.maxPerOrderQty) {
            throw new Error(`FLASH_LIMIT:${product._id}:${activeSale.maxPerOrderQty}`);
          }

          const reservedSale = await FlashSale.findOneAndUpdate(
            {
              _id: activeSale._id,
              isDeleted: false,
              isEnabled: true,
              startsAt: { $lte: now },
              endsAt: { $gt: now },
              $expr: { $lte: [{ $add: ['$soldCount', item.quantity] }, '$quota'] },
            },
            { $inc: { soldCount: item.quantity }, $set: { updatedBy: ownershipForWrite.user || null } },
            { new: true, session },
          );

          if (!reservedSale) {
            throw new Error(`FLASH_SALE_UNAVAILABLE:${product._id}`);
          }

          originalPrice = Number(freshProduct.price || 0);
          finalUnitPrice = Number(reservedSale.flashPrice || freshProduct.price || 0);
          priceSource = 'flash_sale';
          flashSaleId = reservedSale._id;
        }

        orderItems.push({
          product: product._id,
          name: freshProduct.name,
          image: freshProduct.image,
          price: finalUnitPrice,
          originalPrice,
          priceSource,
          flashSaleId,
          quantity: item.quantity,
          lineTotal: finalUnitPrice * item.quantity,
        });
        await InventoryMovement.create(
          [
            {
              product: freshProduct._id,
              type: 'order',
              quantity: -item.quantity,
              previousStock: freshProduct.stock + item.quantity,
              nextStock: freshProduct.stock,
              note: 'Stock decremented by checkout order.',
            },
          ],
          { session },
        );
      }

      const pricing = await calculatePricing({
        lineItems: orderItems.map((item) => ({ quantity: item.quantity, price: item.price })),
        couponCodes: (cart.appliedCoupons || []).map((coupon) => coupon.code),
        session,
      });
      await consumeCouponsUsage(pricing.couponDocs, session);

      let installment = {
        status: 'draft',
      };
      if (paymentMethod === 'installment') {
        const normalized = normalizeInstallmentInput(installmentPayload || {});
        const plan = calculateInstallmentPlan({
          total: pricing.total,
          planMonths: normalized.planMonths,
          downPaymentRate: normalized.downPaymentRate,
        });
        installment = {
          provider: normalized.provider,
          planMonths: normalized.planMonths,
          downPaymentRate: normalized.downPaymentRate,
          downPaymentAmount: plan.downPaymentAmount,
          financedAmount: plan.financedAmount,
          monthlyAmount: plan.monthlyAmount,
          status: 'pending_review',
          note: normalized.note,
          requestedAt: new Date(),
        };
      }

      const initialOrderStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';

      const [order] = await Order.create(
        [
          {
            user: ownershipForWrite.user,
            sessionId: ownershipForWrite.sessionId,
            idempotencyKey,
            items: orderItems,
            subtotal: pricing.subtotal,
            productDiscountTotal: pricing.productDiscountTotal,
            shippingFee: pricing.shippingFee,
            shippingDiscountTotal: pricing.shippingDiscountTotal,
            couponDiscountTotal: pricing.couponDiscountTotal,
            total: pricing.total,
            coupons: pricing.appliedCoupons,
            paymentMethod:
              paymentMethod === 'installment' ? 'installment' : paymentMethod === 'vnpay' ? 'vnpay' : 'cod',
            status: initialOrderStatus,
            installment,
            shippingInfo: {
              fullName: fullName.trim(),
              phone: phone.trim(),
              email: email.trim(),
              province: province.trim(),
              district: district.trim(),
              ward: ward.trim(),
              address: address.trim(),
              note: note.trim(),
            },
          },
        ],
        { session },
      );

      await Cart.findOneAndUpdate(
        ownershipFilter,
        { ...ownershipForWrite, items: [], appliedCoupons: [] },
        { upsert: true, session },
      );
      await OrderEvent.create(
        [
          {
            order: order._id,
            fromStatus: '',
            toStatus: initialOrderStatus,
            note:
              paymentMethod === 'cod'
                ? 'Don COD duoc tu dong xac nhan. Thanh toan khi nhan hang.'
                : paymentMethod === 'installment'
                  ? 'Order created with installment request pending review.'
                  : paymentMethod === 'vnpay'
                    ? 'Order created; awaiting VNPAY payment.'
                    : 'Order created by checkout flow.',
            actor: ownershipForWrite.user,
          },
        ],
        { session },
      );
      createdOrder = order;
    });

    let paymentUrl = null;
    if (paymentMethod === 'vnpay' && createdOrder) {
      try {
        paymentUrl = buildVnpayPaymentUrl({
          amountVnd: createdOrder.total,
          orderId: String(createdOrder._id),
          orderInfo: `TechPhone ${String(createdOrder._id).slice(-8)}`,
          ipAddr: clientIp,
        });
      } catch (e) {
        console.error(e);
        return res.status(500).json({
          message: 'Order was created but VNPAY payment URL could not be generated.',
          order: createdOrder,
        });
      }
    }

    if (paymentMethod === 'cod' && createdOrder) {
      ensureGhnShipmentForOrder(String(createdOrder._id)).catch((err) => {
        console.error(`[orders] GHN create failed for ${createdOrder._id}:`, err.message);
      });
    }

    return res.status(201).json({
      message: 'Order created successfully.',
      order: createdOrder,
      paymentUrl,
      paymentProvider: paymentMethod === 'vnpay' ? 'vnpay' : undefined,
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    if (error.message === 'CART_EMPTY') {
      return res.status(400).json({ message: 'Cart is empty.' });
    }
    if (error.message === 'PRODUCT_UNAVAILABLE') {
      return res.status(400).json({ message: 'Some products are no longer available.' });
    }
    if (error.message.startsWith('OUT_OF_STOCK:')) {
      const productId = error.message.split(':')[1];
      return res.status(400).json({ message: `Product out of stock: ${productId}` });
    }
    if (error.message.startsWith('FLASH_SALE_UNAVAILABLE:')) {
      const productId = error.message.split(':')[1];
      return res.status(409).json({
        message: `Flash sale da ket thuc hoac het so luong cho san pham: ${productId}.`,
      });
    }
    if (error.message.startsWith('FLASH_LIMIT:')) {
      const [, productId, limit] = error.message.split(':');
      return res.status(400).json({
        message: `Vuot gioi han mua flash sale cho san pham ${productId}. Toi da moi don: ${limit}.`,
      });
    }
    return next(error);
  } finally {
    await session.endSession();
  }
});

router.get('/', async (req, res, next) => {
  try {
    const ownershipFilter = getOwnershipFilter(req);
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }

    const orders = await Order.find(ownershipFilter).sort({ createdAt: -1 }).lean();
    return res.json({ items: orders });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/timeline', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    const ownershipFilter = getOwnershipFilter(req);
    const isAdmin = req.auth?.role === 'admin';
    const order = isAdmin
      ? await Order.findById(id).lean()
      : await Order.findOne({ _id: id, ...ownershipFilter }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const timeline = await buildOrderTimeline(order);
    return res.json(timeline);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/refresh-shipment', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    const ownershipFilter = getOwnershipFilter(req);
    const isAdmin = req.auth?.role === 'admin';
    const order = isAdmin
      ? await Order.findById(id)
      : await Order.findOne({ _id: id, ...ownershipFilter });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!isGhnConfigured() || !order.shipment?.labelId) {
      const timeline = await buildOrderTimeline(order.toObject());
      return res.json({ refreshed: false, ...timeline });
    }

    const detail = await syncGhnOrderFromApi(order);

    const fresh = await Order.findById(id).lean();
    const timeline = await buildOrderTimeline(fresh);
    return res.json({ refreshed: Boolean(detail), ...timeline });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/shipment-events', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    const ownershipFilter = getOwnershipFilter(req);
    const isAdmin = req.auth?.role === 'admin';
    const order = isAdmin
      ? await Order.findById(id).lean()
      : await Order.findOne({ _id: id, ...ownershipFilter }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const items = await ShipmentEvent.find({ order: id }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }
    const ownershipFilter = getOwnershipFilter(req);
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }
    const order = await Order.findOne({ _id: id, ...ownershipFilter }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/request-cancellation', async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = String(req.body?.note || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }
    const ownershipFilter = getOwnershipFilter(req);
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }
    const order = await Order.findOne({ _id: id, ...ownershipFilter });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const validation = validateCustomerRequestCancel(order);
    if (!validation.ok) {
      if (validation.reason === 'CANCEL_ALREADY_PENDING') {
        return res.status(400).json({ message: 'A cancellation request is already pending.' });
      }
      return res.status(400).json({ message: 'This order cannot be cancelled.' });
    }

    const previous = order.status;
    order.cancelRequestStatus = 'pending';
    order.cancelRequestNote = note;
    order.cancelRequestedAt = new Date();
    await order.save();
    await OrderEvent.create({
      order: order._id,
      fromStatus: previous,
      toStatus: previous,
      note: `Yeu cau huy don.${note ? ` Ghi chu: ${note}` : ''}`,
      actor: req.auth?.userId || null,
    });
    return res.json({ order });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/cancel-immediate', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }
    const ownershipFilter = getOwnershipFilter(req);
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }

    let resultOrder = null;
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: id, ...ownershipFilter }).session(session);
      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }
      if (order.status !== 'pending') {
        throw new Error('ORDER_NOT_PENDING');
      }
      if (!canCustomerCancelImmediate(order.status)) {
        throw new Error('ORDER_NOT_PENDING');
      }
      if (order.paymentMethod === 'installment') {
        throw new Error('ORDER_INSTALLMENT');
      }
      const previous = order.status;
      await restoreInventoryForCancelledOrder(order, {
        session,
        actorUserId: req.auth?.userId || null,
        note: 'Hoan kho sau khi khach huy don (pending).',
      });
      order.status = 'cancelled';
      order.cancelRequestStatus = 'none';
      order.cancelResolvedAt = new Date();
      await order.save({ session });
      await OrderEvent.create(
        [
          {
            order: order._id,
            fromStatus: previous,
            toStatus: 'cancelled',
            note: 'Khach huy ngay khi don dang cho xu ly.',
            actor: req.auth?.userId || null,
          },
        ],
        { session },
      );
      resultOrder = order.toObject();
    });

    return res.json({ order: resultOrder });
  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (error.message === 'ORDER_NOT_PENDING') {
      return res.status(400).json({ message: 'Chi co the huy ngay khi don dang o trang thai cho xu ly.' });
    }
    if (error.message === 'ORDER_INSTALLMENT') {
      return res.status(400).json({ message: 'Don tra gop can duoc xu ly qua yeu cau huy hoac ho tro.' });
    }
    return next(error);
  } finally {
    await session.endSession();
  }
});

export default router;
