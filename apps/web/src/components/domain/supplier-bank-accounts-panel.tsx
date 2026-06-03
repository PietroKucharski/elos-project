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
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
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
            <Plus style={{ width: 15, height: 15, marginRight: 6 }} />
            Adicionar conta
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div
          style={{
            background: 'hsl(0 0% 100%)',
            border: '1px dashed hsl(214 32% 91%)',
            borderRadius: '0.5rem',
            padding: '40px 24px',
            textAlign: 'center',
            color: 'hsl(215 16% 47%)',
            fontSize: 14,
          }}
        >
          Nenhuma conta bancária cadastrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              style={{
                background: 'hsl(0 0% 100%)',
                border: '1px solid hsl(214 32% 91%)',
                borderRadius: '0.5rem',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.5rem',
                    background: 'hsl(210 40% 96.1%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Landmark size={18} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
                      {acc.bank}
                    </span>
                    {acc.isPrimary && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'hsl(38 92% 40%)',
                          background: 'hsl(38 92% 95%)',
                          padding: '2px 8px',
                          borderRadius: 9999,
                        }}
                      >
                        <Star size={11} fill="hsl(38 92% 50%)" stroke="hsl(38 92% 40%)" />
                        Principal
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                    {ACCOUNT_TYPE_LABELS[acc.accountType] ?? acc.accountType} · Ag. {acc.agency} ·
                    Conta {acc.account}
                  </p>
                  {acc.pixKey && (
                    <p style={{ fontSize: 12.5, color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                      PIX: {acc.pixKey}
                    </p>
                  )}
                </div>
              </div>

              {canMutate && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label={`Editar conta ${acc.bank}`}
                    onClick={() => {
                      setEditTarget(acc)
                      setSheetOpen(true)
                    }}
                    style={iconButtonStyle}
                  >
                    <Pencil size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover conta ${acc.bank}`}
                    onClick={() => setRemoveTarget(acc)}
                    style={iconButtonStyle}
                  >
                    <Trash2 size={15} strokeWidth={1.6} style={{ color: 'hsl(0 72% 51%)' }} />
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
              style={{ background: 'hsl(0 72% 51%)', color: '#fff' }}
            >
              {removing ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '0.375rem',
  border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
