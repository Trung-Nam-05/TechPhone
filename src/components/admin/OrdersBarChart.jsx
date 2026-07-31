import { useMemo, useState } from 'react';

export default function OrdersBarChart({ data, formatShortDate }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const points = data || [];

  const chart = useMemo(() => {
    const width = 920;
    const height = 280;
    const pad = { top: 28, right: 24, bottom: 40, left: 48 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxOrders = Math.max(1, ...points.map((d) => Number(d.orders || 0)));
    const gap = 0.28;
    const slot = points.length > 0 ? innerW / points.length : innerW;
    const barW = Math.max(8, slot * (1 - gap));

    const bars = points.map((day, index) => {
      const orders = Number(day.orders || 0);
      const h = (orders / maxOrders) * innerH;
      const x = pad.left + index * slot + (slot - barW) / 2;
      const y = pad.top + innerH - h;
      return { x, y, width: barW, height: h, orders, date: day.date, revenue: day.revenue };
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

        {chart.bars.map((bar, index) => (
          <g key={bar.date || index}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(bar.height, bar.orders > 0 ? 2 : 0)}
              rx="4"
              className={`admin-orders-chart-bar${hoverIndex === index ? ' is-active' : ''}`}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {bar.orders > 0 && (
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 6}
                className="admin-orders-chart-count"
                textAnchor="middle"
              >
                {bar.orders}
              </text>
            )}
            <text x={bar.x + bar.width / 2} y={chart.height - 12} className="admin-sales-chart-x-label" textAnchor="middle">
              {formatShortDate(bar.date)}
            </text>
          </g>
        ))}

        {active && (
          <g>
            <rect
              x={Math.min(active.x + active.width + 6, chart.width - 160)}
              y={Math.max(active.y - 20, 8)}
              width="148"
              height="36"
              rx="6"
              className="admin-sales-chart-tooltip"
            />
            <text
              x={Math.min(active.x + active.width + 14, chart.width - 152)}
              y={Math.max(active.y + 2, 30)}
              className="admin-sales-chart-tooltip-text"
            >
              {formatShortDate(active.date)}: {active.orders} đơn
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
