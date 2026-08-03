/**
 * State Pattern — Flash sale lifecycle
 * inactive → upcoming → active → sold_out → ended
 *
 * @see docs/design-patterns/PATTERN-MAP.md
 */
export const FLASH_SALE_STATES = ['inactive', 'upcoming', 'active', 'sold_out', 'ended'];

export function resolveFlashSaleState(saleDoc, now = new Date()) {
  if (!saleDoc || saleDoc.isDeleted || !saleDoc.isEnabled) {
    return 'inactive';
  }
  if (saleDoc.startsAt > now) return 'upcoming';
  if (saleDoc.endsAt <= now) return 'ended';
  if (saleDoc.soldCount >= saleDoc.quota) return 'sold_out';
  return 'active';
}

export function isFlashSaleBlockingDelete(state) {
  return state === 'active' || state === 'upcoming';
}
