'use client'

import { Logo } from '@/components/domain/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CreditCard, FileText, Loader2, Lock, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
type SignUpForm = z.infer<typeof signUpSchema>

// Reutilizar o BrandPanel como componente local (mesmo código do sign-in)
function BrandPanel() {
  return (
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
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bgg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(243 75% 30%)" />
              <stop offset="100%" stopColor="hsl(250 70% 16%)" />
            </linearGradient>
            <pattern id="chains2" width="120" height="120" patternUnits="userSpaceOnUse">
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
          <rect width="100%" height="100%" fill="url(#bgg2)" />
          <rect width="100%" height="100%" fill="url(#chains2)" />
        </svg>
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
        <div style={{ position: 'relative' }}>
          <Logo size={22} light />
        </div>
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
            Comece a conectar sua cadeia de suprimentos.
          </h1>
          <p style={{ fontSize: 15.5, color: 'hsl(243 40% 86%)', marginTop: 18, lineHeight: 1.6 }}>
            Crie sua conta e convide sua equipe para gerenciar fornecedores, cotações e pedidos em
            um único lugar.
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
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpForm) {
    setLoading(true)
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        name: data.name,
        password: data.password,
      })
      if (result.error) {
        toast.error('Não foi possível criar a conta. Verifique os dados.')
        return
      }
      toast.success('Conta criada! Redirecionando...')
      router.push('/')
    } catch (error) {
      console.error('[SignUp]', error)
      toast.error('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Reutilizar o mesmo campo estilizado de sign-in
  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 6 }
  const labelStyle = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
  const iconStyle = {
    position: 'absolute' as const,
    left: 11,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'hsl(215 20% 65%)',
    pointerEvents: 'none' as const,
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'white' }}>
      <BrandPanel />
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
          <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 30 }}>
            <Logo size={22} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Criar sua conta
          </h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 6, marginBottom: 28 }}>
            Comece a organizar sua cadeia de suprimentos.
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={fieldStyle}>
              <Label htmlFor="name" style={labelStyle}>
                Nome completo
              </Label>
              <div style={{ position: 'relative' }}>
                <User size={15} strokeWidth={1.5} style={iconStyle} />
                <Input
                  id="name"
                  placeholder="Seu nome"
                  style={{ paddingLeft: 34 }}
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div style={fieldStyle}>
              <Label htmlFor="email" style={labelStyle}>
                E-mail corporativo
              </Label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} strokeWidth={1.5} style={iconStyle} />
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
            <div style={fieldStyle}>
              <Label htmlFor="password" style={labelStyle}>
                Senha
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} strokeWidth={1.5} style={iconStyle} />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo de 8 caracteres"
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
            <div style={fieldStyle}>
              <Label htmlFor="confirmPassword" style={labelStyle}>
                Confirmar senha
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} strokeWidth={1.5} style={iconStyle} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  style={{ paddingLeft: 34 }}
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-[42px] text-[14.5px]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar conta
            </Button>
          </form>
          <p
            style={{
              fontSize: 12,
              color: 'hsl(215 16% 47%)',
              marginTop: 16,
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade do
            Elos.
          </p>
          <div
            style={{
              textAlign: 'center',
              fontSize: 13.5,
              color: 'hsl(215 16% 47%)',
              marginTop: 18,
            }}
          >
            Já tem conta?{' '}
            <Link href="/sign-in" style={{ color: 'hsl(243 75% 59%)', fontWeight: 600 }}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
