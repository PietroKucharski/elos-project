# Feature Spec — 1.4 App Shell e Company Switcher (Frontend)

**Fase:** 1 — Auth e Empresas  
**Unidade:** 1.4  
**Pré-requisito:** 1.3 concluído (endpoints `/v1/me/companies` e `/v1/companies/:cnpj`); 0.5 concluído (Next.js bootstrap, auth client, api client)  
**Commit convencional esperado:** `feat(web): add app shell layout with topbar, sidebar and company switcher`

---

## Objetivo

Criar a shell da aplicação e as páginas de autenticação seguindo o design do
protótipo **`Elos.html`** (arquivo de design aprovado). O layout usa o sistema
de tokens do design, com topbar + sidebar colapsável + área de conteúdo.
A rota protegida usa `/(app)/[cnpj]/...` — o CNPJ da empresa ativa vive na URL.
As páginas de sign-in e sign-up usam um layout split-screen com painel de marca
indigo escuro à esquerda e formulário à direita.

> **Referência de design:** `Elos.html` — protótipo entregue via Claude Design.
> Os arquivos `js/shell.jsx`, `js/pages-auth.jsx`, `js/ui.jsx` e `styles.css`
> do bundle são a fonte de verdade visual desta spec. Todo detalhe de medida,
> cor e comportamento abaixo vem diretamente desses arquivos.

---

## Escopo

### In

- Atualização de `globals.css` com token set completo do design
- Reestruturação do route group `(app)`: segmento dinâmico `[cnpj]`
- `(app)/layout.tsx` — redireciona para `/:cnpj/dashboard`
- `(app)/[cnpj]/layout.tsx` — shell com topbar + sidebar
- `(app)/[cnpj]/dashboard/page.tsx` — placeholder
- `(app)/[cnpj]/loading.tsx` e `(app)/[cnpj]/error.tsx`
- `(auth)/sign-in/page.tsx` — redesign com split-screen + painel de marca
- `(auth)/sign-up/page.tsx` — redesign com split-screen + painel de marca
- `components/domain/topbar.tsx`
- `components/domain/sidebar.tsx` — colapsável, agrupado
- `components/domain/company-switcher.tsx`
- `components/domain/user-menu.tsx`
- `components/domain/logo.tsx` — SVG de elos/correntes
- `lib/api.ts` — funções de fetch server-side e client-side tipadas
- shadcn: `dropdown-menu`, `avatar`, `separator`, `sheet`, `skeleton`

### Out

- Páginas de conteúdo reais (→ Fases 2+)
- Página de configurações (→ 1.5)
- Responsividade mobile completa (sidebar colapsável existe; breakpoint mobile é iteração futura)

---

## Estrutura de Rotas após esta unidade

```
app/
  layout.tsx                      ← raiz (fontes + Toaster) — já existe
  (auth)/
    layout.tsx                    ← já existe
    sign-in/page.tsx              ← modificar (split-screen + brand panel)
    sign-up/page.tsx              ← modificar (split-screen + brand panel)
  (app)/
    layout.tsx                    ← modificar: redireciona para /[cnpj]/dashboard
    page.tsx                      ← redirect intermediário
    no-company/page.tsx           ← criar: stub "aguardando acesso"
    [cnpj]/
      layout.tsx                  ← criar: shell (topbar + sidebar)
      loading.tsx                 ← criar
      error.tsx                   ← criar
      dashboard/
        page.tsx                  ← criar: placeholder
```

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  app/
    (auth)/
      sign-in/page.tsx                    ← modificar (design completo)
      sign-up/page.tsx                    ← modificar (design completo)
    (app)/
      layout.tsx                          ← modificar
      page.tsx                            ← modificar
      no-company/page.tsx                 ← criar
      [cnpj]/
        layout.tsx                        ← criar
        loading.tsx                       ← criar
        error.tsx                         ← criar
        dashboard/page.tsx                ← criar
  components/
    domain/
      logo.tsx                            ← criar
      topbar.tsx                          ← criar
      sidebar.tsx                         ← criar
      company-switcher.tsx                ← criar
      user-menu.tsx                       ← criar
  lib/
    api.ts                                ← criar
  app/globals.css                         ← modificar (tokens completos)
