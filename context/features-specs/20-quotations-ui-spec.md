# Feature Spec — 3.4 Quotations Management UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 3 — Cotações e Lances  
**Unidade:** 3.4  
**Pré-requisito:** 3.3 concluído (API de cotações e lances funcional)  
**Commit convencional esperado:** `feat(web): add quotations ui with list, form and detail`

---

## Objetivo

Criar as páginas de gestão de cotações no frontend: listagem com filtros por status,
formulário de criação (com itens e fornecedores convidados inline), página de detalhe
e ações de transição de status (publicar, fechar, cancelar). Segue os mesmos padrões
visuais e de estado de `suppliers` (2.4) e `products` (2.5).

---

## Escopo

### In

- `lib/api.ts` — funções server-side e client-side para cotações + itens + fornecedores convidados
- `components/domain/` — componentes de cotação
- Rotas `(app)/[cnpj]/quotations/` — lista, novo, detalhe, editar

### Out (não implementar nesta unidade)

- UI de lances e comparativo (→ 3.5)
- Seleção de vencedor (→ 3.5)
- Formulário de edição de cotação publicada (status bloqueado pelo backend)

---

## Componentes shadcn a Instalar

```bash
pnpm dlx shadcn@latest add badge
```

> `badge` (status da cotação). `alert-dialog`, `sheet`, `select`, `tabs` já foram
> instalados nas specs 1.5 e 2.4.

---

## Extensões em `lib/api.ts`

### Funções Server-Side (SSR)

```typescript
// ─── Quotations ──────────────────────────────────────────────────────────────

export async function getQuotationsServer(params?: {
  status?: string
  search?: string
}): Promise<QuotationResponse[]> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.search) qs.set('search', params.search)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/quotations?${qs}`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json()
}

export async function getQuotationServer(id: string): Promise<QuotationResponse | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/quotations/${id}`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return null
  return res.json()
}

export async function getQuotationItemsServer(
  quotationId: string,
): Promise<QuotationItemResponse[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/items`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json()
}

export async function getQuotationSuppliersServer(
  quotationId: string,
): Promise<QuotationSupplierResponse[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/suppliers`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json()
}
```

> **Padrão:** todas as funções server-side usam `sessionHeaders()` e `cache: 'no-store'`,
> idêntico ao padrão de `getSuppliersServer` e `getProductsServer`.

### Funções Client-Side (mutações via ky)

```typescript
// ─── Quotations ──────────────────────────────────────────────────────────────

export async function createQuotation(
  cnpj: string,
  data: CreateQuotationDto,
): Promise<QuotationResponse> {
  const { api } = await import('@/lib/api-client')
  return api.post(`v1/companies/${cnpj}/quotations`, { json: data }).json<QuotationResponse>()
}

export async function updateQuotation(
  cnpj: string,
  id: string,
  data: UpdateQuotationDto,
): Promise<QuotationResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .patch(`v1/companies/${cnpj}/quotations/${id}`, { json: data })
    .json<QuotationResponse>()
}

export async function publishQuotation(cnpj: string, id: string): Promise<QuotationResponse> {
  const { api } = await import('@/lib/api-client')
  return api.post(`v1/companies/${cnpj}/quotations/${id}/publish`).json<QuotationResponse>()
}

export async function closeQuotation(cnpj: string, id: string): Promise<QuotationResponse> {
  const { api } = await import('@/lib/api-client')
  return api.post(`v1/companies/${cnpj}/quotations/${id}/close`).json<QuotationResponse>()
}

export async function cancelQuotation(cnpj: string, id: string): Promise<{ success: boolean }> {
  const { api } = await import('@/lib/api-client')
  return api.post(`v1/companies/${cnpj}/quotations/${id}/cancel`).json<{ success: boolean }>()
}

// ─── Quotation Items ──────────────────────────────────────────────────────────

export async function addQuotationItem(
  cnpj: string,
  quotationId: string,
  data: CreateQuotationItemDto,
): Promise<QuotationItemResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/items`, { json: data })
    .json<QuotationItemResponse>()
}

