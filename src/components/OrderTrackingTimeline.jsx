import { getGhtkStatusLabel } from '../constants/orderLabels';

function formatEventTime(at, locale = 'vi-VN') {
  if (!at) return '';
  return new Date(at).toLocaleString(locale);
}

function eventIcon(source) {
  if (source === 'ghtk') return '📦';
  return '📋';
}

export default function OrderTrackingTimeline({ events = [], locale = 'vi-VN', loading = false }) {
  if (loading) {
    return <p className="text-muted">Đang tải hành trình...</p>;
  }

  if (!events.length) {
    return <p className="text-muted">Chưa có cập nhật vận chuyển.</p>;
  }

  return (
    <ol className="order-timeline">
      {[...events].reverse().map((event, index) => (
        <li
          key={`${event.at}-${event.title}-${index}`}
          className={`order-timeline-item order-timeline-item--${event.source || 'order'}`}
        >
          <span className="order-timeline-icon" aria-hidden>
            {eventIcon(event.source)}
          </span>
          <div className="order-timeline-body">
            <div className="order-timeline-title">{event.title}</div>
            <div className="order-timeline-time">{formatEventTime(event.at, locale)}</div>
            {event.ghtkStatusId != null && (
              <div className="order-timeline-meta text-sm text-muted">
                GHTK: {getGhtkStatusLabel(event.ghtkStatusId)}
              </div>
            )}
            {event.note && <p className="order-timeline-note text-sm">{event.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
