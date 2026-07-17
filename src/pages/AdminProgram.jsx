import { Link } from 'react-router-dom';
import AdminPageHeader from '../components/admin/AdminPageHeader';

const WEEKLY_LOOP = [
  'Thu thập funnel KPI từ admin analytics.',
  'Review vấn đề conversion và quality (thất bại đơn, oversell, support SLA).',
  'Chọn 1-2 experiment có tác động cao nhất cho sprint tiếp theo.',
  'Phân công owner, ETA, metric kỳ vọng.',
  'Tổng kết kết quả vào cuối tuần và cập nhật quyết định iterate.',
];

const KPI_CHECKPOINTS = [
  { metric: 'Add-to-cart rate', target: '+10% vs baseline 4 tuần' },
  { metric: 'Checkout completion rate', target: '+8% vs baseline 4 tuần' },
  { metric: 'Order failure rate', target: '< 1%' },
  { metric: 'Oversell incident', target: '0 / tuần' },
  { metric: 'Support resolution time', target: '< 4h trung bình' },
];

export default function AdminProgram() {
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Chương trình 30/60/90"
        subtitle="Khung vận hành để ra quyết định hàng tuần theo KPI thay vì ra feature theo cảm tính."
      />

      <div className="admin-card-grid">
        <section className="admin-stat-card">
          <h2>Weekly operating loop</h2>
          <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'grid', gap: 8, margin: 0 }}>
            {WEEKLY_LOOP.map((item) => (
              <li key={item} style={{ fontSize: 14, color: 'var(--admin-text-secondary)' }}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="admin-stat-card">
          <h2>KPI checkpoints</h2>
          <div className="admin-list">
            {KPI_CHECKPOINTS.map((item) => (
              <div key={item.metric} className="admin-list-row">
                <strong style={{ fontSize: 14 }}>{item.metric}</strong>
                <span className="text-muted">{item.target}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-stat-card">
          <h2>Liên kết thực thi</h2>
          <div className="flex gap-2">
            <Link to="/admin/analytics" className="btn btn-primary">
              Mở funnel dashboard
            </Link>
            <Link to="/program" className="btn btn-outline">
              Xem roadmap 30/60/90
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
