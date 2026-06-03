# Feature Spec — 2.4 Suppliers UI (Next.js)

**Fase:** 2 — Fornecedores e Produtos  
**Unidade:** 2.4  
**Pré-requisito:** 2.2 concluído (endpoints de suppliers, contacts, bank-accounts); 1.4/1.5 concluídos (app shell, `lib/api.ts`, padrões de componente)  
**Commit convencional esperado:** `feat(web): add suppliers ui with list, form, detail and approval`

---

## Objetivo

Criar as páginas e componentes de gestão de fornecedores:

- **Listagem** com filtros de status e busca por nome
- **Criação** e **edição** de fornecedor (formulário com dados, endereço, tipo PJ/PF)
- **Detalhe** com tabs para contatos e contas bancárias
- **Ações de aprovação/rejeição** inline na lista e na página de detalhe

Apenas COMPRADOR e ADMIN_EMPRESA veem botões de mutação; demais papéis têm
acesso somente leitura (as páginas renderizam condicionalmente com base em
`session.user.role`).

---

## Escopo

### In

- `(app)/[cnpj]/suppliers/page.tsx` — listagem com filtros + ações
- `(app)/[cnpj]/suppliers/new/page.tsx` — formulário de criação
- `(app)/[cnpj]/suppliers/[id]/page.tsx` — detalhe + tabs (info / contatos / contas bancárias)
- `(app)/[cnpj]/suppliers/[id]/edit/page.tsx` — formulário de edição
- `(app)/[cnpj]/suppliers/loading.tsx` — skeleton
- `(app)/[cnpj]/suppliers/error.tsx` — error boundary
- `components/domain/supplier-form.tsx` — form reutilizável create/edit
- `components/domain/supplier-status-badge.tsx` — badge colorido por status
- `components/domain/supplier-contacts-panel.tsx` — lista de contatos com ações
- `components/domain/supplier-bank-accounts-panel.tsx` — contas bancárias com ações
- `components/domain/add-contact-sheet.tsx` — Sheet para criar/editar contato
- `components/domain/add-bank-account-sheet.tsx` — Sheet para criar/editar conta
- `components/domain/approve-supplier-dialog.tsx` — AlertDialog de aprovação (com campo rating opcional)
- `components/domain/reject-supplier-dialog.tsx` — AlertDialog de rejeição (campo notes obrigatório)
- Extensão de `lib/api.ts` — funções server-side e client-side de suppliers
- shadcn: `tabs`, `alert-dialog` (se não instalado), `select`

### Out (não implementar nesta unidade)

- Upload de documentos do fornecedor (Supabase Storage — Fase futura)
- Avaliação automática de fornecedor por múltiplos critérios (v1: rating manual na aprovação)
- Paginação server-side (volume pequeno — filtros client-side suficientes na v1)

---

## Estrutura de Rotas após esta unidade

```
app/
  (app)/
    [cnpj]/
      suppliers/
        page.tsx           ← criar (listagem + filtros)
        new/
          page.tsx         ← criar
        [id]/
          page.tsx         ← criar (detalhe + tabs)
          edit/
            page.tsx       ← criar
        loading.tsx        ← criar
        error.tsx          ← criar (reutiliza o padrão de [cnpj]/error.tsx)
```

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  app/
    (app)/
      [cnpj]/
        suppliers/
          page.tsx                           ← criar
          loading.tsx                        ← criar
          error.tsx                          ← criar
          new/page.tsx                       ← criar
          [id]/
            page.tsx                         ← criar
            edit/page.tsx                    ← criar
  components/
    domain/
      supplier-form.tsx                      ← criar
      supplier-status-badge.tsx              ← criar
      supplier-contacts-panel.tsx            ← criar
      supplier-bank-accounts-panel.tsx       ← criar
      add-contact-sheet.tsx                  ← criar
      add-bank-account-sheet.tsx             ← criar
      approve-supplier-dialog.tsx            ← criar
      reject-supplier-dialog.tsx             ← criar
  lib/
    api.ts                                   ← modificar (funções suppliers)
