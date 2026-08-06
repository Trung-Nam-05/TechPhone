import express from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import FlashSale from '../models/FlashSale.js';
import InventoryMovement from '../models/InventoryMovement.js';
import OrderEvent from '../models/OrderEvent.js';
import { getOwnershipFilter, getOwnershipForWrite } from '../utils/ownership.js';
import { claimSessionOwnership } from '../services/claimSessionOwnership.js';
import { calculatePricing, consumeCouponsUsage, PricingError } from '../services/pricing.js';
import { restoreInventoryForCancelledOrder } from '../services/orderCancel.js';
import { restoreCartFromOrder } from '../services/cartRestore.js';
import { syncGhnOrderFromApi } from '../services/ghnShipment.js';
import { isGhnConfigured } from '../services/ghn.js';
import ShipmentEvent from '../models/ShipmentEvent.js';
import { requireAuth } from '../middleware/auth.js';
import { buildOrderTimeline } from '../services/orderTimeline.js';
import { sanitizeOrderForCustomer, sanitizeOrdersForCustomer } from '../utils/orderSanitize.js';
import {
  validateCustomerRequestCancel,
  canCustomerCancelImmediate,
} from '../services/orderStateMachine.js';
import { resolvePaymentStrategy, getPaymentStrategy } from '../patterns/payment/paymentStrategyRegistry.js';
import { applyOrderCancellation, recordOrderEvent } from '../patterns/state/orderTransitionService.js';
import { MAX_LINE_QUANTITY } from '../constants/cartLimits.js';

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
    const provinceId = Number(shippingInfo?.provinceId) || null;
    const districtId = Number(shippingInfo?.districtId) || null;
    const wardCode = String(shippingInfo?.wardCode || '').trim();
    const rawPaymentMethod = String(req.body?.paymentMethod || 'cod').trim();
    const paymentStrategy = resolvePaymentStrategy(rawPaymentMethod);
    if (!paymentStrategy) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }
    const paymentMethod = paymentStrategy.key;

    const paymentValidation = paymentStrategy.validateCheckout({ shippingInfo: req.body?.shippingInfo });
    if (!paymentValidation.ok) {
      return res.status(paymentValidation.status || 400).json({ message: paymentValidation.message });
    }

    const installmentPayload = req.body?.installment || null;
    const invoiceRequested =
      req.body?.invoiceRequested === true ||
      String(note || '').includes('Xuất hoá đơn điện tử');
    const idempotencyKey = String(req.header('x-idempotency-key') || '').trim() || null;
    if (!fullName?.trim() || !phone?.trim() || !address?.trim()) {
      return res.status(400).json({
        message: 'shippingInfo.fullName, shippingInfo.phone, shippingInfo.address are required.',
      });
    }
    if (!province?.trim() || !district?.trim()) {
      if (paymentStrategy.requiresProvinceDistrict()) {
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
        const existedStrategy = getPaymentStrategy(existed.paymentMethod) || paymentStrategy;
        const idempotentPayload = await existedStrategy.buildIdempotentResponse(existed, { clientIp });
        return res.status(200).json({
          message: 'Order already created.',
          order: existed,
          duplicated: true,
          ...idempotentPayload,
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
        if (item.quantity > MAX_LINE_QUANTITY) {
          throw new Error(`LINE_QTY_LIMIT:${product._id}:${MAX_LINE_QUANTITY}`);
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

      const installment = paymentStrategy.buildInstallmentPayload(pricing, installmentPayload);

      const initialOrderStatus = paymentStrategy.getInitialOrderStatus();

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
            paymentMethod,
            status: initialOrderStatus,
            installment,
            invoiceRequested,
            shippingInfo: {
              fullName: fullName.trim(),
              phone: phone.trim(),
              email: email.trim(),
              province: province.trim(),
              provinceId: Number.isFinite(provinceId) && provinceId > 0 ? provinceId : null,
              district: district.trim(),
              districtId: Number.isFinite(districtId) && districtId > 0 ? districtId : null,
              ward: ward.trim(),
              wardCode,
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
            note: paymentStrategy.getOrderCreatedNote(),
            actor: ownershipForWrite.user,
          },
        ],
        { session },
      );
      createdOrder = order;
    });

    const postCreatePayload = await paymentStrategy.buildPostCreatePayload(createdOrder, { clientIp });
    if (postCreatePayload.paymentUrlError) {
      return res.status(500).json({
        message: 'Order was created but VNPAY payment URL could not be generated.',
        order: createdOrder,
      });
    }

    return res.status(201).json({
      message: 'Order created successfully.',
      order: createdOrder,
      ...postCreatePayload,
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
    if (error.message.startsWith('LINE_QTY_LIMIT:')) {
      const limit = error.message.split(':')[2] || MAX_LINE_QUANTITY;
      return res.status(400).json({
        message: `Mỗi sản phẩm tối đa ${limit} sản phẩm/đơn.`,
      });
    }
    return next(error);
  } finally {
    await session.endSession();
  }
});

