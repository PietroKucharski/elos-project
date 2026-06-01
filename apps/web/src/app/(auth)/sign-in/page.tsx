'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Schema inline — migrará para @elos/shared na Fase 1 (AuthModule)
const signInSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.'),
})

type SignInFormData = z.infer<typeof signInSchema>

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(data: SignInFormData) {
    setIsLoading(true)
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: '/',
      })

      if (result.error) {
        toast.error(result.error.message ?? 'Credenciais inválidas.')
        return
      }

      toast.success('Login realizado com sucesso!')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Entrar</CardTitle>
        <CardDescription>Acesse sua conta Elos com e-mail e senha.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
              autoComplete="current-password"
              placeholder="••••••••"
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full mt-2">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <a href="/sign-up" className="text-primary underline-offset-4 hover:underline">
              Criar conta
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
