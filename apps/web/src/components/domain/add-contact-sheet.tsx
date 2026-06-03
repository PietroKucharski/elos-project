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

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const ERROR = 'text-xs text-destructive'

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
      <SheetContent className="flex w-[440px] flex-col">
        <SheetHeader>
          <SheetTitle className="text-[17px] font-semibold">
            {isEdit ? 'Editar contato' : 'Adicionar contato'}
          </SheetTitle>
          <p className="mt-[3px] text-[13px] text-muted-foreground">
            Dados da pessoa de contato no fornecedor.
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-[18px] overflow-y-auto py-[22px]"
        >
          <div className={FIELD}>
            <label htmlFor="contact-name" className={LABEL}>
              Nome <span className="text-destructive">*</span>
            </label>
            <input
              id="contact-name"
              {...register('name')}
              placeholder="Nome completo"
              className={INPUT}
            />
            {errors.name && (
              <span className={ERROR} role="alert">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className={FIELD}>
            <label htmlFor="contact-email" className={LABEL}>
              E-mail
            </label>
            <input
              id="contact-email"
              type="email"
              {...register('email')}
              placeholder="pessoa@fornecedor.com"
              className={INPUT}
            />
            {errors.email && (
              <span className={ERROR} role="alert">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className={FIELD}>
            <label htmlFor="contact-phone" className={LABEL}>
              Telefone
            </label>
            <input
              id="contact-phone"
              {...register('phone')}
              placeholder="(11) 99999-9999"
              className={INPUT}
            />
            {errors.phone && (
              <span className={ERROR} role="alert">
                {errors.phone.message}
              </span>
            )}
          </div>

          <div className={FIELD}>
            <label htmlFor="contact-role" className={LABEL}>
              Cargo / Função
            </label>
            <input
              id="contact-role"
              {...register('role')}
              placeholder="Ex: Gerente Comercial"
              className={INPUT}
            />
            {errors.role && (
              <span className={ERROR} role="alert">
                {errors.role.message}
              </span>
            )}
          </div>

          <label
            htmlFor="contact-isMain"
            className="flex cursor-pointer items-center gap-2 text-[13.5px]"
          >
            <input id="contact-isMain" type="checkbox" {...register('isMain')} />
            Definir como contato principal
          </label>
        </form>

        <SheetFooter className="flex justify-end gap-2.5 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 size={15} className="mr-1.5 animate-spin" />}
            {isEdit ? 'Salvar' : 'Adicionar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
