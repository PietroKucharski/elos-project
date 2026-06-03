// apps/web/src/app/(app)/[cnpj]/quotations/[id]/loading.tsx
export default function QuotationDetailLoading() {
  return (
    <div className="max-w-[960px]">
      <div className="skeleton mb-2 h-7 w-[280px] rounded-md" />
      <div className="skeleton mb-8 h-4 w-[180px] rounded-md" />
      <div className="skeleton mb-8 h-24 rounded-lg" />
      <div className="skeleton mb-3 h-5 w-[160px] rounded-md" />
      <div className="skeleton mb-8 h-32 rounded-lg" />
      <div className="skeleton mb-3 h-5 w-[200px] rounded-md" />
      <div className="skeleton h-32 rounded-lg" />
    </div>
  )
}
