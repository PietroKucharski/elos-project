# Feature Spec — 0.5 Bootstrap do Frontend (Next.js)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 0 — Fundação  
**Unidade:** 0.5  
**Pré-requisito:** 0.4 (API rodando — `/api/auth/*` e `/health` respondem)  
**Commit convencional esperado:** `feat(web): bootstrap nextjs with auth, tailwind and shadcn`

---

## Objetivo

Configurar a aplicação Next.js 15 com toda a infraestrutura de UI: design tokens
do Elos em `globals.css`, cliente Better-Auth para o browser, cliente HTTP `ky`
com cookie automático, layout root com Toaster, layout protegido com verificação
de sessão server-side, e páginas de sign-in e sign-up funcionais. Ao final desta
unidade, um usuário consegue fazer login, acessar uma área protegida e receber
um redirect para sign-in ao acessar sem sessão.

---

## Escopo

### In

- Scaffold Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn/ui
- `globals.css` com todos os tokens de cor do `ui-context.md`
- `lib/auth-client.ts` — Better-Auth client para Client Components
- `lib/server-auth.ts` — proxy que verifica sessão via API (Server Components)
- `lib/api-client.ts` — `ky` pré-configurado com `credentials: 'include'`
- `app/layout.tsx` — root layout (fontes Inter + Geist Mono, Toaster)
- `app/(auth)/sign-in/page.tsx` — formulário de login funcional
- `app/(auth)/sign-up/page.tsx` — formulário de cadastro funcional
- `app/(app)/layout.tsx` — layout protegido com redirect server-side
- `app/(app)/page.tsx` — página placeholder pós-login
- `next.config.ts` com `output: 'standalone'`
- Componentes shadcn/ui iniciais: `button`, `input`, `label`, `form`, `card`, `sonner`

### Out (não implementar nesta unidade)

- Topbar e Sidebar reais (→ Fase 1, junto com company switcher)
- Rotas de empresa `/(app)/[cnpj]/` (→ Fase 1)
- Schemas Zod de auth em `packages/shared` (→ junto com AuthModule na Fase 1)
- Testes de componente com RTL (→ junto com cada componente de domínio)
- Playwright E2E (→ fases posteriores)

---

## Arquivos a Criar / Modificar

```
apps/web/
  next.config.ts                              ← criar
  tsconfig.json                               ← criar
  src/
    app/
      globals.css                             ← criar
      layout.tsx                              ← criar (root)
      (auth)/
        layout.tsx                            ← criar (layout das páginas públicas)
        sign-in/
          page.tsx                            ← criar
        sign-up/
          page.tsx                            ← criar
      (app)/
        layout.tsx                            ← criar (protegido)
        page.tsx                              ← criar (placeholder)
    components/
      ui/                                     ← gerado pelo shadcn CLI
    lib/
      auth-client.ts                          ← criar
      server-auth.ts                          ← criar
      api-client.ts                           ← criar
```

---

## Implementação Detalhada

### 1. Instalar dependências

```bash
# Next.js 15 + React 19
pnpm add next@15 react@19 react-dom@19 --filter web

# TypeScript
pnpm add -D typescript @types/node @types/react @types/react-dom --filter web

# Tailwind CSS 4
pnpm add tailwindcss@4 @tailwindcss/postcss --filter web

# Better-Auth client
pnpm add better-auth --filter web

# HTTP client
pnpm add ky --filter web

# Formulários
pnpm add react-hook-form @hookform/resolvers zod --filter web

# Ícones
pnpm add lucide-react --filter web

# Fontes
pnpm add @fontsource-variable/inter geist --filter web
```

Após instalar as dependências, inicializar o shadcn/ui:

```bash
# Na raiz de apps/web
npx shadcn@latest init
```

Opções recomendadas no wizard:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**
- Tailwind config: Deixar o CLI configurar

Adicionar os componentes iniciais:

```bash
npx shadcn@latest add button input label form card sonner
```

---

### 2. `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Obrigatório para o Dockerfile da unidade 0.2
  output: 'standalone',

  // Permite importar de packages/shared no monorepo
  transpilePackages: ['@elos/shared'],

  experimental: {
    // React 19 server actions
    serverActions: { allowedOrigins: ['localhost:3333'] },
  },
}

export default nextConfig
```

---

### 3. `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### 4. `src/app/globals.css`

Todos os tokens de cor do `ui-context.md` definidos como CSS custom properties.
A integração Tailwind CSS 4 / shadcn/ui usa `@theme inline` para mapear as
variáveis para classes utilitárias.

