// apps/web/src/app/(app)/[cnpj]/suppliers/[id]/page.tsx
import { Stars } from '@/components/domain/stars'
import { SupplierBankAccountsPanel } from '@/components/domain/supplier-bank-accounts-panel'
import { SupplierContactsPanel } from '@/components/domain/supplier-contacts-panel'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getMyCompaniesServer,
  getSupplierBankAccountsServer,
  getSupplierContactsServer,
  getSupplierServer,
} from '@/lib/api'
import { Building2, ChevronRight, Pencil, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function SupplierDetailPage({ params }: Props) {
  const { cnpj, id } = await params

  const [supplier, contacts, bankAccounts, myCompanies] = await Promise.all([
    getSupplierServer(cnpj, id),
    getSupplierContactsServer(cnpj, id),
    getSupplierBankAccountsServer(cnpj, id),
    getMyCompaniesServer(),
  ])

  if (!supplier) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  const doc = supplier.type === 'PJ' ? supplier.cnpj : supplier.cpf
  const since = new Date(supplier.createdAt).toLocaleDateString('pt-BR')

  return (
    <div className="max-w-[960px]">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link href={`/${cnpj}/suppliers`} className="transition-colors hover:text-foreground">
          Fornecedores
        </Link>
        <ChevronRight size={14} className="text-subtle-foreground" />
        <span className="font-medium text-foreground">{supplier.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1 className="text-[22px] font-semibold text-foreground">{supplier.name}</h1>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Bloco de identificação: ícone + documento + status + avaliação + métricas */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-[13px]">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {supplier.type === 'PF' ? (
              <User size={24} strokeWidth={1.6} />
            ) : (
              <Building2 size={24} strokeWidth={1.6} />
            )}
          </div>
          <div>
            <div className="font-mono text-[13px] text-muted-foreground">{doc ?? '—'}</div>
            <div className="mt-1 flex items-center gap-2.5">
              <SupplierStatusBadge status={supplier.status} size="lg" />
              <Stars value={supplier.rating != null ? Number(supplier.rating) : null} />
            </div>
          </div>
        </div>
        <div className="ml-auto flex gap-7">
          <Metric label="Cliente desde" value={since} mono />
          <Metric
            label="Tipo"
            value={supplier.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="bank-accounts">Contas Bancárias</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="mt-4 rounded-lg border border-border bg-card p-6">
            <div className="grid grid-cols-2 gap-5">
              <InfoField label="Telefone" value={supplier.phone} />
              <InfoField label="E-mail" value={supplier.email} />
              {supplier.address && (
                <InfoField
                  label="Endereço"
                  value={[
                    `${supplier.address.street}, ${supplier.address.number}`,
                    supplier.address.complement,
                    `${supplier.address.city}/${supplier.address.state}`,
                    `CEP ${supplier.address.zipCode}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  fullWidth
                />
              )}
              {supplier.notes && <InfoField label="Observações" value={supplier.notes} fullWidth />}
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

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className={`text-[13.5px] font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function InfoField({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string | null | undefined
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : undefined}>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value ?? '—'}</p>
    </div>
  )
}