```

---

## Implementação Detalhada

### 1. Instalar shadcn components necessários

```bash
npx shadcn@latest add tabs select --filter web
```

> `alert-dialog` já foi instalado em 1.5. `sheet` já foi instalado em 1.5.
> Verificar antes de executar para não sobrescrever `globals.css`.

---

### 2. Extensão de `lib/api.ts` — funções de suppliers

Adicionar ao `lib/api.ts` existente, seguindo o mesmo padrão (server-side com
`sessionHeaders()`, client-side com `client()`):

```typescript
// ─── Suppliers (server-side) ─────────────────────────────────────────────────

export async function getSuppliersServer(
  cnpj: string,
  params?: { status?: string; search?: string },
): Promise<SupplierResponse[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/suppliers`)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.search) url.searchParams.set('search', params.search)
  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export async function getSupplierServer(cnpj: string, id: string): Promise<SupplierResponse | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/suppliers/${id}`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return null
  return res.json()
}

export async function getSupplierContactsServer(
  cnpj: string,
  supplierId: string,
): Promise<SupplierContactResponse[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/suppliers/${supplierId}/contacts`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json()
}

export async function getSupplierBankAccountsServer(
  cnpj: string,
  supplierId: string,
): Promise<SupplierBankAccountResponse[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json()
}

// ─── Suppliers (client-side) ─────────────────────────────────────────────────

export async function createSupplier(
  cnpj: string,
  data: CreateSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers`, { json: data })
    .json<SupplierResponse>()
}

export async function updateSupplier(
  cnpj: string,
  id: string,
  data: UpdateSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/suppliers/${id}`, { json: data })
    .json<SupplierResponse>()
}

export async function approveSupplier(
  cnpj: string,
  id: string,
  data: ApproveSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${id}/approve`, { json: data })
    .json<SupplierResponse>()
}

export async function rejectSupplier(
  cnpj: string,
  id: string,
  data: RejectSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${id}/reject`, { json: data })
    .json<SupplierResponse>()
}

export async function addContact(
  cnpj: string,
  supplierId: string,
  data: CreateSupplierContactDto,
): Promise<SupplierContactResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${supplierId}/contacts`, { json: data })
    .json<SupplierContactResponse>()
}

export async function updateContact(
  cnpj: string,
  supplierId: string,
  contactId: string,
  data: UpdateSupplierContactDto,
): Promise<SupplierContactResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/suppliers/${supplierId}/contacts/${contactId}`, { json: data })
    .json<SupplierContactResponse>()
}

export async function removeContact(
  cnpj: string,
  supplierId: string,
  contactId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/suppliers/${supplierId}/contacts/${contactId}`,
  )
}

export async function addBankAccount(
  cnpj: string,
  supplierId: string,
  data: CreateSupplierBankAccountDto,
): Promise<SupplierBankAccountResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts`, { json: data })
    .json<SupplierBankAccountResponse>()
}

export async function updateBankAccount(
  cnpj: string,
  supplierId: string,
  accountId: string,
  data: UpdateSupplierBankAccountDto,
): Promise<SupplierBankAccountResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts/${accountId}`, { json: data })
    .json<SupplierBankAccountResponse>()
}

