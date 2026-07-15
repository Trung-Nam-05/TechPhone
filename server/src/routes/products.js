import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import { enrichProductsWithFlashSale } from '../services/flashSale.js';
import {
  buildProductSearchFilter,
  sortProductsByRelevance,
} from '../services/productSearch.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function resolveActiveProductId(rawId) {
  if (/^\d+$/.test(rawId)) {
    const p = await Product.findOne({ legacyId: Number(rawId), isActive: true, deletedAt: null }).select('_id').lean();
    return p?._id || null;
  }
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    const p = await Product.findOne({ _id: rawId, isActive: true, deletedAt: null }).select('_id').lean();
    return p?._id || null;
  }
  const p = await Product.findOne({ slug: rawId, isActive: true, deletedAt: null }).select('_id').lean();
  return p?._id || null;
}

const SORT_MAP = {
  newest: { createdAt: -1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
};

router.get('/suggest', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 12);
    if (!q) return res.json({ items: [] });

    const query = { isActive: true, deletedAt: null };
    const searchFilter = buildProductSearchFilter(q);
    if (searchFilter) Object.assign(query, searchFilter);

    const raw = await Product.find(query)
      .select('name slug brand price oldPrice image category stock legacyId')
      .limit(40)
      .lean();

    const ranked = sortProductsByRelevance(raw, q).slice(0, limit);
    const items = await enrichProductsWithFlashSale(ranked);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      search = '',
      sort = 'newest',
      page: pageRaw = '1',
      limit: limitRaw = '12',
    } = req.query;

    const page = Math.max(Number(pageRaw) || 1, 1);
    const limit = Math.min(Math.max(Number(limitRaw) || 12, 1), 48);
    const searchText = String(search || '').trim();

    const query = { isActive: true, deletedAt: null };
    if (category && category !== 'all') {
      query['category.key'] = category;
    }
    const searchFilter = buildProductSearchFilter(searchText);
    if (searchFilter) Object.assign(query, searchFilter);
    if (req.query.brand) {
      query.brand = String(req.query.brand).trim().toLowerCase();
    }
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    const sortQuery = SORT_MAP[sort] || SORT_MAP.newest;
    const fetchLimit = searchText ? Math.min(limit * 4, 120) : limit;
    const [rawItems, total] = await Promise.all([
      Product.find(query)
        .sort(sortQuery)
        .skip(searchText ? 0 : (page - 1) * limit)
        .limit(searchText ? fetchLimit : limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    let rankedItems = rawItems;
    if (searchText) {
      rankedItems = sortProductsByRelevance(rawItems, searchText);
      rankedItems = rankedItems.slice((page - 1) * limit, (page - 1) * limit + limit);
    }

    const items = await enrichProductsWithFlashSale(rankedItems);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    const productMongoId = await resolveActiveProductId(req.params.id);
    if (!productMongoId) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const items = await Review.find({ product: productMongoId, isDeleted: false, isApproved: true })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .limit(50)
      .lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const productMongoId = await resolveActiveProductId(req.params.id);
    if (!productMongoId) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();
    const title = String(req.body?.title || '').trim();
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating must be between 1 and 5.' });
    }
    const review = await Review.create({
      product: productMongoId,
      user: req.auth.userId,
      rating,
      title,
      comment,
      isApproved: true,
    });
    const populated = await Review.findById(review._id).populate('user', 'name').lean();
    return res.status(201).json(populated);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this product.' });
    }
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let product = null;

    if (/^\d+$/.test(id)) {
      product = await Product.findOne({ legacyId: Number(id), isActive: true, deletedAt: null }).lean();
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findOne({ _id: id, isActive: true, deletedAt: null }).lean();
    } else {
      product = await Product.findOne({ slug: id, isActive: true, deletedAt: null }).lean();
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const [enriched] = await enrichProductsWithFlashSale([product]);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

export default router;
