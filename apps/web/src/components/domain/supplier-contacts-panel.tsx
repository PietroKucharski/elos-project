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
      const exists = prev.some((c) => c.id === saved.id)
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
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
            <Plus style={{ width: 15, height: 15, marginRight: 6 }} />
            Adicionar contato
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
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
          Nenhum contato cadastrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contacts.map((contact) => (
            <div
              key={contact.id}
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
                    {contact.name}
                  </span>
                  {contact.isMain && (
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
                {contact.role && (
                  <p style={{ fontSize: 12.5, color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                    {contact.role}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginTop: 8,
                    fontSize: 12.5,
                    color: 'hsl(215 16% 47%)',
                  }}
                >
                  {contact.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Mail size={13} strokeWidth={1.6} /> {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Phone size={13} strokeWidth={1.6} /> {contact.phone}
                    </span>
                  )}
                </div>
              </div>

              {canMutate && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label={`Editar ${contact.name}`}
                    onClick={() => {
                      setEditTarget(contact)
                      setSheetOpen(true)
                    }}
                    style={iconButtonStyle}
                  >
                    <Pencil size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${contact.name}`}
                    onClick={() => setRemoveTarget(contact)}
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
