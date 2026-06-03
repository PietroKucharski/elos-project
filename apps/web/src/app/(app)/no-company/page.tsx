import { Logo } from '@/components/domain/logo'

export default function NoCompanyPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="max-w-[380px] text-center">
        <div className="mb-5 flex justify-center">
          <Logo size={22} />
        </div>
        <h1 className="mb-2 text-lg font-semibold">Aguardando acesso</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sua conta ainda não foi vinculada a nenhuma empresa. Entre em contato com o administrador
          da plataforma.
        </p>
      </div>
    </div>
  )
}
