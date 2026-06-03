'use client'

// apps/web/src/components/domain/add-contact-sheet.tsx

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { addContact, updateContact } from '@/lib/api'
import { createSupplierContactSchema } from '@elos/shared'
import type { CreateSupplierContactDto, SupplierContactResponse } from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

const inputStyle: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  fontSize: 13.5,
  borderRadius: '0.375rem',
  border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)',
  color: 'hsl(222 47% 11%)',
  outline: 'none',
  width: '100%',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }

interface AddContactSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  supplierId: string
  contact?: SupplierContactResponse | null
  onSaved: (contact: SupplierContactResponse) => void
}

export function AddContactSheet({
  open,
  onOpenChange,
  cnpj,
  supplierId,
  contact,
  onSaved,
}: AddContactSheetProps) {
  const isEdit = !!contact

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSupplierContactDto>({
    resolver: zodResolver(createSupplierContactSchema) as Resolver<CreateSupplierContactDto>,
    defaultValues: { isMain: false },
  })

  // Sincroniza o formulário com o contato em edição sempre que o Sheet abre
  useEffect(() => {
    if (open) {
      reset({
        name: contact?.name ?? '',
        email: contact?.email ?? undefined,
        phone: contact?.phone ?? undefined,
        role: contact?.role ?? undefined,
        isMain: contact?.isMain ?? false,
      })
    }
  }, [open, contact, reset])

  async function onSubmit(data: CreateSupplierContactDto) {
    try {
      const saved = contact
        ? await updateContact(cnpj, supplierId, contact.id, data)
        : await addContact(cnpj, supplierId, data)
      toast.success(contact ? 'Contato atualizado.' : 'Contato adicionado.')
      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      console.error('[AddContactSheet.onSubmit]', error)
      toast.error('Erro ao salvar contato.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ width: 440, display: 'flex', flexDirection: 'column' }}>
        <SheetHeader>
          <SheetTitle style={{ fontSize: 17, fontWeight: 600 }}>
            {isEdit ? 'Editar contato' : 'Adicionar contato'}
          </SheetTitle>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 3 }}>
            Dados da pessoa de contato no fornecedor.
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '22px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={fieldStyle}>
            <label htmlFor="contact-name" style={labelStyle}>
              Nome <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
            </label>
            <input
              id="contact-name"
              {...register('name')}
              placeholder="Nome completo"
              style={inputStyle}
            />
            {errors.name && (
              <span style={errorStyle} role="alert">
                {errors.name.message}
              </span>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="contact-email" style={labelStyle}>
              E-mail
            </label>
            <input
              id="contact-email"
              type="email"
              {...register('email')}
              placeholder="pessoa@fornecedor.com"
              style={inputStyle}
            />
            {errors.email && (
              <span style={errorStyle} role="alert">
                {errors.email.message}
              </span>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="contact-phone" style={labelStyle}>
              Telefone
            </label>
            <input
              id="contact-phone"
              {...register('phone')}
              placeholder="(11) 99999-9999"
              style={inputStyle}
            />
            {errors.phone && (
              <span style={errorStyle} role="alert">
                {errors.phone.message}
              </span>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="contact-role" style={labelStyle}>
              Cargo / Função
            </label>
            <input
              id="contact-role"
              {...register('role')}
              placeholder="Ex: Gerente Comercial"
              style={inputStyle}
            />
            {errors.role && (
              <span style={errorStyle} role="alert">
                {errors.role.message}
              </span>
            )}
          </div>

          <label
            htmlFor="contact-isMain"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            <input id="contact-isMain" type="checkbox" {...register('isMain')} />
            Definir como contato principal
          </label>
        </form>

        <SheetFooter
          style={{
            padding: '16px 0 0',
            borderTop: '1px solid hsl(214 32% 91%)',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 size={15} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />
            )}
            {isEdit ? 'Salvar' : 'Adicionar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
