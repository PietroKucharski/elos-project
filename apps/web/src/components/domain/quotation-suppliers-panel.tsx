'use client'

// apps/web/src/components/domain/quotation-suppliers-panel.tsx

import { Button } from '@/components/ui/button'
import { inviteSupplierToQuotation, removeSupplierFromQuotation } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { QuotationSupplierResponse, SupplierResponse } from '@elos/shared'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const INVITE_STATUS_LABEL: Record<string, string> = {
  INVITED: 'Convidado',
  RESPONDED: 'Respondeu',
  DECLINED: 'Recusou',
}

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const SELECT =
  'h-[38px] w-full cursor-pointer rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'

interface QuotationSuppliersPanelProps {
  cnpj: string
  quotationId: string
  initialInvites: QuotationSupplierResponse[]
  approvedSuppliers: SupplierResponse[] // lista completa de APPROVED para o select
  canEdit: boolean
}

export function QuotationSuppliersPanel({
  cnpj,
  quotationId,
  initialInvites,
  approvedSuppliers,
  canEdit,
}: QuotationSuppliersPanelProps) {
  const [invites, setInvites] = useState<QuotationSupplierResponse[]>(initialInvites)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [loading, setLoading] = useState(false)

  const alreadyInvitedIds = new Set(invites.map((i) => i.supplierId))
  const availableSuppliers = approvedSuppliers.filter((s) => !alreadyInvitedIds.has(s.id))

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
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Fornecedor</th>
                <th className={TH}>Status</th>
                {canEdit && <th className={cn(TH, 'w-12 text-right')} />}
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 && (
                <tr>
                  <td
                    colSpan={canEdit ? 3 : 2}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum fornecedor convidado.
                  </td>
                </tr>
              )}
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{invite.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {INVITE_STATUS_LABEL[invite.status] ?? invite.status}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(invite.supplierId)}
                        aria-label={`Remover ${invite.supplierName}`}
                        title="Remover convite"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive-soft"
                      >
                        <Trash2 size={15} strokeWidth={1.6} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && availableSuppliers.length > 0 && (
        <div className="flex items-end gap-2.5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="invite-supplier" className={LABEL}>
              Convidar Fornecedor
            </label>
            <select
              id="invite-supplier"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className={SELECT}
            >
              <option value="">Selecione um fornecedor...</option>
              {availableSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={handleInvite} disabled={!selectedSupplierId || loading}>
            {loading ? '...' : 'Convidar'}
          </Button>
        </div>
      )}

      {canEdit && availableSuppliers.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          Todos os fornecedores aprovados já foram convidados.
        </p>
      )}
    </div>
  )
}
