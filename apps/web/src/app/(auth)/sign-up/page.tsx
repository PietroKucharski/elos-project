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

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const ICON =
  'pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-subtle-foreground'

// Reutilizar o BrandPanel como componente local (mesmo código do sign-in)
function BrandPanel() {
  return (
    <div className="auth-brand flex flex-1">
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[hsl(243_72%_22%)] px-[52px] py-12 text-white">
        <svg
          className="absolute inset-0 h-full w-full opacity-50"
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
        <div className="absolute -top-[120px] -right-[120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(243_80%_60%/0.35),transparent_70%)]" />
        <div className="relative">
          <Logo size={22} light />
        </div>
        <div className="relative max-w-[440px]">
          <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
            Comece a conectar sua cadeia de suprimentos.
          </h1>
          <p className="mt-[18px] text-[15.5px] leading-relaxed text-[hsl(243_40%_86%)]">
            Crie sua conta e convide sua equipe para gerenciar fornecedores, cotações e pedidos em
            um único lugar.
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

  return (
    <div className="flex h-full bg-card">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <div className="w-full max-w-[380px]">
          <div className="auth-mobile-logo mb-[30px] hidden">
            <Logo size={22} />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Criar sua conta</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">
            Comece a organizar sua cadeia de suprimentos.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className={FIELD}>
              <Label htmlFor="name" className={LABEL}>
                Nome completo
              </Label>
              <div className="relative">
                <User size={15} strokeWidth={1.5} className={ICON} />
                <Input
                  id="name"
                  placeholder="Seu nome"
                  className="pl-[34px]"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <span className="text-xs text-destructive" role="alert">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className={FIELD}>
              <Label htmlFor="email" className={LABEL}>
                E-mail corporativo
              </Label>
              <div className="relative">
                <Mail size={15} strokeWidth={1.5} className={ICON} />
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
            <div className={FIELD}>
              <Label htmlFor="password" className={LABEL}>
                Senha
              </Label>
              <div className="relative">
                <Lock size={15} strokeWidth={1.5} className={ICON} />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo de 8 caracteres"
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
            <div className={FIELD}>
              <Label htmlFor="confirmPassword" className={LABEL}>
                Confirmar senha
              </Label>
              <div className="relative">
                <Lock size={15} strokeWidth={1.5} className={ICON} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  className="pl-[34px]"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <span className="text-xs text-destructive" role="alert">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>
            <Button type="submit" disabled={loading} className="h-[42px] w-full text-[14.5px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>
          <p className="mt-4 text-center text-xs leading-normal text-muted-foreground">
            Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade do
            Elos.
          </p>
          <div className="mt-[18px] text-center text-[13.5px] text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/sign-in" className="font-semibold text-primary">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
