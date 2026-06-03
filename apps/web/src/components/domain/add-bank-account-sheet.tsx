'use client'

// apps/web/src/components/domain/add-bank-account-sheet.tsx

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { addBankAccount, updateBankAccount } from '@/lib/api'
import { cn } from '@/lib/utils'
import { createSupplierBankAccountSchema } from '@elos/shared'
import type { CreateSupplierBankAccountDto, SupplierBankAccountResponse } from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const SELECT = cn(INPUT, 'cursor-pointer')
const ERROR = 'text-xs text-destructive'

interface AddBankAccountSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  supplierId: string
  account?: SupplierBankAccountResponse | null
  onSaved: (account: SupplierBankAccountResponse) => void
}

export function AddBankAccountSheet({
  open,
  onOpenChange,
  cnpj,
  supplierId,
  account,
  onSaved,
}: AddBankAccountSheetProps) {
  const isEdit = !!account

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSupplierBankAccountDto>({
    resolver: zodResolver(
      createSupplierBankAccountSchema,
    ) as Resolver<CreateSupplierBankAccountDto>,
    defaultValues: { accountType: 'CHECKING', isPrimary: false },
  })

  useEffect(() => {
    if (open) {
      reset({
        bank: account?.bank ?? '',
        agency: account?.agency ?? '',
        account: account?.account ?? '',
        accountType: account?.accountType ?? 'CHECKING',
        pixKey: account?.pixKey ?? undefined,
        isPrimary: account?.isPrimary ?? false,
      })
    }
  }, [open, account, reset])

  async function onSubmit(data: CreateSupplierBankAccountDto) {
    try {
      const saved = account
        ? await updateBankAccount(cnpj, supplierId, account.id, data)
        : await addBankAccount(cnpj, supplierId, data)
      toast.success(account ? 'Conta bancária atualizada.' : 'Conta bancária adicionada.')
      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      console.error('[AddBankAccountSheet.onSubmit]', error)
      toast.error('Erro ao salvar conta bancária.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col">
        <SheetHeader>
          <SheetTitle className="text-[17px] font-semibold">
            {isEdit ? 'Editar conta bancária' : 'Adicionar conta bancária'}
          </SheetTitle>
          <p className="mt-[3px] text-[13px] text-muted-foreground">
            Dados bancários para pagamento do fornecedor.
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-[18px] overflow-y-auto py-[22px]"
        >
          <div className={FIELD}>
            <label htmlFor="bank-bank" className={LABEL}>
              Banco <span className="text-destructive">*</span>
            </label>
            <input
              id="bank-bank"
              {...register('bank')}
              placeholder="Ex: Banco do Brasil"
              className={INPUT}
            />
            {errors.bank && (
              <span className={ERROR} role="alert">
                {errors.bank.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={FIELD}>
              <label htmlFor="bank-agency" className={LABEL}>
                Agência <span className="text-destructive">*</span>
              </label>
              <input
                id="bank-agency"
                {...register('agency')}
                placeholder="0001"
                className={INPUT}
              />
              {errors.agency && (
                <span className={ERROR} role="alert">
                  {errors.agency.message}
                </span>
              )}
            </div>
            <div className={FIELD}>
              <label htmlFor="bank-account" className={LABEL}>
                Conta <span className="text-destructive">*</span>
              </label>
              <input
                id="bank-account"
                {...register('account')}
                placeholder="12345-6"
                className={INPUT}
              />
              {errors.account && (
                <span className={ERROR} role="alert">
                  {errors.account.message}
                </span>
              )}
            </div>
          </div>

          <div className={FIELD}>
            <label htmlFor="bank-accountType" className={LABEL}>
              Tipo de conta <span className="text-destructive">*</span>
            </label>
            <select id="bank-accountType" {...register('accountType')} className={SELECT}>
              <option value="CHECKING">Conta Corrente</option>
              <option value="SAVINGS">Conta Poupança</option>
            </select>
            {errors.accountType && (
              <span className={ERROR} role="alert">
                {errors.accountType.message}
              </span>
            )}
          </div>

          <div className={FIELD}>
            <label htmlFor="bank-pixKey" className={LABEL}>
              Chave PIX
            </label>
            <input
              id="bank-pixKey"
              {...register('pixKey')}
              placeholder="CPF, CNPJ, e-mail ou aleatória"
              className={INPUT}
            />
            {errors.pixKey && (
              <span className={ERROR} role="alert">
                {errors.pixKey.message}
              </span>
            )}
          </div>

          <label
            htmlFor="bank-isPrimary"
            className="flex cursor-pointer items-center gap-2 text-[13.5px]"
          >
            <input id="bank-isPrimary" type="checkbox" {...register('isPrimary')} />
            Definir como conta principal
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
