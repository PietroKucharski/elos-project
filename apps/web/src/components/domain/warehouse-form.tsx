'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWarehouse, updateWarehouse } from '@/lib/api'
import {
  type CreateWarehouseDto,
  type WarehouseResponse,
  createWarehouseSchema,
  updateWarehouseSchema,
} from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { toast } from 'sonner'

interface WarehouseFormProps {
  cnpj: string
  warehouse?: WarehouseResponse // se presente, modo edição
}

export function WarehouseForm({ cnpj, warehouse }: WarehouseFormProps) {
  const router = useRouter()
  const isEdit = !!warehouse
  const schema = isEdit ? updateWarehouseSchema : createWarehouseSchema

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateWarehouseDto>({
    resolver: zodResolver(schema) as Resolver<CreateWarehouseDto>,
    defaultValues: warehouse
      ? {
          name: warehouse.name,
          code: warehouse.code ?? undefined,
          location: warehouse.location ?? undefined,
        }
      : {},
  })

  async function onSubmit(data: CreateWarehouseDto) {
    try {
      if (isEdit) {
        await updateWarehouse(cnpj, warehouse!.id, data)
        toast.success('Armazém atualizado com sucesso.')
      } else {
        await createWarehouse(cnpj, data)
        toast.success('Armazém criado com sucesso.')
      }
      router.push(`/${cnpj}/warehouses`)
      router.refresh()
    } catch (error) {
      console.error('[WarehouseForm.onSubmit]', error)
      toast.error('Erro ao salvar armazém. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register('name')} placeholder="Ex: Armazém Central" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="code">Código</Label>
        <Input id="code" {...register('code')} placeholder="Ex: AC01" />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Localização</Label>
        <Input id="location" {...register('location')} placeholder="Ex: Galpão A, Rua X" />
        {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar Alterações' : 'Criar Armazém'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/${cnpj}/warehouses`)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
