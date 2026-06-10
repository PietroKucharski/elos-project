'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInvoice } from '@/lib/api'
import type { PurchaseOrderResponse, SupplierResponse } from '@elos/shared'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

interface InvoiceFormProps {
  cnpj: string
  purchaseOrders: PurchaseOrderResponse[] // SENT / RECEIVED
  suppliers: SupplierResponse[] // APPROVED
  purchaseOrderId?: string // pré-selecionado se vindo do detalhe do PO
}

export function InvoiceForm({
  cnpj,
  purchaseOrders,
  suppliers,
  purchaseOrderId,
}: InvoiceFormProps) {
  const router = useRouter()

  const [purchaseOrder, setPurchaseOrder] = useState(purchaseOrderId ?? purchaseOrders[0]?.id ?? '')
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [number, setNumber] = useState('')
  const [issueDate, setIssueDate] = useState(() => {
    // default: agora, no formato datetime-local (hora local de parede, não UTC)
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [totalAmount, setTotalAmount] = useState('')
  const [taxAmount, setTaxAmount] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!purchaseOrder) {
      toast.error('Selecione o pedido de compra.')
      return
    }
    if (!supplierId) {
      toast.error('Selecione o fornecedor.')
      return
    }
    const total = Number.parseFloat(totalAmount)
    if (Number.isNaN(total) || total <= 0) {
      toast.error('Informe um valor total válido.')
      return
    }

    setSubmitting(true)
    try {
      const invoice = await createInvoice(cnpj, {
        purchaseOrderId: purchaseOrder,
        supplierId,
        number: number.trim(),
        issueDate: new Date(issueDate).toISOString(),
        totalAmount: total,
        taxAmount: taxAmount ? Number.parseFloat(taxAmount) : undefined,
        fileUrl: fileUrl.trim() || undefined,
      })
      toast.success('Nota fiscal registrada com sucesso.')
      router.push(`/${cnpj}/invoices/${invoice.id}`)
      router.refresh()
    } catch (error) {
      console.error('[InvoiceForm.handleSubmit]', error)
      toast.error('Erro ao registrar nota fiscal. Verifique os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Pedido de Compra */}
      <div className="space-y-1">
        <Label htmlFor="purchaseOrderId">Pedido de Compra *</Label>
        <select
          id="purchaseOrderId"
          value={purchaseOrder}
          onChange={(e) => setPurchaseOrder(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          <option value="">Selecione o pedido…</option>
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.number} — {po.supplierName}
            </option>
          ))}
        </select>
        {purchaseOrders.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum pedido enviado ou recebido disponível para vincular.
          </p>
        )}
      </div>

      {/* Fornecedor */}
      <div className="space-y-1">
        <Label htmlFor="supplierId">Fornecedor *</Label>
        <select
          id="supplierId"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          <option value="">Selecione o fornecedor…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum fornecedor aprovado disponível.</p>
        )}
      </div>

      {/* Número da NF */}
      <div className="space-y-1">
        <Label htmlFor="number">Número da NF *</Label>
        <Input
          id="number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Ex: 000123456"
          required
        />
      </div>

      {/* Data de emissão */}
      <div className="space-y-1">
        <Label htmlFor="issueDate">Data de Emissão *</Label>
        <Input
          id="issueDate"
          type="datetime-local"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          required
        />
      </div>

      {/* Valores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="totalAmount">Valor Total (R$) *</Label>
          <Input
            id="totalAmount"
            type="number"
            min="0.01"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="0,00"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="taxAmount">Valor de Impostos (R$)</Label>
          <Input
            id="taxAmount"
            type="number"
            min="0"
            step="0.01"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* URL do arquivo */}
      <div className="space-y-1">
        <Label htmlFor="fileUrl">URL do Arquivo (PDF)</Label>
        <Input
          id="fileUrl"
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://… (opcional)"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar NF'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/${cnpj}/invoices`)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