```

---

## Implementação Detalhada

### 1. Instalar shadcn components necessários

```bash
npx shadcn@latest add dropdown-menu avatar separator skeleton --filter web
```

---

### 2. Atualizar `globals.css` — token set completo do design

Substituir o bloco de tokens existente pelo conjunto completo extraído de
`styles.css` do protótipo. Manter a estrutura `@theme inline` do Tailwind v4.

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Surfaces */
  --color-background:        hsl(210 40% 98%);      /* slate-50 */
  --color-card:              hsl(0 0% 100%);
  --color-muted:             hsl(210 40% 96.1%);     /* slate-100 */
  --color-muted-2:           hsl(214 32% 93%);

  /* Text */
  --color-foreground:        hsl(222 47% 11%);       /* slate-900 */
  --color-foreground-2:      hsl(217 33% 17%);       /* slate-800 */
  --color-muted-foreground:  hsl(215 16% 47%);       /* slate-500 */
  --color-subtle-foreground: hsl(215 20% 65%);       /* slate-400 */

  /* Brand */
  --color-primary:           hsl(243 75% 59%);       /* indigo-500 */
  --color-primary-hover:     hsl(243 70% 50%);       /* indigo-600 */
  --color-primary-foreground: hsl(0 0% 100%);
  --color-primary-soft:      hsl(243 75% 96%);       /* indigo wash */
  --color-primary-soft-border: hsl(243 60% 88%);

  /* Borders */
  --color-border:            hsl(214 32% 91%);       /* slate-200 */
  --color-border-strong:     hsl(214 25% 84%);       /* slate-300 */
  --color-input:             hsl(214 32% 91%);
  --color-ring:              hsl(243 75% 59%);

  /* Semantic */
  --color-success:           hsl(142 71% 40%);
  --color-success-soft:      hsl(142 60% 95%);
  --color-success-border:    hsl(142 45% 82%);
  --color-warning:           hsl(33 92% 45%);
  --color-warning-soft:      hsl(38 92% 95%);
  --color-warning-border:    hsl(38 80% 80%);
  --color-destructive:       hsl(0 72% 51%);
  --color-destructive-soft:  hsl(0 86% 97%);
  --color-destructive-border: hsl(0 80% 89%);
  --color-destructive-foreground: hsl(0 0% 100%);
  --color-info:              hsl(199 89% 42%);
  --color-info-soft:         hsl(199 90% 95%);
  --color-info-border:       hsl(199 80% 82%);

  /* Radii */
  --radius:    0.5rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Shadows */
  --shadow-sm:     0 1px 2px 0 hsl(222 47% 11% / 0.04);
  --shadow-card:   0 1px 3px 0 hsl(222 47% 11% / 0.05), 0 1px 2px -1px hsl(222 47% 11% / 0.04);
  --shadow-pop:    0 4px 16px -2px hsl(222 47% 11% / 0.12), 0 2px 6px -2px hsl(222 47% 11% / 0.08);
  --shadow-drawer: -8px 0 28px -6px hsl(222 47% 11% / 0.16);

  /* Layout */
  --sidebar-w: 240px;
  --row-h: 52px;

  /* Fonts */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
}

/* --- Base --- */
*, *::before, *::after { box-sizing: border-box; }

html, body { height: 100%; }

body {
  font-family: var(--font-sans);
  background: hsl(210 40% 98%);
  color: hsl(222 47% 11%);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-size: 14px;
  line-height: 1.5;
  font-feature-settings: 'cv11', 'ss01';
}

::selection { background: hsl(243 75% 59% / 0.18); }

/* Scrollbars */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb {
  background: hsl(214 25% 84%);
  border-radius: 99px;
  border: 2px solid hsl(210 40% 98%);
}
::-webkit-scrollbar-thumb:hover { background: hsl(215 16% 65%); }
::-webkit-scrollbar-track { background: transparent; }

/* Focus ring */
:focus-visible {
  outline: 2px solid hsl(243 75% 59% / 0.55);
  outline-offset: 1px;
}

/* --- Animations --- */
@keyframes fadeIn      { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlayIn   { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheetIn     { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes popIn       { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes rowIn       { from { transform: translateY(5px); } to { transform: translateY(0); } }
@keyframes toastIn     { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes shimmer     { 100% { transform: translateX(100%); } }
@keyframes pageIn      { from { transform: translateY(7px); opacity: 0.6; } to { transform: none; opacity: 1; } }

.page-enter { animation: pageIn 0.26s cubic-bezier(0.32,0.72,0,1) both; }

/* Skeleton shimmer */
.skeleton {
  position: relative;
  overflow: hidden;
  background: hsl(210 40% 96.1%);
  border-radius: 0.375rem;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.6), transparent);
  transform: translateX(-100%);
  animation: shimmer 1.4s infinite;
}

/* Mono utility */
.font-mono-nums { font-variant-numeric: tabular-nums; }

/* Auth responsive: hide brand panel on narrow */
@media (max-width: 768px) {
  .auth-brand { display: none !important; }
  .auth-mobile-logo { display: block !important; }
}
```

---

### 3. `lib/api.ts` — funções de fetch tipadas

```typescript
// apps/web/src/lib/api.ts
import { headers } from 'next/headers'
import type { CompanyResponse, MyCompany, MemberResponse } from '@elos/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// ── Server-side (Server Components) ─────────────────────────────────────────
// Usa fetch nativo com cookie da sessão passado via headers()

export async function getMyCompaniesServer(): Promise<MyCompany[]> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/me/companies`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<MyCompany[]>
}

export async function getCompanyServer(cnpj: string): Promise<CompanyResponse | null> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<CompanyResponse>
}

