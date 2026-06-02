# Feature Spec — 1.5 Companies Management UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 1 — Auth e Empresas  
**Unidade:** 1.5  
**Pré-requisito:** 1.4 concluído (shell + company switcher + `lib/api.ts`); 1.2 e 1.3 concluídos (endpoints de empresa e membros)  
**Commit convencional esperado:** `feat(web): add company settings and members management ui`

---

## Objetivo

Criar as páginas de gestão de empresas e membros seguindo o design do protótipo
`Elos.html`. O layout de settings usa **duas colunas** (card de logo à esquerda
+ formulário à direita). O convite de membros usa um **Sheet (drawer lateral)**
com preview das permissões do papel — igual ao padrão `UsersList` do protótipo.

- **ADMIN_EMPRESA**: `/[cnpj]/settings` (dados da empresa) e `/[cnpj]/settings/members` (gestão de membros).
- **SUPER_ADMIN**: `/admin/companies` (listar e criar empresas).

---

## Escopo

### In

- `(app)/[cnpj]/settings/page.tsx` — layout 2 colunas: card logo + form
- `(app)/[cnpj]/settings/members/page.tsx` — tabela de membros + invite drawer
- `(app)/admin/layout.tsx` — shell de plataforma (SUPER_ADMIN) com `<Logo>`
- `(app)/admin/companies/page.tsx` — listagem de empresas
- `(app)/admin/companies/new/page.tsx` — formulário de criação
- `components/domain/company-form.tsx` — formulário reutilizável (inline styles)
- `components/domain/members-table.tsx` — avatar + badge + kebab menu
- `components/domain/invite-member-sheet.tsx` — Sheet com preview de permissões
- Adição de shadcn: `table`, `sheet`, `badge`, `select`, `alert-dialog`
- Extensão de `lib/api.ts` com funções client-side de mutação

### Out (não implementar nesta unidade)

- Upload real de logo de empresa (campo visual existe, funcionalidade → Fase 6)
- Tela de perfil pessoal do usuário (→ Fase 7)
- Paginação server-side (volume pequeno na v1 — client-side suficiente)
- E-mail de boas-vindas para membro (requer serviço de e-mail — Open Question)

---

## Estrutura de Rotas após esta unidade

```
app/
  (app)/
    [cnpj]/
      settings/
        page.tsx           ← criar (2 colunas: logo + form)
        members/
          page.tsx         ← criar (tabela + invite sheet)
    admin/
      layout.tsx           ← criar (SUPER_ADMIN, usa <Logo>)
      companies/
        page.tsx           ← criar
        new/page.tsx       ← criar
```

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  app/
    (app)/
      [cnpj]/
        settings/
          page.tsx                      ← criar
          members/
            page.tsx                    ← criar
      admin/
        layout.tsx                      ← criar
        companies/
          page.tsx                      ← criar
          new/page.tsx                  ← criar
  components/
    domain/
      company-form.tsx                  ← criar
      members-table.tsx                 ← criar
      invite-member-sheet.tsx           ← criar
  lib/
    api.ts                              ← modificar (adicionar funções client-side)
```

---

## Implementação Detalhada

### 1. Instalar shadcn components necessários

```bash
npx shadcn@latest add table sheet badge select alert-dialog --filter web
```

> `dialog` **não** é instalado — o convite usa `sheet` (drawer lateral).
> `skeleton` e `dropdown-menu` já foram instalados em 1.4.

---

### 2. Extensão de `lib/api.ts` — funções client-side de mutação

As funções server-side (`getMyCompaniesServer`, `getCompanyServer`,
`getMembersServer`, `getAllCompaniesServer`) já foram definidas em 1.4.
Adicionar apenas as funções client-side que fazem mutações via `ky`:

```typescript
// Adicionar ao final de apps/web/src/lib/api.ts