export async function updateQuotationItem(
  cnpj: string,
  quotationId: string,
  itemId: string,
  data: UpdateQuotationItemDto,
): Promise<QuotationItemResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .patch(`v1/companies/${cnpj}/quotations/${quotationId}/items/${itemId}`, { json: data })
    .json<QuotationItemResponse>()
}

export async function removeQuotationItem(
  cnpj: string,
  quotationId: string,
  itemId: string,
): Promise<{ success: boolean }> {
  const { api } = await import('@/lib/api-client')
  return api
    .delete(`v1/companies/${cnpj}/quotations/${quotationId}/items/${itemId}`)
    .json<{ success: boolean }>()
}

// ─── Quotation Suppliers (convites) ───────────────────────────────────────────

export async function inviteSupplierToQuotation(
  cnpj: string,
  quotationId: string,
  data: InviteSupplierToQuotationDto,
): Promise<QuotationSupplierResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/suppliers`, { json: data })
    .json<QuotationSupplierResponse>()
}

export async function removeSupplierFromQuotation(
  cnpj: string,
  quotationId: string,
  supplierId: string,
): Promise<{ success: boolean }> {
  const { api } = await import('@/lib/api-client')
  return api
    .delete(`v1/companies/${cnpj}/quotations/${quotationId}/suppliers/${supplierId}`)
    .json<{ success: boolean }>()
}
```

---

## Componentes a Criar

### `components/domain/quotation-status-badge.tsx`

Badge colorido por status da cotação, seguindo o padrão de `supplier-status-badge.tsx`.

```tsx
'use client'

import type { QuotationStatus } from '@elos/shared'

const STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT:     { label: 'Rascunho', bg: '#f3f4f6', text: '#6b7280' },
  OPEN:      { label: 'Aberta',   bg: '#dcfce7', text: '#16a34a' },
  CLOSED:    { label: 'Fechada',  bg: '#dbeafe', text: '#1d4ed8' },
  CANCELLED: { label: 'Cancelada', bg: '#fee2e2', text: '#dc2626' },
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const { label, bg, text } = STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: bg,
        color: text,
      }}
    >
      {label}
    </span>
  )
}
```

---

### `components/domain/quotation-form.tsx`

Formulário de criação de cotação. Campos: título, descrição, prazo (`deadline`),
condições de pagamento. Não inclui itens nem fornecedores (gerenciados em painéis
separados após a criação).

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createQuotationSchema, updateQuotationSchema } from '@elos/shared'
import type { CreateQuotationDto, UpdateQuotationDto, QuotationResponse } from '@elos/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createQuotation, updateQuotation } from '@/lib/api'

interface QuotationFormProps {
  cnpj: string
  mode: 'create' | 'edit'
  quotation?: QuotationResponse
}

