# Feature Spec — 5.7 Non-Conformities UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.7  
**Pré-requisito:** 5.4 concluído (API de NCs disponível)  
**Commit convencional esperado:** `feat(web): add non-conformities ui with list, detail and status flow`

---

## Objetivo

Criar a interface de não-conformidades: listagem com filtros, detalhe com
histórico de comentários e transições de status (Analisar, Resolver, Rejeitar).
Integração com o detalhe do Pedido de Compra: card "Não-Conformidades" para
abrir NCs diretamente associadas ao PO.

---

## Escopo

### In

- Extensão de `apps/web/src/lib/api.ts` com funções de NCs
- `apps/web/src/components/domain/nc-status-badge.tsx`
- `apps/web/src/components/domain/non-conformity-form.tsx`
- `apps/web/src/components/domain/non-conformities-list-client.tsx`
- `apps/web/src/components/domain/nc-actions.tsx`
- `apps/web/src/components/domain/nc-comments-panel.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/loading.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/error.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/new/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/[id]/page.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/[id]/loading.tsx`
- `apps/web/src/app/(app)/[cnpj]/non-conformities/[id]/error.tsx`
- Modificação em `apps/web/src/app/(app)/[cnpj]/purchase-orders/[id]/page.tsx`
  — card "Não-Conformidades" com link para abrir nova NC

### Out

- Upload de anexos (→ Fase 6)
- Edição/exclusão de comentários na v1

---

## Arquivos a Criar / Modificar

```
apps/web/src/
  lib/
    api.ts                                               ← modificar
  components/domain/
    nc-status-badge.tsx                                  ← criar
    non-conformity-form.tsx                              ← criar
    non-conformities-list-client.tsx                     ← criar
    nc-actions.tsx                                       ← criar
    nc-comments-panel.tsx                                ← criar
  app/(app)/[cnpj]/
    non-conformities/
      page.tsx                                           ← criar
      loading.tsx                                        ← criar
      error.tsx                                          ← criar
      new/
        page.tsx                                         ← criar
      [id]/
        page.tsx                                         ← criar
        loading.tsx                                      ← criar
        error.tsx                                        ← criar
    purchase-orders/
      [id]/
        page.tsx                                         ← modificar (card NC)
```

---

## Implementação Detalhada

### 1. Extensão de `lib/api.ts`

```typescript
// ─── Server-side (NCs) ────────────────────────────────────────────────────────

export async function getNonConformitiesServer(
  cnpj: string,
  params?: {
    status?: string; type?: string; severity?: string
    supplierId?: string; purchaseOrderId?: string
    search?: string; page?: string; limit?: string
  },
) {
  const headers = await sessionHeaders()
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/non-conformities${qs}`, {
    headers, cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<NonConformityResponse[]>
}

export async function getNonConformityServer(cnpj: string, id: string) {
  const headers = await sessionHeaders()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/non-conformities/${id}`, {
    headers, cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<NonConformityResponse>
}

// ─── Client-side (mutações) ───────────────────────────────────────────────────

export async function createNonConformity(cnpj: string, data: CreateNonConformityDto) {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities`, { json: data })
    .json<NonConformityResponse>()
}

export async function updateNonConformity(cnpj: string, id: string, data: UpdateNonConformityDto) {
  return (await client())
    .patch(`v1/companies/${cnpj}/non-conformities/${id}`, { json: data })
    .json<NonConformityResponse>()
}

export async function analyzeNonConformity(cnpj: string, id: string, data?: AnalyzeNcDto) {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/analyze`, { json: data ?? {} })
    .json<NonConformityResponse>()
}

export async function resolveNonConformity(cnpj: string, id: string, data: ResolveNcDto) {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/resolve`, { json: data })
    .json<NonConformityResponse>()
}

