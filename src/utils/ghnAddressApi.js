import { apiFetch } from '../config/api';

export async function fetchGhnShippingStatus() {
  try {
    return await apiFetch('/api/shipping/ghn/status');
  } catch {
    return { enabled: false, configured: false };
  }
}

export async function fetchGhnProvinces() {
  const payload = await apiFetch('/api/shipping/ghn/provinces');
  return payload?.items || [];
}

export async function fetchGhnDistricts(provinceId) {
  const payload = await apiFetch(`/api/shipping/ghn/districts?provinceId=${provinceId}`);
  return payload?.items || [];
}

export async function fetchGhnWards(districtId) {
  const payload = await apiFetch(`/api/shipping/ghn/wards?districtId=${districtId}`);
  return payload?.items || [];
}

export function normalizeAddressSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function getProvinceLabels(item) {
  return [item?.ProvinceName, ...(item?.NameExtension || [])].filter(Boolean);
}

export function getDistrictLabels(item) {
  return [item?.DistrictName, ...(item?.NameExtension || [])].filter(Boolean);
}

export function getWardLabels(item) {
  return [item?.WardName, ...(item?.NameExtension || [])].filter(Boolean);
}

export function matchesAddressQuery(item, query, getLabels) {
  if (!query) return true;
  const normalizedQuery = normalizeAddressSearch(query);
  return getLabels(item).some((label) => normalizeAddressSearch(label).includes(normalizedQuery));
}
