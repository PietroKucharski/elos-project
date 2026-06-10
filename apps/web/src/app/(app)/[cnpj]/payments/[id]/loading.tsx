export default function PaymentDetailLoading() {
  return (
    <div className="max-w-[960px]">
      <div className="skeleton mb-4 h-4 w-[160px] rounded-md" />
      <div className="skeleton mb-6 h-9 w-[300px] rounded-md" />
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="skeleton h-44 rounded-lg" />
        <div className="skeleton h-44 rounded-lg" />
      </div>
      <div className="skeleton h-64 rounded-lg" />
    </div>
  )
}