export async function rejectNonConformity(cnpj: string, id: string, data: RejectNcDto) {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/reject`, { json: data })
    .json<NonConformityResponse>()
}

export async function addNcComment(cnpj: string, id: string, data: AddNcCommentDto) {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/comments`, { json: data })
    .json<NcCommentResponse>()
}
```

> Adicionar imports de tipos de `@elos/shared`:
> `NonConformityResponse`, `NcCommentResponse`, `CreateNonConformityDto`,
> `UpdateNonConformityDto`, `AnalyzeNcDto`, `ResolveNcDto`, `RejectNcDto`,
> `AddNcCommentDto`.

---

### 2. `components/domain/nc-status-badge.tsx`

```tsx
import type { NonConformityStatus } from '@elos/shared'

const STATUS_CONFIG: Record<
  NonConformityStatus,
  { label: string; className: string }
> = {
  OPEN:      { label: 'Aberta',     className: 'bg-warning/10 text-warning' },
  ANALYZING: { label: 'Em Análise', className: 'bg-info/10 text-info' },
  RESOLVED:  { label: 'Resolvida',  className: 'bg-success/10 text-success' },
  REJECTED:  { label: 'Rejeitada',  className: 'bg-destructive/10 text-destructive' },
}

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW:      { label: 'Baixa',    className: 'bg-muted text-muted-foreground' },
  MEDIUM:   { label: 'Média',    className: 'bg-warning/10 text-warning' },
  HIGH:     { label: 'Alta',     className: 'bg-destructive/10 text-destructive' },
  CRITICAL: { label: 'Crítica',  className: 'bg-destructive text-destructive-foreground' },
}

