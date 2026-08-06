import { useMemo, useState } from 'react';
import { getChartLabelIndices } from '../../utils/chartLabels';

export default function OrdersBarChart({
  data,
  formatShortDate,
  formatFullDate,
  onDaySelect,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const points = useMemo(() => data || [], [data]);
  const formatDayLabel = formatShortDate || ((date) => date);
  const formatDayFull = formatFullDate || formatDayLabel;

  const chart = useMemo(() => {
    const width = 920;
    const height = 280;
    const pad = { top: 28, right: 24, bottom: 44, left: 48 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxOrders = Math.max(1, ...points.map((d) => Number(d.orders || 0)));
    const gap = 0.28;
    const slot = points.length > 0 ? innerW / points.length : innerW;
    const barW = Math.max(4, Math.min(24, slot * (1 - gap)));
    const labelIndices = new Set(getChartLabelIndices(points.length));

    const bars = points.map((day, index) => {
      const orders = Number(day.orders || 0);
      const h = (orders / maxOrders) * innerH;
      const x = pad.left + index * slot + (slot - barW) / 2;
      const y = pad.top + innerH - h;
      return {
        x,
        y,
        width: barW,
        height: h,
        orders,
        date: day.date,
        revenue: day.revenue,
        index,
        showLabel: labelIndices.has(index),
      };
    });

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      y: pad.top + innerH - ratio * innerH,
      label: String(Math.round(maxOrders * ratio)),
    }));

    return { width, height, pad, innerH, bars, yTicks, maxOrders };
  }, [points]);

  if (points.length === 0) {
    return <p className="admin-chart-empty">Chưa có dữ liệu đơn hàng theo ngày.</p>;
  }

  const active = hoverIndex != null ? chart.bars[hoverIndex] : null;

  const handleSelect = (index) => {
    if (onDaySelect && chart.bars[index]?.date) {
      onDaySelect(chart.bars[index]);
    }
  };

  return (
    <div className="admin-orders-chart">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="admin-orders-chart-svg" preserveAspectRatio="xMidYMid meet">
        {chart.yTicks.map((tick) => (
          <g key={`y-${tick.y}`}>
            <line
              x1={chart.pad.left}
              y1={tick.y}
              x2={chart.width - chart.pad.right}
              y2={tick.y}
              className="admin-sales-chart-grid"
            />
            <text x={chart.pad.left - 10} y={tick.y + 4} className="admin-sales-chart-y-label" textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}

        {chart.bars.map((bar) => (
          <g key={bar.date || bar.index}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(bar.height, bar.orders > 0 ? 2 : 0)}
              rx="4"
              className={`admin-orders-chart-bar${hoverIndex === bar.index ? ' is-active' : ''}${onDaySelect ? ' is-clickable' : ''}`}
              onMouseEnter={() => setHoverIndex(bar.index)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => handleSelect(bar.index)}
            />
            {bar.orders > 0 && bar.width >= 12 && (
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 6}
                className="admin-orders-chart-count"
                textAnchor="middle"
                pointerEvents="none"
              >
                {bar.orders}
              </text>
            )}
            {bar.showLabel && (
              <text
                x={bar.x + bar.width / 2}
                y={chart.height - 12}
                className="admin-sales-chart-x-label"
                textAnchor="middle"
                pointerEvents="none"
              >
                {formatDayLabel(bar.date)}
              </text>
            )}
          </g>
        ))}

        {active && (
          <g pointerEvents="none">
            <rect
              x={Math.min(active.x + active.width + 6, chart.width - 190)}
              y={Math.max(active.y - 20, 8)}
              width="182"
              height="36"
              rx="6"
              className="admin-sales-chart-tooltip"
            />
            <text
              x={Math.min(active.x + active.width + 14, chart.width - 182)}
              y={Math.max(active.y + 2, 30)}
              className="admin-sales-chart-tooltip-text"
            >
              {formatDayFull(active.date)}: {active.orders} đơn
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
