export default function CompanyLoading() {
  return (
    <div style={{ padding: 24 }}>
      {/* Skeleton de page header */}
      <div style={{ marginBottom: 22 }}>
        <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 18 }} />
      </div>
      {/* Skeleton de tabela */}
      <div
        style={{
          background: 'white',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático sem identidade própria
            key={i}
            style={{
              display: 'flex',
              gap: 16,
              padding: '14px 16px',
              borderBottom: i < 4 ? '1px solid hsl(214 32% 91%)' : 'none',
            }}
          >
            <div className="skeleton" style={{ width: 160, height: 16 }} />
            <div className="skeleton" style={{ width: 100, height: 16 }} />
            <div className="skeleton" style={{ width: 80, height: 16, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
