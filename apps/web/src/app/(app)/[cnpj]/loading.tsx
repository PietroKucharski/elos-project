export default function CompanyLoading() {
  return (
    <div className="p-6">
      {/* Skeleton de page header */}
      <div className="mb-[22px]">
        <div className="skeleton mb-2 h-7 w-[200px]" />
        <div className="skeleton h-[18px] w-[320px]" />
      </div>
      {/* Skeleton de tabela */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático sem identidade própria
            key={i}
            className={`flex gap-4 px-4 py-3.5 ${i < 4 ? 'border-b border-border' : ''}`}
          >
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-4 w-[100px]" />
            <div className="skeleton ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
