// apps/web/src/app/(app)/[cnpj]/purchase-orders/loading.tsx
export default function PurchaseOrdersLoading() {
  return (
    <div className="max-w-[1100px]">
      <div className="skeleton mb-2 h-7 w-[220px] rounded-md" />
      <div className="skeleton mb-6 h-4 w-[160px] rounded-md" />
      <div className="skeleton mb-4 h-9 w-[360px] rounded-lg" />
      <div className="skeleton h-80 rounded-lg" />
    </div>
  )
}
