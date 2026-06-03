'use client'

// apps/web/src/components/domain/supplier-bank-accounts-panel.tsx

import { AddBankAccountSheet } from '@/components/domain/add-bank-account-sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { removeBankAccount } from '@/lib/api'
import type { SupplierBankAccountResponse } from '@elos/shared'
import { Landmark, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Conta Poupança',
}

const ICON_BTN =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted'

interface SupplierBankAccountsPanelProps {
  cnpj: string
  supplierId: string
  initialAccounts: SupplierBankAccountResponse[]
  canMutate: boolean
}

export function SupplierBankAccountsPanel({
  cnpj,
  supplierId,
  initialAccounts,
  canMutate,
}: SupplierBankAccountsPanelProps) {
  const [accounts, setAccounts] = useState<SupplierBankAccountResponse[]>(initialAccounts)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SupplierBankAccountResponse | null>(null)
  const [removeTarget, setRemoveTarget] = useState<SupplierBankAccountResponse | null>(null)
  const [removing, setRemoving] = useState(false)

  function handleSaved(saved: SupplierBankAccountResponse) {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === saved.id)
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved]
    })
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await removeBankAccount(cnpj, supplierId, removeTarget.id)
      setAccounts((prev) => prev.filter((a) => a.id !== removeTarget.id))
      toast.success('Conta bancária removida.')
      setRemoveTarget(null)
    } catch (error) {
      console.error('[SupplierBankAccountsPanel.handleRemove]', error)
      toast.error('Erro ao remover conta bancária.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {accounts.length} conta{accounts.length === 1 ? '' : 's'} bancária
          {accounts.length === 1 ? '' : 's'}
        </p>
        {canMutate && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditTarget(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-[15px] w-[15px]" />
            Adicionar conta
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhuma conta bancária cadastrada.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5"
            >
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Landmark size={18} strokeWidth={1.6} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{acc.bank}</span>
                    {acc.isPrimary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                        <Star size={11} className="fill-current" />
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[acc.accountType] ?? acc.accountType} · Ag. {acc.agency} ·
                    Conta {acc.account}
                  </p>
                  {acc.pixKey && (
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">PIX: {acc.pixKey}</p>
                  )}
                </div>
              </div>

              {canMutate && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Editar conta ${acc.bank}`}
                    onClick={() => {
                      setEditTarget(acc)
                      setSheetOpen(true)
                    }}
                    className={ICON_BTN}
                  >
                    <Pencil size={15} strokeWidth={1.6} className="text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover conta ${acc.bank}`}
                    onClick={() => setRemoveTarget(acc)}
                    className={ICON_BTN}
                  >
                    <Trash2 size={15} strokeWidth={1.6} className="text-destructive" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canMutate && (
        <AddBankAccountSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          cnpj={cnpj}
          supplierId={supplierId}
          account={editTarget}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta bancária</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a conta do <strong>{removeTarget?.bank}</strong>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removing ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
