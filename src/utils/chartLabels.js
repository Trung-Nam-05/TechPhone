/**
 * Chọn index hiển thị nhãn trục X — tránh chồng chữ khi lọc 1 tháng+.
 */
export function getChartLabelIndices(count, maxLabels = 8) {
  if (count <= 0) return [];
  if (count <= maxLabels) {
    return Array.from({ length: count }, (_, index) => index);
  }

  const safeMax = Math.max(2, maxLabels);
  const indices = [];
  for (let i = 0; i < safeMax; i += 1) {
    indices.push(Math.round((i / (safeMax - 1)) * (count - 1)));
  }

  return [...new Set(indices)].sort((a, b) => a - b);
}
