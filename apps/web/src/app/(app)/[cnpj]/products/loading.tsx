// apps/web/src/app/(app)/[cnpj]/products/loading.tsx
export default function ProductsLoading() {
  return (
    <div>
      <div
        className="skeleton"
        style={{ height: 28, width: 140, marginBottom: 24, borderRadius: 6 }}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático sem identidade própria
          key={i}
          className="skeleton"
          style={{ height: 48, marginBottom: 8, borderRadius: 6 }}
        />
      ))}
    </div>
  )
}
