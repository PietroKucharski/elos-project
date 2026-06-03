'use client'

// apps/web/src/components/domain/supplier-contacts-panel.tsx

import { AddContactSheet } from '@/components/domain/add-contact-sheet'
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
import { removeContact } from '@/lib/api'
import type { SupplierContactResponse } from '@elos/shared'
import { Mail, Pencil, Phone, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const ICON_BTN =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted'

interface SupplierContactsPanelProps {
  cnpj: string
  supplierId: string
  initialContacts: SupplierContactResponse[]
  canMutate: boolean
}

export function SupplierContactsPanel({
  cnpj,
  supplierId,
  initialContacts,
  canMutate,
}: SupplierContactsPanelProps) {
  const [contacts, setContacts] = useState<SupplierContactResponse[]>(initialContacts)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SupplierContactResponse | null>(null)
  const [removeTarget, setRemoveTarget] = useState<SupplierContactResponse | null>(null)
  const [removing, setRemoving] = useState(false)

  function handleSaved(saved: SupplierContactResponse) {
    setContacts((prev) => {
      // Espelha a regra do servidor: só um contato principal. Se o salvo é
      // principal, zera isMain dos demais para não exibir múltiplos badges.
      const base = saved.isMain
        ? prev.map((c) => (c.id === saved.id ? c : { ...c, isMain: false }))
        : prev
      const exists = base.some((c) => c.id === saved.id)
      return exists ? base.map((c) => (c.id === saved.id ? saved : c)) : [...base, saved]
    })
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await removeContact(cnpj, supplierId, removeTarget.id)
      setContacts((prev) => prev.filter((c) => c.id !== removeTarget.id))
      toast.success('Contato removido.')
      setRemoveTarget(null)
    } catch (error) {
      console.error('[SupplierContactsPanel.handleRemove]', error)
      toast.error('Erro ao remover contato.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {contacts.length} contato{contacts.length === 1 ? '' : 's'}
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
            Adicionar contato
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum contato cadastrado.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{contact.name}</span>
                  {contact.isMain && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                      <Star size={11} className="fill-current" />
                      Principal
                    </span>
                  )}
                </div>
                {contact.role && (
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">{contact.role}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-4 text-[12.5px] text-muted-foreground">
                  {contact.email && (
                    <span className="inline-flex items-center gap-[5px]">
                      <Mail size={13} strokeWidth={1.6} /> {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="inline-flex items-center gap-[5px]">
                      <Phone size={13} strokeWidth={1.6} /> {contact.phone}
                    </span>
                  )}
                </div>
              </div>

              {canMutate && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Editar ${contact.name}`}
                    onClick={() => {
                      setEditTarget(contact)
                      setSheetOpen(true)
                    }}
                    className={ICON_BTN}
                  >
                    <Pencil size={15} strokeWidth={1.6} className="text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${contact.name}`}
                    onClick={() => setRemoveTarget(contact)}
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
        <AddContactSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          cnpj={cnpj}
          supplierId={supplierId}
          contact={editTarget}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong>? Esta ação não
              pode ser desfeita.
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
