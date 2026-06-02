import { Logo } from '@/components/domain/logo'

export default function NoCompanyPage() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(210 40% 98%)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size={22} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Aguardando acesso</h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', lineHeight: 1.6 }}>
          Sua conta ainda não foi vinculada a nenhuma empresa. Entre em contato com o administrador
          da plataforma.
        </p>
      </div>
    </div>
  )
}
