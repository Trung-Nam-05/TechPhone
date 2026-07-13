import { fetchDistricts, fetchProvinces, fetchWards } from './ghn.js';

const cache = {
  provinces: null,
  districts: new Map(),
  wards: new Map(),
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tránh "Quận 1" khớp nhầm "Quận 12". */
function matchScore(input, candidate) {
  const n = normalizeText(input);
  const cn = normalizeText(candidate);
  if (!n || !cn) return 0;
  if (n === cn) return 100;

  if (cn.startsWith(n)) {
    const tail = cn.slice(n.length);
    if (!tail || /^[\s,.-]/.test(tail)) return 90;
    return 0;
  }
  if (n.startsWith(cn)) {
    const tail = n.slice(cn.length);
    if (!tail || /^[\s,.-]/.test(tail)) return 85;
    return 0;
  }

  if (cn.includes(n) || n.includes(cn)) return 50;
  return 0;
}

function pickBest(rows, input, getNames) {
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    for (const name of getNames(row)) {
      const score = matchScore(input, name);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }
  return bestScore >= 50 ? best : null;
}

async function getProvinces() {
  if (!cache.provinces) {
    cache.provinces = await fetchProvinces();
  }
  return cache.provinces;
}

async function getDistricts(provinceId) {
  if (!cache.districts.has(provinceId)) {
    cache.districts.set(provinceId, await fetchDistricts(provinceId));
  }
  return cache.districts.get(provinceId);
}

async function getWards(districtId) {
  if (!cache.wards.has(districtId)) {
    cache.wards.set(districtId, await fetchWards(districtId));
  }
  return cache.wards.get(districtId);
}

export async function resolveGhnAddress(shippingInfo) {
  const { province = '', district = '', ward = '' } = shippingInfo || {};
  if (!province?.trim() || !district?.trim()) {
    throw new Error('GHN_MISSING_ADDRESS: province and district are required.');
  }

  const provinces = await getProvinces();
  const provinceRow = pickBest(provinces, province, (p) => [
    p.ProvinceName,
    ...(p.NameExtension || []),
  ]);
  if (!provinceRow) {
    throw new Error(`GHN_ADDRESS: Khong tim thay tinh/thanh "${province}".`);
  }

  const districts = await getDistricts(provinceRow.ProvinceID);
  const districtRow = pickBest(districts, district, (d) => [
    d.DistrictName,
    ...(d.NameExtension || []),
  ]);
  if (!districtRow) {
    throw new Error(`GHN_ADDRESS: Khong tim thay quan/huyen "${district}" tai ${provinceRow.ProvinceName}.`);
  }

  const wards = await getWards(districtRow.DistrictID);
  let wardRow = ward
    ? pickBest(wards, ward, (w) => [w.WardName, ...(w.NameExtension || [])])
    : null;
  if (!wardRow && wards.length > 0) {
    wardRow = wards[0];
  }
  if (!wardRow?.WardCode) {
    throw new Error(`GHN_ADDRESS: Khong tim thay phuong/xa "${ward || '(trong)'}" tai ${districtRow.DistrictName}.`);
  }

  return {
    provinceId: provinceRow.ProvinceID,
    districtId: districtRow.DistrictID,
    wardCode: wardRow.WardCode,
    provinceName: provinceRow.ProvinceName,
    districtName: districtRow.DistrictName,
    wardName: wardRow.WardName,
  };
}
