'use client'

import { Logo } from '@/components/domain/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CreditCard, FileText, Loader2, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type SignInForm = z.infer<typeof signInSchema>

export default function SignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(data: SignInForm) {
    setLoading(true)
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      })
      if (result.error) {
        toast.error('E-mail ou senha inválidos.')
        return
      }
      router.push('/')
    } catch (error) {
      console.error('[SignIn]', error)
      toast.error('Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full bg-card">
      {/* ── Painel de Marca (esquerda) ─────────────────────────────────── */}
      <div className="auth-brand flex flex-1">
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[hsl(243_72%_22%)] px-[52px] py-12 text-white">
          {/* Padrão geométrico de correntes */}
          <svg
            className="absolute inset-0 h-full w-full opacity-50"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(243 75% 30%)" />
                <stop offset="100%" stopColor="hsl(250 70% 16%)" />
              </linearGradient>
              <pattern id="chains" width="120" height="120" patternUnits="userSpaceOnUse">
                <rect
                  x="18"
                  y="50"
                  width="52"
                  height="34"
                  rx="17"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  opacity="0.16"
                />
                <rect
                  x="58"
                  y="50"
                  width="52"
                  height="34"
                  rx="17"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  opacity="0.16"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgg)" />
            <rect width="100%" height="100%" fill="url(#chains)" />
          </svg>
          {/* Glow radial */}
          <div className="absolute -top-[120px] -right-[120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(243_80%_60%/0.35),transparent_70%)]" />

          {/* Logo */}
          <div className="relative">
            <Logo size={22} light />
          </div>

          {/* Headline */}
          <div className="relative max-w-[440px]">
            <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
              Cada elo da sua cadeia de suprimentos, conectado.
            </h1>
            <p className="mt-[18px] text-[15.5px] leading-relaxed text-[hsl(243_40%_86%)]">
              Do cadastro do fornecedor ao pagamento da nota — cotações, pedidos e recebimentos
              rastreáveis em uma única plataforma.
            </p>
            <div className="mt-9 flex gap-[26px]">
              {[
                { label: 'Fornecedores', Icon: Building2 },
                { label: 'Cotações', Icon: FileText },
                { label: 'Pagamentos', Icon: CreditCard },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-[9px] text-[13.5px] text-[hsl(243_40%_88%)]"
                >
                  <Icon size={17} strokeWidth={1.5} /> {label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-[12.5px] text-[hsl(243_35%_75%)]">
            © 2026 Elos · Gestão de cadeia de suprimentos
          </div>
        </div>
      </div>

      {/* ── Formulário (direita) ───────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <div className="w-full max-w-[380px]">
          {/* Logo mobile (aparece apenas quando o painel some) */}
          <div className="auth-mobile-logo mb-[30px] hidden">
            <Logo size={22} />
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Entrar no Elos</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">
            Acesse o painel da sua empresa.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground-2">
                E-mail
              </Label>
              <div className="relative">
                <Mail
                  size={15}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-subtle-foreground"
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com.br"
                  className="pl-[34px]"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-foreground-2">
                Senha
              </Label>
              <div className="relative">
                <Lock
                  size={15}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-subtle-foreground"
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  className="pl-[34px]"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <span className="text-xs text-destructive" role="alert">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="flex items-center text-[13px]">
              <label className="flex cursor-pointer items-center gap-[7px] text-muted-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-[15px] w-[15px] accent-primary"
                />
                Manter conectado
              </label>
            </div>

            <Button type="submit" disabled={loading} className="h-[42px] w-full text-[14.5px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-[13.5px] text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/sign-up" className="font-semibold text-primary">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