import type {
  CreateCompanyDto,
  UpdateCompanyDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from '@elos/shared'

// Importação dinâmica de apiClient evita que ky seja bundleado em Server Components
async function client() {
  const { apiClient } = await import('@/lib/api-client')
  return apiClient
}

export async function updateCompany(cnpj: string, data: UpdateCompanyDto): Promise<CompanyResponse> {
  return (await client()).patch(`v1/companies/${cnpj}`, { json: data }).json()
}

export async function createCompany(data: CreateCompanyDto): Promise<CompanyResponse> {
  return (await client()).post('v1/companies', { json: data }).json()
}

export async function inviteMember(cnpj: string, data: InviteMemberDto): Promise<MemberResponse> {
  return (await client()).post(`v1/companies/${cnpj}/members`, { json: data }).json()
}

export async function updateMemberRole(
  cnpj: string,
  userId: string,
  data: UpdateMemberRoleDto,
): Promise<void> {
  await (await client()).patch(`v1/companies/${cnpj}/members/${userId}`, { json: data })
}

export async function removeMember(cnpj: string, userId: string): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/members/${userId}`)
}
```

---

### 3. `components/domain/company-form.tsx`

Formulário reutilizável em modo `'create'` (com campo CNPJ) ou `'edit'` (CNPJ
readonly). Usa inline styles alinhados ao sistema de tokens do protótipo.

```tsx
'use client'

// apps/web/src/components/domain/company-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createCompanySchema, updateCompanySchema } from '@elos/shared'
import type { CreateCompanyDto, UpdateCompanyDto, CompanyResponse } from '@elos/shared'
import { Button } from '@/components/ui/button'
import { createCompany, updateCompany } from '@/lib/api'

type FormMode = 'create' | 'edit'

interface CompanyFormProps {
  mode:          FormMode
  cnpj?:         string
  defaultValues?: Partial<CreateCompanyDto>
  onSuccess?:    (company: CompanyResponse) => void
}

// Estilos reutilizáveis alinhados ao protótipo
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const inputStyle: React.CSSProperties = {
  height: 38, padding: '0 12px', fontSize: 13.5,
  borderRadius: '0.375rem', border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)', color: 'hsl(222 47% 11%)',
  outline: 'none', transition: 'border .15s, box-shadow .15s', width: '100%',
}
const inputReadonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'hsl(210 40% 96.1%)',
  fontFamily: 'monospace',
  cursor: 'not-allowed',
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }
const sectionTitle: React.CSSProperties = {
  fontSize: 15.5, fontWeight: 600, color: 'hsl(222 47% 11%)',
  marginBottom: 14, marginTop: 4,
}

function inputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'hsl(243 75% 59%)'
  e.target.style.boxShadow   = '0 0 0 3px hsl(243 75% 59% / 0.13)'
}
function inputBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'hsl(214 32% 91%)'
  e.target.style.boxShadow   = 'none'
}

export function CompanyForm({ mode, cnpj, defaultValues, onSuccess }: CompanyFormProps) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const schema = mode === 'create' ? createCompanySchema : updateCompanySchema
  const { register, handleSubmit, formState: { errors } } = useForm<CreateCompanyDto | UpdateCompanyDto>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  })

  async function onSubmit(data: CreateCompanyDto | UpdateCompanyDto) {
    setLoading(true)
    try {
      if (mode === 'create') {
        const company = await createCompany(data as CreateCompanyDto)
        toast.success('Empresa criada com sucesso.')
        router.push(`/${company.cnpj}/dashboard`)
      } else {
        const company = await updateCompany(cnpj!, data as UpdateCompanyDto)
        toast.success('Dados atualizados com sucesso.')
        onSuccess?.(company)
        router.refresh()
      }
    } catch (error) {
      console.error('[CompanyForm.onSubmit]', error)
      toast.error('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 780 }}>

      {/* ── Identificação ────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>Identificação</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Razão Social <span style={{ color: 'hsl(0 72% 51%)' }}>*</span></label>
            <input {...register('name')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            {errors.name && <span style={errorStyle} role="alert">{errors.name.message}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nome Fantasia</label>
            <input {...register('tradeName')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              CNPJ {mode === 'create' && <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>}
            </label>
            {mode === 'create' ? (
              <>
                <input {...register('cnpj')} style={inputStyle} placeholder="14 dígitos sem formatação"
                  maxLength={14} onFocus={inputFocus} onBlur={inputBlur} />
                {errors.cnpj && <span style={errorStyle} role="alert">{errors.cnpj.message}</span>}
              </>
            ) : (
              <input value={cnpj} readOnly style={inputReadonlyStyle} />
            )}
          </div>
        </div>
      </div>

      {/* ── Contato ──────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>Contato</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>E-mail</label>
            <input type="email" {...register('email')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            {errors.email && <span style={errorStyle} role="alert">{errors.email.message}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Telefone</label>
            <input {...register('phone')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
        </div>
      </div>

      {/* ── Endereço ─────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>Endereço</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <div style={{ ...fieldStyle, gridColumn: 'span 4' }}>
            <label style={labelStyle}>Logradouro</label>
            <input {...register('street')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Número</label>
            <input {...register('number')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 3' }}>
            <label style={labelStyle}>Complemento</label>
            <input {...register('complement')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 3' }}>
            <label style={labelStyle}>Cidade</label>
            <input {...register('city')} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 1' }}>
            <label style={labelStyle}>UF</label>
            <input {...register('state')} maxLength={2} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>CEP</label>
            <input {...register('zipCode')} maxLength={8} placeholder="8 dígitos"
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 size={15} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />}
          {mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
```

---

### 4. `(app)/[cnpj]/settings/page.tsx` — layout 2 colunas

Fiel ao design: coluna esquerda com card de logo (placeholder), coluna direita
com card de dados + botão "Salvar" no cabeçalho do card.

```tsx
// apps/web/src/app/(app)/[cnpj]/settings/page.tsx
import { Upload } from 'lucide-react'
import { getCompanyServer } from '@/lib/api'
import { CompanyForm } from '@/components/domain/company-form'
import { Button } from '@/components/ui/button'

interface Props { params: Promise<{ cnpj: string }> }

export default async function SettingsPage({ params }: Props) {
  const { cnpj }  = await params
  const company   = await getCompanyServer(cnpj)

  const cardStyle: React.CSSProperties = {
    background: 'hsl(0 0% 100%)',
    border: '1px solid hsl(214 32% 91%)',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
    padding: 20,
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
          Configurações da Empresa
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
          Dados cadastrais e identidade da empresa.
        </p>
      </div>

      {/* Two-column layout (identical to protótipo Settings page) */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: Logo card */}
        <div style={cardStyle}>
          <div style={{
            fontSize: 15.5, fontWeight: 600, marginBottom: 14,
            color: 'hsl(222 47% 11%)',
          }}>Logo</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Avatar placeholder com inicial da empresa */}
            <div style={{
              width: 96, height: 96, borderRadius: '0.75rem',
              background: 'hsl(243 75% 96%)', color: 'hsl(243 75% 59%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34, fontWeight: 700,
              border: '1px solid hsl(243 60% 88%)',
            }}>
              {company?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Upload size={14} strokeWidth={1.5} style={{ marginRight: 6 }} />
              Enviar logo
            </Button>
            <p style={{ fontSize: 11.5, color: 'hsl(215 16% 47%)', textAlign: 'center', lineHeight: 1.5 }}>
              PNG ou SVG, até 2 MB.<br />Recomendado 256×256px.
            </p>
          </div>
        </div>

        {/* Right: form card */}
        <div style={cardStyle}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 18,
          }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              Dados cadastrais
            </span>
          </div>
          <CompanyForm
            mode="edit"
            cnpj={cnpj}
            defaultValues={company ?? undefined}
          />
        </div>
      </div>
    </div>
  )
}
```

---

### 5. `components/domain/invite-member-sheet.tsx`

Sheet (drawer lateral) fiel ao padrão `UsersList` do protótipo: campos de
e-mail, nome e papel + card de preview das permissões do papel selecionado.

```tsx
'use client'

// apps/web/src/components/domain/invite-member-sheet.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, UserPlus, Check } from 'lucide-react'
import { inviteMemberSchema } from '@elos/shared'
import type { InviteMemberDto } from '@elos/shared'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { inviteMember } from '@/lib/api'

const ROLE_LABELS: Record<string, string> = {
  ADMIN_EMPRESA:       'Administrador',
  COMPRADOR:           'Comprador',
  ALMOXARIFE:          'Almoxarife',
  ANALISTA_FINANCEIRO: 'Analista Financeiro',
  TRANSPORTADOR:       'Transportador',
}

// Permissões exibidas no card de preview (igual ao protótipo ROLE_PERMS)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN_EMPRESA:       ['Gerenciar usuários e fornecedores', 'Configurações da empresa', 'Todos os módulos'],
  COMPRADOR:           ['Criar cotações e pedidos', 'Aprovar fornecedores', 'Gerenciar produtos'],
  ALMOXARIFE:          ['Registrar recebimentos', 'Movimentações de estoque', 'Abrir não-conformidades'],
  ANALISTA_FINANCEIRO: ['Validar notas fiscais', 'Registrar pagamentos', 'Conciliação financeira'],
  TRANSPORTADOR:       ['Acompanhar entregas', 'Atualizar status de transporte'],
}

interface InviteMemberSheetProps {
  cnpj: string
}

const inputStyle: React.CSSProperties = {
  height: 38, padding: '0 12px', fontSize: 13.5,
  borderRadius: '0.375rem', border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)', color: 'hsl(222 47% 11%)',
  outline: 'none', transition: 'border .15s, box-shadow .15s', width: '100%',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }

function inputFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'hsl(243 75% 59%)'
  e.target.style.boxShadow   = '0 0 0 3px hsl(243 75% 59% / 0.13)'
}
function inputBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'hsl(214 32% 91%)'
  e.target.style.boxShadow   = 'none'
}

export function InviteMemberSheet({ cnpj }: InviteMemberSheetProps) {
  const router  = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } =
    useForm<InviteMemberDto>({ resolver: zodResolver(inviteMemberSchema) })

  const selectedRole = watch('role')
  const permissions  = selectedRole ? ROLE_PERMISSIONS[selectedRole] ?? [] : []

  async function onSubmit(data: InviteMemberDto) {
    setLoading(true)
    try {
      await inviteMember(cnpj, data)
      toast.success(`${data.name} foi convidado com sucesso.`)
      reset()
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('[InviteMemberSheet.onSubmit]', error)
      toast.error('Erro ao convidar membro. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus size={15} strokeWidth={1.5} style={{ marginRight: 6 }} />
        Convidar usuário
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent style={{ width: 440, display: 'flex', flexDirection: 'column' }}>
          <SheetHeader>
            <SheetTitle style={{ fontSize: 17, fontWeight: 600 }}>Convidar usuário</SheetTitle>
            <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 3 }}>
              O usuário receberá acesso imediato com a senha definida pelo administrador.
            </p>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ flex: 1, overflowY: 'auto', padding: '22px 0', display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Nome <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              <input {...register('name')} placeholder="Nome completo"
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              {errors.name && <span style={errorStyle} role="alert">{errors.name.message}</span>}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                E-mail <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              <input type="email" {...register('email')} placeholder="pessoa@empresa.com.br"
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              {errors.email && <span style={errorStyle} role="alert">{errors.email.message}</span>}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Papel na empresa <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              {/* Select nativo estilizado — igual ao protótipo ui.jsx Select */}
              <div style={{ position: 'relative' }}>
                <select {...register('role')}
                  style={{
                    ...inputStyle, appearance: 'none',
                    padding: '0 32px 0 12px', cursor: 'pointer',
                  }}
                  onFocus={inputFocus} onBlur={inputBlur}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione um papel</option>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(215 16% 47%)', pointerEvents: 'none' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {errors.role && <span style={errorStyle} role="alert">{errors.role.message}</span>}
            </div>

            {/* Card de preview das permissões do papel */}
            {permissions.length > 0 && (
              <div style={{
                background: 'hsl(210 40% 96.1%)',
                borderRadius: '0.375rem', padding: 14,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, color: 'hsl(222 47% 11%)' }}>
                  Permissões do papel
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {permissions.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'hsl(217 33% 17%)' }}>
                      <Check size={14} strokeWidth={2} style={{ color: 'hsl(142 71% 40%)', flexShrink: 0 }} />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          <SheetFooter style={{ padding: '16px 0 0', borderTop: '1px solid hsl(214 32% 91%)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading && <Loader2 size={15} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />}
              Enviar convite
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

---

### 6. `components/domain/members-table.tsx`

Fiel ao padrão `UsersList` do protótipo: **avatar + nome + email** em uma
célula, Badge de papel (sem select inline), kebab menu com "Editar papel" e
"Remover da empresa" + AlertDialog de confirmação de remoção.

```tsx
'use client'

// apps/web/src/components/domain/members-table.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, XCircle, Shield } from 'lucide-react'
import type { MemberResponse, UpdateMemberRoleDto } from '@elos/shared'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { updateMemberRole, removeMember } from '@/lib/api'

// Cores de badge por papel — fiel ao STATUS_MAP do protótipo
const ROLE_BADGE: Record<string, { fg: string; bg: string; bd: string }> = {
  SUPER_ADMIN:         { fg: 'var(--color-primary)',     bg: 'var(--color-primary-soft)',      bd: 'var(--color-primary-soft-border)' },
  ADMIN_EMPRESA:       { fg: 'var(--color-primary)',     bg: 'var(--color-primary-soft)',      bd: 'var(--color-primary-soft-border)' },
  COMPRADOR:           { fg: 'var(--color-info)',        bg: 'var(--color-info-soft)',         bd: 'var(--color-info-border)' },
  ALMOXARIFE:          { fg: 'var(--color-info)',        bg: 'var(--color-info-soft)',         bd: 'var(--color-info-border)' },
  ANALISTA_FINANCEIRO: { fg: 'var(--color-info)',        bg: 'var(--color-info-soft)',         bd: 'var(--color-info-border)' },
  TRANSPORTADOR:       { fg: 'var(--color-muted-foreground)', bg: 'var(--color-muted)', bd: 'var(--color-border)' },
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:         'Super Admin',
  ADMIN_EMPRESA:       'Administrador',
  COMPRADOR:           'Comprador',
  ALMOXARIFE:          'Almoxarife',
  ANALISTA_FINANCEIRO: 'Analista Financeiro',
  TRANSPORTADOR:       'Transportador',
}

const ASSIGNABLE_ROLES = ['ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE', 'ANALISTA_FINANCEIRO', 'TRANSPORTADOR'] as const

// Avatar com iniciais, igual ao componente Avatar do protótipo
const PALETTE = ['243 75% 59%', '199 89% 42%', '142 60% 40%', '262 60% 55%', '20 85% 52%', '330 65% 52%']
function avatarColor(name: string) { return PALETTE[name.charCodeAt(0) % PALETTE.length] ?? PALETTE[0]! }
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

interface MembersTableProps {
  cnpj:          string
  members:       MemberResponse[]
  currentUserId: string
}

// Mini dropdown de papel (abre ao clicar em "Editar papel" no kebab)
function RoleEditor({ cnpj, userId, currentRole, onClose }: { cnpj: string; userId: string; currentRole: string; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function change(role: typeof ASSIGNABLE_ROLES[number]) {
    setLoading(true)
    try {
      await updateMemberRole(cnpj, userId, { role })
      toast.success('Papel atualizado.')
      onClose()
      router.refresh()
    } catch (error) {
      console.error('[RoleEditor]', error)
      toast.error('Erro ao atualizar papel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 60,
      width: 210, background: 'hsl(0 0% 100%)',
      border: '1px solid hsl(214 32% 91%)', borderRadius: '0.5rem',
      boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12)',
      padding: 5, animation: 'popIn .14s ease',
    }}>
      <div style={{ padding: '7px 9px 5px', fontSize: 11, fontWeight: 600, color: 'hsl(215 16% 47%)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        Alterar papel
      </div>
      {ASSIGNABLE_ROLES.map(role => (
        <button key={role} onClick={() => change(role)} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 9px',
            borderRadius: '0.375rem', border: 'none',
            background: 'transparent', textAlign: 'left',
            fontSize: 13.5, color: 'hsl(222 47% 11%)', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {ROLE_LABELS[role]}
          {role === currentRole && <Shield size={13} style={{ color: 'hsl(243 75% 59%)' }} />}
        </button>
      ))}
    </div>
  )
}

export function MembersTable({ cnpj, members, currentUserId }: MembersTableProps) {
  const router = useRouter()
  const [menuOpen,   setMenuOpen]   = useState<string | null>(null)
  const [editRole,   setEditRole]   = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null)
  const [loadingId,  setLoadingId]  = useState<string | null>(null)

  async function handleRemove() {
    if (!removeTarget) return
    setLoadingId(removeTarget.userId)
    try {
      await removeMember(cnpj, removeTarget.userId)
      toast.success(`${removeTarget.name} foi removido da empresa.`)
      setRemoveTarget(null)
      router.refresh()
    } catch (error) {
      console.error('[MembersTable.handleRemove]', error)
      toast.error('Não foi possível remover o membro.')
    } finally {
      setLoadingId(null)
    }
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '0 16px 10px',
    fontSize: 11.5, fontWeight: 600, color: 'hsl(215 16% 47%)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid hsl(214 32% 91%)',
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={thStyle}>Usuário</th>
              <th style={thStyle}>Papel</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '48px 16px', color: 'hsl(215 16% 47%)', fontSize: 14 }}>
                  Nenhum membro encontrado.
                </td>
              </tr>
            )}
            {members.map((member, index) => {
              const isSelf       = member.userId === currentUserId
              const isSuperAdmin = member.role === 'SUPER_ADMIN'
              const isLoading    = loadingId === member.userId
              const color        = avatarColor(member.user.name)
              const badge        = ROLE_BADGE[member.role] ?? ROLE_BADGE['TRANSPORTADOR']!

              return (
                <tr key={member.id} style={{
                  borderBottom: '1px solid hsl(214 32% 91%)',
                  animation: `rowIn .3s ease ${Math.min(index * 0.025, 0.3)}s both`,
                }}>
                  {/* Usuário: avatar + nome + email */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 999, flexShrink: 0,
                        background: `hsl(${color} / 0.13)`, color: `hsl(${color})`,
                        border: `1px solid hsl(${color} / 0.2)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600,
                      }}>
                        {getInitials(member.user.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
                          {member.user.name}
                          {isSelf && (
                            <span style={{ fontSize: 11, color: 'hsl(215 16% 47%)', fontWeight: 400, marginLeft: 6 }}>
                              (você)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'hsl(215 16% 47%)' }}>
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Badge de papel */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 22, padding: '0 8px', borderRadius: 999,
                      background: `hsl(${badge!.bg})`,
                      color: `hsl(${badge!.fg})`,
                      border: `1px solid hsl(${badge!.bd})`,
                      fontSize: 11.5, fontWeight: 600,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: `hsl(${badge!.fg})` }} />
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>

                  {/* Kebab menu */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {!isSuperAdmin && (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === member.userId ? null : member.userId)}
                          disabled={isLoading}
                          aria-label={`Ações para ${member.user.name}`}
                          style={{
                            width: 30, height: 30, borderRadius: '0.375rem', border: 'none',
                            background: 'transparent', color: 'hsl(215 16% 47%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background .12s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === member.userId && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
                            width: 210, background: 'hsl(0 0% 100%)',
                            border: '1px solid hsl(214 32% 91%)', borderRadius: '0.5rem',
                            boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12)',
                            padding: 5, animation: 'popIn .14s ease',
                          }}>
                            {!isSelf && (
                              <button
                                onClick={() => { setMenuOpen(null); setEditRole(member.userId) }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 9,
                                  width: '100%', padding: '8px 9px',
                                  borderRadius: '0.375rem', border: 'none',
                                  background: 'transparent', fontSize: 13.5,
                                  color: 'hsl(222 47% 11%)', cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'hsl(210 40% 96.1%)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Pencil size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} />
                                Editar papel
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setMenuOpen(null)
                                setRemoveTarget({ userId: member.userId, name: member.user.name })
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 9,
                                width: '100%', padding: '8px 9px',
                                borderRadius: '0.375rem', border: 'none',
                                background: 'transparent', fontSize: 13.5,
                                color: 'hsl(0 72% 51%)', cursor: 'pointer',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(0 86% 97%)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <XCircle size={15} strokeWidth={1.6} /> Remover da empresa
                            </button>
                          </div>
                        )}

                        {/* Role editor dropdown (aparece após "Editar papel") */}
                        {editRole === member.userId && (
                          <RoleEditor
                            cnpj={cnpj}
                            userId={member.userId}
                            currentRole={member.role}
                            onClose={() => setEditRole(null)}
                          />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* AlertDialog de confirmação de remoção */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{removeTarget?.name}</strong> da empresa?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              style={{ background: 'hsl(0 72% 51%)', color: '#fff' }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

---

### 7. `(app)/[cnpj]/settings/members/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/settings/members/page.tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'
import { getMembersServer } from '@/lib/api'
import { MembersTable } from '@/components/domain/members-table'
import { InviteMemberSheet } from '@/components/domain/invite-member-sheet'

interface Props { params: Promise<{ cnpj: string }> }

export default async function MembersPage({ params }: Props) {
  const { cnpj } = await params
  const [session, members] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getMembersServer(cnpj),
  ])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Usuários</h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            Membros da empresa e seus papéis de acesso.
          </p>
        </div>
        <InviteMemberSheet cnpj={cnpj} />
      </div>

      <div style={{
        background: 'hsl(0 0% 100%)',
        border: '1px solid hsl(214 32% 91%)',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
        overflow: 'hidden',
      }}>
        <MembersTable
          cnpj={cnpj}
          members={members}
          currentUserId={session?.user.id ?? ''}
        />
      </div>
    </div>
  )
}
```

---

### 8. `(app)/admin/layout.tsx` — usa `<Logo>` do design

```tsx
// apps/web/src/app/(app)/admin/layout.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/server-auth'
import { getMyCompaniesServer } from '@/lib/api'
import { Logo } from '@/components/domain/logo'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, companies] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getMyCompaniesServer(),
  ])

  if (!session) redirect('/sign-in')

  const isSuperAdmin = companies.some(c => c.role === 'SUPER_ADMIN')
  if (!isSuperAdmin) redirect('/')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Shell simplificada para área de plataforma — sem sidebar de empresa */}
      <header style={{
        height: 64, flexShrink: 0,
        background: 'hsl(0 0% 100%)',
        borderBottom: '1px solid hsl(214 32% 91%)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 14,
      }}>
        <Logo size={18} />
        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)' }} />
        <span style={{ fontSize: 13.5, color: 'hsl(215 16% 47%)' }}>
          Administração da Plataforma
        </span>
      </header>
      <main style={{ flex: 1, overflowY: 'auto', background: 'hsl(210 40% 98%)' }}>
        <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
