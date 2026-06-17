'use client'

// apps/web/src/components/domain/supplier-detail-tabs.tsx
//
// Abas do detalhe do fornecedor. Construído sobre as primitivas do Radix Tabs
// (e não sobre components/ui/tabs.tsx, intocável pela regra #10) para usar o
// estilo "linha" do Claude Design — sublinhado primário no item ativo + badges
// de contagem — via seletores reais data-[state=active].

import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge'
import { Stars } from '@/components/domain/stars'
import { SupplierBankAccountsPanel } from '@/components/domain/supplier-bank-accounts-panel'
import { SupplierContactsPanel } from '@/components/domain/supplier-contacts-panel'
import { cn } from '@/lib/utils'
import type {
  SupplierBankAccountResponse,
  SupplierContactResponse,
  SupplierEvaluationResponse,
  SupplierProductResponse,
  SupplierPurchaseOrderResponse,
  SupplierResponse,
} from '@elos/shared'
import { CheckCircle2, Package, ShoppingCart, XCircle } from 'lucide-react'
import { Tabs as TabsPrimitive } from 'radix-ui'

interface SupplierDetailTabsProps {
  cnpj: string
  supplierId: string
  canMutate: boolean
  supplier: SupplierResponse
  contacts: SupplierContactResponse[]
  bankAccounts: SupplierBankAccountResponse[]
  products: SupplierProductResponse[]
  orders: SupplierPurchaseOrderResponse[]
  evaluations: SupplierEvaluationResponse[]
}

const TAB_TRIGGER =
  'relative -mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-[13.5px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary'

function formatBRL(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
      {count}
    </span>
  )
}

