# Feature Spec — 5.5 Warehouses UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.5  
**Pré-requisito:** 5.2 concluído (API de armazéns disponível); 5.1 concluído (tipos)  
**Commit convencional esperado:** `feat(web): add warehouses ui with list, form and inventory view`

---

## Objetivo

Criar a interface de gestão de armazéns: listagem, criação/edição (via página
dedicada), desativação e visualização do inventário (saldo de estoque por
produto/armazém). O sidebar já tem o item "Armazéns" (`Warehouse`, href
`/${cnpj}/warehouses`) — nenhuma alteração no sidebar necessária.

---

## Escopo

### In

- Extensão de `apps/web/src/lib/api.ts` com funções de armazéns
- `apps/web/src/components/domain/warehouse-form.tsx`
- `apps/web/src/components/domain/warehouses-list-client.tsx`
- `apps/web/src/components/domain/inventory-table.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/loading.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/error.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/new/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/[id]/page.tsx` (detalhe + inventário)
- `apps/web/src/app/(app)/[cnpj]/warehouses/[id]/loading.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/[id]/error.tsx`
- `apps/web/src/app/(app)/[cnpj]/warehouses/[id]/edit/page.tsx`

### Out

- Movimentações manuais de estoque (→ 5.6, integradas ao fluxo de recebimento)
- Recebimento (→ 5.6)
- Não-conformidades (→ 5.7)

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  lib/
    api.ts                                    ← modificar (funções de warehouses)
  components/domain/
    warehouse-form.tsx                        ← criar
    warehouses-list-client.tsx                ← criar
    inventory-table.tsx                       ← criar
  app/(app)/[cnpj]/
    warehouses/
      page.tsx                                ← criar
      loading.tsx                             ← criar
      error.tsx                               ← criar
      new/
        page.tsx                              ← criar
      [id]/
        page.tsx                              ← criar
        loading.tsx                           ← criar
        error.tsx                             ← criar
        edit/
          page.tsx                            ← criar
```

---

## Implementação Detalhada

### 1. Extensão de `lib/api.ts`

Adicionar funções server-side e client-side para armazéns:

```typescript
// ─── Server-side (armazéns) ──────────────────────────────────────────────────

