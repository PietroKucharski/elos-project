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
    <div
      style={{ display: 'flex', height: '100%', background: 'hsl(var(--color-card, 0 0% 100%))' }}
    >
      {/* ── Painel de Marca (esquerda) ─────────────────────────────────── */}
      <div className="auth-brand" style={{ flex: 1, display: 'flex' }}>
        <div
          style={{
            position: 'relative',
            flex: 1,
            background: 'hsl(243 72% 22%)',
            color: '#fff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 52px',
          }}
        >
          {/* Padrão geométrico de correntes */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
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
          <div
            style={{
              position: 'absolute',
              width: 420,
              height: 420,
              borderRadius: '50%',
              background: 'radial-gradient(circle, hsl(243 80% 60% / 0.35), transparent 70%)',
              top: -120,
              right: -120,
            }}
          />

          {/* Logo */}
          <div style={{ position: 'relative' }}>
            <Logo size={22} light />
          </div>

          {/* Headline */}
          <div style={{ position: 'relative', maxWidth: 440 }}>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: '#fff',
              }}
            >
              Cada elo da sua cadeia de suprimentos, conectado.
            </h1>
            <p
              style={{
                fontSize: 15.5,
                color: 'hsl(243 40% 86%)',
                marginTop: 18,
                lineHeight: 1.6,
              }}
            >
              Do cadastro do fornecedor ao pagamento da nota — cotações, pedidos e recebimentos
              rastreáveis em uma única plataforma.
            </p>
            <div style={{ display: 'flex', gap: 26, marginTop: 36 }}>
              {[
                { label: 'Fornecedores', Icon: Building2 },
                { label: 'Cotações', Icon: FileText },
                { label: 'Pagamentos', Icon: CreditCard },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    fontSize: 13.5,
                    color: 'hsl(243 40% 88%)',
                  }}
                >
                  <Icon size={17} strokeWidth={1.5} /> {label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', fontSize: 12.5, color: 'hsl(243 35% 75%)' }}>
            © 2026 Elos · Gestão de cadeia de suprimentos
          </div>
        </div>
      </div>

      {/* ── Formulário (direita) ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo mobile (aparece apenas quando o painel some) */}
          <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 30 }}>
            <Logo size={22} />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Entrar no Elos
          </h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 6, marginBottom: 28 }}>
            Acesse o painel da sua empresa.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label
                htmlFor="email"
                style={{ fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }}
              >
                E-mail
              </Label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  strokeWidth={1.5}
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'hsl(215 20% 65%)',
                    pointerEvents: 'none',
                  }}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com.br"
                  style={{ paddingLeft: 34 }}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label
                htmlFor="password"
                style={{ fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }}
              >
                Senha
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  strokeWidth={1.5}
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'hsl(215 20% 65%)',
                    pointerEvents: 'none',
                  }}
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  style={{ paddingLeft: 34 }}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  color: 'hsl(215 16% 47%)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ accentColor: 'hsl(243 75% 59%)', width: 15, height: 15 }}
                />
                Manter conectado
              </label>
              <Link href="/sign-in" style={{ color: 'hsl(243 75% 59%)', fontWeight: 500 }}>
                Esqueci a senha
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-[42px] text-[14.5px]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div
            style={{
              textAlign: 'center',
              fontSize: 13.5,
              color: 'hsl(215 16% 47%)',
              marginTop: 24,
            }}
          >
            Não tem uma conta?{' '}
            <Link href="/sign-up" style={{ color: 'hsl(243 75% 59%)', fontWeight: 600 }}>
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
