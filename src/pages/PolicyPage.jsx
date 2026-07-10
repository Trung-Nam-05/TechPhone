import { Link, useParams } from 'react-router-dom';
import { POLICY_PAGES } from '../data/contentPages';

export default function PolicyPage() {
  const { slug } = useParams();
  const page = POLICY_PAGES[slug];

  if (!page) {
    return (
      <div className="container py-8">
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Khong tim thay chinh sach</h1>
        <Link to="/" className="btn btn-outline">
          Quay lai trang chu
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
        Trang chu / Chinh sach
      </p>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>{page.title}</h1>
      <p className="text-muted" style={{ marginBottom: 18 }}>
        {page.summary}
      </p>
      <div className="card" style={{ padding: 16 }}>
        <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'grid', gap: 8 }}>
          {page.blocks.map((block) => (
            <li key={block}>{block}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