export async function getMembersServer(cnpj: string): Promise<MemberResponse[]> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/members`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<MemberResponse[]>
}

export async function getAllCompaniesServer(): Promise<CompanyResponse[]> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/companies`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<CompanyResponse[]>
}
```

---

### 4. `components/domain/logo.tsx`

SVG fiel ao protótipo: dois retângulos sobrepostos representando elos de corrente.

```tsx
// apps/web/src/components/domain/logo.tsx
interface LogoProps {
  size?: number
  light?: boolean   // true = versão branca para fundo escuro (painel de marca)
}

export function Logo({ size = 18, light = false }: LogoProps) {
  const color = light ? '#fff' : 'hsl(243 75% 59%)'
  const textColor = light ? '#fff' : 'hsl(222 47% 11%)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg
        width={size + 8}
        height={size + 8}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        {/* Elo da esquerda */}
        <rect x="3.2" y="9.5" width="13" height="9" rx="4.5"
          stroke={color} strokeWidth="2.4" />
        {/* Elo da direita (sobreposição cria o "elo") */}
        <rect x="11.8" y="9.5" width="13" height="9" rx="4.5"
          stroke={light ? 'rgba(255,255,255,0.55)' : 'hsl(243 75% 59% / 0.45)'}
          strokeWidth="2.4" />
      </svg>
      <span style={{
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: textColor,
      }}>
        Elos
      </span>
    </div>
  )
}
```

---

### 5. Páginas de autenticação — redesign completo

#### `(auth)/sign-in/page.tsx`

```tsx
// apps/web/src/app/(auth)/sign-in/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, Building2, FileText, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Logo } from '@/components/domain/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signInSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type SignInForm = z.infer<typeof signInSchema>