export async function removeBankAccount(
  cnpj: string,
  supplierId: string,
  accountId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts/${accountId}`,
  )
}
```

> Adicionar os imports correspondentes de `@elos/shared` no topo do `lib/api.ts`
> (`SupplierResponse`, `SupplierContactResponse`, `SupplierBankAccountResponse`,
> `CreateSupplierDto`, `UpdateSupplierDto`, `ApproveSupplierDto`, `RejectSupplierDto`,
> `CreateSupplierContactDto`, `UpdateSupplierContactDto`, `CreateSupplierBankAccountDto`,
> `UpdateSupplierBankAccountDto`).

---

### 3. `components/domain/supplier-status-badge.tsx`

```tsx
// apps/web/src/components/domain/supplier-status-badge.tsx

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendente',  color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 95%)' },
  APPROVED: { label: 'Aprovado',  color: 'hsl(142 71% 30%)', bg: 'hsl(142 71% 94%)' },
  REJECTED: { label: 'Reprovado', color: 'hsl(0 84% 50%)',   bg: 'hsl(0 84% 95%)' },
} as const

type SupplierStatus = keyof typeof STATUS_CONFIG

interface SupplierStatusBadgeProps {
  status: SupplierStatus
}

export function SupplierStatusBadge({ status }: SupplierStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: 12,
        fontWeight: 500,
        color: config.color,
        background: config.bg,
      }}
    >
      {config.label}
    </span>
  )
}
```

---

### 4. `components/domain/supplier-form.tsx`

Formulário reutilizável para criar e editar fornecedor. Segue o padrão inline-style
de `company-form.tsx` (1.5). O campo `type` (PJ/PF) é exibido apenas no modo
`'create'` e determina qual documento fiscal é obrigatório.

```tsx
'use client'
// apps/web/src/components/domain/supplier-form.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createSupplierSchema, updateSupplierSchema } from '@elos/shared'
import type { CreateSupplierDto, UpdateSupplierDto, SupplierResponse } from '@elos/shared'
import { Button } from '@/components/ui/button'
import { createSupplier, updateSupplier } from '@/lib/api'

// Estilos reutilizáveis (mesmos de company-form.tsx)
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const inputStyle: React.CSSProperties = {
  height: 38, padding: '0 12px', fontSize: 13.5,
  borderRadius: '0.375rem', border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)', color: 'hsl(222 47% 11%)',
  outline: 'none', width: '100%',
}
const inputReadonlyStyle: React.CSSProperties = {
  ...inputStyle, background: 'hsl(210 40% 96.1%)', cursor: 'not-allowed',
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }

interface SupplierFormProps {
  mode: 'create' | 'edit'
  cnpj: string                          // cnpj da empresa (tenant) — para URL
  supplierId?: string                   // id do fornecedor (modo edit)
  defaultValues?: Partial<CreateSupplierDto>
  onSuccess?: (supplier: SupplierResponse) => void
}

export function SupplierForm({ mode, cnpj, supplierId, defaultValues, onSuccess }: SupplierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Em modo edit, o tipo foi fixado na criação — usamos CreateSupplierDto como
  // superset para o form (todos os campos presentes, só usamos o que é editável)
  const schema = mode === 'create' ? createSupplierSchema : updateSupplierSchema
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateSupplierDto>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultValues
      ? Object.fromEntries(
          Object.entries(defaultValues).map(([k, v]) => [k, v ?? undefined])
        )
      : { type: 'PJ' },
  })

  const supplierType = watch('type')

  const onSubmit = async (data: CreateSupplierDto) => {
    setLoading(true)
    try {
      let result: SupplierResponse
      if (mode === 'create') {
        result = await createSupplier(cnpj, data)
        toast.success('Fornecedor criado com sucesso.')
      } else {
        result = await updateSupplier(cnpj, supplierId!, data as UpdateSupplierDto)
        toast.success('Fornecedor atualizado com sucesso.')
      }
      onSuccess?.(result)
      router.push(`/${cnpj}/suppliers`)
      router.refresh()
    } catch {
      toast.error(mode === 'create' ? 'Erro ao criar fornecedor.' : 'Erro ao atualizar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Tipo de fornecedor — apenas no modo create */}
      {mode === 'create' && (
        <div style={fieldStyle}>
          <label htmlFor="type" style={labelStyle}>Tipo de pessoa *</label>
          <select id="type" {...register('type')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
          </select>
          {errors.type && <span style={errorStyle}>{errors.type.message}</span>}
        </div>
      )}

      {/* Nome / Razão Social */}
      <div style={fieldStyle}>
        <label htmlFor="name" style={labelStyle}>
          {supplierType === 'PF' ? 'Nome completo' : 'Razão social'} *
        </label>
        <input id="name" {...register('name')} style={inputStyle}
          placeholder={supplierType === 'PF' ? 'João da Silva' : 'Empresa Ltda'} />
        {errors.name && <span style={errorStyle}>{errors.name.message}</span>}
      </div>

      {/* CNPJ / CPF */}
      {(mode === 'create' ? supplierType !== 'PF' : defaultValues?.type !== 'PF') ? (
        <div style={fieldStyle}>
          <label htmlFor="cnpj" style={labelStyle}>CNPJ *</label>
          <input id="cnpj" {...register('cnpj')}
            style={mode === 'edit' ? inputReadonlyStyle : inputStyle}
            readOnly={mode === 'edit'}
            placeholder="00000000000000"
            maxLength={14} />
          {errors.cnpj && <span style={errorStyle}>{errors.cnpj.message}</span>}
        </div>
      ) : (
        <div style={fieldStyle}>
          <label htmlFor="cpf" style={labelStyle}>CPF *</label>
          <input id="cpf" {...register('cpf')}
            style={mode === 'edit' ? inputReadonlyStyle : inputStyle}
            readOnly={mode === 'edit'}
            placeholder="00000000000"
            maxLength={11} />
          {errors.cpf && <span style={errorStyle}>{errors.cpf.message}</span>}
        </div>
      )}

      {/* E-mail */}
      <div style={fieldStyle}>
        <label htmlFor="email" style={labelStyle}>E-mail</label>
        <input id="email" type="email" {...register('email')} style={inputStyle}
          placeholder="contato@fornecedor.com" />
        {errors.email && <span style={errorStyle}>{errors.email.message}</span>}
      </div>

      {/* Telefone */}
      <div style={fieldStyle}>
        <label htmlFor="phone" style={labelStyle}>Telefone</label>
        <input id="phone" {...register('phone')} style={inputStyle}
          placeholder="(11) 99999-9999" />
        {errors.phone && <span style={errorStyle}>{errors.phone.message}</span>}
      </div>

      {/* Observações */}
      <div style={fieldStyle}>
        <label htmlFor="notes" style={labelStyle}>Observações</label>
        <textarea id="notes" {...register('notes')} rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
          placeholder="Informações adicionais sobre o fornecedor..." />
        {errors.notes && <span style={errorStyle}>{errors.notes.message}</span>}
      </div>

      {/* ─── Endereço ──────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid hsl(214 32% 91%)', paddingTop: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'hsl(222 47% 11%)' }}>
          Endereço (opcional)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label htmlFor="address.street" style={labelStyle}>Logradouro</label>
            <input id="address.street" {...register('address.street')} style={inputStyle}
              placeholder="Rua, Avenida, Alameda..." />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.number" style={labelStyle}>Número</label>
            <input id="address.number" {...register('address.number')} style={inputStyle}
              placeholder="123" />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.complement" style={labelStyle}>Complemento</label>
            <input id="address.complement" {...register('address.complement')} style={inputStyle}
              placeholder="Sala 4, Apto 10..." />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.city" style={labelStyle}>Cidade</label>
            <input id="address.city" {...register('address.city')} style={inputStyle}
              placeholder="São Paulo" />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.state" style={labelStyle}>UF</label>
            <input id="address.state" {...register('address.state')} style={inputStyle}
              placeholder="SP" maxLength={2} />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.zipCode" style={labelStyle}>CEP</label>
            <input id="address.zipCode" {...register('address.zipCode')} style={inputStyle}
              placeholder="00000000" maxLength={8} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 style={{ width: 14, height: 14, marginRight: 6, animation: 'spin 1s linear infinite' }} />}
          {mode === 'create' ? 'Criar fornecedor' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
```

---

### 5. `approve-supplier-dialog.tsx` e `reject-supplier-dialog.tsx`

```tsx
// apps/web/src/components/domain/approve-supplier-dialog.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { approveSupplier } from '@/lib/api'

interface ApproveSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  supplierId: string
  supplierName: string
  onApproved?: () => void
}

export function ApproveSupplierDialog({
  open, onOpenChange, cnpj, supplierId, supplierName, onApproved,
}: ApproveSupplierDialogProps) {
  const [rating, setRating] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      await approveSupplier(cnpj, supplierId, {
        rating: rating ? Number(rating) : undefined,
      })
      toast.success(`${supplierName} aprovado com sucesso.`)
      onApproved?.()
      onOpenChange(false)
    } catch {
      toast.error('Erro ao aprovar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar fornecedor</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja aprovar <strong>{supplierName}</strong>?
            O fornecedor poderá ser vinculado a produtos e convidado para cotações.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div style={{ padding: '0 0 8px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Avaliação inicial (1–5, opcional)
          </label>
          <input
            type="number" min={1} max={5} value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Ex: 4"
            style={{
              width: 80, height: 36, padding: '0 10px', fontSize: 13,
              border: '1px solid hsl(214 32% 91%)', borderRadius: '0.375rem',
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={loading}
            style={{ background: 'hsl(142 71% 45%)', color: 'white' }}
          >
            {loading ? 'Aprovando...' : 'Aprovar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

```tsx
// apps/web/src/components/domain/reject-supplier-dialog.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { rejectSupplier } from '@/lib/api'

interface RejectSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  supplierId: string
  supplierName: string
  onRejected?: () => void
}