export async function getWarehousesServer(
  cnpj: string,
  params?: { includeInactive?: string },
) {
  const headers = await sessionHeaders()
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/warehouses${qs}`, {
    headers,
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<WarehouseResponse[]>
}

export async function getWarehouseServer(cnpj: string, id: string) {
  const headers = await sessionHeaders()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/warehouses/${id}`, {
    headers,
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<WarehouseResponse>
}

export async function getInventoryServer(
  cnpj: string,
  params?: { warehouseId?: string; productId?: string; search?: string; page?: string; limit?: string },
) {
  const headers = await sessionHeaders()
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/warehouses/inventory${qs}`, {
    headers,
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<InventoryResponse[]>
}

export async function getWarehouseInventoryServer(
  cnpj: string,
  warehouseId: string,
  params?: { search?: string; page?: string; limit?: string },
) {
  const headers = await sessionHeaders()
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(
    `${API_URL}/v1/companies/${cnpj}/warehouses/${warehouseId}/inventory${qs}`,
    { headers, cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json() as Promise<InventoryResponse[]>
}

// ─── Client-side (mutações) ───────────────────────────────────────────────────

export async function createWarehouse(cnpj: string, data: CreateWarehouseDto) {
  return (await client()).post(`v1/companies/${cnpj}/warehouses`, { json: data }).json<WarehouseResponse>()
}

export async function updateWarehouse(cnpj: string, id: string, data: UpdateWarehouseDto) {
  return (await client()).patch(`v1/companies/${cnpj}/warehouses/${id}`, { json: data }).json<WarehouseResponse>()
}

export async function deactivateWarehouse(cnpj: string, id: string) {
  return (await client()).post(`v1/companies/${cnpj}/warehouses/${id}/deactivate`).json<{ success: boolean }>()
}
```

> Adicionar imports de tipos de `@elos/shared`:
> `WarehouseResponse`, `InventoryResponse`, `CreateWarehouseDto`, `UpdateWarehouseDto`.

---

### 2. `components/domain/warehouse-form.tsx`

Form reutilizável de criação/edição. Segue o padrão de `product-form.tsx`.

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseDto,
  type WarehouseResponse,
} from '@elos/shared'
import { createWarehouse, updateWarehouse } from '@/lib/api'
import type { Resolver } from 'react-hook-form'

interface WarehouseFormProps {
  cnpj:      string
  warehouse?: WarehouseResponse // se presente, modo edição
}

export function WarehouseForm({ cnpj, warehouse }: WarehouseFormProps) {
  const router    = useRouter()
  const isEdit    = !!warehouse
  const schema    = isEdit ? updateWarehouseSchema : createWarehouseSchema

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CreateWarehouseDto>({
      resolver:      zodResolver(schema) as Resolver<CreateWarehouseDto>,
      defaultValues: warehouse
        ? {
            name:     warehouse.name,
            code:     warehouse.code     ?? undefined,
            location: warehouse.location ?? undefined,
          }
        : {},
    })

  async function onSubmit(data: CreateWarehouseDto) {
    try {
      if (isEdit) {
        await updateWarehouse(cnpj, warehouse!.id, data)
        toast.success('Armazém atualizado com sucesso.')
      } else {
        await createWarehouse(cnpj, data)
        toast.success('Armazém criado com sucesso.')
      }
      router.push(`/${cnpj}/warehouses`)
      router.refresh()
    } catch (error) {
      console.error('[WarehouseForm.onSubmit]', error)
      toast.error('Erro ao salvar armazém. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register('name')} placeholder="Ex: Armazém Central" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="code">Código</Label>
        <Input id="code" {...register('code')} placeholder="Ex: AC01" />
        {errors.code && (
          <p className="text-xs text-destructive">{errors.code.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Localização</Label>
        <Input id="location" {...register('location')} placeholder="Ex: Galpão A, Rua X" />
        {errors.location && (
          <p className="text-xs text-destructive">{errors.location.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar Alterações' : 'Criar Armazém'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${cnpj}/warehouses`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

---

### 3. `components/domain/warehouses-list-client.tsx`

Client Component com tabela, busca inline, kebab menu e desativação via
`AlertDialog`.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { MoreHorizontal, Warehouse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deactivateWarehouse } from '@/lib/api'
import type { WarehouseResponse } from '@elos/shared'

interface WarehousesListClientProps {
  cnpj:       string
  warehouses: WarehouseResponse[]
  canMutate:  boolean
}

export function WarehousesListClient({
  cnpj, warehouses, canMutate,
}: WarehousesListClientProps) {
  const router = useRouter()
  const [search, setSearch]             = useState('')
  const [toDeactivate, setToDeactivate] = useState<WarehouseResponse | null>(null)

  const filtered = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.code ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDeactivate() {
    if (!toDeactivate) return
    try {
      await deactivateWarehouse(cnpj, toDeactivate.id)
      toast.success('Armazém desativado.')
      router.refresh()
    } catch (error) {
      console.error('[WarehousesListClient.handleDeactivate]', error)
      toast.error('Erro ao desativar armazém. Verifique se há estoque.')
    } finally {
      setToDeactivate(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="search"
          placeholder="Buscar por nome ou código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Warehouse className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhum armazém encontrado.</p>
          {canMutate && (
            <Button asChild size="sm">
              <Link href={`/${cnpj}/warehouses/new`}>Criar armazém</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Localização</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((warehouse) => (
                <tr
                  key={warehouse.id}
                  className={`hover:bg-muted/30 ${!warehouse.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${cnpj}/warehouses/${warehouse.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {warehouse.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {warehouse.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {warehouse.location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        warehouse.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {warehouse.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canMutate && warehouse.isActive && (
                      <div className="relative group">
                        <button
                          type="button"
                          className="p-1 rounded-md hover:bg-muted"
                          aria-label="Ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-36 bg-card border rounded-lg shadow-md hidden group-focus-within:block z-10">
                          <Link
                            href={`/${cnpj}/warehouses/${warehouse.id}`}
                            className="block px-3 py-2 text-sm hover:bg-muted rounded-t-lg"
                          >
                            Ver detalhe
                          </Link>
                          <Link
                            href={`/${cnpj}/warehouses/${warehouse.id}/edit`}
                            className="block px-3 py-2 text-sm hover:bg-muted"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => setToDeactivate(warehouse)}
                            className="block w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-b-lg"
                          >
                            Desativar
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog
        open={!!toDeactivate}
        onOpenChange={(open) => !open && setToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar armazém?</AlertDialogTitle>
            <AlertDialogDescription>
              O armazém <strong>{toDeactivate?.name}</strong> será desativado.
              Esta ação não pode ser desfeita se houver estoque no armazém.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

---

### 4. `components/domain/inventory-table.tsx`

Tabela de saldo de estoque — usada tanto na página de detalhe do armazém quanto
na listagem global.

```tsx
'use client'

import { useState } from 'react'
import { Package, AlertTriangle } from 'lucide-react'
import type { InventoryResponse } from '@elos/shared'

interface InventoryTableProps {
  inventory:    InventoryResponse[]
  showWarehouse?: boolean // esconder coluna "Armazém" quando já estamos no contexto do armazém
}

export function InventoryTable({ inventory, showWarehouse = true }: InventoryTableProps) {
  const [search, setSearch] = useState('')

  const filtered = inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      (item.productCode ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Buscar produto…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Package className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhum produto em estoque.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {showWarehouse && (
                  <th className="text-left px-4 py-3 font-medium">Armazém</th>
                )}
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Unidade</th>
                <th className="text-right px-4 py-3 font-medium">Saldo</th>
                <th className="text-right px-4 py-3 font-medium">Mínimo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => {
                const qty     = Number(item.quantity)
                const minStock = item.minStock ? Number(item.minStock) : null
                const belowMin = minStock !== null && qty < minStock
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    {showWarehouse && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.warehouseName}
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.productCode ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={belowMin ? 'text-destructive font-semibold' : ''}>
                        {qty.toFixed(3)}
                        {belowMin && (
                          <AlertTriangle className="inline h-3 w-3 ml-1" strokeWidth={2} />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {minStock !== null ? minStock.toFixed(3) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

---

### 5. Rotas

#### `(app)/[cnpj]/warehouses/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getWarehousesServer } from '@/lib/api'
import { WarehousesListClient } from '@/components/domain/warehouses-list-client'

const MUTATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function WarehousesPage({
  params,
}: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params
  const [myCompanies, warehouses] = await Promise.all([
    getMyCompaniesServer(),
    getWarehousesServer(cnpj, { includeInactive: 'true' }),
  ])

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role       = membership?.role ?? null
  const canMutate  = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Armazéns</h1>
        {canMutate && (
          <Button asChild>
            <Link href={`/${cnpj}/warehouses/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Armazém
            </Link>
          </Button>
        )}
      </div>

      <WarehousesListClient
        cnpj={cnpj}
        warehouses={warehouses}
        canMutate={canMutate}
      />
    </div>
  )
}
```

#### `(app)/[cnpj]/warehouses/loading.tsx`

```tsx
export default function WarehousesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton rounded-md" />
      <div className="h-64 w-full skeleton rounded-lg" />
    </div>
  )
}
```

#### `(app)/[cnpj]/warehouses/error.tsx`

```tsx
'use client'

import { useEffect } from 'react'

export default function WarehousesError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[WarehousesError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar armazéns. Tente recarregar a página.
    </div>
  )
}
```

#### `(app)/[cnpj]/warehouses/new/page.tsx`

```tsx
import { WarehouseForm } from '@/components/domain/warehouse-form'

export default async function NewWarehousePage({
  params,
}: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Novo Armazém</h1>
      <WarehouseForm cnpj={cnpj} />
    </div>
  )
}
```

#### `(app)/[cnpj]/warehouses/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getWarehouseServer, getWarehouseInventoryServer } from '@/lib/api'
import { InventoryTable } from '@/components/domain/inventory-table'

const MUTATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function WarehouseDetailPage({
  params,
}: { params: Promise<{ cnpj: string; id: string }> }) {
  const { cnpj, id } = await params
  const [myCompanies, warehouse, inventoryItems] = await Promise.all([
    getMyCompaniesServer(),
    getWarehouseServer(cnpj, id),
    getWarehouseInventoryServer(cnpj, id),
  ])

  if (!warehouse) notFound()

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role       = membership?.role ?? null
  const canMutate  = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/warehouses`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Armazéns
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{warehouse.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {warehouse.code ? `Código: ${warehouse.code} · ` : ''}
            {warehouse.location ?? 'Sem localização'}
          </p>
        </div>
        {canMutate && warehouse.isActive && (
          <Button variant="outline" asChild>
            <Link href={`/${cnpj}/warehouses/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Inventário</h2>
        <InventoryTable inventory={inventoryItems} showWarehouse={false} />
      </div>
    </div>
  )
}
```

#### `(app)/[cnpj]/warehouses/[id]/loading.tsx` e `error.tsx`

Seguem o padrão de `warehouses/loading.tsx` e `warehouses/error.tsx` respectivamente.

#### `(app)/[cnpj]/warehouses/[id]/edit/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import { getWarehouseServer } from '@/lib/api'
import { WarehouseForm } from '@/components/domain/warehouse-form'

export default async function EditWarehousePage({
  params,
}: { params: Promise<{ cnpj: string; id: string }> }) {
  const { cnpj, id } = await params
  const warehouse    = await getWarehouseServer(cnpj, id)
  if (!warehouse || !warehouse.isActive) notFound()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Editar Armazém</h1>
      <WarehouseForm cnpj={cnpj} warehouse={warehouse} />
    </div>
  )
}
```

---

## Checklist de Verificação

```bash
# TypeScript
pnpm --filter web type-check

# Lint
pnpm --filter web lint

# Build
pnpm --filter web build
# Espera: rotas de warehouses presentes em .next/server/app

# Manual
# [ ] Listagem exibe armazéns ativos/inativos (toggle includeInactive)
# [ ] Busca por nome e código funciona client-side
# [ ] Criar armazém redireciona para listagem com toast de sucesso
# [ ] Editar armazém pré-preenche form com dados atuais
# [ ] Desativar via AlertDialog — toast de sucesso ou erro (estoque)
# [ ] InventoryTable exibe badge de alerta quando qty < minStock
# [ ] canMutate=false esconde botões de ação (COMPRADOR/ANALISTA não vê)
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| `includeInactive: 'true'` na listagem | ALMOXARIFE pode precisar ver armazéns inativos para referência histórica; os inativos aparecem com `opacity-50` na tabela |
| Inventário carregado no SSR do detalhe | O saldo de estoque muda pouco; SSR é suficiente para a primeira renderização; `cache: 'no-store'` garante dados frescos |
| `showWarehouse` prop na `InventoryTable` | A tabela é reutilizada na página de detalhe (coluna armazém redundante) e futuramente na listagem global de inventário (coluna armazém necessária) |
| Alerta de estoque mínimo inline | `AlertTriangle` vermelho ao lado da quantidade — visível na tabela sem modal; sem notificação push (fora do escopo v1) |
| Detalhe do armazém sem paginação do inventário | Para v1, o `limit` padrão da API (50) cobre a maioria dos casos; paginação pode ser adicionada depois sem breaking change |