export default function SignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<SignInForm>({
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
    <div style={{ display: 'flex', height: '100%', background: 'hsl(var(--color-card, 0 0% 100%))' }}>

      {/* ── Painel de Marca (esquerda) ─────────────────────────────────── */}
      <div className="auth-brand" style={{ flex: 1, display: 'flex' }}>
        <div style={{
          position: 'relative', flex: 1,
          background: 'hsl(243 72% 22%)',
          color: '#fff', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '48px 52px',
        }}>
          {/* Padrão geométrico de correntes */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
            preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(243 75% 30%)" />
                <stop offset="100%" stopColor="hsl(250 70% 16%)" />
              </linearGradient>
              <pattern id="chains" width="120" height="120" patternUnits="userSpaceOnUse">
                <rect x="18" y="50" width="52" height="34" rx="17" fill="none"
                  stroke="#fff" strokeWidth="2" opacity="0.16" />
                <rect x="58" y="50" width="52" height="34" rx="17" fill="none"
                  stroke="#fff" strokeWidth="2" opacity="0.16" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgg)" />
            <rect width="100%" height="100%" fill="url(#chains)" />
          </svg>
          {/* Glow radial */}
          <div style={{
            position: 'absolute', width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(243 80% 60% / 0.35), transparent 70%)',
            top: -120, right: -120,
          }} />

          {/* Logo */}
          <div style={{ position: 'relative' }}>
            <Logo size={22} light />
          </div>

          {/* Headline */}
          <div style={{ position: 'relative', maxWidth: 440 }}>
            <h1 style={{
              fontSize: 34, fontWeight: 700, lineHeight: 1.15,
              letterSpacing: '-0.02em', color: '#fff',
            }}>
              Cada elo da sua cadeia de suprimentos, conectado.
            </h1>
            <p style={{
              fontSize: 15.5, color: 'hsl(243 40% 86%)',
              marginTop: 18, lineHeight: 1.6,
            }}>
              Do cadastro do fornecedor ao pagamento da nota — cotações, pedidos
              e recebimentos rastreáveis em uma única plataforma.
            </p>
            <div style={{ display: 'flex', gap: 26, marginTop: 36 }}>
              {[
                { label: 'Fornecedores', Icon: Building2 },
                { label: 'Cotações',     Icon: FileText },
                { label: 'Pagamentos',   Icon: CreditCard },
              ].map(({ label, Icon }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  fontSize: 13.5, color: 'hsl(243 40% 88%)',
                }}>
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
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 32, overflowY: 'auto',
      }}>
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

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }}>
                E-mail
              </Label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} strokeWidth={1.5} style={{
                  position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                  color: 'hsl(215 20% 65%)', pointerEvents: 'none',
                }} />
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
              <Label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }}>
                Senha
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} strokeWidth={1.5} style={{
                  position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                  color: 'hsl(215 20% 65%)', pointerEvents: 'none',
                }} />
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'hsl(215 16% 47%)', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked
                  style={{ accentColor: 'hsl(243 75% 59%)', width: 15, height: 15 }} />
                Manter conectado
              </label>
              <a href="#" style={{ color: 'hsl(243 75% 59%)', fontWeight: 500 }}>
                Esqueci a senha
              </a>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-[42px] text-[14.5px]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'hsl(215 16% 47%)', marginTop: 24 }}>
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
```

#### `(auth)/sign-up/page.tsx`

Mesma estrutura split-screen com o mesmo `BrandPanel`. Apenas o formulário muda:

```tsx
// apps/web/src/app/(auth)/sign-up/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, User, Mail, Lock, Building2, FileText, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Logo } from '@/components/domain/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signUpSchema = z.object({
  name:            z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email:           z.string().email('E-mail inválido'),
  password:        z.string().min(8, 'Mínimo de 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
type SignUpForm = z.infer<typeof signUpSchema>

// Reutilizar o BrandPanel como componente local (mesmo código do sign-in)
function BrandPanel() {
  return (
    <div className="auth-brand" style={{ flex: 1, display: 'flex' }}>
      <div style={{
        position: 'relative', flex: 1,
        background: 'hsl(243 72% 22%)',
        color: '#fff', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 52px',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
          preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bgg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(243 75% 30%)" />
              <stop offset="100%" stopColor="hsl(250 70% 16%)" />
            </linearGradient>
            <pattern id="chains2" width="120" height="120" patternUnits="userSpaceOnUse">
              <rect x="18" y="50" width="52" height="34" rx="17" fill="none" stroke="#fff" strokeWidth="2" opacity="0.16" />
              <rect x="58" y="50" width="52" height="34" rx="17" fill="none" stroke="#fff" strokeWidth="2" opacity="0.16" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bgg2)" />
          <rect width="100%" height="100%" fill="url(#chains2)" />
        </svg>
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, hsl(243 80% 60% / 0.35), transparent 70%)', top: -120, right: -120 }} />
        <div style={{ position: 'relative' }}><Logo size={22} light /></div>
        <div style={{ position: 'relative', maxWidth: 440 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#fff' }}>
            Comece a conectar sua cadeia de suprimentos.
          </h1>
          <p style={{ fontSize: 15.5, color: 'hsl(243 40% 86%)', marginTop: 18, lineHeight: 1.6 }}>
            Crie sua conta e convide sua equipe para gerenciar fornecedores,
            cotações e pedidos em um único lugar.
          </p>
          <div style={{ display: 'flex', gap: 26, marginTop: 36 }}>
            {[
              { label: 'Fornecedores', Icon: Building2 },
              { label: 'Cotações',     Icon: FileText },
              { label: 'Pagamentos',   Icon: CreditCard },
            ].map(({ label, Icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'hsl(243 40% 88%)' }}>
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
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpForm) {
    setLoading(true)
    try {
      const result = await authClient.signUp.email({
        email: data.email, name: data.name, password: data.password,
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
  const iconStyle = { position: 'absolute' as const, left: 11, top: '50%', transform: 'translateY(-50%)', color: 'hsl(215 20% 65%)', pointerEvents: 'none' as const }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'white' }}>
      <BrandPanel />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 30 }}>
            <Logo size={22} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>Criar sua conta</h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 6, marginBottom: 28 }}>
            Comece a organizar sua cadeia de suprimentos.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={fieldStyle}>
              <Label htmlFor="name" style={labelStyle}>Nome completo</Label>
              <div style={{ position: 'relative' }}>
                <User size={15} strokeWidth={1.5} style={iconStyle} />
                <Input id="name" placeholder="Seu nome" style={{ paddingLeft: 34 }} {...register('name')} />
              </div>
              {errors.name && <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">{errors.name.message}</span>}
            </div>
            <div style={fieldStyle}>
              <Label htmlFor="email" style={labelStyle}>E-mail corporativo</Label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} strokeWidth={1.5} style={iconStyle} />
                <Input id="email" type="email" placeholder="voce@empresa.com.br" style={{ paddingLeft: 34 }} {...register('email')} />
              </div>
              {errors.email && <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">{errors.email.message}</span>}
            </div>
            <div style={fieldStyle}>
              <Label htmlFor="password" style={labelStyle}>Senha</Label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} strokeWidth={1.5} style={iconStyle} />
                <Input id="password" type="password" placeholder="Mínimo de 8 caracteres" style={{ paddingLeft: 34 }} {...register('password')} />
              </div>
              {errors.password && <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">{errors.password.message}</span>}
            </div>
            <div style={fieldStyle}>
              <Label htmlFor="confirmPassword" style={labelStyle}>Confirmar senha</Label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} strokeWidth={1.5} style={iconStyle} />
                <Input id="confirmPassword" type="password" placeholder="Repita a senha" style={{ paddingLeft: 34 }} {...register('confirmPassword')} />
              </div>
              {errors.confirmPassword && <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }} role="alert">{errors.confirmPassword.message}</span>}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-[42px] text-[14.5px]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar conta
            </Button>
          </form>
          <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginTop: 16, lineHeight: 1.5, textAlign: 'center' }}>
            Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade do Elos.
          </p>
          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'hsl(215 16% 47%)', marginTop: 18 }}>
            Já tem conta?{' '}
            <Link href="/sign-in" style={{ color: 'hsl(243 75% 59%)', fontWeight: 600 }}>Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 6. `(app)/layout.tsx` + `(app)/page.tsx` — redirect para primeiro cnpj

