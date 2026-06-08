# Feature Spec — 5.6 Receipts UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.6  
**Pré-requisito:** 5.3 concluído (API de recebimentos); 5.5 concluído (armazéns disponíveis)  
**Commit convencional esperado:** `feat(web): add receipts ui linked to purchase order detail`

---

## Objetivo

Criar a interface de recebimento de mercadorias. O fluxo principal parte do
detalhe de um Pedido de Compra (`SENT`): o almoxarife clica em "Registrar
Recebimento", preenche um formulário com os itens recebidos e o armazém de
destino, e o sistema cria o recebimento + movimentações de estoque.

Adicionalmente, existe uma página de listagem global de recebimentos e o
detalhe de um recebimento específico.

O detalhe do PO (já implementado em 4.3) recebe um card "Recebimentos" quando
o PO está em status `SENT` ou `RECEIVED`.

---

## Escopo

### In

- Extensão de `apps/web/src/lib/api.ts` com funções de recebimento
- `apps/web/src/components/domain/receipt-form.tsx` (formulário de recebimento)
- `apps/web/src/components/domain/receipts-list-client.tsx`
- `apps/web/src/app/(app)/[cnpj]/receipts/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/receipts/loading.tsx`
- `apps/web/src/app/(app)/[cnpj]/receipts/error.tsx`
- `apps/web/src/app/(app)/[cnpj]/receipts/[id]/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/receipts/[id]/loading.tsx`
- `apps/web/src/app/(app)/[cnpj]/receipts/[id]/error.tsx`
- Modificação em `apps/web/src/app/(app)/[cnpj]/purchase-orders/[id]/page.tsx`
  — adicionar painel de recebimentos e botão "Registrar Recebimento" quando
  status = `SENT`

### Out

- Movimentações manuais de estoque (log de movimentações): listagem simples via
  `/stock-movements` pode ser adicionada aqui como sub-feature trivial, mas fica
  fora do escopo obrigatório desta spec — o implementador pode adicioná-la
  como `GET /stock-movements` na página de inventário do armazém (5.5) se desejar
- Não-conformidades (→ 5.7)

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  lib/
    api.ts                                          ← modificar (funções de receipts)
  components/domain/
    receipt-form.tsx                                ← criar
    receipts-list-client.tsx                        ← criar
  app/(app)/[cnpj]/
    receipts/
      page.tsx                                      ← criar
      loading.tsx                                   ← criar
      error.tsx                                     ← criar
      [id]/
        page.tsx                                    ← criar
        loading.tsx                                 ← criar
        error.tsx                                   ← criar
    purchase-orders/
      [id]/
        page.tsx                                    ← modificar (painel de recebimentos)
```

---

## Implementação Detalhada

### 1. Extensão de `lib/api.ts`

```typescript
// ─── Server-side (recebimentos) ───────────────────────────────────────────────

