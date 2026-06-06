# Feature Spec — 4.3 Purchase Orders UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 4 — Pedidos de Compra  
**Unidade:** 4.3  
**Pré-requisito:** 4.2 concluído (`PurchaseOrdersModule` com todas as rotas da API)  
**Commit convencional esperado:** `feat(web): add purchase orders ui with list, detail and status workflow`

---

## Objetivo

Criar as páginas de gestão de pedidos de compra no frontend: listagem com filtros
por status, página de detalhe com stepper visual do fluxo (DRAFT → APPROVED → SENT
→ RECEIVED / CANCELLED) e botões de ação contextuais. A geração de um novo PO é
acionada **a partir do detalhe da cotação** (página existente de 3.4), onde um botão
"Gerar Pedido de Compra" aparece quando a cotação está `CLOSED` e possui um lance
`SELECTED` sem PO gerado. Segue os padrões visuais de `quotations` (3.4).

---

## Decisão de UX: Onde Gerar o PO

O fluxo de geração do PO é acionado **a partir da cotação**, não do módulo de POs:

1. Na página de detalhe da cotação (`[cnpj]/quotations/[id]/page.tsx`, já existente),
   quando status = `CLOSED` e existe um lance `SELECTED`:
   - Aparece um card "Lance Vencedor" com dados do fornecedor e valor total do lance.
   - Botão "Gerar Pedido de Compra" dentro do card chama o endpoint `POST /purchase-orders`.
   - Após sucesso, redireciona para `[cnpj]/purchase-orders/{poId}`.
2. Da listagem de POs **não** há botão "Novo PO" — POs só existem a partir de lances.

Esta modificação da página de cotação é **in-scope** desta unidade (4.3), pois depende
das funções de `lib/api.ts` e do redirecionamento para rotas de PO.

---

## Escopo

### In

- `lib/api.ts` — funções server-side e client-side para purchase-orders
- `components/domain/` — componentes específicos de purchase-orders
- Rotas `(app)/[cnpj]/purchase-orders/` — lista e detalhe
- Modificação em `(app)/[cnpj]/quotations/[id]/page.tsx` — adicionar card de lance
  vencedor com botão "Gerar Pedido de Compra"

### Out (não implementar nesta unidade)

- Registro de recebimento (→ Fase 5)
- Upload de nota fiscal vinculada ao PO (→ Fase 6)
- Dashboard com KPIs de pedidos (→ Fase 7)

---

## Extensões em `lib/api.ts`

### Funções Server-Side (SSR)

```typescript
// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrdersServer(
  cnpj: string,
  params?: {
    status?: string
    search?: string
    supplierId?: string
    page?: string
    limit?: string
  },
): Promise<PurchaseOrderResponse[]> {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/purchase-orders`,
  )
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.search) url.searchParams.set('search', params.search)
  if (params?.supplierId) url.searchParams.set('supplierId', params.supplierId)
  if (params?.page) url.searchParams.set('page', params.page)
  if (params?.limit) url.searchParams.set('limit', params.limit)

  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export async function getPurchaseOrderServer(
  cnpj: string,
  id: string,
): Promise<(PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }) | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/purchase-orders/${id}`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return null
  return res.json()
}
```

### Funções Client-Side (mutações via ky)

```typescript
// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function createPurchaseOrder(
  cnpj: string,
  data: CreatePurchaseOrderDto,
): Promise<PurchaseOrderResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .post(`v1/companies/${cnpj}/purchase-orders`, { json: data })
    .json<PurchaseOrderResponse>()
}

export async function approvePurchaseOrder(
  cnpj: string,
  id: string,
): Promise<PurchaseOrderResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .post(`v1/companies/${cnpj}/purchase-orders/${id}/approve`)
    .json<PurchaseOrderResponse>()
}

export async function sendPurchaseOrder(
  cnpj: string,
  id: string,
): Promise<PurchaseOrderResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .post(`v1/companies/${cnpj}/purchase-orders/${id}/send`)
    .json<PurchaseOrderResponse>()
}

export async function cancelPurchaseOrder(
  cnpj: string,
  id: string,
): Promise<PurchaseOrderResponse> {
  const { api } = await import('@/lib/api-client')
  return api
    .post(`v1/companies/${cnpj}/purchase-orders/${id}/cancel`)
    .json<PurchaseOrderResponse>()
}
```