```

---

### 9. `(app)/admin/companies/page.tsx`

```tsx
// apps/web/src/app/(app)/admin/companies/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAllCompaniesServer } from '@/lib/api'
import { Button } from '@/components/ui/button'

export default async function AdminCompaniesPage() {
  const companies = await getAllCompaniesServer()

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '0 16px 10px',
    fontSize: 11.5, fontWeight: 600, color: 'hsl(215 16% 47%)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid hsl(214 32% 91%)',
  }
  const tdStyle: React.CSSProperties = { padding: '13px 16px', borderBottom: '1px solid hsl(214 32% 91%)' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Empresas</h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">
            <Plus size={15} strokeWidth={1.5} style={{ marginRight: 6 }} />
            Nova Empresa
          </Link>
        </Button>
      </div>

      <div style={{
        background: 'hsl(0 0% 100%)',
        border: '1px solid hsl(214 32% 91%)',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={thStyle}>Razão Social</th>
              <th style={thStyle}>CNPJ</th>
              <th style={thStyle}>Cidade / UF</th>
              <th style={thStyle}>Criada em</th>
              <th style={{ ...thStyle, width: 96 }} />
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '48px 16px', color: 'hsl(215 16% 47%)', fontSize: 14 }}>
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
            {companies.map(company => (
              <tr key={company.id}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>{company.name}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: 'hsl(215 16% 47%)' }}>{company.cnpj}</td>
                <td style={{ ...tdStyle, color: 'hsl(215 16% 47%)' }}>
                  {[company.city, company.state].filter(Boolean).join(' / ') || '—'}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: 'hsl(215 16% 47%)' }}>
                  {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${company.cnpj}/dashboard`}>Acessar</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

### 10. `(app)/admin/companies/new/page.tsx`

```tsx
// apps/web/src/app/(app)/admin/companies/new/page.tsx
import { CompanyForm } from '@/components/domain/company-form'

export default function NewCompanyPage() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Nova Empresa</h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
          Cadastre um novo tenant na plataforma Elos.
        </p>
      </div>
      <div style={{
        background: 'hsl(0 0% 100%)',
        border: '1px solid hsl(214 32% 91%)',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
        padding: 24,
      }}>
        <CompanyForm mode="create" />
      </div>
    </div>
  )
}
```

---

## Verificação

- [ ] `pnpm --filter web build` compila sem erros de TypeScript
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] Design (requer inspecção visual):
  - [ ] `/[cnpj]/settings`: layout 2 colunas — card de logo à esquerda (260px), form à direita
  - [ ] Card de logo exibe a inicial da empresa em indigo com fundo `primary-soft`
  - [ ] Formulário: campos com focus ring indigo, readonly CNPJ em mono com fundo muted
  - [ ] `/[cnpj]/settings/members`: tabela com avatar + nome + email em uma célula
  - [ ] Badge de papel com dot e cores corretas por papel
  - [ ] Kebab menu abre dropdown com "Editar papel" e "Remover da empresa" (vermelho)
  - [ ] "Editar papel" abre sub-dropdown com lista de papéis atribuíveis
  - [ ] Botão "Convidar usuário" abre Sheet lateral (440px) com campos + preview de permissões
  - [ ] Preview de permissões aparece ao selecionar papel no sheet (check verde por permissão)
  - [ ] "Remover da empresa" abre AlertDialog de confirmação
  - [ ] `/admin/companies`: cabeçalho usa `<Logo>` + "Administração da Plataforma"
  - [ ] Tabela de empresas sem shadcn Table (inline styles fiéis ao protótipo)
- [ ] Segurança:
  - [ ] Kebab menu não aparece para membros SUPER_ADMIN
  - [ ] Remoção do último ADMIN_EMPRESA retorna toast de erro (400 da API)
  - [ ] `/admin/*` redireciona para `/` se o usuário não é SUPER_ADMIN
  - [ ] Funções client-side (`createCompany`, `inviteMember`, etc.) nunca chamadas em Server Components
- [ ] Acessibilidade:
  - [ ] Todos os campos de formulário têm `<label>` associado
  - [ ] Mensagens de erro têm `role="alert"`
  - [ ] Botões de ação têm `aria-label` descritivo quando o texto é ambíguo
