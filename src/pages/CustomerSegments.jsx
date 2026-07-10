import { CUSTOMER_SEGMENTS } from '../data/customerSegments';

export default function CustomerSegments() {
  return (
    <div className="container py-8">
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Customer segments and value proposition</h1>
      <p className="text-muted" style={{ marginBottom: 18 }}>
        Tai lieu van hanh de dong bo Product, Marketing va Sales trong qua trinh tang truong.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CUSTOMER_SEGMENTS.map((segment) => (
          <article key={segment.key} className="card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>{segment.name}</h2>
            <p className="text-muted" style={{ marginBottom: 8 }}>
              Ngan sach: {segment.budget}
            </p>
            <p style={{ marginBottom: 10 }}>{segment.valueProposition}</p>
            <strong style={{ display: 'block', marginBottom: 4 }}>Muc tieu chinh</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: 16, marginBottom: 10 }}>
              {segment.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
            <strong style={{ display: 'block', marginBottom: 4 }}>Kenh uu tien</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: 16 }}>
              {segment.channels.map((channel) => (
                <li key={channel}>{channel}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