> Não incluir `receivePurchaseOrder` no cliente web da Fase 4 — o `receive` é
> acionado pela Fase 5 (Receipts), não diretamente pelo usuário nesta fase.

---

## Arquivos a Criar / Modificar

```text
apps/web/src/
  lib/
    api.ts                                      ← modificar (adicionar funções PO)
  components/domain/
    purchase-order-status-badge.tsx             ← criar
    purchase-order-stepper.tsx                  ← criar
    purchase-order-actions.tsx                  ← criar
    purchase-orders-list-client.tsx             ← criar
    generate-po-dialog.tsx                      ← criar
  app/(app)/[cnpj]/
    purchase-orders/
      page.tsx                                  ← criar
      loading.tsx                               ← criar
      error.tsx                                 ← criar
      [id]/
        page.tsx                                ← criar
        loading.tsx                             ← criar
        error.tsx                               ← criar
    quotations/
      [id]/
        page.tsx                                ← modificar (adicionar card do lance vencedor)
```

---

## Implementação Detalhada

### 1. `components/domain/purchase-order-status-badge.tsx`

```tsx
'use client'

import type { PurchaseOrderStatus } from '@elos/shared'

const STATUS_CONFIG: Record<
  PurchaseOrderStatus,
  { label: string; style: React.CSSProperties }
> = {
  DRAFT:     { label: 'Rascunho',  style: { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' } },
  APPROVED:  { label: 'Aprovado',  style: { backgroundColor: 'hsl(var(--info) / 0.15)', color: 'hsl(var(--info))' } },
  SENT:      { label: 'Enviado',   style: { backgroundColor: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' } },
  RECEIVED:  { label: 'Recebido',  style: { backgroundColor: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' } },
  CANCELLED: { label: 'Cancelado', style: { backgroundColor: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' } },
}

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      style={{
        ...config.style,
        padding: '2px 10px',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.75rem',
        fontWeight: 500,
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  )
}
```

---

### 2. `components/domain/purchase-order-stepper.tsx`

Exibe o fluxo de status como um stepper horizontal. Estados CANCELLED e RECEIVED
são tratados como terminais — o stepper reflete o caminho percorrido.

```tsx
'use client'

import type { PurchaseOrderStatus } from '@elos/shared'
import { Check } from 'lucide-react'

const STEPS: { status: PurchaseOrderStatus; label: string }[] = [
  { status: 'DRAFT',    label: 'Rascunho' },
  { status: 'APPROVED', label: 'Aprovado' },
  { status: 'SENT',     label: 'Enviado' },
  { status: 'RECEIVED', label: 'Recebido' },
]

const STATUS_ORDER: Record<PurchaseOrderStatus, number> = {
  DRAFT:     0,
  APPROVED:  1,
  SENT:      2,
  RECEIVED:  3,
  CANCELLED: -1,
}

export function PurchaseOrderStepper({ status }: { status: PurchaseOrderStatus }) {
  const currentOrder = STATUS_ORDER[status]
  const isCancelled = status === 'CANCELLED'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '16px 0',
        overflowX: 'auto',
      }}
    >
      {STEPS.map((step, index) => {
        const stepOrder = STATUS_ORDER[step.status]
        const isCompleted = !isCancelled && currentOrder > stepOrder
        const isActive = !isCancelled && currentOrder === stepOrder
        const isFuture = isCancelled || currentOrder < stepOrder

        return (
          <div key={step.status} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* Círculo do step */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCompleted
                    ? 'hsl(var(--success))'
                    : isActive
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))',
                  color: isFuture ? 'hsl(var(--muted-foreground))' : 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </div>
              {/* Label */}
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isFuture
                    ? 'hsl(var(--muted-foreground))'
                    : isActive
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--success))',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
            {/* Linha entre steps */}
            {index < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: isCompleted
                    ? 'hsl(var(--success))'
                    : 'hsl(var(--border))',
                  margin: '0 4px',
                  marginBottom: 22, // alinha com o centro dos círculos
                }}
              />
            )}
          </div>
        )
      })}
      {/* Badge CANCELADO sobreposto se cancelado */}
      {isCancelled && (
        <div
          style={{
            marginLeft: 16,
            padding: '4px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
            fontSize: '0.75rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Cancelado
        </div>
      )}
    </div>
  )
}
```

