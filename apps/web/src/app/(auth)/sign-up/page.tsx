'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Schema inline — migrará para @elos/shared na Fase 1 (AuthModule)
const signUpSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })

type SignUpFormData = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpFormData) {
    setIsLoading(true)
    try {
      const result = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: '/',
      })

      if (result.error) {
        toast.error(result.error.message ?? 'Erro ao criar conta.')
        return
      }

      toast.success('Conta criada! Bem-vindo ao Elos.')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Erro ao criar conta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Criar conta</CardTitle>
        <CardDescription>Preencha os dados para acessar o Elos.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Nome completo <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="João Silva"
              aria-describedby={errors.name ? 'name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              E-mail <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com.br"
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">
              Senha <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">
              Confirmar senha <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p id="confirm-error" className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full mt-2">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? 'Criando conta...' : 'Criar conta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <a href="/sign-in" className="text-primary underline-offset-4 hover:underline">
              Entrar
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
