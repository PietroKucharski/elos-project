# Feature Spec — 2.5 Products UI (Next.js)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 2 — Fornecedores e Produtos  
**Unidade:** 2.5  
**Pré-requisito:** 2.3 concluído (endpoints de products + supplier links); 2.4 concluído (`lib/api.ts` com padrões SSR/client); 1.4/1.5 concluídos (app shell + componentes de domínio)  
**Commit convencional esperado:** `feat(web): add products ui with list, form, detail and supplier links`

---

## Objetivo

Criar as páginas e componentes de gestão do catálogo de produtos:

- **Listagem** com busca por nome, filtro por status ativo/inativo e filtro por unidade
- **Criação** e **edição** de produto (nome, código, unidade, estoque mínimo)
- **Detalhe** mostrando os fornecedores vinculados com ação de vínculo/desvínculo
- **Soft delete** (desativar produto) inline na listagem

Apenas COMPRADOR e ADMIN_EMPRESA veem botões de mutação. Produto inativo é
exibido com visual esmaecido; o filtro padrão mostra apenas produtos ativos.

---

## Escopo

### In

- `(app)/[cnpj]/products/page.tsx` — listagem com filtros + ações
- `(app)/[cnpj]/products/new/page.tsx` — formulário de criação
- `(app)/[cnpj]/products/[id]/page.tsx` — detalhe + fornecedores vinculados
- `(app)/[cnpj]/products/[id]/edit/page.tsx` — formulário de edição
- `(app)/[cnpj]/products/loading.tsx` — skeleton
- `(app)/[cnpj]/products/error.tsx` — error boundary
- `components/domain/product-form.tsx` — form reutilizável create/edit
- `components/domain/product-suppliers-panel.tsx` — painel de fornecedores vinculados
- `components/domain/link-supplier-sheet.tsx` — Sheet para vincular fornecedor
- Extensão de `lib/api.ts` — funções server-side e client-side de products
- shadcn: nenhum componente adicional necessário (todos já instalados em 1.5 / 2.4)

### Out (não implementar nesta unidade)

- Histórico de preços por produto/fornecedor (→ cotações futuras)
- Controle de estoque mínimo com alertas (→ Fase 5)
- Paginação server-side

---

## Estrutura de Rotas após esta unidade

```
app/
  (app)/
    [cnpj]/
      products/
        page.tsx           ← criar (listagem + filtros)
        new/
          page.tsx         ← criar
        [id]/
          page.tsx         ← criar (detalhe + fornecedores)
          edit/
            page.tsx       ← criar
        loading.tsx        ← criar
        error.tsx          ← criar
```

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  app/
    (app)/
      [cnpj]/
        products/
          page.tsx                           ← criar
          loading.tsx                        ← criar
          error.tsx                          ← criar
          new/page.tsx                       ← criar
          [id]/
            page.tsx                         ← criar
            edit/page.tsx                    ← criar
  components/
    domain/
      product-form.tsx                       ← criar
      product-suppliers-panel.tsx            ← criar
      link-supplier-sheet.tsx                ← criar
  lib/
    api.ts                                   ← modificar (funções products)
```

---

## Implementação Detalhada

### 1. Extensão de `lib/api.ts` — funções de products

```typescript
// ─── Products (server-side) ──────────────────────────────────────────────────

export async function getProductsServer(
  cnpj: string,
  params?: { search?: string; isActive?: string; unit?: string },
): Promise<ProductResponse[]> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/products`)
  if (params?.search)   url.searchParams.set('search', params.search)
  if (params?.isActive) url.searchParams.set('isActive', params.isActive)
  if (params?.unit)     url.searchParams.set('unit', params.unit)
  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export async function getProductServer(
  cnpj: string,
  id: string,
): Promise<ProductResponse | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/companies/${cnpj}/products/${id}`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return null
  return res.json()
}

