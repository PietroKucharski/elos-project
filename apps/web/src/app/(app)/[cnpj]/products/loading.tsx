// apps/web/src/app/(app)/[cnpj]/products/loading.tsx
export default function ProductsLoading() {
  return (
    <div>
      <div className="skeleton mb-6 h-7 w-[140px] rounded-md" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático sem identidade própria
          key={i}
          className="skeleton mb-2 h-12 rounded-md"
        />
      ))}
    </div>
  )
}