---

### 3. `components/domain/purchase-order-actions.tsx`

Botões de ação contextual baseados no status atual. Usa `AlertDialog` para confirmar
ações destrutivas (cancelar) e de transição (aprovar, enviar).

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import {
  approvePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
} from '@/lib/api'
import type { PurchaseOrderResponse } from '@elos/shared'

interface Props {
  po: PurchaseOrderResponse
  cnpj: string
  canMutate: boolean
}

export function PurchaseOrderActions({ po, cnpj, canMutate }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleApprove() {
    try {
      await approvePurchaseOrder(cnpj, po.id)
      toast.success('Pedido aprovado com sucesso.')
      startTransition(() => router.refresh())
    } catch (error) {
      console.error('[PurchaseOrderActions.approve]', error)
      toast.error('Erro ao aprovar pedido. Tente novamente.')
    }
  }

  async function handleSend() {
    try {
      await sendPurchaseOrder(cnpj, po.id)
      toast.success('Pedido enviado ao fornecedor.')
      startTransition(() => router.refresh())
    } catch (error) {
      console.error('[PurchaseOrderActions.send]', error)
      toast.error('Erro ao enviar pedido. Tente novamente.')
    }
  }

  async function handleCancel() {
    try {
      await cancelPurchaseOrder(cnpj, po.id)
      toast.success('Pedido cancelado.')
      startTransition(() => router.refresh())
    } catch (error) {
      console.error('[PurchaseOrderActions.cancel]', error)
      toast.error('Erro ao cancelar pedido. Tente novamente.')
    }
  }

  if (!canMutate) return null

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {/* Aprovar (DRAFT → APPROVED) */}
      {po.status === 'DRAFT' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Aprovar Pedido
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aprovar pedido {po.number}?</AlertDialogTitle>
              <AlertDialogDescription>
                O pedido será aprovado e poderá ser enviado ao fornecedor na
                próxima etapa. Esta ação pode ser revertida via cancelamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>Aprovar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Enviar (APPROVED → SENT) */}
      {po.status === 'APPROVED' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Enviar ao Fornecedor
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar pedido {po.number}?</AlertDialogTitle>
              <AlertDialogDescription>
                O pedido será marcado como enviado ao fornecedor{' '}
                <strong>{po.supplierName}</strong>. Após envio, não é possível
                editar ou cancelar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend}>Confirmar Envio</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Cancelar (DRAFT ou APPROVED) */}
      {['DRAFT', 'APPROVED'].includes(po.status) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                color: 'hsl(var(--destructive))',
                border: '1px solid hsl(var(--destructive))',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Cancelar Pedido
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar pedido {po.number}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O pedido será cancelado e
                permanecerá no histórico com status Cancelado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                style={{ backgroundColor: 'hsl(var(--destructive))' }}
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
```

---

### 4. `components/domain/purchase-orders-list-client.tsx`

Client Component com filtro por status em tabs e busca por número/fornecedor.

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { PurchaseOrderStatusBadge } from './purchase-order-status-badge'
import type { PurchaseOrderResponse, PurchaseOrderStatus } from '@elos/shared'

const STATUS_TABS: { value: PurchaseOrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',       label: 'Todos' },
  { value: 'DRAFT',     label: 'Rascunho' },
  { value: 'APPROVED',  label: 'Aprovado' },
  { value: 'SENT',      label: 'Enviado' },
  { value: 'RECEIVED',  label: 'Recebido' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

interface Props {
  purchaseOrders: PurchaseOrderResponse[]
  cnpj: string
}

export function PurchaseOrdersListClient({ purchaseOrders, cnpj }: Props) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<PurchaseOrderStatus | 'ALL'>('ALL')

  const filtered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesTab = activeTab === 'ALL' || po.status === activeTab
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        po.number.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [purchaseOrders, search, activeTab])

  return (
    <div>
      {/* Tabs de status */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid hsl(var(--border))',
          marginBottom: 16,
          overflowX: 'auto',
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom:
                activeTab === tab.value
                  ? '2px solid hsl(var(--primary))'
                  : '2px solid transparent',
              backgroundColor: 'transparent',
              color:
                activeTab === tab.value
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.value ? 600 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'hsl(var(--muted-foreground))',
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número ou fornecedor..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 0',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          Nenhum pedido de compra encontrado.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  Número
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  Fornecedor
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  Cotação
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  Status
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textAlign: 'right' }}>
                  Total
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  Itens
                </th>
                <th style={{ padding: '10px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => (
                <tr
                  key={po.id}
                  style={{ borderBottom: '1px solid hsl(var(--border))' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      'hsl(var(--muted) / 0.3)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent')
                  }
                >
                  <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {po.number}
                  </td>
                  <td style={{ padding: '12px' }}>{po.supplierName}</td>
                  <td style={{ padding: '12px', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
                    {po.quotationNumber ?? '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <PurchaseOrderStatusBadge status={po.status} />
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {Number(po.totalAmount).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td style={{ padding: '12px', color: 'hsl(var(--muted-foreground))' }}>
                    {po.itemCount ?? '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Link
                      href={`/${cnpj}/purchase-orders/${po.id}`}
                      style={{
                        color: 'hsl(var(--primary))',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

---

### 5. `components/domain/generate-po-dialog.tsx`

Dialog de confirmação antes de gerar o PO a partir de um lance vencedor.
Exibido na página de detalhe da cotação (3.4).

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import { createPurchaseOrder } from '@/lib/api'

interface Props {
  cnpj: string
  bidId: string
  supplierName: string
  totalPrice: string
}

export function GeneratePODialog({ cnpj, bidId, supplierName, totalPrice }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleGenerate() {
    setIsLoading(true)
    try {
      const po = await createPurchaseOrder(cnpj, { bidId })
      toast.success(`Pedido ${po.number} gerado com sucesso.`)
      router.push(`/${cnpj}/purchase-orders/${po.id}`)
    } catch (error) {
      console.error('[GeneratePODialog.handleGenerate]', error)
      toast.error('Erro ao gerar pedido de compra. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Gerar Pedido de Compra
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Gerar Pedido de Compra?</AlertDialogTitle>
          <AlertDialogDescription>
            Um pedido de compra em rascunho será gerado para{' '}
            <strong>{supplierName}</strong> com o valor total de{' '}
            <strong>
              {Number(totalPrice).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
            . Você poderá revisar os itens e aprovar antes de enviar ao fornecedor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Gerando...' : 'Gerar Pedido'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

### 6. `(app)/[cnpj]/purchase-orders/page.tsx`

```tsx
import { Suspense } from 'react'
import { getPurchaseOrdersServer, getMyCompaniesServer } from '@/lib/api'
import { PurchaseOrdersListClient } from '@/components/domain/purchase-orders-list-client'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function PurchaseOrdersPage({ params }: Props) {
  const { cnpj } = await params

  // Carregar todos os status em paralelo para exibir contagens e filtrar client-side
  const [draft, approved, sent, received, cancelled] = await Promise.all([
    getPurchaseOrdersServer(cnpj, { status: 'DRAFT',     limit: '100' }),
    getPurchaseOrdersServer(cnpj, { status: 'APPROVED',  limit: '100' }),
    getPurchaseOrdersServer(cnpj, { status: 'SENT',      limit: '100' }),
    getPurchaseOrdersServer(cnpj, { status: 'RECEIVED',  limit: '100' }),
    getPurchaseOrdersServer(cnpj, { status: 'CANCELLED', limit: '100' }),
  ])

  const allPOs = [...draft, ...approved, ...sent, ...received, ...cancelled]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Pedidos de Compra
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', margin: '4px 0 0', fontSize: '0.875rem' }}>
            {allPOs.length} pedido{allPOs.length !== 1 ? 's' : ''} encontrado{allPOs.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Não há "Novo PO" — gerado a partir da cotação */}
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
          Pedidos são gerados a partir de lances vencedores de cotações.
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
        }}
      >
        <PurchaseOrdersListClient purchaseOrders={allPOs} cnpj={cnpj} />
      </div>
    </div>
  )
}
```

---

### 7. `(app)/[cnpj]/purchase-orders/loading.tsx`

```tsx
export default function Loading() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 24, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
    </div>
  )
}
```

---

### 8. `(app)/[cnpj]/purchase-orders/error.tsx`

```tsx
'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[PurchaseOrdersError]', error)
  }, [error])

  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p style={{ color: 'hsl(var(--destructive))', marginBottom: 16 }}>
        Erro ao carregar pedidos de compra.
      </p>
      <button type="button" onClick={reset} style={{ cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  )
}
```

---

### 9. `(app)/[cnpj]/purchase-orders/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import {
  getPurchaseOrderServer,
  getMyCompaniesServer,
} from '@/lib/api'
import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge'
import { PurchaseOrderStepper } from '@/components/domain/purchase-order-stepper'
import { PurchaseOrderActions } from '@/components/domain/purchase-order-actions'

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN'] as const

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function PurchaseOrderDetailPage({ params }: Props) {
  const { cnpj, id } = await params

  const [po, myCompanies] = await Promise.all([
    getPurchaseOrderServer(cnpj, id),
    getMyCompaniesServer(),
  ])

  if (!po) notFound()

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role = membership?.role
  const canMutate = MUTATE_ROLES.includes(role as typeof MUTATE_ROLES[number])

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Breadcrumb */}
      <Link
        href={`/${cnpj}/purchase-orders`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'hsl(var(--muted-foreground))',
          textDecoration: 'none',
          fontSize: '0.875rem',
          marginBottom: 16,
        }}
      >
        <ChevronLeft size={16} />
        Pedidos de Compra
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                margin: 0,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {po.number}
            </h1>
            <PurchaseOrderStatusBadge status={po.status} />
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', margin: 0, fontSize: '0.875rem' }}>
            Fornecedor: <strong>{po.supplierName}</strong>
            {po.quotationNumber && (
              <>
                {' '}·{' '}
                <Link
                  href={`/${cnpj}/quotations/${po.quotationId}`}
                  style={{ color: 'hsl(var(--primary))', textDecoration: 'none' }}
                >
                  Cotação {po.quotationNumber}
                </Link>
              </>
            )}
          </p>
        </div>
        <PurchaseOrderActions po={po} cnpj={cnpj} canMutate={canMutate} />
      </div>

      {/* Stepper */}
      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginBottom: 20,
        }}
      >
        <PurchaseOrderStepper status={po.status} />
      </div>

      {/* Informações do pedido */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Datas e aprovação */}
        <div
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
          }}
        >
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 16px', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
            Informações
          </h2>
          <dl style={{ display: 'grid', gap: 12, margin: 0 }}>
            {[
              { label: 'Criado em', value: new Date(po.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'medium' }) },
              { label: 'Aprovado em', value: po.approvedAt ? new Date(po.approvedAt).toLocaleDateString('pt-BR', { dateStyle: 'medium' }) : '—' },
              { label: 'Enviado em', value: po.sentAt ? new Date(po.sentAt).toLocaleDateString('pt-BR', { dateStyle: 'medium' }) : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>{label}</dt>
                <dd style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Totais */}
        <div
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
          }}
        >
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 16px', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
            Financeiro
          </h2>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderTop: '1px solid hsl(var(--border))',
              }}
            >
              <span style={{ fontWeight: 600 }}>Total do Pedido</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'hsl(var(--primary))',
                }}
              >
                {Number(po.totalAmount).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          </div>
          {po.notes && (
            <div style={{ marginTop: 12, padding: '10px 12px', backgroundColor: 'hsl(var(--muted) / 0.5)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                {po.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Itens do Pedido */}
      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px' }}>
          Itens do Pedido ({po.items?.length ?? 0})
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left' }}>
                {['Produto', 'Código', 'Unidade', 'Quantidade', 'Preço Unit.', 'Total', 'Recebido'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      fontWeight: 600,
                      color: 'hsl(var(--muted-foreground))',
                      textAlign: h === 'Total' || h === 'Quantidade' || h === 'Preço Unit.' || h === 'Recebido' ? 'right' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {po.items?.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.productName}</td>
                  <td style={{ padding: '10px 12px', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    {item.productCode ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'hsl(var(--muted-foreground))' }}>
                    {item.unit}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {Number(item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {Number(item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {Number(item.totalPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'hsl(var(--muted-foreground))' }}>
                    {Number(item.receivedQuantity).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

---

### 10. `(app)/[cnpj]/purchase-orders/[id]/loading.tsx` e `error.tsx`

```tsx
// loading.tsx
export default function Loading() {
  return (
    <div style={{ maxWidth: 960 }}>
      <div className="skeleton" style={{ height: 24, width: 160, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 48, width: 300, marginBottom: 24, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 80, marginBottom: 20, borderRadius: 'var(--radius-lg)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
    </div>
  )
}

// error.tsx
'use client'
import { useEffect } from 'react'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[PurchaseOrderDetailError]', error) }, [error])
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p style={{ color: 'hsl(var(--destructive))', marginBottom: 16 }}>
        Erro ao carregar pedido de compra.
      </p>
      <button type="button" onClick={reset} style={{ cursor: 'pointer' }}>Tentar novamente</button>
    </div>
  )
}
```

---

### 11. Modificar `(app)/[cnpj]/quotations/[id]/page.tsx`

Adicionar o card "Lance Vencedor" abaixo dos painéis de itens e fornecedores,
visível apenas quando a cotação está `CLOSED` e há um lance `SELECTED`:

```tsx
// No topo, importar a função de busca e o componente:
import { getBidsServer } from '@/lib/api'
import { GeneratePODialog } from '@/components/domain/generate-po-dialog'

// No corpo do Server Component: buscar a cotação primeiro (para o notFound
// antecipado e para condicionar a busca de lances), depois o restante em paralelo.
const quotation = await getQuotationServer(cnpj, id)
if (!quotation) notFound()

const [items, suppliers, bids] = await Promise.all([
  getQuotationItemsServer(cnpj, id),
  getQuotationSuppliersServer(cnpj, id),
  // Somente buscar lances se a cotação estiver CLOSED
  quotation.status === 'CLOSED' ? getBidsServer(cnpj, id) : Promise.resolve([]),
])

// Após os painéis de itens e fornecedores, adicionar:
{quotation.status === 'CLOSED' && (() => {
  const winnerBid = bids.find((b) => b.status === 'SELECTED')
  if (!winnerBid) return null

  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--card))',
        border: '2px solid hsl(var(--primary) / 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginTop: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: 'hsl(var(--primary))' }}>
            🏆 Lance Vencedor
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            <strong>{winnerBid.supplierName}</strong>
            {winnerBid.totalPrice && (
              <>
                {' '}·{' '}
                <strong style={{ color: 'hsl(var(--foreground))' }}>
                  {Number(winnerBid.totalPrice).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>
              </>
            )}
          </p>
        </div>
        {canMutate && (
          <GeneratePODialog
            cnpj={cnpj}
            bidId={winnerBid.id}
            supplierName={winnerBid.supplierName}
            totalPrice={winnerBid.totalPrice ?? '0'}
          />
        )}
      </div>
    </div>
  )
})()}
```

> **Nota de implementação:** o `Promise.all` original da página de cotação (3.4)
> precisa ser ajustado para incluir a busca de lances (`getBidsServer`) quando
> `status === 'CLOSED'`. O padrão de `await params` + múltiplas chamadas server-side
> já está estabelecido na página existente — apenas adicionar a chamada e o card.

---

## Checklist de Verificação

```bash
# Type-check
pnpm type-check   # 3 workspaces verdes

# Lint
pnpm --filter web lint   # sem erros (apenas warnings noNonNullAssertion esperados)

# Build
pnpm --filter web build  # compila + gera as rotas de purchase-orders

# Rotas esperadas em .next/server/app:
# /(app)/[cnpj]/purchase-orders/page
# /(app)/[cnpj]/purchase-orders/[id]/page

# Funcional (requer API + banco):
# [ ] Lista de POs com filtro de status por tabs funciona
# [ ] Busca por número e fornecedor funciona client-side
# [ ] Stepper exibe status correto e marca steps concluídos
# [ ] Botão "Aprovar" aparece em DRAFT e some após aprovação
# [ ] Botão "Enviar" aparece em APPROVED e some após envio
# [ ] Botão "Cancelar" aparece em DRAFT e APPROVED; oculto em SENT/RECEIVED
# [ ] Dialog de cancelamento pede confirmação antes de agir
# [ ] Na cotação CLOSED, card "Lance Vencedor" aparece com botão "Gerar PO"
# [ ] Clicar "Gerar Pedido de Compra" redireciona para o PO gerado
# [ ] Sidebar item "Pedidos de Compra" linka corretamente para /${cnpj}/purchase-orders
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| Lista busca todos os status em paralelo | Mesmo padrão de `products` (2.5): filtro client-side puro sem round-trip extra por status. Em volumes maiores (>100 POs), adicionar paginação server-side no endpoint. |
| Geração de PO a partir da cotação, não do módulo PO | UX mais natural: o COMPRADOR está na cotação, viu o comparativo, selecionou o vencedor — gerar o PO é o próximo passo contextual. Evita tela separada para "selecionar bid". |
| `GeneratePODialog` como componente separado | A página de cotação (3.4) já existe; o dialog é o único elemento novo necessário. Importar apenas o componente evita reescrever a página inteira. |
| Não incluir `receive` no cliente web (Fase 4) | A transição SENT→RECEIVED será acionada pelo módulo de Recebimentos (Fase 5). Expor o botão agora criaria fluxo incompleto (sem criação de receipt). |
| `PurchaseOrderStepper` com `STATUS_ORDER` numérico | Permite comparar estados sem switch/if aninhados. `CANCELLED = -1` garante que nenhum step apareça como "concluído" quando cancelado. |
| Valores monetários formatados com `toLocaleString('pt-BR')` | Padrão do mercado brasileiro: `R$ 1.234,56`. Os campos chegam como string (numeric do postgres.js) e são convertidos com `Number()`. |
| `role` via `getMyCompaniesServer()` | Mesmo padrão de 2.4/2.5/3.4 — papel é por empresa (membership), não `session.user.role`. |