```css
@import "tailwindcss";

/* ─── Mapeamento Tailwind CSS 4 → CSS variables ─────────────────────────── */
@theme inline {
  --color-background:       var(--background);
  --color-foreground:       var(--foreground);
  --color-card:             var(--card);
  --color-card-foreground:  var(--card-foreground);
  --color-primary:          var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary:        var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:            var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent:           var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive:      var(--destructive);
  --color-border:           var(--border);
  --color-input:            var(--input);
  --color-ring:             var(--ring);
  --color-success:          var(--success);
  --color-warning:          var(--warning);
  --color-info:             var(--info);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
}

/* ─── Tokens de cor Elos (light mode — sem dark mode na v1) ─────────────── */
@layer base {
  :root {
    /* Superfícies */
    --background:          0 0% 98%;          /* slate-50  */
    --foreground:          222 47% 11%;        /* slate-900 */
    --card:                0 0% 100%;          /* white     */
    --card-foreground:     222 47% 11%;
    --popover:             0 0% 100%;
    --popover-foreground:  222 47% 11%;

    /* Accent primário — Indigo */
    --primary:             243 75% 59%;        /* indigo-500 */
    --primary-foreground:  0 0% 100%;

    /* Superfície secundária */
    --secondary:           210 40% 96%;        /* slate-100 */
    --secondary-foreground: 222 47% 11%;

    /* Muted */
    --muted:               210 40% 96%;        /* slate-100 */
    --muted-foreground:    215 16% 47%;        /* slate-500 */

    /* Accent (hover states) */
    --accent:              210 40% 96%;
    --accent-foreground:   222 47% 11%;

    /* Destrutivo / Erro */
    --destructive:         0 84% 60%;          /* red-500   */
    --destructive-foreground: 0 0% 100%;

    /* Bordas e inputs */
    --border:              214 32% 91%;        /* slate-200 */
    --input:               214 32% 91%;
    --ring:                243 75% 59%;        /* indigo-500 */

    /* Status customizados */
    --success:             142 71% 45%;        /* green-500 */
    --warning:             38 92% 50%;         /* amber-500 */
    --info:                199 89% 48%;        /* sky-500   */

    /* Border radius base */
    --radius: 0.5rem;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

> **Sem dark mode na v1** — invariante do `ui-context.md`. Não adicionar
> `@media (prefers-color-scheme: dark)` nem `class="dark"`.

---

### 5. `src/app/layout.tsx` — root layout

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const geistMono = localFont({
  src: '../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Elos — Gestão de Cadeia de Suprimentos',
  description: 'Plataforma B2B de supply chain para o mercado brasileiro.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
```

---

### 6. `src/app/(auth)/layout.tsx` — layout das páginas públicas

Páginas de auth são centralizadas na tela, sem sidebar ou topbar.

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {children}
    </div>
  )
}
```

---

### 7. `src/lib/server-auth.ts`

Proxy server-side que verifica a sessão chamando o endpoint do Better-Auth na
API. Não há conexão direta ao banco no frontend — toda autenticação passa pela API.

O shape do retorno espelha o que o Better-Auth retorna em `/api/auth/get-session`.

```typescript
import { headers } from 'next/headers'

export type AuthSession = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
    emailVerified: boolean
    createdAt: string
    updatedAt: string
  }
  session: {
    id: string
    expiresAt: string
    token: string
  }
} | null

/**
 * Verifica a sessão do usuário fazendo uma requisição à API.
 * Deve ser chamado apenas em Server Components ou Route Handlers.
 *
 * Uso:
 *   const session = await auth.api.getSession({ headers: await headers() })
 *   if (!session) redirect('/sign-in')
 */
export const auth = {
  api: {
    async getSession(opts?: {
      headers?: Headers | ReturnType<typeof headers> extends Promise<infer T> ? T : never
    }): Promise<AuthSession> {
      const reqHeaders = opts?.headers ?? (await headers())
      const cookie = reqHeaders.get('cookie') ?? ''

      if (!cookie) return null

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`,
          {
            headers: { cookie },
            cache: 'no-store',
          },
        )

        if (!response.ok) return null
        return response.json() as Promise<AuthSession>
      } catch {
        return null
      }
    },
  },
}
```

---

### 8. `src/lib/auth-client.ts` — Better-Auth client (browser)

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // BETTER_AUTH_URL aponta para a API onde o Better-Auth está montado
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
```

---

### 9. `src/lib/api-client.ts` — HTTP client com ky

Pré-configurado com `prefixUrl` da API e `credentials: 'include'` para enviar
o cookie de sessão automaticamente em todas as requisições.

```typescript
import ky, { type KyInstance } from 'ky'

export const api: KyInstance = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  hooks: {
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401 && typeof window !== 'undefined') {
          window.location.href = '/sign-in'
        }
      },
    ],
  },
  retry: {
    limit: 1,
    statusCodes: [408, 502, 503, 504],
  },
})
```

> **Uso nos Client Components:**
> ```typescript
> const data = await api.get('v1/companies/:cnpj/suppliers').json()
> ```
> O prefixo `/v1` deve ser incluído nas chamadas — `api` apenas adiciona o host.

---

### 10. `src/app/(app)/layout.tsx` — layout protegido

Verifica a sessão server-side. Sem sessão → redirect para `/sign-in`.
O conteúdo real de topbar e sidebar virá na Fase 1 (company switcher, navegação).

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar — implementado na Fase 1 */}
      <header className="h-16 border-b bg-card flex items-center px-6">
        <span className="font-semibold text-primary">Elos</span>
        <span className="ml-auto text-sm text-muted-foreground">
          {session.user.name}
        </span>
      </header>

      {/* Shell principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — implementado na Fase 1 */}
        <aside className="w-60 border-r bg-background hidden lg:block" />

        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

### 11. `src/app/(app)/page.tsx` — placeholder pós-login

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/sign-in')

  // Fase 1: redirecionar para a empresa ativa do usuário
  // Por ora, exibe uma mensagem de boas-vindas
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Bem-vindo, {session.user.name}!</h1>
      <p className="text-sm text-muted-foreground">
        Selecione uma empresa para começar. (Fase 1)
      </p>
    </div>
  )
}
```

