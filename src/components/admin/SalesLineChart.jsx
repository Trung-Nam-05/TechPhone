import { useMemo, useState } from 'react';

function buildSmoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function SalesLineChart({ data, formatMoney, formatShortDate }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const points = data || [];

  const chart = useMemo(() => {
    const width = 920;
    const height = 300;
    const pad = { top: 24, right: 24, bottom: 40, left: 64 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxRevenue = Math.max(1, ...points.map((d) => d.revenue || 0));

    const coords = points.map((day, index) => {
      const x = pad.left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
      const y = pad.top + innerH - ((day.revenue || 0) / maxRevenue) * innerH;
      return { x, y, ...day };
    });

    const linePath = buildSmoothPath(coords);
    const areaPath = coords.length
      ? `${linePath} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`
      : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      y: pad.top + innerH - ratio * innerH,
      label: formatMoney(maxRevenue * ratio),
    }));

    return { width, height, pad, innerH, coords, linePath, areaPath, yTicks, maxRevenue };
  }, [points, formatMoney]);

  if (points.length === 0) {
    return <p className="admin-chart-empty">Chưa có dữ liệu doanh thu.</p>;
  }

  const active = hoverIndex != null ? chart.coords[hoverIndex] : null;

  return (
    <div className="admin-sales-chart">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="admin-sales-chart-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4880ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4880ff" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick) => (
          <g key={tick.y}>
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

        <path d={chart.areaPath} fill="url(#salesAreaGradient)" />
        <path d={chart.linePath} className="admin-sales-chart-line" fill="none" />

        {chart.coords.map((point, index) => (
          <g key={point.date || index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 6 : 4}
              className="admin-sales-chart-dot"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            <text x={point.x} y={chart.height - 12} className="admin-sales-chart-x-label" textAnchor="middle">
              {formatShortDate(point.date)}
            </text>
          </g>
        ))}

        {active && (
          <g>
            <line
              x1={active.x}
              y1={chart.pad.top}
              x2={active.x}
              y2={chart.pad.top + chart.innerH}
              className="admin-sales-chart-active-line"
            />
            <rect
              x={Math.min(active.x + 8, chart.width - 150)}
              y={Math.max(active.y - 36, 8)}
              width="140"
              height="28"
              rx="6"
              className="admin-sales-chart-tooltip"
            />
            <text
              x={Math.min(active.x + 16, chart.width - 142)}
              y={Math.max(active.y - 17, 26)}
              className="admin-sales-chart-tooltip-text"
            >
              {formatMoney(active.revenue)} · {active.orders} đơn
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
