export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Container full-bleed: as páginas de auth são split-screen e usam height: 100%.
  return <div style={{ height: '100vh', overflow: 'hidden' }}>{children}</div>
}