```tsx
// apps/web/src/app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  return <>{children}</>
}
```

```tsx
// apps/web/src/app/(app)/page.tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'
import { getMyCompaniesServer } from '@/lib/api'

export default async function AppIndexPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const companies = await getMyCompaniesServer()
  if (companies.length === 0) redirect('/no-company')

  redirect(`/${companies[0]!.cnpj}/dashboard`)
}
```

```tsx
// apps/web/src/app/(app)/no-company/page.tsx
import { Logo } from '@/components/domain/logo'

export default function NoCompanyPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'hsl(210 40% 98%)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size={22} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Aguardando acesso</h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', lineHeight: 1.6 }}>
          Sua conta ainda não foi vinculada a nenhuma empresa.
          Entre em contato com o administrador da plataforma.
        </p>
      </div>
    </div>
  )
}
```

---

### 7. `(app)/[cnpj]/layout.tsx` — Shell principal

```tsx
// apps/web/src/app/(app)/[cnpj]/layout.tsx
import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'
import { getCompanyServer, getMyCompaniesServer } from '@/lib/api'
import { Topbar } from '@/components/domain/topbar'
import { Sidebar } from '@/components/domain/sidebar'
import type { MyCompany } from '@elos/shared'

interface Props {
  children: React.ReactNode
  params: Promise<{ cnpj: string }>
}

export default async function CompanyLayout({ children, params }: Props) {
  const { cnpj } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const [company, myCompanies] = await Promise.all([
    getCompanyServer(cnpj),
    getMyCompaniesServer(),
  ])

  if (!company) notFound()

  const membership = myCompanies.find(c => c.cnpj === cnpj)
  if (!membership) notFound()  // AuthGuard da API já garantiu acesso; isso é proteção extra no SSR

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar
        companyName={company.name}
        companyCnpj={cnpj}
        myCompanies={myCompanies}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar cnpj={cnpj} role={membership.role} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'hsl(210 40% 98%)' }}>
          <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

---

### 8. `components/domain/topbar.tsx`

Fiel ao protótipo: 64px, card bg, menu de hamburguer toggle, logo, separadores,
company switcher, sino de notificações com ponto vermelho, user menu.

```tsx
'use client'

// apps/web/src/components/domain/topbar.tsx
import { useState } from 'react'
import { PanelLeft, Bell } from 'lucide-react'
import { Logo } from './logo'
import { CompanySwitcher } from './company-switcher'
import { UserMenu } from './user-menu'
import type { MyCompany } from '@elos/shared'

interface TopbarProps {
  companyName:  string
  companyCnpj:  string
  myCompanies:  MyCompany[]
  userName:     string
  userEmail:    string
}

// Contexto simples de colapso da sidebar — compartilhado via localStorage
export function Topbar({ companyName, companyCnpj, myCompanies, userName, userEmail }: TopbarProps) {
  function toggleSidebar() {
    const sidebar = document.getElementById('elos-sidebar')
    if (!sidebar) return
    const isCollapsed = sidebar.getAttribute('data-collapsed') === 'true'
    sidebar.setAttribute('data-collapsed', String(!isCollapsed))
    sidebar.style.width = !isCollapsed ? '64px' : '240px'
  }

  return (
    <header style={{
      height: 64, flexShrink: 0,
      background: 'hsl(0 0% 100%)',
      borderBottom: '1px solid hsl(214 32% 91%)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 18px 0 20px', gap: 16, zIndex: 30,
    }}>
      {/* Esquerda: toggle + logo + company switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={toggleSidebar}
          aria-label="Alternar menu lateral"
          style={{
            width: 36, height: 36, borderRadius: '0.375rem', border: 'none',
            background: 'transparent', color: 'hsl(215 16% 47%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <PanelLeft size={19} strokeWidth={1.6} />
        </button>

        {/* Separador */}
        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)' }} />

        <Logo size={18} />

        {/* Separador */}
        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)', margin: '0 2px' }} />

        <CompanySwitcher
          currentCnpj={companyCnpj}
          currentName={companyName}
          companies={myCompanies}
        />
      </div>

      {/* Direita: notificações + user menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          aria-label="Notificações"
          style={{
            position: 'relative', width: 38, height: 38,
            borderRadius: '0.375rem', border: 'none',
            background: 'transparent', color: 'hsl(215 16% 47%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Bell size={19} strokeWidth={1.6} />
          {/* Ponto de notificação */}
          <span style={{
            position: 'absolute', top: 8, right: 9,
            width: 7, height: 7, borderRadius: 99,
            background: 'hsl(0 72% 51%)',
            border: '1.5px solid hsl(0 0% 100%)',
          }} />
        </button>

        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)', margin: '0 4px' }} />

        <UserMenu name={userName} email={userEmail} currentCnpj={companyCnpj} />
      </div>
    </header>
  )
}
```

---

### 9. `components/domain/company-switcher.tsx`

Botão com ícone de prédio, nome da empresa, CNPJ em mono e chevron. Dropdown
com lista de empresas, check no ativo e separador para "Gerenciar empresas".

```tsx
'use client'