export async function getReceiptsServer(
  cnpj: string,
  params?: {
    purchaseOrderId?: string
    warehouseId?:     string
    status?:          string
    page?:            string
    limit?:           string
  },
) {
  const headers = await sessionHeaders()
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/receipts${qs}`, {
    headers, cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<ReceiptResponse[]>
}

export async function getReceiptServer(cnpj: string, id: string) {
  const headers = await sessionHeaders()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/receipts/${id}`, {
    headers, cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<ReceiptResponse>
}

// ─── Client-side (mutações) ───────────────────────────────────────────────────

export async function createReceipt(cnpj: string, data: CreateReceiptDto) {
  return (await client())
    .post(`v1/companies/${cnpj}/receipts`, { json: data })
    .json<ReceiptResponse>()
}
```

> Adicionar imports de tipos de `@elos/shared`:
> `ReceiptResponse`, `ReceiptItemResponse`, `CreateReceiptDto`.

---

### 2. `components/domain/receipt-form.tsx`

Formulário de recebimento. Exibe os itens do PO com campos de quantidade recebida,
permite selecionar o armazém e informar a data/hora e notas.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createReceipt } from '@/lib/api'
import type { PurchaseOrderResponse, PurchaseOrderItemResponse, WarehouseResponse } from '@elos/shared'

interface ReceiptFormProps {
  cnpj:       string
  po:         PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }
  warehouses: WarehouseResponse[]
}

interface ItemState {
  purchaseOrderItemId: string
  receivedQuantity:    string
  notes:               string
}

export function ReceiptForm({ cnpj, po, warehouses }: ReceiptFormProps) {
  const router = useRouter()
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [receivedAt, setReceivedAt]   = useState(
    // default: agora, no formato datetime-local
    new Date().toISOString().slice(0, 16),
  )
  const [globalNotes, setGlobalNotes] = useState('')
  const [items, setItems]             = useState<ItemState[]>(
    po.items.map((item) => ({
      purchaseOrderItemId: item.id,
      receivedQuantity:    '',
      notes:               '',
    })),
  )
  const [submitting, setSubmitting]   = useState(false)

  function updateItem(index: number, field: keyof ItemState, value: string) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, [field]: value }
      return next
    })
  }

  // Calcula quantidade pendente (orderedQuantity - totalReceived até agora)
  function getPending(item: PurchaseOrderItemResponse) {
    return Math.max(
      0,
      Number(item.orderedQuantity) - Number(item.receivedQuantity ?? '0'),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!warehouseId) {
      toast.error('Selecione o armazém de destino.')
      return
    }

    // Filtrar apenas itens com quantidade informada
    const filledItems = items.filter((i) => {
      const qty = Number.parseFloat(i.receivedQuantity)
      return !Number.isNaN(qty) && qty > 0
    })

    if (filledItems.length === 0) {
      toast.error('Informe a quantidade recebida de pelo menos um item.')
      return
    }

    setSubmitting(true)
    try {
      const receipt = await createReceipt(cnpj, {
        purchaseOrderId: po.id,
        warehouseId,
        receivedAt:      new Date(receivedAt).toISOString(),
        notes:           globalNotes || undefined,
        items:           filledItems.map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          receivedQuantity:    Number.parseFloat(i.receivedQuantity),
          notes:               i.notes || undefined,
        })),
      })
      toast.success(
        receipt.status === 'COMPLETE'
          ? 'Recebimento completo registrado. PO marcado como recebido.'
          : 'Recebimento parcial registrado.',
      )
      router.push(`/${cnpj}/receipts/${receipt.id}`)
      router.refresh()
    } catch (error) {
      console.error('[ReceiptForm.handleSubmit]', error)
      toast.error('Erro ao registrar recebimento. Verifique as quantidades.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Armazém */}
      <div className="space-y-1">
        <Label htmlFor="warehouseId">Armazém de Destino *</Label>
        <select
          id="warehouseId"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          <option value="">Selecione o armazém…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Data/hora */}
      <div className="space-y-1">
        <Label htmlFor="receivedAt">Data e Hora do Recebimento *</Label>
        <Input
          id="receivedAt"
          type="datetime-local"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          required
        />
      </div>

      {/* Itens */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Itens</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-right px-4 py-3 font-medium">Pedido</th>
                <th className="text-right px-4 py-3 font-medium">Já recebido</th>
                <th className="text-right px-4 py-3 font-medium">Pendente</th>
                <th className="text-right px-4 py-3 font-medium">Receber agora *</th>
                <th className="px-4 py-3 font-medium">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {po.items.map((poItem, index) => {
                const pending = getPending(poItem)
                const state   = items[index]
                if (!state) return null
                return (
                  <tr key={poItem.id} className={pending === 0 ? 'opacity-40' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{poItem.productName}</div>
                      {poItem.productCode && (
                        <div className="text-xs text-muted-foreground">{poItem.productCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(poItem.orderedQuantity).toFixed(3)} {poItem.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {Number(poItem.totalReceived ?? poItem.receivedQuantity ?? '0').toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {pending.toFixed(3)}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max={pending}
                        value={state.receivedQuantity}
                        onChange={(e) => updateItem(index, 'receivedQuantity', e.target.value)}
                        disabled={pending === 0}
                        className="w-28 text-right"
                        placeholder="0.000"
                        aria-label={`Quantidade recebida de ${poItem.productName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={state.notes}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        disabled={pending === 0}
                        className="w-40"
                        placeholder="Opcional"
                        aria-label={`Observação de ${poItem.productName}`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notas gerais */}
      <div className="space-y-1">
        <Label htmlFor="globalNotes">Notas gerais</Label>
        <Input
          id="globalNotes"
          value={globalNotes}
          onChange={(e) => setGlobalNotes(e.target.value)}
          placeholder="Observações sobre o recebimento"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar Recebimento'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${cnpj}/purchase-orders/${po.id}`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

---

### 3. `components/domain/receipts-list-client.tsx`

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package } from 'lucide-react'
import type { ReceiptResponse } from '@elos/shared'

interface ReceiptsListClientProps {
  cnpj:     string
  receipts: ReceiptResponse[]
}

const STATUS_LABEL: Record<string, string> = {
  PARTIAL:  'Parcial',
  COMPLETE: 'Completo',
}

export function ReceiptsListClient({ cnpj, receipts }: ReceiptsListClientProps) {
  const [search, setSearch] = useState('')

  const filtered = receipts.filter(
    (r) =>
      r.purchaseOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.warehouseName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Buscar por PO ou armazém…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Package className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhum recebimento encontrado.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 font-medium">Armazém</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Recebido em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${cnpj}/receipts/${receipt.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {receipt.purchaseOrderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{receipt.warehouseName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        receipt.status === 'COMPLETE'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {STATUS_LABEL[receipt.status] ?? receipt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(receipt.receivedAt).toLocaleString('pt-BR')}
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

### 4. Rotas de Recebimento

#### `(app)/[cnpj]/receipts/page.tsx`

```tsx
import { getReceiptsServer } from '@/lib/api'
import { ReceiptsListClient } from '@/components/domain/receipts-list-client'

export default async function ReceiptsPage({
  params,
}: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params
  const receipts = await getReceiptsServer(cnpj)

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Recebimentos</h1>
      <ReceiptsListClient cnpj={cnpj} receipts={receipts} />
    </div>
  )
}
```

#### `(app)/[cnpj]/receipts/loading.tsx` e `error.tsx`

Padrão de skeleton e erro (idêntico a `warehouses/loading.tsx` e `error.tsx`).

#### `(app)/[cnpj]/receipts/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getReceiptServer } from '@/lib/api'

export default async function ReceiptDetailPage({
  params,
}: { params: Promise<{ cnpj: string; id: string }> }) {
  const { cnpj, id } = await params
  const receipt      = await getReceiptServer(cnpj, id)
  if (!receipt) notFound()

  const items = receipt.items ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/receipts`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Recebimentos
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Recebimento — {receipt.purchaseOrderNumber}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {receipt.warehouseName} ·{' '}
            {new Date(receipt.receivedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            receipt.status === 'COMPLETE'
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning'
          }`}
        >
          {receipt.status === 'COMPLETE' ? 'Completo' : 'Parcial'}
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Itens recebidos</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-right px-4 py-3 font-medium">Pedido</th>
                <th className="text-right px-4 py-3 font-medium">Recebido (este)</th>
                <th className="text-right px-4 py-3 font-medium">Total recebido</th>
                <th className="text-left px-4 py-3 font-medium">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.productName}</div>
                    {item.productCode && (
                      <div className="text-xs text-muted-foreground">{item.productCode}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(item.orderedQuantity).toFixed(3)} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-success">
                    +{Number(item.receivedQuantity).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(item.totalReceived).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receipt.notes && (
        <div className="mb-6">
          <h2 className="text-base font-medium mb-1">Notas</h2>
          <p className="text-sm text-muted-foreground">{receipt.notes}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href={`/${cnpj}/purchase-orders/${receipt.purchaseOrderId}`}>
            Ver Pedido de Compra
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

---

### 5. Modificação em `purchase-orders/[id]/page.tsx`

Adicionar painel de recebimentos ao detalhe do PO. Quando status = `SENT` e
`canMutate = true`, exibir botão "Registrar Recebimento" que leva ao formulário.

```tsx
// Adicionar à lista de imports:
import { getReceiptsServer, getWarehousesServer } from '@/lib/api'

// No Promise.all existente, adicionar:
const [/* ... existentes ...*/, receipts, warehouses] = await Promise.all([
  // ... chamadas existentes ...,
  getReceiptsServer(cnpj, { purchaseOrderId: id }),
  po.status === 'SENT' ? getWarehousesServer(cnpj) : Promise.resolve([]),
])

// Adicionar ao JSX, após a tabela de itens:
{(po.status === 'SENT' || po.status === 'RECEIVED') && (
  <div className="mt-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Recebimentos</h2>
      {po.status === 'SENT' && canMutate && (
        <Button asChild variant="outline">
          <Link href={`/${cnpj}/purchase-orders/${po.id}/receive`}>
            Registrar Recebimento
          </Link>
        </Button>
      )}
    </div>
    {receipts.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        Nenhum recebimento registrado ainda.
      </p>
    ) : (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Data</th>
              <th className="text-left px-4 py-3 font-medium">Armazém</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  {new Date(r.receivedAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.warehouseName}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${r.status === 'COMPLETE' ? 'text-success' : 'text-warning'}`}>
                    {r.status === 'COMPLETE' ? 'Completo' : 'Parcial'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${cnpj}/receipts/${r.id}`}
                    className="text-xs text-primary hover:underline"
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
)}
```

**Nova rota para o formulário:** `purchase-orders/[id]/receive/page.tsx`

```tsx
import { notFound, redirect } from 'next/navigation'
import { getPurchaseOrderServer, getWarehousesServer, getMyCompaniesServer } from '@/lib/api'
import { ReceiptForm } from '@/components/domain/receipt-form'

const MUTATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function RegisterReceiptPage({
  params,
}: { params: Promise<{ cnpj: string; id: string }> }) {
  const { cnpj, id } = await params
  const [myCompanies, po, warehouses] = await Promise.all([
    getMyCompaniesServer(),
    getPurchaseOrderServer(cnpj, id),
    getWarehousesServer(cnpj),
  ])

  if (!po) notFound()
  if (po.status !== 'SENT') redirect(`/${cnpj}/purchase-orders/${id}`)

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role = membership?.role ?? null
  if (!role || !MUTATE_ROLES.includes(role)) redirect(`/${cnpj}/purchase-orders/${id}`)

  const activeWarehouses = warehouses.filter((w) => w.isActive)
  if (activeWarehouses.length === 0) {
    // Sem armazéns ativos — redirecionar com mensagem
    redirect(`/${cnpj}/warehouses`)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Registrar Recebimento</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pedido: <strong>{po.number}</strong>
      </p>
      <ReceiptForm cnpj={cnpj} po={po as any} warehouses={activeWarehouses} />
    </div>
  )
}
```

> Adicionar `loading.tsx` e `error.tsx` ao lado desta página seguindo o padrão.

---

## Checklist de Verificação

```bash
# TypeScript
pnpm --filter web type-check

# Lint
pnpm --filter web lint

# Build
pnpm --filter web build
# Espera: rotas de receipts e purchase-orders/[id]/receive presentes em .next

# Manual
# [ ] Página de PO SENT exibe botão "Registrar Recebimento"
# [ ] Formulário de recebimento exibe itens com quantidade pendente
# [ ] Itens já totalmente recebidos ficam desabilitados (pendente = 0)
# [ ] Toast correto para COMPLETE vs. PARTIAL
# [ ] Listagem de recebimentos filtrada por busca (PO/armazém)
# [ ] Detalhe exibe itens com quantidades corretas
# [ ] Redirect se PO não está SENT ou usuário sem permissão
# [ ] Redirect para /warehouses se não há armazém ativo
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| Formulário de recebimento em rota dedicada (`/receive`) | O formulário tem muitos campos (tabela de itens × quantidade); Page dedicada é mais adequada que Sheet para formulários complexos (padrão do projeto: "Sheet para até ~8 campos") |
| `items` filtrados por `qty > 0` no submit | O almoxarife pode deixar itens sem quantidade (não recebidos nesta entrega); só enviar os preenchidos evita erros 400 desnecessários |
| Redirect para `/warehouses` se sem armazém ativo | Melhor UX que mostrar formulário vazio sem opções; o usuário pode criar um armazém primeiro |
| `po as any` no cast do `ReceiptForm` | O `getPurchaseOrderServer` retorna `PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }`; o cast é necessário pois `items` é opcional no schema (presente apenas no detalhe); em runtime os itens sempre existem nesta página pois vêm do endpoint `GET /purchase-orders/:id` |
| `getWarehousesServer` carregado em paralelo no `Promise.all` | Mesmo que a maioria das vezes o PO esteja SENT, o custo de carregar armazéns é baixo; evita waterfall |
