'use client'

// apps/web/src/components/domain/quotation-form.tsx

import { Button } from '@/components/ui/button'
import { createQuotation, updateQuotation } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  type CreateQuotationDto,
  type QuotationResponse,
  type UpdateQuotationDto,
  createQuotationSchema,
  updateQuotationSchema,
} from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const TEXTAREA = cn(INPUT, 'h-auto resize-y py-2')
const ERROR = 'text-xs text-destructive'

// O input datetime-local trabalha com `YYYY-MM-DDTHH:mm` em horário local,
// enquanto o contrato da API exige uma data ISO completa (z.string().datetime()).
// Convertemos nos dois sentidos: ISO → input (default em edit) e input → ISO (submit).
function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

interface QuotationFormProps {
  cnpj: string
  mode: 'create' | 'edit'
  quotation?: QuotationResponse
}

export function QuotationForm({ cnpj, mode, quotation }: QuotationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEdit = mode === 'edit'
  const schema = isEdit ? updateQuotationSchema : createQuotationSchema

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateQuotationDto>({
    resolver: zodResolver(schema) as never,
    defaultValues:
      isEdit && quotation
        ? {
            title: quotation.title,
            description: quotation.description ?? undefined,
            // Valor do form é sempre ISO (o schema exige z.string().datetime());
            // a conversão p/ exibição no input é feita via estado controlado abaixo.
            deadline: quotation.deadline,
            paymentTerms: quotation.paymentTerms ?? undefined,
          }
        : undefined,
  })

  // O input datetime-local exibe `YYYY-MM-DDTHH:mm` (local) enquanto o form guarda
  // ISO. Mantemos o valor de exibição controlado e gravamos o ISO via setValue —
  // assim um campo não tocado em modo edição submete o ISO correto (o RHF não roda
  // defaultValues por setValueAs).
  const [deadlineLocal, setDeadlineLocal] = useState(
    isEdit && quotation ? isoToDatetimeLocal(quotation.deadline) : '',
  )

  const onSubmit = async (data: CreateQuotationDto) => {
    setLoading(true)
    try {
      if (isEdit && quotation) {
        await updateQuotation(cnpj, quotation.id, data as UpdateQuotationDto)
        toast.success('Cotação atualizada.')
        router.push(`/${cnpj}/quotations/${quotation.id}`)
        router.refresh()
      } else {
        const created = await createQuotation(cnpj, data)
        toast.success('Cotação criada.')
        router.push(`/${cnpj}/quotations/${created.id}`)
        router.refresh()
      }
    } catch (error) {
      console.error('[QuotationForm.onSubmit]', error)
      toast.error('Erro ao salvar cotação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Título */}
      <div className={FIELD}>
        <label htmlFor="title" className={LABEL}>
          Título *
        </label>
        <input
          id="title"
          {...register('title')}
          className={INPUT}
          placeholder="Ex: Cotação de Materiais Q4"
        />
        {errors.title && <span className={ERROR}>{errors.title.message}</span>}
      </div>

      {/* Descrição */}
      <div className={FIELD}>
        <label htmlFor="description" className={LABEL}>
          Descrição
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className={TEXTAREA}
          placeholder="Detalhes adicionais sobre a cotação..."
        />
        {errors.description && <span className={ERROR}>{errors.description.message}</span>}
      </div>

      {/* Prazo */}
      <div className={FIELD}>
        <label htmlFor="deadline" className={LABEL}>
          Prazo de Recebimento *
        </label>
        <input
          id="deadline"
          type="datetime-local"
          value={deadlineLocal}
          onChange={(e) => {
            const v = e.target.value
            setDeadlineLocal(v)
            setValue('deadline', v ? new Date(v).toISOString() : '', {
              shouldValidate: true,
              shouldDirty: true,
            })
          }}
          className={INPUT}
        />
        {errors.deadline && <span className={ERROR}>{errors.deadline.message}</span>}
      </div>

      {/* Condições de pagamento */}
      <div className={FIELD}>
        <label htmlFor="paymentTerms" className={LABEL}>
          Condições de Pagamento
        </label>
        <input
          id="paymentTerms"
          {...register('paymentTerms')}
          className={INPUT}
          placeholder="Ex: 30/60/90 dias, boleto"
        />
        {errors.paymentTerms && <span className={ERROR}>{errors.paymentTerms.message}</span>}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {isEdit ? 'Salvar alterações' : 'Criar cotação'}
        </Button>
      </div>
    </form>
  )
}
