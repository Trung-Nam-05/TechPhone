const ROADMAP_PHASES = [
  {
    key: '0-30',
    title: '0-30 ngay: Stabilize and trust',
    kpi: ['Giam loi checkout < 1%', 'Hoan tat trang trust/policy 100%', 'Tang add-to-cart rate +10%'],
    actions: [
      'Fix dead-end flow va thay bang route that.',
      'Hoan thien thong diep sau dat hang kem ma don.',
      'Harden backend cho ownership, price snapshot, stock consistency.',
    ],
  },
  {
    key: '31-60',
    title: '31-60 ngay: Convert better',
    kpi: ['Tang checkout start rate +15%', 'Tang conversion listing -> PDP +12%'],
    actions: [
      'Hoan tat bo loc nang cao hoat dong thuc te.',
      'Them event analytics cho toan funnel.',
      'Toi uu trang chi tiet theo brand/category de tang trust.',
    ],
  },
  {
    key: '61-90',
    title: '61-90 ngay: Scale and retain',
    kpi: ['30-day repeat purchase > 8%', 'Giam support SLA trung binh < 4h'],
    actions: [
      'Mo rong admin cho workflow van hanh don hang va ton kho.',
      'Them coupon/review va event trail cho audit.',
      'Van hanh review KPI hang tuan va quyet dinh iterate.',
    ],
  },
];

export default function ExecutionProgram() {
  return (
    <div className="container py-8">
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>30/60/90 execution program</h1>
      <p className="text-muted" style={{ marginBottom: 18 }}>
        Chuong trinh thuc thi roadmap theo sprint, KPI checkpoint va quyet dinh tuan.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        {ROADMAP_PHASES.map((phase) => (
          <article key={phase.key} className="card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: 21, marginBottom: 8 }}>{phase.title}</h2>
            <strong style={{ display: 'block', marginBottom: 4 }}>Action plan</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: 18, marginBottom: 10 }}>
              {phase.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <strong style={{ display: 'block', marginBottom: 4 }}>KPI checkpoint</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: 18 }}>
              {phase.kpi.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