---

### 12. `src/app/(auth)/sign-in/page.tsx`

Client Component com react-hook-form + Zod. Após login bem-sucedido, redireciona
para `/` (que o AppLayout redirecionará para a empresa ativa na Fase 1).

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn } from '@/lib/auth-client'

// Schema inline — migrará para @elos/shared na Fase 1 (AuthModule)
const signInSchema = z.object({
  email:    z.string().email('E-mail inválido.'),
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
        email:    data.email,
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
        <CardDescription>
          Acesse sua conta Elos com e-mail e senha.
        </CardDescription>
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
```

---

### 13. `src/app/(auth)/sign-up/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUp } from '@/lib/auth-client'

// Schema inline — migrará para @elos/shared na Fase 1 (AuthModule)
const signUpSchema = z
  .object({
    name:            z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.'),
    email:           z.string().email('E-mail inválido.'),
    password:        z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.'),
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
        name:     data.name,
        email:    data.email,
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
        <CardDescription>
          Preencha os dados para acessar o Elos.
        </CardDescription>
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
```

---

## Checklist de Conclusão

- [ ] `pnpm dev --filter web` inicia sem erros de TypeScript ou módulo
- [ ] `pnpm build --filter web` compila com `output: 'standalone'` sem erros
- [ ] `GET /` sem sessão → redirect para `/sign-in`
- [ ] `GET /sign-in` exibe o formulário de login corretamente
- [ ] Login com `admin@elos.com.br` + `Elos@2024!` → redirect para `/` com toast de sucesso
- [ ] `GET /` com sessão → exibe "Bem-vindo, Super Admin!"
- [ ] `GET /sign-up` exibe o formulário de cadastro
- [ ] Cadastro com dados inválidos → erros de validação Zod exibidos inline
- [ ] Paleta de cores visualmente correta: fundo `slate-50`, accent `indigo-500`
- [ ] Fonte Inter carregada (sem FOUT visível)
- [ ] Toaster exibe notificações no canto superior direito
- [ ] `GET /sign-in` com sessão ativa → não redireciona (página é pública)
- [ ] Erros de rede na API → toast de erro exibido, sem crash da página

---

## Invariantes Verificadas

| Invariante                                      | Como esta unidade cumpre |
| ----------------------------------------------- | ------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` nunca no frontend   | Não existe referência em nenhum arquivo do `apps/web` |
| Nenhum valor hex hardcoded fora de globals.css  | Todos os estilos usam classes Tailwind ou `var(--*)` |
| `components/ui/*` nunca editado manualmente     | Gerado via `npx shadcn@latest add` — não tocar |
| Sem dark mode na v1                             | Nenhuma classe `dark:` nem `@media prefers-color-scheme` |
| `catch {}` vazio proibido                       | Todos os blocos catch nos forms fazem `toast.error()` |
| Sessão verificada server-side no layout         | `(app)/layout.tsx` é async e faz redirect antes de renderizar |

---

## Notas de Implementação

**Por que `lib/server-auth.ts` faz fetch para a API em vez de conectar ao banco?**
O frontend não tem acesso direto ao banco — toda a lógica de autenticação vive na
API (NestJS + Better-Auth). O `server-auth.ts` é um proxy fino que repassa o
cookie da requisição para o endpoint `/api/auth/get-session`. Isso mantém a
separação de responsabilidades e evita uma segunda conexão postgres no frontend.

**Por que schemas Zod estão inline nos formulários e não em `@elos/shared`?**
Os schemas de auth para o contrato de API (payload de sign-in/sign-up enviado ao
backend) serão definidos em `packages/shared` na Fase 1, junto com o AuthModule
da API. Os schemas inline nesta unidade são apenas para validação client-side dos
formulários — eles podem ter regras diferentes (ex: `confirmPassword` não existe
na API). Ao criar o `AuthModule`, mover o subconjunto compartilhável para shared.

**Por que `api.get('v1/...')` e não `api.get('/v1/...')`?**
O `ky` com `prefixUrl` concatena diretamente — a barra inicial seria interpretada
como caminho absoluto, sobrescrevendo o `prefixUrl`. Use sempre paths relativos
nas chamadas ao `api`.

**Por que o redirect pós-login vai para `/` e não para `/:cnpj/dashboard`?**
O CNPJ da empresa ativa do usuário só é conhecido após a Fase 1 implementar a
seleção de empresa (company switcher). O placeholder em `(app)/page.tsx` aguarda
essa lógica. Na Fase 1, o `AppLayout` ou a `page.tsx` raiz fará o redirect para
a empresa padrão do usuário.
