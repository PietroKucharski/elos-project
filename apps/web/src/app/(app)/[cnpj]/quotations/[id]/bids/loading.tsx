// apps/web/src/app/(app)/[cnpj]/quotations/[id]/bids/loading.tsx
export default function BidsLoading() {
  return (
    <div className="max-w-[1100px]">
      <div className="skeleton mb-5 h-4 w-[160px] rounded-md" />
      <div className="skeleton mb-2 h-7 w-[240px] rounded-md" />
      <div className="skeleton mb-8 h-4 w-[300px] rounded-md" />
      <div className="skeleton mb-4 h-16 rounded-lg" />
      <div className="skeleton h-48 rounded-lg" />
    </div>
  )
}