export function SupplierDetailTabs({
  cnpj,
  supplierId,
  canMutate,
  supplier,
  contacts,
  bankAccounts,
  products,
  orders,
  evaluations,
}: SupplierDetailTabsProps) {
  const isPJ = supplier.type === 'PJ'
  const doc = isPJ ? supplier.cnpj : supplier.cpf
  const mainContact = contacts.find((c) => c.isMain) ?? contacts[0] ?? null
  const address = supplier.address
    ? [
        `${supplier.address.street}, ${supplier.address.number}`,
        supplier.address.complement,
        `${supplier.address.city}/${supplier.address.state}`,
        `CEP ${supplier.address.zipCode}`,
      ]
        .filter(Boolean)
        .join(' — ')
    : null
  const cityUf = supplier.address ? `${supplier.address.city}, ${supplier.address.state}` : null

  return (
    <TabsPrimitive.Root defaultValue="info">
      <TabsPrimitive.List className="flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        <TabsPrimitive.Trigger value="info" className={TAB_TRIGGER}>
          Informações Gerais
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="contacts" className={TAB_TRIGGER}>
          Contatos <CountBadge count={contacts.length} />
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="bank" className={TAB_TRIGGER}>
          Dados Bancários <CountBadge count={bankAccounts.length} />
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="products" className={TAB_TRIGGER}>
          Produtos <CountBadge count={products.length} />
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="orders" className={TAB_TRIGGER}>
          Pedidos <CountBadge count={orders.length} />
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="evaluations" className={TAB_TRIGGER}>
          Avaliações
        </TabsPrimitive.Trigger>
      </TabsPrimitive.List>

      {/* Informações Gerais */}
      <TabsPrimitive.Content value="info" className="mt-5 outline-none">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={isPJ ? 'Razão social' : 'Nome completo'} value={supplier.name} />
            {isPJ && <Field label="Nome fantasia" value={supplier.tradeName} />}
            <Field label={isPJ ? 'CNPJ' : 'CPF'} value={doc} mono />
            {isPJ && <Field label="Inscrição estadual" value={supplier.stateRegistration} mono />}
            <Field label="E-mail" value={supplier.email} />
            <Field label="Telefone" value={supplier.phone} mono />
            <Field label="Cidade / UF" value={cityUf} />
            <Field label="Contato principal" value={mainContact?.name} />
            <Field label="Endereço" value={address} fullWidth />
            {supplier.notes && <Field label="Observações" value={supplier.notes} fullWidth />}
          </div>
        </div>
      </TabsPrimitive.Content>

      {/* Contatos */}
      <TabsPrimitive.Content value="contacts" className="mt-5 outline-none">
        <SupplierContactsPanel
          cnpj={cnpj}
          supplierId={supplierId}
          initialContacts={contacts}
          canMutate={canMutate}
        />
      </TabsPrimitive.Content>

      {/* Dados Bancários */}
      <TabsPrimitive.Content value="bank" className="mt-5 outline-none">
        <SupplierBankAccountsPanel
          cnpj={cnpj}
          supplierId={supplierId}
          initialAccounts={bankAccounts}
          canMutate={canMutate}
        />
      </TabsPrimitive.Content>

      {/* Produtos */}
      <TabsPrimitive.Content value="products" className="mt-5 outline-none">
        {products.length === 0 ? (
          <EmptyState
            icon={<Package size={22} strokeWidth={1.5} />}
            label="Nenhum produto vinculado a este fornecedor."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            {products.map((p, i) => (
              <div
                key={p.linkId}
                className={cn(
                  'flex items-center justify-between gap-4 px-4 py-3',
                  i > 0 && 'border-t border-border',
                )}
              >
                <div className="flex min-w-0 items-center gap-[11px]">
                  <div className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package size={16} strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {p.code ?? '—'} · {p.unit}
                    </div>
                  </div>
                </div>
                {p.isPreferred && (
                  <span className="shrink-0 rounded-full border border-primary-soft-border bg-primary-soft px-2 py-0.5 text-[11.5px] font-semibold text-primary">
                    Preferencial
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsPrimitive.Content>

      {/* Pedidos */}
      <TabsPrimitive.Content value="orders" className="mt-5 outline-none">
        {orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={22} strokeWidth={1.5} />}
            label="Nenhum pedido emitido para este fornecedor."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            {orders.map((o, i) => (
              <div
                key={o.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-4 px-4 py-3',
                  i > 0 && 'border-t border-border',
                )}
              >
                <div>
                  <div className="font-mono text-[13.5px] font-medium text-foreground">
                    {o.number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.itemCount} {o.itemCount === 1 ? 'item' : 'itens'} ·{' '}
                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <PurchaseOrderStatusBadge status={o.status} />
                  <span className="font-mono text-[13.5px] font-semibold text-foreground">
                    {formatBRL(o.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsPrimitive.Content>

      {/* Avaliações */}
      <TabsPrimitive.Content value="evaluations" className="mt-5 outline-none">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="text-xs text-muted-foreground">Avaliação média</div>
              <div className="mt-1.5">
                <Stars value={supplier.rating != null ? Number(supplier.rating) : null} size={16} />
              </div>
            </div>
          </div>

          {evaluations.length === 0 ? (
            <p className="pt-5 text-[13.5px] text-muted-foreground">
              Nenhuma avaliação registrada ainda.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {evaluations.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 py-3.5">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0',
                      ev.action === 'APPROVE' ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {ev.action === 'APPROVE' ? (
                      <CheckCircle2 size={18} strokeWidth={1.7} />
                    ) : (
                      <XCircle size={18} strokeWidth={1.7} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[13.5px] font-medium text-foreground">
                        {ev.action === 'APPROVE' ? 'Aprovado' : 'Reprovado'}
                      </span>
                      {ev.rating != null && <Stars value={ev.rating} />}
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {ev.notes && (
                      <p className="mt-1 text-[13px] text-muted-foreground">{ev.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  )
}

function Field({
  label,
  value,
  mono,
  fullWidth,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2 lg:col-span-3' : undefined}>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-[13.5px] text-foreground', mono && 'font-mono')}>{value ?? '—'}</p>
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card py-14 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-[13.5px] text-muted-foreground">{label}</p>
    </div>
  )
}