export function NcStatusBadge({ status }: { status: NonConformityStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export function NcSeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] ?? { label: severity, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
```

---

### 3. `components/domain/non-conformity-form.tsx`

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
  createNonConformitySchema,
  ncTypeValues,
  ncStatusValues as _,   // não usado diretamente; importado apenas para garantir tree-shake
  severityValues,
  type CreateNonConformityDto,
  type NonConformityResponse,
} from '@elos/shared'
import { createNonConformity } from '@/lib/api'
import type { SupplierResponse } from '@elos/shared'
import type { Resolver } from 'react-hook-form'

const TYPE_LABELS: Record<string, string> = {
  QUALITY:       'Qualidade',
  QUANTITY:      'Quantidade',
  DELIVERY:      'Entrega',
  DOCUMENTATION: 'Documentação',
  OTHER:         'Outro',
}

const SEVERITY_LABELS: Record<string, string> = {
  LOW:      'Baixa',
  MEDIUM:   'Média',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

interface NonConformityFormProps {
  cnpj:            string
  suppliers:       SupplierResponse[]
  purchaseOrderId?: string  // pré-selecionado se vindo do detalhe do PO
}

export function NonConformityForm({
  cnpj, suppliers, purchaseOrderId,
}: NonConformityFormProps) {
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CreateNonConformityDto>({
      resolver: zodResolver(createNonConformitySchema) as Resolver<CreateNonConformityDto>,
      defaultValues: {
        purchaseOrderId: purchaseOrderId ?? undefined,
        supplierId:      suppliers[0]?.id ?? '',
        type:            'QUALITY',
        severity:        'MEDIUM',
      },
    })

  async function onSubmit(data: CreateNonConformityDto) {
    try {
      const nc = await createNonConformity(cnpj, data)
      toast.success('Não-conformidade aberta com sucesso.')
      router.push(`/${cnpj}/non-conformities/${nc.id}`)
      router.refresh()
    } catch (error) {
      console.error('[NonConformityForm.onSubmit]', error)
      toast.error('Erro ao abrir não-conformidade. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {/* Fornecedor */}
      <div className="space-y-1">
        <Label htmlFor="supplierId">Fornecedor *</Label>
        <select
          id="supplierId"
          {...register('supplierId')}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {errors.supplierId && (
          <p className="text-xs text-destructive">{errors.supplierId.message}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <Label htmlFor="type">Tipo *</Label>
        <select
          id="type"
          {...register('type')}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ncTypeValues.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>
      </div>

      {/* Severidade */}
      <div className="space-y-1">
        <Label htmlFor="severity">Severidade *</Label>
        <select
          id="severity"
          {...register('severity')}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {severityValues.map((s) => (
            <option key={s} value={s}>{SEVERITY_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Label htmlFor="description">Descrição do problema *</Label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder="Descreva o problema com pelo menos 10 caracteres…"
          className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <Label htmlFor="notes">Notas adicionais</Label>
        <Input id="notes" {...register('notes')} placeholder="Opcional" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Abrindo…' : 'Abrir NC'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${cnpj}/non-conformities`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

---

### 4. `components/domain/nc-actions.tsx`

Client Component com as ações de transição de status (Analisar, Resolver,
Rejeitar) via `AlertDialog` com campos de texto.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { analyzeNonConformity, resolveNonConformity, rejectNonConformity } from '@/lib/api'
import type { NonConformityStatus } from '@elos/shared'

interface NcActionsProps {
  cnpj:   string
  id:     string
  status: NonConformityStatus
  canAct: boolean // COMPRADOR / ADMIN_EMPRESA / SUPER_ADMIN
}

export function NcActions({ cnpj, id, status, canAct }: NcActionsProps) {
  const router              = useRouter()
  const [resolution, setResolution] = useState('')
  const [dialog, setDialog] = useState<'analyze' | 'resolve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleAction() {
    if (!dialog) return
    if ((dialog === 'resolve' || dialog === 'reject') && resolution.trim().length < 5) {
      toast.error('Informe o motivo (mínimo 5 caracteres).')
      return
    }

    setLoading(true)
    try {
      if (dialog === 'analyze') {
        await analyzeNonConformity(cnpj, id)
        toast.success('NC enviada para análise.')
      } else if (dialog === 'resolve') {
        await resolveNonConformity(cnpj, id, { resolution: resolution.trim() })
        toast.success('NC resolvida.')
      } else {
        await rejectNonConformity(cnpj, id, { resolution: resolution.trim() })
        toast.success('NC rejeitada.')
      }
      router.refresh()
    } catch (error) {
      console.error('[NcActions.handleAction]', error)
      toast.error('Erro ao atualizar a NC. Tente novamente.')
    } finally {
      setLoading(false)
      setDialog(null)
      setResolution('')
    }
  }

  if (!canAct) return null

  return (
    <>
      <div className="flex gap-2">
        {status === 'OPEN' && (
          <Button variant="outline" onClick={() => setDialog('analyze')}>
            Iniciar Análise
          </Button>
        )}
        {status === 'ANALYZING' && (
          <>
            <Button onClick={() => setDialog('resolve')}>
              Resolver
            </Button>
            <Button variant="outline" onClick={() => setDialog('reject')} className="text-destructive border-destructive hover:bg-destructive/10">
              Rejeitar
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === 'analyze' && 'Iniciar análise da NC?'}
              {dialog === 'resolve' && 'Resolver não-conformidade'}
              {dialog === 'reject' && 'Rejeitar não-conformidade'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === 'analyze' && 'A NC será movida para o status "Em Análise".'}
              {dialog === 'resolve' && 'Descreva como o problema foi resolvido.'}
              {dialog === 'reject' && 'Informe o motivo da rejeição da NC.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(dialog === 'resolve' || dialog === 'reject') && (
            <div className="space-y-2 my-2">
              <Label htmlFor="resolution">
                {dialog === 'resolve' ? 'Resolução *' : 'Motivo da rejeição *'}
              </Label>
              <textarea
                id="resolution"
                rows={3}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Mínimo 5 caracteres…"
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleAction}
              disabled={loading}
              variant={dialog === 'reject' ? 'destructive' : 'default'}
            >
              {loading ? 'Aguarde…' : 'Confirmar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

---

### 5. `components/domain/nc-comments-panel.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addNcComment } from '@/lib/api'
import type { NcCommentResponse } from '@elos/shared'

interface NcCommentsPanelProps {
  cnpj:     string
  ncId:     string
  comments: NcCommentResponse[]
}

export function NcCommentsPanel({ cnpj, ncId, comments }: NcCommentsPanelProps) {
  const router = useRouter()
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (text.trim().length === 0) return
    setSending(true)
    try {
      await addNcComment(cnpj, ncId, { text: text.trim() })
      setText('')
      router.refresh()
    } catch (error) {
      console.error('[NcCommentsPanel.handleSend]', error)
      toast.error('Erro ao enviar comentário.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Comentários ({comments.length})</h2>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{
                  background: `hsl(${(c.userName.charCodeAt(0) * 37) % 360} 60% 50%)`,
                }}
                aria-hidden="true"
              >
                {c.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      )}

      {/* Campo de novo comentário */}
      <div className="flex gap-2 pt-2 border-t">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adicionar comentário…"
          className="flex-1 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSend()
            }
          }}
          aria-label="Novo comentário"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={sending || text.trim().length === 0}
          aria-label="Enviar comentário"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

---

### 6. `components/domain/non-conformities-list-client.tsx`

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { NcStatusBadge, NcSeverityBadge } from '@/components/domain/nc-status-badge'
import type { NonConformityResponse } from '@elos/shared'

const TYPE_LABELS: Record<string, string> = {
  QUALITY: 'Qualidade', QUANTITY: 'Quantidade',
  DELIVERY: 'Entrega', DOCUMENTATION: 'Documentação', OTHER: 'Outro',
}

interface NonConformitiesListClientProps {
  cnpj:             string
  nonConformities:  NonConformityResponse[]
  canCreate:        boolean
}

export function NonConformitiesListClient({
  cnpj, nonConformities, canCreate,
}: NonConformitiesListClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch]             = useState('')

  const filtered = nonConformities.filter((nc) => {
    const matchStatus = statusFilter === 'ALL' || nc.status === statusFilter
    const matchSearch =
      nc.description.toLowerCase().includes(search.toLowerCase()) ||
      nc.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (nc.purchaseOrderNumber ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statusOptions = ['ALL', 'OPEN', 'ANALYZING', 'RESOLVED', 'REJECTED']
  const statusLabels: Record<string, string> = {
    ALL: 'Todas', OPEN: 'Abertas', ANALYZING: 'Em Análise',
    RESOLVED: 'Resolvidas', REJECTED: 'Rejeitadas',
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border overflow-hidden">
          {statusOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por descrição, fornecedor ou PO…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhuma não-conformidade encontrada.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Severidade</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Aberta em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((nc) => (
                <tr key={nc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${cnpj}/non-conformities/${nc.id}`}
                      className="font-medium text-primary hover:underline line-clamp-2 max-w-xs"
                    >
                      {nc.description}
                    </Link>
                    {nc.purchaseOrderNumber && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        PO: {nc.purchaseOrderNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{nc.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {TYPE_LABELS[nc.type] ?? nc.type}
                  </td>
                  <td className="px-4 py-3">
                    <NcSeverityBadge severity={nc.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <NcStatusBadge status={nc.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(nc.createdAt).toLocaleDateString('pt-BR')}
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

### 7. Rotas

#### `(app)/[cnpj]/non-conformities/page.tsx`

```tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNonConformitiesServer, getMyCompaniesServer } from '@/lib/api'
import { NonConformitiesListClient } from '@/components/domain/non-conformities-list-client'

const CREATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function NonConformitiesPage({
  params,
}: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params
  const [myCompanies, ncs] = await Promise.all([
    getMyCompaniesServer(),
    getNonConformitiesServer(cnpj),
  ])

  const role      = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canCreate = role !== null && CREATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Não-Conformidades</h1>
        {canCreate && (
          <Button asChild>
            <Link href={`/${cnpj}/non-conformities/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Abrir NC
            </Link>
          </Button>
        )}
      </div>
      <NonConformitiesListClient
        cnpj={cnpj}
        nonConformities={ncs}
        canCreate={canCreate}
      />
    </div>
  )
}
```

#### `(app)/[cnpj]/non-conformities/loading.tsx` e `error.tsx`

Seguem o padrão das fases anteriores.

#### `(app)/[cnpj]/non-conformities/new/page.tsx`

```tsx
import { getSuppliersServer, getMyCompaniesServer } from '@/lib/api'
import { NonConformityForm } from '@/components/domain/non-conformity-form'

export default async function NewNcPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>
  searchParams?: Promise<{ purchaseOrderId?: string }>
}) {
  const { cnpj }       = await params
  const sp             = await searchParams
  const poId           = sp?.purchaseOrderId
  const [suppliers]    = await Promise.all([getSuppliersServer(cnpj, { status: 'APPROVED' })])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Abrir Não-Conformidade</h1>
      <NonConformityForm
        cnpj={cnpj}
        suppliers={suppliers}
        purchaseOrderId={poId}
      />
    </div>
  )
}
```

> Usa `searchParams` para pré-preencher `purchaseOrderId` quando a NC é
> aberta a partir do detalhe de um PO com `?purchaseOrderId=...`.

#### `(app)/[cnpj]/non-conformities/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNonConformityServer, getMyCompaniesServer } from '@/lib/api'
import { NcStatusBadge, NcSeverityBadge } from '@/components/domain/nc-status-badge'
import { NcActions } from '@/components/domain/nc-actions'
import { NcCommentsPanel } from '@/components/domain/nc-comments-panel'

const ACT_ROLES = ['ADMIN_EMPRESA', 'COMPRADOR', 'SUPER_ADMIN']

export default async function NcDetailPage({
  params,
}: { params: Promise<{ cnpj: string; id: string }> }) {
  const { cnpj, id } = await params
  const [myCompanies, nc] = await Promise.all([
    getMyCompaniesServer(),
    getNonConformityServer(cnpj, id),
  ])

  if (!nc) notFound()

  const role   = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canAct = role !== null && ACT_ROLES.includes(role)

  const comments = nc.comments ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/non-conformities`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Não-Conformidades
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <NcStatusBadge status={nc.status} />
            <NcSeverityBadge severity={nc.severity} />
          </div>
          <p className="text-sm text-muted-foreground">
            {nc.supplierName}
            {nc.purchaseOrderNumber ? ` · PO ${nc.purchaseOrderNumber}` : ''}
          </p>
        </div>
        <NcActions cnpj={cnpj} id={nc.id} status={nc.status} canAct={canAct} />
      </div>

      {/* Descrição */}
      <div className="mb-6 max-w-2xl">
        <h2 className="text-base font-medium mb-2">Descrição</h2>
        <p className="text-sm whitespace-pre-wrap">{nc.description}</p>
        {nc.notes && (
          <p className="text-sm text-muted-foreground mt-2 italic">{nc.notes}</p>
        )}
      </div>

      {/* Resolução (se finalizada) */}
      {nc.resolution && (
        <div className="mb-6 max-w-2xl p-4 rounded-lg bg-muted/50 border">
          <h2 className="text-base font-medium mb-2">
            {nc.status === 'RESOLVED' ? 'Resolução' : 'Motivo da rejeição'}
          </h2>
          <p className="text-sm whitespace-pre-wrap">{nc.resolution}</p>
          {nc.resolvedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              em {new Date(nc.resolvedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-8 max-w-lg">
        <div>
          <p className="font-medium">Aberta por</p>
          <p className="text-muted-foreground">{nc.createdByName}</p>
        </div>
        <div>
          <p className="font-medium">Aberta em</p>
          <p className="text-muted-foreground">
            {new Date(nc.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
        {nc.productName && (
          <div>
            <p className="font-medium">Produto</p>
            <p className="text-muted-foreground">{nc.productName}</p>
          </div>
        )}
        {nc.purchaseOrderId && (
          <div>
            <p className="font-medium">Pedido de Compra</p>
            <Link
              href={`/${cnpj}/purchase-orders/${nc.purchaseOrderId}`}
              className="text-primary hover:underline"
            >
              {nc.purchaseOrderNumber}
            </Link>
          </div>
        )}
      </div>

      {/* Comentários */}
      <div className="max-w-2xl border-t pt-6">
        <NcCommentsPanel cnpj={cnpj} ncId={nc.id} comments={comments} />
      </div>
    </div>
  )
}
```

---

### 8. Modificação em `purchase-orders/[id]/page.tsx`

Adicionar card de Não-Conformidades ao detalhe do PO (após o painel de
recebimentos adicionado em 5.6):

```tsx
// Adicionar ao Promise.all existente:
const ncs = await getNonConformitiesServer(cnpj, { purchaseOrderId: id })

// Adicionar ao JSX após o painel de recebimentos:
<div className="mt-8">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold">Não-Conformidades</h2>
    {canMutate && (
      <Button asChild variant="outline" size="sm">
        <Link href={`/${cnpj}/non-conformities/new?purchaseOrderId=${po.id}`}>
          Abrir NC
        </Link>
      </Button>
    )}
  </div>
  {ncs.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      Nenhuma não-conformidade registrada para este pedido.
    </p>
  ) : (
    <div className="space-y-2">
      {ncs.map((nc) => (
        <div key={nc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
          <div className="flex items-center gap-3">
            <NcStatusBadge status={nc.status} />
            <span className="text-sm">{nc.description.slice(0, 80)}{nc.description.length > 80 ? '…' : ''}</span>
          </div>
          <Link
            href={`/${cnpj}/non-conformities/${nc.id}`}
            className="text-xs text-primary hover:underline"
          >
            Ver →
          </Link>
        </div>
      ))}
    </div>
  )}
</div>
```

> Adicionar imports: `getNonConformitiesServer`, `NcStatusBadge`.

---

## Checklist de Verificação

```bash
# TypeScript
pnpm --filter web type-check

# Lint
pnpm --filter web lint

# Build
pnpm --filter web build
# Espera: rotas de non-conformities em .next/server/app

# Manual
# [ ] Listagem com filtros de status e busca funciona
# [ ] Abrir NC a partir de PO pré-preenche purchaseOrderId via searchParams
# [ ] NcActions exibe botões corretos conforme status (OPEN → Analisar; ANALYZING → Resolver/Rejeitar)
# [ ] AlertDialog de resolução valida mínimo 5 chars
# [ ] NcCommentsPanel envia comentário e atualiza a lista via router.refresh()
# [ ] Ctrl+Enter / Cmd+Enter no campo de comentário envia o comentário
# [ ] Detalhe do PO exibe NCs vinculadas e link para abrir nova NC
# [ ] canAct=false (ALMOXARIFE/ANALISTA_FINANCEIRO) não exibe botões de ação
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| Abertura de NC via `searchParams.purchaseOrderId` | Permite vincular a NC ao PO diretamente do detalhe do PO sem state global; URL compartilhável e server-safe |
| `getSuppliersServer` com `status: 'APPROVED'` | NCs devem referenciar fornecedores aprovados (fornecedores com problemas antes da aprovação são tratados no fluxo de aprovação); lista de aprovados é mais gerenciável |
| `NcActions` como Client Component separado | Isola a lógica de transição de status e os estados de loading/dialog do Server Component de detalhe |
| `canAct` baseado em papel e não em status | A permissão para analisar/resolver/rejeitar é por papel (COMPRADOR/ADMIN); a validação de status válido é feita na API. O UI só oculta botões irrelevantes |
| Comentários sem edição/exclusão | Decisão de produto da v1: comentários são audit trail da NC; adicionar edição/exclusão aumenta complexidade sem valor claro |
| Shortcut Ctrl+Enter para comentário | UX padrão de ferramentas de gestão (Jira, Linear); não substitui o botão de envio |