// apps/web/src/components/domain/company-switcher.tsx
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronsUpDown, Check, Settings } from 'lucide-react'
import type { MyCompany } from '@elos/shared'

interface CompanySwitcherProps {
  currentCnpj: string
  currentName: string
  companies:   MyCompany[]
}

export function CompanySwitcher({ currentCnpj, currentName, companies }: CompanySwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Trocar empresa"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 40, padding: '0 10px 0 12px',
          background: 'transparent',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.375rem', cursor: 'pointer',
          transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'hsl(243 75% 59% / 0.13)',
          color: 'hsl(243 75% 59%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={15} strokeWidth={1.6} />
        </div>
        <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            maxWidth: 180, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'hsl(222 47% 11%)',
          }}>
            {currentName}
          </div>
          <div style={{ fontSize: 10.5, color: 'hsl(215 16% 47%)', fontFamily: 'var(--font-mono, monospace)' }}>
            {currentCnpj}
          </div>
        </div>
        <ChevronsUpDown size={15} strokeWidth={1.6} style={{ color: 'hsl(215 20% 65%)', marginLeft: 2 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          width: 300,
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12), 0 2px 6px -2px hsl(222 47% 11% / 0.08)',
          padding: 5,
          animation: 'popIn .14s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '7px 9px 5px', fontSize: 11, fontWeight: 600,
            color: 'hsl(215 16% 47%)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Empresas
          </div>

          {companies.map(company => {
            const isActive = company.cnpj === currentCnpj
            return (
              <button key={company.cnpj}
                onClick={() => { setOpen(false); if (!isActive) router.push(`/${company.cnpj}/dashboard`) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '8px 9px',
                  borderRadius: '0.375rem', border: 'none',
                  background: 'transparent', textAlign: 'left',
                  cursor: 'pointer', transition: 'background .12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Check size={15} strokeWidth={2}
                  style={{ color: 'hsl(243 75% 59%)', opacity: isActive ? 1 : 0, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500, color: 'hsl(222 47% 11%)', lineHeight: 1.3 }}>
                    {company.companyName}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'hsl(215 16% 47%)', fontFamily: 'monospace', lineHeight: 1.3 }}>
                    {company.cnpj} · {company.role}
                  </div>
                </div>
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'hsl(214 32% 91%)', margin: '5px -5px' }} />

          {/* Gerenciar empresas (SUPER_ADMIN) */}
          <button
            onClick={() => { setOpen(false); router.push('/admin/companies') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '8px 9px',
              borderRadius: '0.375rem', border: 'none',
              background: 'transparent', textAlign: 'left',
              fontSize: 13.5, color: 'hsl(222 47% 11%)',
              cursor: 'pointer', transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Settings size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)', flexShrink: 0 }} />
            Gerenciar empresas
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### 10. `components/domain/user-menu.tsx`

```tsx
'use client'

// apps/web/src/components/domain/user-menu.tsx
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Paleta de cores para avatar (igual ao protótipo)
const PALETTE = [
  '243 75% 59%', '199 89% 42%', '142 60% 40%',
  '262 60% 55%', '20 85% 52%',  '330 65% 52%',
]
function avatarColor(name: string): string {
  return PALETTE[name.charCodeAt(0) % PALETTE.length] ?? PALETTE[0]!
}

interface UserMenuProps {
  name:        string
  email:       string
  currentCnpj: string
}

export function UserMenu({ name, email, currentCnpj }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const color = avatarColor(name)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function handleSignOut() {
    try {
      await authClient.signOut()
      router.push('/sign-in')
    } catch (error) {
      console.error('[UserMenu.signOut]', error)
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  const menuItemBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 9,
    width: '100%', padding: '8px 9px',
    borderRadius: '0.375rem', border: 'none',
    background: 'transparent', textAlign: 'left',
    fontSize: 13.5, cursor: 'pointer', transition: 'background .12s',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        style={{ border: 'none', background: 'transparent', borderRadius: 999, padding: 1, cursor: 'pointer' }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 999,
          background: `hsl(${color} / 0.13)`,
          color: `hsl(${color})`,
          border: `1px solid hsl(${color} / 0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, letterSpacing: '0.01em',
        }}>
          {getInitials(name)}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
          width: 230,
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12), 0 2px 6px -2px hsl(222 47% 11% / 0.08)',
          padding: 5,
          animation: 'popIn .14s ease',
        }}>
          {/* Nome do usuário */}
          <div style={{ padding: '7px 9px 5px', fontSize: 11, fontWeight: 600, color: 'hsl(215 16% 47%)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {name}
          </div>
          <div style={{ padding: '0 9px 7px', fontSize: 12.5, color: 'hsl(215 16% 47%)' }}>
            {email}
          </div>

          <div style={{ height: 1, background: 'hsl(214 32% 91%)', margin: '5px -5px' }} />

          <button style={{ ...menuItemBase, color: 'hsl(222 47% 11%)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <User size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} /> Meu perfil
          </button>

          <button
            onClick={() => { setOpen(false); router.push(`/${currentCnpj}/settings`) }}
            style={{ ...menuItemBase, color: 'hsl(222 47% 11%)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Settings size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} /> Configurações
          </button>

          <div style={{ height: 1, background: 'hsl(214 32% 91%)', margin: '5px -5px' }} />

          <button
            onClick={handleSignOut}
            style={{ ...menuItemBase, color: 'hsl(0 72% 51%)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(0 86% 97%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={15} strokeWidth={1.6} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### 11. `components/domain/sidebar.tsx`

Sidebar colapsável (240px ↔ 64px) com navegação agrupada, indicador de item
ativo (barra esquerda + fundo indigo suave), badges e card de ajuda no rodapé.

```tsx
'use client'

// apps/web/src/components/domain/sidebar.tsx
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Building2, Package, ClipboardList, ShoppingCart,
  ClipboardCheck, Warehouse, AlertTriangle, Receipt, CreditCard,
  Truck, Users, ScrollText, Settings, HelpCircle,
} from 'lucide-react'
import type { Role } from '@elos/shared'

interface SidebarProps {
  cnpj: string
  role: Role
}

interface NavItem {
  key:   string
  label: string
  icon:  React.ElementType
  roles: Role[]
  badge?: number
}

const NAV_GROUPS = [
  {
    group: 'Principal',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE', 'ANALISTA_FINANCEIRO', 'TRANSPORTADOR'] },
    ] as NavItem[],
  },
  {
    group: 'Compras',
    items: [
      { key: 'suppliers',       label: 'Fornecedores',    icon: Building2,      roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR'] },
      { key: 'products',        label: 'Produtos',         icon: Package,        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE'] },
      { key: 'quotations',      label: 'Cotações',         icon: ClipboardList,  roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR'] },
      { key: 'purchase-orders', label: 'Pedidos de Compra', icon: ShoppingCart,  roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE'] },
    ] as NavItem[],
  },
  {
    group: 'Operações',
    items: [
      { key: 'receipts',          label: 'Recebimentos',       icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ALMOXARIFE'] },
      { key: 'warehouses',        label: 'Armazéns',            icon: Warehouse,      roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ALMOXARIFE'] },
      { key: 'non-conformities',  label: 'Não-Conformidades',   icon: AlertTriangle,  roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE'] },
    ] as NavItem[],
  },
  {
    group: 'Financeiro',
    items: [
      { key: 'invoices',  label: 'Notas Fiscais', icon: Receipt,     roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO'] },
      { key: 'payments',  label: 'Pagamentos',    icon: CreditCard,  roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO'] },
    ] as NavItem[],
  },
  {
    group: 'Logística',
    items: [
      { key: 'logistics', label: 'Transportes', icon: Truck, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'TRANSPORTADOR'] },
    ] as NavItem[],
  },
  {
    group: 'Administração',
    items: [
      { key: 'settings', label: 'Configurações', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'] },
      { key: 'users',    label: 'Usuários',       icon: Users,    roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'] },
      { key: 'audit',    label: 'Audit Log',      icon: ScrollText, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'] },
    ] as NavItem[],
  },
]

export function Sidebar({ cnpj, role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      id="elos-sidebar"
      data-collapsed="false"
      style={{
        width: 'var(--sidebar-w, 240px)',
        flexShrink: 0,
        background: 'hsl(210 40% 98%)',
        borderRight: '1px solid hsl(214 32% 91%)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
        transition: 'width .2s ease',
        padding: '14px 12px',
      }}
    >
      {NAV_GROUPS.map(section => {
        const visible = section.items.filter(item => item.roles.includes(role))
        if (visible.length === 0) return null

        return (
          <div key={section.group} style={{ marginBottom: 6 }}>
            {/* Label do grupo — oculto quando colapsado via CSS calc */}
            <div style={{
              padding: '10px 10px 6px',
              fontSize: 10.5, fontWeight: 700,
              color: 'hsl(215 20% 65%)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {section.group}
            </div>

            {visible.map(item => {
              const href = `/${cnpj}/${item.key}`
              const isActive = pathname.startsWith(href)
              const Icon = item.icon

              return (
                <Link key={item.key} href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    width: '100%', height: 38, padding: '0 10px',
                    borderRadius: '0.375rem',
                    position: 'relative', marginBottom: 2,
                    textDecoration: 'none',
                    background: isActive ? 'hsl(243 75% 96%)' : 'transparent',
                    color: isActive ? 'hsl(243 75% 59%)' : 'hsl(217 33% 17%)',
                    fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                    transition: 'background .12s, color .12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'hsl(210 40% 96.1%)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Indicador de item ativo: barra vertical esquerda */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: -12, top: 7, bottom: 7,
                      width: 3,
                      background: 'hsl(243 75% 59%)',
                      borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <Icon size={19} strokeWidth={isActive ? 1.9 : 1.6} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  {item.badge != null && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      minWidth: 19, height: 19, padding: '0 5px',
                      borderRadius: 99,
                      background: 'hsl(0 72% 51%)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )
      })}

      {/* Card de ajuda no rodapé */}
      <div style={{ marginTop: 'auto', padding: 12 }}>
        <div style={{
          background: 'hsl(210 40% 96.1%)',
          borderRadius: '0.5rem',
          padding: '12px 13px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <HelpCircle size={17} strokeWidth={1.5} style={{ color: 'hsl(215 16% 47%)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              Central de ajuda
            </div>
            <div style={{ fontSize: 11.5, color: 'hsl(215 16% 47%)', marginTop: 1 }}>
              Guias e atalhos do Elos
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

---

### 12. `(app)/[cnpj]/loading.tsx` e `error.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/loading.tsx
export default function CompanyLoading() {
  return (
    <div style={{ padding: 24 }}>
      {/* Skeleton de page header */}
      <div style={{ marginBottom: 22 }}>
        <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 18 }} />
      </div>
      {/* Skeleton de tabela */}
      <div style={{
        background: 'white', border: '1px solid hsl(214 32% 91%)',
        borderRadius: '0.5rem', overflow: 'hidden',
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, padding: '14px 16px',
            borderBottom: i < 4 ? '1px solid hsl(214 32% 91%)' : 'none',
          }}>
            <div className="skeleton" style={{ width: 160, height: 16 }} />
            <div className="skeleton" style={{ width: 100, height: 16 }} />
            <div className="skeleton" style={{ width: 80, height: 16, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

```tsx
'use client'

// apps/web/src/app/(app)/[cnpj]/error.tsx
import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error('[CompanyError]', error) }, [error])

  return (
    <div style={{
      display: 'flex', height: '100%', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{
          background: 'hsl(0 86% 97%)',
          border: '1px solid hsl(0 80% 89%)',
          borderRadius: '0.5rem',
          padding: '14px 16px',
          display: 'flex', gap: 12, marginBottom: 16,
        }}>
          <AlertCircle size={18} strokeWidth={1.6} style={{ color: 'hsl(0 72% 51%)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(222 47% 11%)', marginBottom: 4 }}>
              Erro ao carregar a página
            </div>
            <div style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
              Ocorreu um problema inesperado. Tente novamente ou entre em contato com o suporte.
            </div>
          </div>
        </div>
        <Button onClick={reset} variant="outline" className="w-full">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
```

---

### 13. `(app)/[cnpj]/dashboard/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/dashboard/page.tsx
interface Props { params: Promise<{ cnpj: string }> }

export default async function DashboardPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: 'hsl(222 47% 11%)' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
          Empresa <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{cnpj}</span>
        </p>
      </div>
      <div style={{
        border: '2px dashed hsl(214 32% 91%)',
        borderRadius: '0.5rem',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'hsl(215 16% 47%)',
        fontSize: 14,
      }}>
        KPIs e gráficos chegam na Fase 7 — Audit Log e Administração.
      </div>
    </div>
  )
}
```

---

## Verificação

- [ ] `pnpm --filter web build` compila sem erros de TypeScript
- [ ] `pnpm type-check` verde
- [ ] `pnpm lint` limpo
- [ ] Design (requer inspecção visual):
  - [ ] Sign-in: painel indigo à esquerda com padrão de correntes SVG, formulário à direita, layout split 50/50
  - [ ] Sign-in: campos com ícone à esquerda (Mail, Lock), focus ring indigo
  - [ ] Sign-in: em mobile (< 768px) o painel some e o logo aparece acima do formulário
  - [ ] Topbar: 64px, fundo branco, borda inferior slate-200, logo SVG dos elos visível
  - [ ] Topbar: company switcher exibe ícone de prédio + nome + CNPJ em mono + chevrons
  - [ ] Topbar: sino de notificações com ponto vermelho no canto
  - [ ] Topbar: avatar com iniciais e cor gerada pelo nome
  - [ ] Company switcher dropdown: check no item ativo, CNPJ e papel em mono abaixo do nome
  - [ ] User menu dropdown: nome + email no topo, "Sair" em vermelho com hover vermelho
  - [ ] Sidebar: grupos de navegação com labels maiúsculas (Principal, Compras, Operações…)
  - [ ] Sidebar: item ativo com fundo `primary-soft` + texto indigo + barra vertical esquerda de 3px
  - [ ] Sidebar: card de "Central de ajuda" no rodapé
  - [ ] Sidebar: botão de toggle (PanelLeft) colapsa/expande entre 64px e 240px
  - [ ] Skeleton de loading corresponde ao layout da página
- [ ] Fluxo (requer API + banco vivos):
  - [ ] Login → redireciona para `/<cnpj>/dashboard` da primeira empresa
  - [ ] Company switcher → troca URL e recarrega o layout com a nova empresa
  - [ ] "Sair" no user menu → redireciona para `/sign-in`
  - [ ] CNPJ inválido na URL → Next.js 404
  - [ ] Usuário sem empresa → `/no-company`
