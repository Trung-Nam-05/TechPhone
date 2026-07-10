export function getFlashSaleState(flashSale, nowMs = Date.now()) {
  if (!flashSale) return 'none';
  const startsMs = new Date(flashSale.startsAt).getTime();
  const endsMs = new Date(flashSale.endsAt).getTime();
  if (Number.isNaN(startsMs) || Number.isNaN(endsMs)) return flashSale.status || 'none';

  if (nowMs < startsMs) return 'upcoming';
  if (nowMs >= endsMs) return 'ended';
  if ((flashSale.remainingQuantity || 0) <= 0 || flashSale.status === 'sold_out') return 'sold_out';
  return 'active';
}

export function formatCountdown(targetTime, nowMs = Date.now()) {
  const targetMs = new Date(targetTime).getTime();
  if (Number.isNaN(targetMs)) return '00:00:00';
  const diff = Math.max(targetMs - nowMs, 0);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
