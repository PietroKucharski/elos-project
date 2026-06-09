'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createNonConformity } from '@/lib/api'
import {
  type CreateNonConformityDto,
  type SupplierResponse,
  createNonConformitySchema,
  ncTypeValues,
  severityValues,
} from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

const TYPE_LABELS: Record<string, string> = {
  QUALITY: 'Qualidade',
  QUANTITY: 'Quantidade',
  DELIVERY: 'Entrega',
  DOCUMENTATION: 'Documentação',
  OTHER: 'Outro',
}

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

interface NonConformityFormProps {
  cnpj: string
  suppliers: SupplierResponse[]
  purchaseOrderId?: string // pré-selecionado se vindo do detalhe do PO
}

export function NonConformityForm({ cnpj, suppliers, purchaseOrderId }: NonConformityFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateNonConformityDto>({
    resolver: zodResolver(createNonConformitySchema) as Resolver<CreateNonConformityDto>,
    defaultValues: {
      purchaseOrderId: purchaseOrderId ?? undefined,
      supplierId: suppliers[0]?.id ?? '',
      type: 'QUALITY',
      severity: 'MEDIUM',
    },
  })

  async function onSubmit(data: CreateNonConformityDto) {
    try {
      const nc = await createNonConformity(cnpj, data)
      toast.success('Não-conformidade aberta com sucesso.')
      router.push(`/${cnpj}/non-conformities/${nc.id}`)
      router.refresh()
    } catch (error) {
      console.error('[NonConformityForm.onSubmit]', error)
      toast.error('Erro ao abrir não-conformidade. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {/* Fornecedor */}
      <div className="space-y-1">
        <Label htmlFor="supplierId">Fornecedor *</Label>
        <select
          id="supplierId"
          {...register('supplierId')}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.supplierId && (
          <p className="text-xs text-destructive">{errors.supplierId.message}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <Label htmlFor="type">Tipo *</Label>
        <select
          id="type"
          {...register('type')}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ncTypeValues.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      {/* Severidade */}
      <div className="space-y-1">
        <Label htmlFor="severity">Severidade *</Label>
        <select
          id="severity"
          {...register('severity')}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {severityValues.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Label htmlFor="description">Descrição do problema *</Label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder="Descreva o problema com pelo menos 10 caracteres…"
          className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <Label htmlFor="notes">Notas adicionais</Label>
        <Input id="notes" {...register('notes')} placeholder="Opcional" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Abrindo…' : 'Abrir NC'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${cnpj}/non-conformities`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