// Para o link-supplier-sheet: lista todos os fornecedores APPROVED do tenant
// (reutiliza getSuppliersServer de 2.4 com status=APPROVED)

// ─── Products (client-side) ──────────────────────────────────────────────────

export async function createProduct(
  cnpj: string,
  data: CreateProductDto,
): Promise<ProductResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/products`, { json: data })
    .json<ProductResponse>()
}

export async function updateProduct(
  cnpj: string,
  id: string,
  data: UpdateProductDto,
): Promise<ProductResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/products/${id}`, { json: data })
    .json<ProductResponse>()
}

export async function deactivateProduct(cnpj: string, id: string): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/products/${id}`)
}

export async function linkSupplierToProduct(
  cnpj: string,
  productId: string,
  data: LinkProductSupplierDto,
): Promise<ProductSupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/products/${productId}/suppliers`, { json: data })
    .json<ProductSupplierResponse>()
}

export async function updateProductSupplierLink(
  cnpj: string,
  productId: string,
  supplierId: string,
  data: UpdateProductSupplierDto,
): Promise<ProductSupplierResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/products/${productId}/suppliers/${supplierId}`, { json: data })
    .json<ProductSupplierResponse>()
}

export async function unlinkSupplierFromProduct(
  cnpj: string,
  productId: string,
  supplierId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/products/${productId}/suppliers/${supplierId}`,
  )
}
```

> Adicionar os imports correspondentes de `@elos/shared` no topo de `lib/api.ts`
> (`ProductResponse`, `CreateProductDto`, `UpdateProductDto`, `LinkProductSupplierDto`,
> `UpdateProductSupplierDto`, `ProductSupplierResponse`).

---

### 2. `components/domain/product-form.tsx`

```tsx
'use client'
// apps/web/src/components/domain/product-form.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createProductSchema, unitOfMeasureValues } from '@elos/shared'
import type { CreateProductDto, UpdateProductDto, ProductResponse } from '@elos/shared'
import { Button } from '@/components/ui/button'
import { createProduct, updateProduct } from '@/lib/api'

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const inputStyle: React.CSSProperties = {
  height: 38, padding: '0 12px', fontSize: 13.5,
  borderRadius: '0.375rem', border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)', color: 'hsl(222 47% 11%)',
  outline: 'none', width: '100%',
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }

// Label amigável para cada unidade de medida
const UNIT_LABELS: Record<string, string> = {
  UN: 'Unidade (UN)',
  KG: 'Quilograma (KG)',
  G:  'Grama (G)',
  L:  'Litro (L)',
  ML: 'Mililitro (ML)',
  M:  'Metro (M)',
  M2: 'Metro quadrado (M²)',
  M3: 'Metro cúbico (M³)',
  CX: 'Caixa (CX)',
  PC: 'Peça (PC)',
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  cnpj: string
  productId?: string
  defaultValues?: Partial<CreateProductDto>
  onSuccess?: (product: ProductResponse) => void
}