router.get('/', async (req, res, next) => {
  try {
    // Đã login + còn session guest → gắn đơn cũ vào tài khoản (không cần logout/login lại)
    if (req.auth?.userId) {
      await claimSessionOwnership(req, req.auth.userId);
    }

    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }

    const orders = await Order.find(ownershipFilter).sort({ createdAt: -1 }).lean();
    return res.json({ items: sanitizeOrdersForCustomer(orders) });
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

    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    const isAdmin = req.auth?.role === 'admin';
    const order = isAdmin
      ? await Order.findById(id).lean()
      : await Order.findOne({ _id: id, ...ownershipFilter }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const timeline = await buildOrderTimeline(order, { forCustomer: !isAdmin });
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

    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    const isAdmin = req.auth?.role === 'admin';
    const order = isAdmin
      ? await Order.findById(id)
      : await Order.findOne({ _id: id, ...ownershipFilter });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!isGhnConfigured() || !order.shipment?.labelId) {
      const timeline = await buildOrderTimeline(order.toObject(), { forCustomer: !isAdmin });
      return res.json({ refreshed: false, ...timeline });
    }

    const detail = await syncGhnOrderFromApi(order);

    const fresh = await Order.findById(id).lean();
    const timeline = await buildOrderTimeline(fresh, { forCustomer: !isAdmin });
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

    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    const isAdmin = req.auth?.role === 'admin';
    const order = isAdmin
      ? await Order.findById(id).lean()
      : await Order.findOne({ _id: id, ...ownershipFilter }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Shipment details are available to admin only.' });
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
    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }
    const order = await Order.findOne({ _id: id, ...ownershipFilter }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    return res.json(sanitizeOrderForCustomer(order));
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
    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
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
    await recordOrderEvent({
      orderId: order._id,
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

router.post('/:id/vnpay/retry-payment', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }

    const order = await Order.findOne({ _id: id, ...ownershipFilter });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (order.paymentMethod !== 'vnpay') {
      return res.status(400).json({ message: 'Don khong phai thanh toan VNPAY.' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Chi co the thanh toan lai khi don dang cho xu ly.' });
    }
    if (!['pending', 'failed'].includes(order.paymentStatus)) {
      return res.status(400).json({ message: 'Trang thai thanh toan khong cho phep thu lai.' });
    }

    const vnpayStrategy = getPaymentStrategy('vnpay');
    const validation = vnpayStrategy.validateCheckout();
    if (!validation.ok) {
      return res.status(validation.status || 503).json({ message: validation.message });
    }

    if (order.paymentStatus === 'failed') {
      order.paymentStatus = 'pending';
      await order.save();
    }

    const clientIp =
      (typeof req.headers['x-forwarded-for'] === 'string' && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = await vnpayStrategy.buildPaymentUrl(order, clientIp);
    return res.json({ paymentUrl, order: sanitizeOrderForCustomer(order.toObject()) });
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
    const ownershipFilter = getOwnershipFilter(req, { includeGuestSession: true });
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing order ownership context.' });
    }

    let resultOrder = null;
    let cartRestore = null;
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
      await restoreInventoryForCancelledOrder(order, {
        session,
        actorUserId: req.auth?.userId || null,
        note: 'Hoan kho sau khi khach huy don (pending).',
      });
      const transition = await applyOrderCancellation(order, {
        note: 'Khach huy ngay khi don dang cho xu ly.',
        actor: req.auth?.userId || null,
        session,
        beforeSave: (doc) => {
          doc.cancelRequestStatus = 'none';
          doc.cancelResolvedAt = new Date();
        },
      });
      if (!transition.ok) {
        throw new Error(transition.reason || 'INVALID_TRANSITION');
      }
      if (order.paymentMethod === 'vnpay') {
        const ownershipForWrite = getOwnershipForWrite(req);
        if (ownershipForWrite) {
          cartRestore = await restoreCartFromOrder(order, ownershipForWrite, { session });
        }
      }
      resultOrder = order.toObject();
    });

    return res.json({ order: resultOrder, cartRestore });
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
