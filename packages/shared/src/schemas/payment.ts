import { z } from 'zod'
import { PaymentMethod, PaymentStatus } from '../enums'

export const paymentStatusValues = Object.values(PaymentStatus) as [
  PaymentStatus,
  ...PaymentStatus[],
]

export const paymentMethodValues = Object.values(PaymentMethod) as [
  PaymentMethod,
  ...PaymentMethod[],
]

// Nota: InstallmentStatus pode não existir em enums.ts (é pgEnum do banco).
// Se existir, usar Object.values(). Senão, declarar inline:
export const installmentStatusValues = ['PENDING', 'PAID', 'OVERDUE'] as const

// ─── Payment installment ─────────────────────────────────────────────────────

export const createInstallmentSchema = z.object({
  installmentNumber: z.number().int().positive(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
})

export const installmentResponseSchema = z.object({
  id: z.string().uuid(),
  paymentId: z.string().uuid(),
  installmentNumber: z.string(), // numeric do postgres.js
  amount: z.string(),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  status: z.enum(installmentStatusValues),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ─── Payment ─────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  totalAmount: z.number().positive(),
  method: z.enum(paymentMethodValues),
  notes: z.string().max(1000).optional(),
  installments: z.array(createInstallmentSchema).min(1),
})

export const updatePaymentSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const paymentResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string(),
  totalAmount: z.string(), // numeric do postgres.js
  method: z.enum(paymentMethodValues),
  status: z.enum(paymentStatusValues),
  paidAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdById: z.string(),
  createdByName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  installments: z.array(installmentResponseSchema).optional(), // só no GET :id
  installmentCount: z.number().optional(), // só na listagem
})

// ─── Ações de parcela ────────────────────────────────────────────────────────

export const payInstallmentSchema = z.object({
  paidAt: z.string().datetime().optional(), // default = now no backend
})

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>
export type UpdatePaymentDto = z.infer<typeof updatePaymentSchema>
export type CreateInstallmentDto = z.infer<typeof createInstallmentSchema>
export type PayInstallmentDto = z.infer<typeof payInstallmentSchema>
export type PaymentResponse = z.infer<typeof paymentResponseSchema>
export type InstallmentResponse = z.infer<typeof installmentResponseSchema>