export function ProductForm({ mode, cnpj, productId, defaultValues, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductDto>({
    resolver: zodResolver(createProductSchema) as never,
    defaultValues: defaultValues
      ? Object.fromEntries(
          Object.entries(defaultValues).map(([k, v]) => [k, v ?? undefined])
        )
      : { unit: 'UN', isActive: true },
  })

  const onSubmit = async (data: CreateProductDto) => {
    setLoading(true)
    try {
      let result: ProductResponse
      if (mode === 'create') {
        result = await createProduct(cnpj, data)
        toast.success('Produto criado com sucesso.')
      } else {
        result = await updateProduct(cnpj, productId!, data as UpdateProductDto)
        toast.success('Produto atualizado com sucesso.')
      }
      onSuccess?.(result)
      router.push(`/${cnpj}/products`)
      router.refresh()
    } catch {
      toast.error(mode === 'create' ? 'Erro ao criar produto.' : 'Erro ao atualizar produto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Nome */}
      <div style={fieldStyle}>
        <label htmlFor="name" style={labelStyle}>Nome do produto *</label>
        <input id="name" {...register('name')} style={inputStyle}
          placeholder="Ex: Parafuso M6 × 20mm" />
        {errors.name && <span style={errorStyle}>{errors.name.message}</span>}
      </div>

      {/* Código interno */}
      <div style={fieldStyle}>
        <label htmlFor="code" style={labelStyle}>Código interno</label>
        <input id="code" {...register('code')} style={inputStyle}
          placeholder="Ex: PAR-M6-20" />
        {errors.code && <span style={errorStyle}>{errors.code.message}</span>}
        <p style={{ fontSize: 11, color: 'hsl(215 16% 47%)' }}>
          Código único por empresa. Deixe em branco para geração automática futura.
        </p>
      </div>

      {/* Unidade de medida */}
      <div style={fieldStyle}>
        <label htmlFor="unit" style={labelStyle}>Unidade de medida *</label>
        <select id="unit" {...register('unit')} style={{ ...inputStyle, cursor: 'pointer' }}>
          {unitOfMeasureValues.map((u) => (
            <option key={u} value={u}>{UNIT_LABELS[u] ?? u}</option>
          ))}
        </select>
        {errors.unit && <span style={errorStyle}>{errors.unit.message}</span>}
      </div>

      {/* Estoque mínimo */}
      <div style={fieldStyle}>
        <label htmlFor="minStock" style={labelStyle}>Estoque mínimo</label>
        <input id="minStock" type="number" min={0} step="0.001" {...register('minStock', { valueAsNumber: true })}
          style={inputStyle} placeholder="0" />
        {errors.minStock && <span style={errorStyle}>{errors.minStock.message}</span>}
        <p style={{ fontSize: 11, color: 'hsl(215 16% 47%)' }}>
          Alerta quando o estoque cair abaixo deste valor (funcionalidade na Fase 5).
        </p>
      </div>

      {/* Descrição */}
      <div style={fieldStyle}>
        <label htmlFor="description" style={labelStyle}>Descrição</label>
        <textarea id="description" {...register('description')} rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
          placeholder="Especificações técnicas, observações..." />
        {errors.description && <span style={errorStyle}>{errors.description.message}</span>}
      </div>

      {/* Ativo — apenas em modo edit */}
      {mode === 'edit' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input id="isActive" type="checkbox" {...register('isActive')}
            style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Produto ativo
          </label>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 style={{ width: 14, height: 14, marginRight: 6, animation: 'spin 1s linear infinite' }} />}
          {mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
```

---

### 3. `(app)/[cnpj]/products/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/products/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProductsServer, getCompanyServer } from '@/lib/api'
import { headers } from 'next/headers'
import { auth } from '@/lib/server-auth'
import { ProductsListClient } from '@/components/domain/products-list-client'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function ProductsPage({ params }: Props) {
  const { cnpj } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session as { user?: { role?: string } } | null)?.user?.role ?? ''
  const canMutate = role === 'COMPRADOR' || role === 'ADMIN_EMPRESA' || role === 'SUPER_ADMIN'

  const [products, company] = await Promise.all([
    getProductsServer(cnpj),
    getCompanyServer(cnpj),
  ])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Produtos</h1>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            Catálogo de produtos de {company?.name ?? cnpj}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/products/new`}>
            <Button>
              <Plus style={{ width: 15, height: 15, marginRight: 6 }} />
              Novo produto
            </Button>
          </Link>
        )}
      </div>

      <ProductsListClient
        initialProducts={products}
        cnpj={cnpj}
        canMutate={canMutate}
      />
    </div>
  )
}
```

#### `components/domain/products-list-client.tsx` (estrutura)

Client Component para filtros + tabela de produtos:

```tsx
'use client'
// apps/web/src/components/domain/products-list-client.tsx

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Eye, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductResponse } from '@elos/shared'
import { deactivateProduct } from '@/lib/api'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Filtros: input de busca (nome/código) + select de unidade + toggle Ativo/Inativo
// Tabela: Nome | Código | Unidade | Estoque Mínimo | Fornecedores | Ativo | Ações
// Kebab menu: Ver detalhes, Editar, Desativar (apenas para produtos ativos)
// Produto inativo: linha com opacity 0.5 e badge "Inativo"
```

A implementação segue exatamente o mesmo padrão de `SuppliersListClient` (2.4):
estado local derivado de `initialProducts`, filtro aplicado com `useMemo`, e
AlertDialog de confirmação antes de desativar.

---

### 4. `(app)/[cnpj]/products/new/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/products/new/page.tsx
import { ProductForm } from '@/components/domain/product-form'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function NewProductPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Novo produto
      </h1>
      <div style={{
        background: 'white', borderRadius: '0.5rem',
        border: '1px solid hsl(214 32% 91%)', padding: 28,
      }}>
        <ProductForm mode="create" cnpj={cnpj} />
      </div>
    </div>
  )
}
```

---

### 5. `(app)/[cnpj]/products/[id]/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/products/[id]/page.tsx
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/server-auth'
import { getProductServer, getSuppliersServer } from '@/lib/api'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
import { ProductSuppliersPanel } from '@/components/domain/product-suppliers-panel'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { cnpj, id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session as { user?: { role?: string } } | null)?.user?.role ?? ''
  const canMutate = role === 'COMPRADOR' || role === 'ADMIN_EMPRESA' || role === 'SUPER_ADMIN'

  const [product, approvedSuppliers] = await Promise.all([
    getProductServer(cnpj, id),
    // Fornecedores aprovados disponíveis para vínculo
    getSuppliersServer(cnpj, { status: 'APPROVED' }),
  ])

  if (!product) notFound()

  const UNIT_LABELS: Record<string, string> = {
    UN: 'UN', KG: 'KG', G: 'G', L: 'L', ML: 'ML',
    M: 'M', M2: 'M²', M3: 'M³', CX: 'CX', PC: 'PC',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              {product.name}
            </h1>
            {!product.isActive && (
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '2px 8px',
                borderRadius: 9999, background: 'hsl(214 32% 91%)',
                color: 'hsl(215 16% 47%)',
              }}>
                Inativo
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
            {product.code && `Código: ${product.code} · `}
            Unidade: {UNIT_LABELS[product.unit] ?? product.unit}
            {product.minStock && ` · Estoque mínimo: ${product.minStock}`}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/products/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil style={{ width: 14, height: 14, marginRight: 6 }} />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Descrição */}
      {product.description && (
        <div style={{
          background: 'white', borderRadius: '0.5rem',
          border: '1px solid hsl(214 32% 91%)', padding: 20, marginBottom: 24,
        }}>
          <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginBottom: 6 }}>Descrição</p>
          <p style={{ fontSize: 14, color: 'hsl(222 47% 11%)', whiteSpace: 'pre-wrap' }}>
            {product.description}
          </p>
        </div>
      )}

      {/* Painel de fornecedores */}
      <ProductSuppliersPanel
        cnpj={cnpj}
        productId={id}
        initialLinks={product.suppliers ?? []}
        availableSuppliers={approvedSuppliers}
        canMutate={canMutate}
      />
    </div>
  )
}
```

---

### 6. `components/domain/product-suppliers-panel.tsx`

Client Component que exibe a lista de fornecedores vinculados ao produto e
gerencia o estado de vínculo/desvínculo/isPreferred.

```tsx
'use client'
// apps/web/src/components/domain/product-suppliers-panel.tsx

import { useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SupplierResponse } from '@elos/shared'
import { unlinkSupplierFromProduct, updateProductSupplierLink } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LinkSupplierSheet } from './link-supplier-sheet'

interface LinkedSupplier {
  id: string
  supplierId: string
  supplierName: string
  isPreferred: boolean
  notes: string | null
}

interface ProductSuppliersPanelProps {
  cnpj: string
  productId: string
  initialLinks: LinkedSupplier[]
  availableSuppliers: SupplierResponse[]
  canMutate: boolean
}

export function ProductSuppliersPanel({
  cnpj, productId, initialLinks, availableSuppliers, canMutate,
}: ProductSuppliersPanelProps) {
  const [links, setLinks] = useState(initialLinks)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleUnlink = async (link: LinkedSupplier) => {
    try {
      await unlinkSupplierFromProduct(cnpj, productId, link.supplierId)
      setLinks((prev) => prev.filter((l) => l.id !== link.id))
      toast.success(`${link.supplierName} desvinculado.`)
    } catch {
      toast.error('Erro ao desvincular fornecedor.')
    }
    setRemovingId(null)
  }

  const handleTogglePreferred = async (link: LinkedSupplier) => {
    try {
      const updated = await updateProductSupplierLink(cnpj, productId, link.supplierId, {
        isPreferred: !link.isPreferred,
      })
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, isPreferred: updated.isPreferred } : l)))
      toast.success(updated.isPreferred ? 'Definido como preferido.' : 'Marcação removida.')
    } catch {
      toast.error('Erro ao atualizar preferência.')
    }
  }

  // Fornecedores já vinculados (excluir do select do Sheet)
  const linkedSupplierIds = new Set(links.map((l) => l.supplierId))
  const unlinkedSuppliers = availableSuppliers.filter((s) => !linkedSupplierIds.has(s.id))

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
          Fornecedores vinculados
          <span style={{ fontSize: 13, fontWeight: 400, color: 'hsl(215 16% 47%)', marginLeft: 8 }}>
            ({links.length})
          </span>
        </h2>
        {canMutate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            disabled={unlinkedSuppliers.length === 0}
          >
            <Plus style={{ width: 14, height: 14, marginRight: 6 }} />
            Vincular fornecedor
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: '0.5rem',
          border: '1px solid hsl(214 32% 91%)',
          padding: '32px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)' }}>
            Nenhum fornecedor vinculado a este produto.
          </p>
          {canMutate && (
            <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 6 }}>
              Vincule um fornecedor aprovado para usá-lo em cotações.
            </p>
          )}
        </div>
      ) : (
        <div style={{
          background: 'white', borderRadius: '0.5rem',
          border: '1px solid hsl(214 32% 91%)', overflow: 'hidden',
        }}>
          {links.map((link, idx) => (
            <div
              key={link.id}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 20px',
                borderTop: idx > 0 ? '1px solid hsl(214 32% 91%)' : 'none',
              }}
            >
              {/* Ícone de preferido */}
              <button
                type="button"
                disabled={!canMutate}
                onClick={() => handleTogglePreferred(link)}
                style={{
                  marginRight: 12, cursor: canMutate ? 'pointer' : 'default',
                  background: 'none', border: 'none', padding: 2,
                  color: link.isPreferred ? 'hsl(38 92% 50%)' : 'hsl(214 32% 91%)',
                }}
                title={link.isPreferred ? 'Remover preferência' : 'Definir como preferido'}
              >
                <Star style={{ width: 16, height: 16, fill: link.isPreferred ? 'currentColor' : 'none' }} />
              </button>

              {/* Nome do fornecedor */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'hsl(222 47% 11%)' }}>
                  {link.supplierName}
                  {link.isPreferred && (
                    <span style={{ fontSize: 11, color: 'hsl(38 92% 50%)', marginLeft: 8 }}>
                      Preferido
                    </span>
                  )}
                </p>
                {link.notes && (
                  <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                    {link.notes}
                  </p>
                )}
              </div>

              {/* Ação de desvincular */}
              {canMutate && (
                <button
                  type="button"
                  onClick={() => setRemovingId(link.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 6, color: 'hsl(215 16% 47%)',
                  }}
                  title="Desvincular fornecedor"
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AlertDialog de confirmação de desvínculo */}
      <AlertDialog open={removingId !== null} onOpenChange={() => setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              O fornecedor será removido deste produto.
              Cotações existentes não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const link = links.find((l) => l.id === removingId)
                if (link) handleUnlink(link)
              }}
              style={{ background: 'hsl(0 84% 60%)', color: 'white' }}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet de vínculo */}
      <LinkSupplierSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cnpj={cnpj}
        productId={productId}
        availableSuppliers={unlinkedSuppliers}
        onLinked={(newLink) => {
          setLinks((prev) => [...prev, newLink])
          setSheetOpen(false)
        }}
      />
    </div>
  )
}
```

---

### 7. `components/domain/link-supplier-sheet.tsx`

```tsx
'use client'
// apps/web/src/components/domain/link-supplier-sheet.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { linkProductSupplierSchema } from '@elos/shared'
import type { LinkProductSupplierDto, SupplierResponse } from '@elos/shared'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { linkSupplierToProduct } from '@/lib/api'

