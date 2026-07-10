import { Link } from 'react-router-dom';

const WEEKLY_LOOP = [
  'Thu thap funnel KPI tu admin analytics.',
  'Review van de conversion va quality (that bai don, oversell, support SLA).',
  'Chon 1-2 experiment co tac dong cao nhat cho sprint tiep theo.',
  'Phan cong owner, ETA, metric ky vong.',
  'Tong ket ket qua vao cuoi tuan va cap nhat quyet dinh iterate.',
];

const KPI_CHECKPOINTS = [
  { metric: 'Add-to-cart rate', target: '+10% vs baseline 4 tuan' },
  { metric: 'Checkout completion rate', target: '+8% vs baseline 4 tuan' },
  { metric: 'Order failure rate', target: '< 1%' },
  { metric: 'Oversell incident', target: '0 / tuan' },
  { metric: 'Support resolution time', target: '< 4h trung binh' },
];

export default function AdminProgram() {
  return (
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 10 }}>30/60/90 execution program</h1>
      <p className="text-muted" style={{ marginBottom: 14 }}>
        Khung van hanh de ra quyet dinh hang tuan theo KPI thay vi ra feature theo cam tinh.
      </p>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Weekly operating loop</h2>
        <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'grid', gap: 6 }}>
          {WEEKLY_LOOP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>KPI checkpoints</h2>
        <div style={{ display: 'grid', gap: 6 }}>
          {KPI_CHECKPOINTS.map((item) => (
            <div key={item.metric} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong>{item.metric}</strong>
              <span className="text-muted">{item.target}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Lien ket thuc thi</h2>
        <div className="flex gap-2">
          <Link to="/admin/analytics" className="btn btn-primary">
            Mo funnel dashboard
          </Link>
          <Link to="/program" className="btn btn-outline">
            Xem roadmap 30/60/90
          </Link>
        </div>
      </div>
    </div>
  );
}