export function QuotationForm({ cnpj, mode, quotation }: QuotationFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const schema = isEdit ? updateQuotationSchema : createQuotationSchema

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CreateQuotationDto>({
      resolver: zodResolver(schema) as Resolver<CreateQuotationDto>,
      defaultValues: isEdit && quotation
        ? {
            title:        quotation.title,
            description:  quotation.description ?? undefined,
            deadline:     quotation.deadline,
            paymentTerms: quotation.paymentTerms ?? undefined,
          }
        : undefined,
    })

  async function onSubmit(data: CreateQuotationDto) {
    try {
      if (isEdit && quotation) {
        await updateQuotation(cnpj, quotation.id, data as UpdateQuotationDto)
        toast.success('Cotação atualizada.')
        router.refresh()
      } else {
        const created = await createQuotation(cnpj, data)
        toast.success('Cotação criada.')
        router.push(`/${cnpj}/quotations/${created.id}`)
      }
    } catch (error) {
      console.error('[QuotationForm.onSubmit]', error)
      toast.error('Erro ao salvar cotação.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register('title')} placeholder="Ex: Cotação de Materiais Q4" />
        {errors.title && <p style={{ color: 'var(--color-destructive)', fontSize: 13 }}>{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            resize: 'vertical',
          }}
          placeholder="Detalhes adicionais sobre a cotação..."
        />
      </div>

      <div>
        <Label htmlFor="deadline">Prazo de Recebimento *</Label>
        <Input
          id="deadline"
          type="datetime-local"
          {...register('deadline')}
        />
        {errors.deadline && <p style={{ color: 'var(--color-destructive)', fontSize: 13 }}>{errors.deadline.message}</p>}
      </div>

      <div>
        <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
        <Input
          id="paymentTerms"
          {...register('paymentTerms')}
          placeholder="Ex: 30/60/90 dias, boleto"
        />
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Cotação'}
        </Button>
      </div>
    </form>
  )
}
```

---

### `components/domain/quotation-items-panel.tsx`

Client Component com estado local: lista os itens da cotação, permite adicionar e
remover. Editável apenas quando `canEdit` (status DRAFT e role COMPRADOR/ADMIN_EMPRESA).

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { QuotationItemResponse, CreateQuotationItemDto } from '@elos/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addQuotationItem, removeQuotationItem } from '@/lib/api'

interface QuotationItemsPanelProps {
  cnpj: string
  quotationId: string
  initialItems: QuotationItemResponse[]
  canEdit: boolean
}

// Formulário inline para adicionar item
function AddItemForm({
  onAdd,
}: {
  onAdd: (item: CreateQuotationItemDto) => Promise<void>
}) {
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('UN')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !quantity) return
    setLoading(true)
    try {
      await onAdd({ description, quantity: Number(quantity), unit, notes: notes || undefined })
      setDescription('')
      setQuantity('')
      setNotes('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}
    >
      <div>
        <Label htmlFor="item-description">Descrição *</Label>
        <Input
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Parafuso M6 × 20mm"
        />
      </div>
      <div>
        <Label htmlFor="item-quantity">Qtd *</Label>
        <Input
          id="item-quantity"
          type="number"
          min="0.001"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="100"
        />
      </div>
      <div>
        <Label htmlFor="item-unit">Unidade</Label>
        <Input
          id="item-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="UN"
        />
      </div>
      <Button type="submit" disabled={loading || !description || !quantity} style={{ marginBottom: 0 }}>
        {loading ? '...' : 'Adicionar'}
      </Button>
    </form>
  )
}

export function QuotationItemsPanel({
  cnpj,
  quotationId,
  initialItems,
  canEdit,
}: QuotationItemsPanelProps) {
  const [items, setItems] = useState(initialItems)

  async function handleAdd(dto: CreateQuotationItemDto) {
    try {
      const newItem = await addQuotationItem(cnpj, quotationId, dto)
      setItems((prev) => [...prev, newItem])
      toast.success('Item adicionado.')
    } catch (error) {
      console.error('[QuotationItemsPanel.handleAdd]', error)
      toast.error('Erro ao adicionar item.')
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await removeQuotationItem(cnpj, quotationId, itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('Item removido.')
    } catch (error) {
      console.error('[QuotationItemsPanel.handleRemove]', error)
      toast.error('Erro ao remover item.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>Descrição</th>
            <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 500 }}>Qtd</th>
            <th style={{ textAlign: 'left', padding: '8px 0 8px 8px', fontWeight: 500 }}>Unid.</th>
            {canEdit && <th style={{ width: 40 }} />}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={canEdit ? 4 : 3} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-muted-foreground)' }}>
                Nenhum item adicionado.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '10px 0' }}>{item.description}</td>
              <td style={{ textAlign: 'right', padding: '10px 0' }}>
                {parseFloat(item.quantity).toLocaleString('pt-BR')}
              </td>
              <td style={{ padding: '10px 0 10px 8px', color: 'var(--color-muted-foreground)' }}>
                {item.unit}
              </td>
              {canEdit && (
                <td style={{ padding: '10px 0', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-destructive)',
                      fontSize: 16,
                    }}
                    title="Remover item"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {canEdit && <AddItemForm onAdd={handleAdd} />}
    </div>
  )
}
```

---

### `components/domain/quotation-suppliers-panel.tsx`

Client Component para gerenciar fornecedores convidados. Mostra lista de convidados
com status e permite adicionar/remover (apenas quando DRAFT e `canEdit`).
O select de fornecedor exibe apenas fornecedores APPROVED da empresa.

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { QuotationSupplierResponse, SupplierResponse } from '@elos/shared'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { inviteSupplierToQuotation, removeSupplierFromQuotation } from '@/lib/api'

const INVITE_STATUS_LABEL: Record<string, string> = {
  INVITED:   'Convidado',
  RESPONDED: 'Respondeu',
  DECLINED:  'Recusou',
}

interface QuotationSuppliersPanelProps {
  cnpj: string
  quotationId: string
  initialInvites: QuotationSupplierResponse[]
  approvedSuppliers: SupplierResponse[]  // lista completa de APPROVED para o select
  canEdit: boolean
}

export function QuotationSuppliersPanel({
  cnpj,
  quotationId,
  initialInvites,
  approvedSuppliers,
  canEdit,
}: QuotationSuppliersPanelProps) {
  const [invites, setInvites] = useState(initialInvites)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [loading, setLoading] = useState(false)

  const alreadyInvitedIds = new Set(invites.map((i) => i.supplierId))
  const availableSuppliers = approvedSuppliers.filter(
    (s) => !alreadyInvitedIds.has(s.id),
  )

  async function handleInvite() {
    if (!selectedSupplierId) return
    setLoading(true)
    try {
      const invite = await inviteSupplierToQuotation(cnpj, quotationId, {
        supplierId: selectedSupplierId,
      })
      setInvites((prev) => [...prev, invite])
      setSelectedSupplierId('')
      toast.success('Fornecedor convidado.')
    } catch (error) {
      console.error('[QuotationSuppliersPanel.handleInvite]', error)
      toast.error('Erro ao convidar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(supplierId: string) {
    try {
      await removeSupplierFromQuotation(cnpj, quotationId, supplierId)
      setInvites((prev) => prev.filter((i) => i.supplierId !== supplierId))
      toast.success('Convite removido.')
    } catch (error) {
      console.error('[QuotationSuppliersPanel.handleRemove]', error)
      toast.error('Erro ao remover convite.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>Fornecedor</th>
            <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>Status</th>
            {canEdit && <th style={{ width: 40 }} />}
          </tr>
        </thead>
        <tbody>
          {invites.length === 0 && (
            <tr>
              <td
                colSpan={canEdit ? 3 : 2}
                style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-muted-foreground)' }}
              >
                Nenhum fornecedor convidado.
              </td>
            </tr>
          )}
          {invites.map((invite) => (
            <tr key={invite.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '10px 0' }}>{invite.supplierName}</td>
              <td style={{ padding: '10px 0', color: 'var(--color-muted-foreground)', fontSize: 13 }}>
                {INVITE_STATUS_LABEL[invite.status] ?? invite.status}
              </td>
              {canEdit && (
                <td style={{ padding: '10px 0', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRemove(invite.supplierId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-destructive)',
                      fontSize: 16,
                    }}
                    title="Remover convite"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {canEdit && availableSuppliers.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label htmlFor="invite-supplier">Convidar Fornecedor</Label>
            <select
              id="invite-supplier"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                backgroundColor: 'var(--color-background)',
              }}
            >
              <option value="">Selecione um fornecedor...</option>
              {availableSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={handleInvite}
            disabled={!selectedSupplierId || loading}
          >
            {loading ? '...' : 'Convidar'}
          </Button>
        </div>
      )}

      {canEdit && availableSuppliers.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>
          Todos os fornecedores aprovados já foram convidados.
        </p>
      )}
    </div>
  )
}
```

---

### `components/domain/quotations-list-client.tsx`

Client Component com tabs por status e busca por título client-side.

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { QuotationResponse, QuotationStatus } from '@elos/shared'
import { QuotationStatusBadge } from './quotation-status-badge'
import { cancelQuotation } from '@/lib/api'

const STATUS_TABS: Array<{ value: QuotationStatus | 'ALL'; label: string }> = [
  { value: 'ALL',       label: 'Todas' },
  { value: 'DRAFT',     label: 'Rascunho' },
  { value: 'OPEN',      label: 'Abertas' },
  { value: 'CLOSED',    label: 'Fechadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
]

interface QuotationsListClientProps {
  cnpj: string
  quotations: QuotationResponse[]
  canMutate: boolean
}

export function QuotationsListClient({
  cnpj,
  quotations,
  canMutate,
}: QuotationsListClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<QuotationStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = quotations
    if (activeTab !== 'ALL') list = list.filter((q) => q.status === activeTab)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(s) ||
          q.number.toLowerCase().includes(s),
      )
    }
    return list
  }, [quotations, activeTab, search])

  async function handleCancel(id: string) {
    if (!confirm('Cancelar esta cotação? Os lances associados serão rejeitados.')) return
    try {
      await cancelQuotation(cnpj, id)
      toast.success('Cotação cancelada.')
      router.refresh()
    } catch (error) {
      console.error('[QuotationsListClient.handleCancel]', error)
      toast.error('Erro ao cancelar cotação.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs de status */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.value ? 600 : 400,
              borderBottom: activeTab === tab.value ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab.value ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por título ou número..."
        style={{
          padding: '8px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 14,
          maxWidth: 360,
        }}
      />

      {/* Tabela */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 500 }}>Número</th>
            <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 500 }}>Título</th>
            <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 500 }}>Prazo</th>
            <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 500 }}>Itens</th>
            <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 500 }}>Lances</th>
            <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 500 }}>Status</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-muted-foreground)' }}>
                Nenhuma cotação encontrada.
              </td>
            </tr>
          )}
          {filtered.map((q) => (
            <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '12px 0', fontFamily: 'monospace', fontSize: 13 }}>
                {q.number}
              </td>
              <td style={{ padding: '12px 0' }}>
                <Link
                  href={`/${cnpj}/quotations/${q.id}`}
                  style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {q.title}
                </Link>
              </td>
              <td style={{ padding: '12px 0', color: 'var(--color-muted-foreground)', fontSize: 13 }}>
                {new Date(q.deadline).toLocaleDateString('pt-BR')}
              </td>
              <td style={{ padding: '12px 0', textAlign: 'center' }}>
                {q.itemCount ?? '—'}
              </td>
              <td style={{ padding: '12px 0', textAlign: 'center' }}>
                {q.bidCount ?? '—'}
              </td>
              <td style={{ padding: '12px 0' }}>
                <QuotationStatusBadge status={q.status} />
              </td>
              <td style={{ padding: '12px 0', textAlign: 'right' }}>
                {/* Kebab menu simples */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Link href={`/${cnpj}/quotations/${q.id}`} style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>
                    Ver
                  </Link>
                  {canMutate && q.status === 'DRAFT' && (
                    <Link href={`/${cnpj}/quotations/${q.id}/edit`} style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>
                      Editar
                    </Link>
                  )}
                  {canMutate && ['DRAFT', 'OPEN'].includes(q.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancel(q.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-destructive)' }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Rotas a Criar

```
apps/web/src/app/(app)/[cnpj]/quotations/
  page.tsx              ← lista de cotações (SSR + client filter)
  loading.tsx           ← skeleton
  error.tsx             ← error boundary
  new/
    page.tsx            ← formulário de criação
  [id]/
    page.tsx            ← detalhe (itens + fornecedores + ações de status)
    loading.tsx
    error.tsx
    edit/
      page.tsx          ← formulário de edição (apenas DRAFT)
```

---

### `(app)/[cnpj]/quotations/page.tsx`

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-auth'
import { getMyCompaniesServer, getQuotationsServer, getSuppliersServer } from '@/lib/api'
import { QuotationsListClient } from '@/components/domain/quotations-list-client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function QuotationsPage({
  params,
}: {
  params: { cnpj: string }
}) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  const [quotations, myCompanies] = await Promise.all([
    getQuotationsServer(params.cnpj),
    getMyCompaniesServer(),
  ])

  const role = myCompanies.find((c) => c.cnpj === params.cnpj)?.role
  const canMutate = role ? MUTATE_ROLES.includes(role) : false

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Cotações</h1>
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 14 }}>
            Gerencie cotações de compra e convide fornecedores para enviar lances.
          </p>
        </div>
        {canMutate && (
          <Link href={`/${params.cnpj}/quotations/new`}>
            <Button>Nova Cotação</Button>
          </Link>
        )}
      </div>

      <QuotationsListClient
        cnpj={params.cnpj}
        quotations={quotations}
        canMutate={canMutate}
      />
    </div>
  )
}
```

---

### `(app)/[cnpj]/quotations/new/page.tsx`

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-auth'
import { QuotationForm } from '@/components/domain/quotation-form'

export default async function NewQuotationPage({
  params,
}: {
  params: { cnpj: string }
}) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Nova Cotação</h1>
      <QuotationForm cnpj={params.cnpj} mode="create" />
    </div>
  )
}
```

---

### `(app)/[cnpj]/quotations/[id]/page.tsx`

Página de detalhe: info da cotação, painel de itens, painel de fornecedores
convidados e botões de ação (publicar, fechar, cancelar) dependendo do status.

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/server-auth'
import {
  getMyCompaniesServer,
  getQuotationServer,
  getQuotationItemsServer,
  getQuotationSuppliersServer,
  getSuppliersServer,
} from '@/lib/api'
import { QuotationStatusBadge } from '@/components/domain/quotation-status-badge'
import { QuotationItemsPanel } from '@/components/domain/quotation-items-panel'
import { QuotationSuppliersPanel } from '@/components/domain/quotation-suppliers-panel'
import { QuotationActions } from '@/components/domain/quotation-actions'

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function QuotationDetailPage({
  params,
}: {
  params: { cnpj: string; id: string }
}) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  const [quotation, items, invites, allSuppliers, myCompanies] = await Promise.all([
    getQuotationServer(params.cnpj, params.id),
    getQuotationItemsServer(params.cnpj, params.id),
    getQuotationSuppliersServer(params.cnpj, params.id),
    getSuppliersServer(params.cnpj, { status: 'APPROVED' }),
    getMyCompaniesServer(),
  ])

  if (!quotation) notFound()

  const role = myCompanies.find((c) => c.cnpj === params.cnpj)?.role
  const canMutate = role ? MUTATE_ROLES.includes(role) : false
  const canEdit = canMutate && quotation.status === 'DRAFT'

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-muted-foreground)' }}>
              {quotation.number}
            </span>
            <QuotationStatusBadge status={quotation.status} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>{quotation.title}</h1>
          {quotation.description && (
            <p style={{ marginTop: 8, color: 'var(--color-muted-foreground)' }}>{quotation.description}</p>
          )}
        </div>

        {canMutate && (
          <QuotationActions
            cnpj={params.cnpj}
            quotation={quotation}
          />
        )}
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32, padding: 20, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 4 }}>PRAZO DE RECEBIMENTO</p>
          <p style={{ fontWeight: 500 }}>
            {new Date(quotation.deadline).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        {quotation.paymentTerms && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 4 }}>CONDIÇÕES DE PAGAMENTO</p>
            <p style={{ fontWeight: 500 }}>{quotation.paymentTerms}</p>
          </div>
        )}
      </div>

      {/* Itens */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Itens da Cotação
        </h2>
        <QuotationItemsPanel
          cnpj={params.cnpj}
          quotationId={params.id}
          initialItems={items}
          canEdit={canEdit}
        />
      </section>

      {/* Fornecedores convidados */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Fornecedores Convidados</h2>
          {quotation.status === 'OPEN' && canMutate && (
            <Link
              href={`/${params.cnpj}/quotations/${params.id}/bids`}
              style={{ fontSize: 14, color: 'var(--color-primary)' }}
            >
              Ver lances →
            </Link>
          )}
          {quotation.status === 'CLOSED' && canMutate && (
            <Link
              href={`/${params.cnpj}/quotations/${params.id}/bids`}
              style={{ fontSize: 14, color: 'var(--color-primary)' }}
            >
              Ver comparativo →
            </Link>
          )}
        </div>
        <QuotationSuppliersPanel
          cnpj={params.cnpj}
          quotationId={params.id}
          initialInvites={invites}
          approvedSuppliers={allSuppliers}
          canEdit={canEdit}
        />
      </section>
    </div>
  )
}
```

---

### `components/domain/quotation-actions.tsx`

Client Component com botões de ação de status (Publicar, Fechar, Editar).
Agrupa os `AlertDialog` de confirmação para ações destrutivas (cancelar, fechar).

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { QuotationResponse } from '@elos/shared'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { publishQuotation, closeQuotation, cancelQuotation } from '@/lib/api'

interface QuotationActionsProps {
  cnpj: string
  quotation: QuotationResponse
}

export function QuotationActions({ cnpj, quotation }: QuotationActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePublish() {
    setLoading(true)
    try {
      await publishQuotation(cnpj, quotation.id)
      toast.success('Cotação publicada. Fornecedores podem enviar lances.')
      router.refresh()
    } catch (error) {
      console.error('[QuotationActions.handlePublish]', error)
      toast.error('Erro ao publicar cotação. Verifique se há itens e fornecedores.')
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    setLoading(true)
    try {
      await closeQuotation(cnpj, quotation.id)
      toast.success('Cotação fechada. Selecione o lance vencedor.')
      router.push(`/${cnpj}/quotations/${quotation.id}/bids`)
    } catch (error) {
      console.error('[QuotationActions.handleClose]', error)
      toast.error('Erro ao fechar cotação.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    try {
      await cancelQuotation(cnpj, quotation.id)
      toast.success('Cotação cancelada.')
      router.push(`/${cnpj}/quotations`)
    } catch (error) {
      console.error('[QuotationActions.handleCancel]', error)
      toast.error('Erro ao cancelar cotação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {quotation.status === 'DRAFT' && (
        <>
          <Link href={`/${cnpj}/quotations/${quotation.id}/edit`}>
            <Button variant="outline" size="sm">Editar</Button>
          </Link>
          <Button size="sm" onClick={handlePublish} disabled={loading}>
            Publicar Cotação
          </Button>
        </>
      )}

      {quotation.status === 'OPEN' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={loading}>Fechar Recebimento</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fechar recebimento de lances?</AlertDialogTitle>
              <AlertDialogDescription>
                Nenhum novo lance poderá ser enviado após este ponto.
                Você poderá comparar os lances e selecionar o vencedor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {['DRAFT', 'OPEN'].includes(quotation.status) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}
              style={{ color: 'var(--color-destructive)', borderColor: 'var(--color-destructive)' }}
            >
              Cancelar Cotação
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar esta cotação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os lances associados
                serão marcados como rejeitados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>Cancelar Cotação</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
```

---

### `(app)/[cnpj]/quotations/[id]/edit/page.tsx`

```tsx
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-auth'
import { getQuotationServer } from '@/lib/api'
import { QuotationForm } from '@/components/domain/quotation-form'

export default async function EditQuotationPage({
  params,
}: {
  params: { cnpj: string; id: string }
}) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  const quotation = await getQuotationServer(params.cnpj, params.id)
  if (!quotation || quotation.status !== 'DRAFT') notFound()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Editar Cotação</h1>
      <QuotationForm cnpj={params.cnpj} mode="edit" quotation={quotation} />
    </div>
  )
}
```

---

### `loading.tsx` e `error.tsx`

Seguem o padrão exato de `suppliers` (2.4) e `products` (2.5): skeleton com
`.skeleton` CSS + boundary com `useEffect` + `console.error`.

---

## Atualizar Sidebar

Adicionar o item "Cotações" no `components/domain/sidebar.tsx` (criado em 1.4):

```tsx
// No array de itens de navegação do sidebar, após "Produtos":
{ href: `/${cnpj}/quotations`, label: 'Cotações', icon: ClipboardList },
```

> Importar `ClipboardList` de `lucide-react`. Verificar que o ícone é adequado ao
> contexto de cotações; alternativas: `FileText`, `ShoppingCart`.

---

## Verificação

- [ ] `pnpm --filter web type-check` verde
- [ ] `pnpm --filter web lint` limpo
- [ ] `pnpm --filter web build` compila + gera as rotas de quotations
- [ ] `getQuotationsServer` importa de `next/headers` de forma dinâmica (padrão
  de `lib/api.ts` para evitar erro de import server-only em Client Components)
- [ ] Formulário: `deadline` enviado como ISO string, não como `Date`
- [ ] Publicar: toast de erro quando faltam itens ou fornecedores (400 do backend)
- [ ] Cancelar: `AlertDialog` de confirmação aparece antes da ação
- [ ] Sidebar exibe item "Cotações" com destaque na rota ativa
- [ ] Rotas de edição retornam 404 se cotação não é DRAFT
