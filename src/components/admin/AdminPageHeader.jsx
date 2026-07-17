export default function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <header className="admin-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
    </header>
  );
}
