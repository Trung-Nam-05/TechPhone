export default function AdminKpiCard({ label, value, hint, icon: Icon, tone = 'blue', highlight = false, loading = false }) {
  return (
    <article className={`admin-kpi-card${highlight ? ' highlight' : ''}${loading ? ' is-loading' : ''}`}>
      <div className="admin-kpi-card-body">
        <span className="admin-kpi-label">{label}</span>
        {loading ? (
          <span className="admin-skeleton admin-skeleton-kpi" aria-hidden="true" />
        ) : (
          <strong className="admin-kpi-value">{value}</strong>
        )}
        {loading ? (
          <span className="admin-skeleton admin-skeleton-hint" aria-hidden="true" />
        ) : hint ? (
          <div className="admin-kpi-hint">{hint}</div>
        ) : null}
      </div>
      {Icon ? (
        <span className={`admin-kpi-icon ${tone}`}>
          <Icon size={24} />
        </span>
      ) : null}
    </article>
  );
}
