import express from 'express';
import { fetchDistricts, fetchProvinces, fetchWards, isGhnConfigured } from '../services/ghn.js';

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({
    enabled: process.env.GHN_ENABLED === 'true',
    configured: isGhnConfigured(),
    devOnly: true,
  });
});

router.get('/provinces', async (_req, res, next) => {
  try {
    if (!isGhnConfigured()) {
      return res.status(503).json({ message: 'GHN is not configured.' });
    }
    const items = await fetchProvinces();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/districts', async (req, res, next) => {
  try {
    if (!isGhnConfigured()) {
      return res.status(503).json({ message: 'GHN is not configured.' });
    }
    const provinceId = Number(req.query.provinceId);
    if (!provinceId) {
      return res.status(400).json({ message: 'provinceId is required.' });
    }
    const items = await fetchDistricts(provinceId);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/wards', async (req, res, next) => {
  try {
    if (!isGhnConfigured()) {
      return res.status(503).json({ message: 'GHN is not configured.' });
    }
    const districtId = Number(req.query.districtId);
    if (!districtId) {
      return res.status(400).json({ message: 'districtId is required.' });
    }
    const items = await fetchWards(districtId);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

export default router;
