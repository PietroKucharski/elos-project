'use client'

// apps/web/src/components/domain/add-bank-account-sheet.tsx

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { addBankAccount, updateBankAccount } from '@/lib/api'
import { createSupplierBankAccountSchema } from '@elos/shared'
import type { CreateSupplierBankAccountDto, SupplierBankAccountResponse } from '@elos/shared'
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
      <SheetContent style={{ width: 440, display: 'flex', flexDirection: 'column' }}>
        <SheetHeader>
          <SheetTitle style={{ fontSize: 17, fontWeight: 600 }}>
            {isEdit ? 'Editar conta bancária' : 'Adicionar conta bancária'}
          </SheetTitle>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 3 }}>
            Dados bancários para pagamento do fornecedor.
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
            <label htmlFor="bank-bank" style={labelStyle}>
              Banco <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
            </label>
            <input
              id="bank-bank"
              {...register('bank')}
              placeholder="Ex: Banco do Brasil"
              style={inputStyle}
            />
            {errors.bank && (
              <span style={errorStyle} role="alert">
                {errors.bank.message}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={fieldStyle}>
              <label htmlFor="bank-agency" style={labelStyle}>
                Agência <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              <input
                id="bank-agency"
                {...register('agency')}
                placeholder="0001"
                style={inputStyle}
              />
              {errors.agency && (
                <span style={errorStyle} role="alert">
                  {errors.agency.message}
                </span>
              )}
            </div>
            <div style={fieldStyle}>
              <label htmlFor="bank-account" style={labelStyle}>
                Conta <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              <input
                id="bank-account"
                {...register('account')}
                placeholder="12345-6"
                style={inputStyle}
              />
              {errors.account && (
                <span style={errorStyle} role="alert">
                  {errors.account.message}
                </span>
              )}
            </div>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="bank-accountType" style={labelStyle}>
              Tipo de conta <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
            </label>
            <select
              id="bank-accountType"
              {...register('accountType')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="CHECKING">Conta Corrente</option>
              <option value="SAVINGS">Conta Poupança</option>
            </select>
            {errors.accountType && (
              <span style={errorStyle} role="alert">
                {errors.accountType.message}
              </span>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="bank-pixKey" style={labelStyle}>
              Chave PIX
            </label>
            <input
              id="bank-pixKey"
              {...register('pixKey')}
              placeholder="CPF, CNPJ, e-mail ou aleatória"
              style={inputStyle}
            />
            {errors.pixKey && (
              <span style={errorStyle} role="alert">
                {errors.pixKey.message}
              </span>
            )}
          </div>

          <label
            htmlFor="bank-isPrimary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            <input id="bank-isPrimary" type="checkbox" {...register('isPrimary')} />
            Definir como conta principal
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