export function RejectSupplierDialog({
  open, onOpenChange, cnpj, supplierId, supplierName, onRejected,
}: RejectSupplierDialogProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReject = async () => {
    if (notes.trim().length < 5) {
      toast.error('Informe o motivo da rejeição (mínimo 5 caracteres).')
      return
    }
    setLoading(true)
    try {
      await rejectSupplier(cnpj, supplierId, { notes: notes.trim() })
      toast.success(`${supplierName} rejeitado.`)
      onRejected?.()
      onOpenChange(false)
    } catch {
      toast.error('Erro ao rejeitar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeitar fornecedor</AlertDialogTitle>
          <AlertDialogDescription>
            Informe o motivo da rejeição de <strong>{supplierName}</strong>.
            Este campo será salvo para rastreabilidade.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div style={{ padding: '0 0 8px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Motivo da rejeição *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3} placeholder="Descreva o motivo..."
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13, resize: 'vertical',
              border: '1px solid hsl(214 32% 91%)', borderRadius: '0.375rem',
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={loading}
            style={{ background: 'hsl(0 84% 60%)', color: 'white' }}
          >
            {loading ? 'Rejeitando...' : 'Rejeitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

### 6. `(app)/[cnpj]/suppliers/page.tsx`

Página SSR de listagem com filtros client-side. Recebe os dados do servidor e
delega o estado de filtro para um componente cliente.

```tsx
// apps/web/src/app/(app)/[cnpj]/suppliers/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSuppliersServer } from '@/lib/api'
import { getCompanyServer } from '@/lib/api'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'
import { SuppliersListClient } from '@/components/domain/suppliers-list-client'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function SuppliersPage({ params }: Props) {
  const { cnpj } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session as { user?: { role?: string } } | null)?.user?.role ?? ''
  const canMutate = role === 'COMPRADOR' || role === 'ADMIN_EMPRESA' || role === 'SUPER_ADMIN'

  const [suppliers, company] = await Promise.all([
    getSuppliersServer(cnpj),
    getCompanyServer(cnpj),
  ])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Fornecedores</h1>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            Gerencie os fornecedores de {company?.name ?? cnpj}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/new`}>
            <Button>
              <Plus style={{ width: 15, height: 15, marginRight: 6 }} />
              Novo fornecedor
            </Button>
          </Link>
        )}
      </div>

      {/* Lista com filtros (Client Component) */}
      <SuppliersListClient
        initialSuppliers={suppliers}
        cnpj={cnpj}
        canMutate={canMutate}
      />
    </div>
  )
}
```

> **`SuppliersListClient`** é um Client Component responsável pelos filtros de
> busca, filtro de status (tabs ou select), e a tabela com ações (kebab menu com
> Aprovar / Rejeitar / Editar / Ver detalhes). Criá-lo em
> `components/domain/suppliers-list-client.tsx`. A estrutura segue o padrão da
> `members-table.tsx` (1.5).

#### `components/domain/suppliers-list-client.tsx` (estrutura)

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, CheckCircle, XCircle, Pencil, Eye } from 'lucide-react'
import type { SupplierResponse } from '@elos/shared'
import { SupplierStatusBadge } from './supplier-status-badge'
import { ApproveSupplierDialog } from './approve-supplier-dialog'
import { RejectSupplierDialog } from './reject-supplier-dialog'

// Filtros: tabs de status + input de busca
// Tabela: Nome | Tipo | CNPJ/CPF | Status | E-mail | Ações
// Kebab menu:
//   - PENDING: Aprovar, Rejeitar, Editar, Ver
//   - APPROVED / REJECTED: Editar, Ver
```

---

### 7. `(app)/[cnpj]/suppliers/new/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/suppliers/new/page.tsx
import { SupplierForm } from '@/components/domain/supplier-form'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function NewSupplierPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Novo fornecedor
      </h1>
      <div style={{
        background: 'white', borderRadius: '0.5rem',
        border: '1px solid hsl(214 32% 91%)', padding: 28,
      }}>
        <SupplierForm mode="create" cnpj={cnpj} />
      </div>
    </div>
  )
}
```

---

### 8. `(app)/[cnpj]/suppliers/[id]/page.tsx`

Página de detalhe com Tabs (Informações | Contatos | Contas Bancárias). Os dados
são buscados server-side em paralelo. Os painéis de contato e conta bancária são
Client Components (gerenciam estado de adição/edição inline).

```tsx
// apps/web/src/app/(app)/[cnpj]/suppliers/[id]/page.tsx
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'
import {
  getSupplierServer,
  getSupplierContactsServer,
  getSupplierBankAccountsServer,
} from '@/lib/api'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
import { SupplierContactsPanel } from '@/components/domain/supplier-contacts-panel'
import { SupplierBankAccountsPanel } from '@/components/domain/supplier-bank-accounts-panel'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function SupplierDetailPage({ params }: Props) {
  const { cnpj, id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session as { user?: { role?: string } } | null)?.user?.role ?? ''
  const canMutate = role === 'COMPRADOR' || role === 'ADMIN_EMPRESA' || role === 'SUPER_ADMIN'

  const [supplier, contacts, bankAccounts] = await Promise.all([
    getSupplierServer(cnpj, id),
    getSupplierContactsServer(cnpj, id),
    getSupplierBankAccountsServer(cnpj, id),
  ])

  if (!supplier) notFound()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              {supplier.name}
            </h1>
            <SupplierStatusBadge status={supplier.status} />
          </div>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
            {supplier.type === 'PJ' ? `CNPJ: ${supplier.cnpj}` : `CPF: ${supplier.cpf}`}
            {supplier.email && ` · ${supplier.email}`}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil style={{ width: 14, height: 14, marginRight: 6 }} />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="bank-accounts">Contas Bancárias</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          {/* Grid de dados: telefone, endereço, rating, notas */}
          <div style={{
            background: 'white', borderRadius: '0.5rem',
            border: '1px solid hsl(214 32% 91%)', padding: 24, marginTop: 16,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <InfoField label="Telefone" value={supplier.phone} />
              <InfoField label="Avaliação" value={supplier.rating ? `${supplier.rating}/5` : '—'} />
              {supplier.address && (
                <InfoField
                  label="Endereço"
                  value={[
                    `${supplier.address.street}, ${supplier.address.number}`,
                    supplier.address.complement,
                    `${supplier.address.city}/${supplier.address.state}`,
                    `CEP ${supplier.address.zipCode}`,
                  ].filter(Boolean).join(' · ')}
                  fullWidth
                />
              )}
              {supplier.notes && (
                <InfoField label="Observações" value={supplier.notes} fullWidth />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <SupplierContactsPanel
            cnpj={cnpj}
            supplierId={id}
            initialContacts={contacts}
            canMutate={canMutate}
          />
        </TabsContent>

        <TabsContent value="bank-accounts">
          <SupplierBankAccountsPanel
            cnpj={cnpj}
            supplierId={id}
            initialAccounts={bankAccounts}
            canMutate={canMutate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoField({
  label, value, fullWidth,
}: { label: string; value: string | null | undefined; fullWidth?: boolean }) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, color: 'hsl(222 47% 11%)' }}>{value ?? '—'}</p>
    </div>
  )
}
```

---

### 9. `(app)/[cnpj]/suppliers/[id]/edit/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/suppliers/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import { SupplierForm } from '@/components/domain/supplier-form'
import { getSupplierServer } from '@/lib/api'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function EditSupplierPage({ params }: Props) {
  const { cnpj, id } = await params
  const supplier = await getSupplierServer(cnpj, id)
  if (!supplier) notFound()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Editar fornecedor
      </h1>
      <div style={{
        background: 'white', borderRadius: '0.5rem',
        border: '1px solid hsl(214 32% 91%)', padding: 28,
      }}>
        <SupplierForm
          mode="edit"
          cnpj={cnpj}
          supplierId={id}
          defaultValues={{
            name:    supplier.name,
            cnpj:    supplier.cnpj ?? undefined,
            cpf:     supplier.cpf ?? undefined,
            email:   supplier.email ?? undefined,
            phone:   supplier.phone ?? undefined,
            notes:   supplier.notes ?? undefined,
            type:    supplier.type,
            address: supplier.address
              ? {
                  street:     supplier.address.street,
                  number:     supplier.address.number,
                  complement: supplier.address.complement ?? undefined,
                  city:       supplier.address.city,
                  state:      supplier.address.state,
                  zipCode:    supplier.address.zipCode,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  )
}
```

---

### 10. `loading.tsx` e `error.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/suppliers/loading.tsx
export default function SuppliersLoading() {
  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="skeleton" style={{ height: 28, width: 180, marginBottom: 24, borderRadius: 6 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 6 }} />
      ))}
    </div>
  )
}
```

```tsx
// apps/web/src/app/(app)/[cnpj]/suppliers/error.tsx
'use client'
import { Button } from '@/components/ui/button'
export default function SuppliersError({ reset }: { reset: () => void }) {
  return (
    <div style={{ padding: '28px 32px', textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: 'hsl(0 84% 60%)', marginBottom: 16 }}>
        Erro ao carregar fornecedores.
      </p>
      <Button variant="outline" onClick={reset}>Tentar novamente</Button>
    </div>
  )
}
```

---

### 11. Painéis de contatos e contas bancárias (estrutura)

`SupplierContactsPanel` e `SupplierBankAccountsPanel` são Client Components que:

- Recebem `initialContacts`/`initialAccounts` (SSR) e mantêm estado local
- Exibem uma lista com botão de editar e remover (AlertDialog de confirmação)
- Têm botão "Adicionar" que abre o Sheet correspondente (`AddContactSheet` / `AddBankAccountSheet`)
- Ao confirmar, chamam `addContact`/`updateContact`/`removeContact` ou os equivalentes de bank-account
- Exibem toast de sucesso/erro e atualizam o estado local

Os Sheets seguem o padrão de `invite-member-sheet.tsx` (1.5): shadcn `<Sheet>` lateral de 440px com formulário react-hook-form + Zod.

---

## Adição ao `sidebar.tsx` (1.4)

Adicionar o item de navegação "Fornecedores" para os papéis com acesso de leitura
(todos exceto SUPER_ADMIN que usa o layout admin):

```tsx
// Em apps/web/src/components/domain/sidebar.tsx
// Dentro do array de navegação (após Dashboard), adicionar:
{
  label: 'Fornecedores',
  href: `/${cnpj}/suppliers`,
  icon: Building2,  // import de lucide-react
  roles: ['ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE', 'ANALISTA_FINANCEIRO', 'TRANSPORTADOR'],
}
```

---

## Verificação

- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo (sem `noNonNullAssertion` extras)
- [ ] `pnpm --filter web build` compila + gera as rotas de suppliers sem erro
- [ ] Checklist funcional:
  - [ ] ALMOXARIFE vê a lista mas não vê botão "Novo fornecedor" nem ações de aprovação
  - [ ] COMPRADOR vê os botões de Aprovar/Rejeitar apenas em fornecedores PENDING
  - [ ] Dialog de aprovação aceita rating vazio (opcional)
  - [ ] Dialog de rejeição bloqueia submit sem notes
  - [ ] Tabs na página de detalhe navegam entre Info / Contatos / Contas Bancárias
  - [ ] Formulário de criação valida que PJ deve ter CNPJ e PF deve ter CPF
  - [ ] Após criar fornecedor, redireciona para `/[cnpj]/suppliers`
