import { Link, useParams } from 'react-router-dom';
import { SUPPORT_PAGES } from '../data/contentPages';

export default function SupportPage() {
  const { slug } = useParams();
  const page = SUPPORT_PAGES[slug];

  if (!page) {
    return (
      <div className="container py-8">
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Khong tim thay trang ho tro</h1>
        <Link to="/" className="btn btn-outline">
          Quay lai trang chu
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
        Trang chu / Ho tro
      </p>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>{page.title}</h1>
      <p className="text-muted" style={{ marginBottom: 18 }}>
        {page.summary}
      </p>
      <div className="card" style={{ padding: 16 }}>
        <ul style={{ listStyle: 'disc', paddingLeft: 18, display: 'grid', gap: 8 }}>
          {page.contacts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