interface LinkedSupplier {
  id: string; supplierId: string; supplierName: string
  isPreferred: boolean; notes: string | null
}

interface LinkSupplierSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  productId: string
  availableSuppliers: SupplierResponse[]
  onLinked: (link: LinkedSupplier) => void
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const inputStyle: React.CSSProperties = {
  height: 38, padding: '0 12px', fontSize: 13.5,
  borderRadius: '0.375rem', border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)', color: 'hsl(222 47% 11%)', width: '100%',
}

export function LinkSupplierSheet({
  open, onOpenChange, cnpj, productId, availableSuppliers, onLinked,
}: LinkSupplierSheetProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LinkProductSupplierDto>({
    resolver: zodResolver(linkProductSupplierSchema),
    defaultValues: { isPreferred: false },
  })

  const selectedSupplierId = watch('supplierId')
  const selectedSupplier = availableSuppliers.find((s) => s.id === selectedSupplierId)

  const onSubmit = async (data: LinkProductSupplierDto) => {
    setLoading(true)
    try {
      const result = await linkSupplierToProduct(cnpj, productId, data)
      onLinked({
        id:           result.id,
        supplierId:   result.supplierId,
        supplierName: selectedSupplier?.name ?? '',
        isPreferred:  result.isPreferred,
        notes:        result.notes,
      })
      toast.success('Fornecedor vinculado com sucesso.')
      reset()
    } catch {
      toast.error('Erro ao vincular fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ width: 440 }}>
        <SheetHeader>
          <SheetTitle>Vincular fornecedor</SheetTitle>
          <SheetDescription>
            Selecione um fornecedor aprovado para associar a este produto.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>

          {/* Seleção do fornecedor */}
          <div style={fieldStyle}>
            <label htmlFor="supplierId" style={labelStyle}>Fornecedor *</label>
            {availableSuppliers.length === 0 ? (
              <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
                Todos os fornecedores aprovados já estão vinculados.
              </p>
            ) : (
              <select id="supplierId" {...register('supplierId')}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {errors.supplierId && (
              <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }}>
                {errors.supplierId.message}
              </span>
            )}
          </div>

          {/* Preferido */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="isPreferred" type="checkbox" {...register('isPreferred')}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="isPreferred" style={{ fontSize: 13, cursor: 'pointer' }}>
              Fornecedor preferido para este produto
            </label>
          </div>

          {/* Observações */}
          <div style={fieldStyle}>
            <label htmlFor="notes" style={labelStyle}>Observações</label>
            <textarea id="notes" {...register('notes')} rows={2}
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
              placeholder="Condições especiais, prazo típico de entrega..." />
          </div>

          {/* Preview do fornecedor selecionado */}
          {selectedSupplier && (
            <div style={{
              background: 'hsl(210 40% 96%)', borderRadius: '0.375rem',
              padding: '10px 14px', fontSize: 13,
            }}>
              <p style={{ fontWeight: 500 }}>{selectedSupplier.name}</p>
              <p style={{ color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                {selectedSupplier.type === 'PJ'
                  ? `CNPJ: ${selectedSupplier.cnpj}`
                  : `CPF: ${selectedSupplier.cpf}`}
                {selectedSupplier.email && ` · ${selectedSupplier.email}`}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || availableSuppliers.length === 0}>
              {loading && <Loader2 style={{ width: 14, height: 14, marginRight: 6, animation: 'spin 1s linear infinite' }} />}
              Vincular
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

---

### 8. `(app)/[cnpj]/products/[id]/edit/page.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/products/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/domain/product-form'
import { getProductServer } from '@/lib/api'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { cnpj, id } = await params
  const product = await getProductServer(cnpj, id)
  if (!product) notFound()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Editar produto
      </h1>
      <div style={{
        background: 'white', borderRadius: '0.5rem',
        border: '1px solid hsl(214 32% 91%)', padding: 28,
      }}>
        <ProductForm
          mode="edit"
          cnpj={cnpj}
          productId={id}
          defaultValues={{
            name:        product.name,
            code:        product.code ?? undefined,
            description: product.description ?? undefined,
            unit:        product.unit,
            minStock:    product.minStock ? parseFloat(product.minStock) : undefined,
            isActive:    product.isActive,
          }}
        />
      </div>
    </div>
  )
}
```

---

### 9. `loading.tsx` e `error.tsx`

```tsx
// apps/web/src/app/(app)/[cnpj]/products/loading.tsx
export default function ProductsLoading() {
  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="skeleton" style={{ height: 28, width: 140, marginBottom: 24, borderRadius: 6 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 6 }} />
      ))}
    </div>
  )
}
```

```tsx
// apps/web/src/app/(app)/[cnpj]/products/error.tsx
'use client'
import { Button } from '@/components/ui/button'
export default function ProductsError({ reset }: { reset: () => void }) {
  return (
    <div style={{ padding: '28px 32px', textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: 'hsl(0 84% 60%)', marginBottom: 16 }}>
        Erro ao carregar produtos.
      </p>
      <Button variant="outline" onClick={reset}>Tentar novamente</Button>
    </div>
  )
}
```

---

### 10. Adição ao `sidebar.tsx` (1.4)

Adicionar o item de navegação "Produtos" (após Fornecedores):

```tsx
// Em apps/web/src/components/domain/sidebar.tsx
// Dentro do array de navegação, após Fornecedores:
{
  label: 'Produtos',
  href: `/${cnpj}/products`,
  icon: Package,  // import de lucide-react
  roles: ['ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE', 'ANALISTA_FINANCEIRO', 'TRANSPORTADOR'],
}
```

---

## Verificação

- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] `pnpm --filter web build` compila + gera as rotas de products sem erro
- [ ] Checklist funcional:
  - [ ] ALMOXARIFE vê a lista mas não vê botão "Novo produto" nem ação de desativar
  - [ ] Produto inativo aparece com visual esmaecido e badge "Inativo"
  - [ ] Filtro padrão mostra apenas produtos ativos (isActive=true)
  - [ ] `LinkSupplierSheet` só lista fornecedores APPROVED ainda não vinculados
  - [ ] Botão "Vincular fornecedor" é desabilitado quando não há fornecedores disponíveis
  - [ ] Star de "preferido" alterna entre preenchido e vazio ao clicar
  - [ ] Após criar produto, redireciona para `/[cnpj]/products`
  - [ ] `minStock` no form aceita decimais (step="0.001")
  - [ ] Ao desvincular, AlertDialog de confirmação aparece antes de confirmar
