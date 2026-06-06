import { z } from 'zod'
import { NonConformityStatus, NonConformityType, Severity } from '../enums'

export const ncStatusValues = Object.values(NonConformityStatus) as [
  NonConformityStatus,
  ...NonConformityStatus[],
]

export const ncTypeValues = Object.values(NonConformityType) as [
  NonConformityType,
  ...NonConformityType[],
]

export const severityValues = Object.values(Severity) as [Severity, ...Severity[]]

// ─── NC Comments ──────────────────────────────────────────────────────────────
// Declarado antes de nonConformityResponseSchema para evitar referência para
// frente — a NC tem uma lista de comentários, mas o comentário não referencia a NC.

export const addNcCommentSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const ncCommentResponseSchema = z.object({
  id: z.string().uuid(),
  nonConformityId: z.string().uuid(),
  userId: z.string(),
  userName: z.string(),
  text: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ─── Non-Conformity ───────────────────────────────────────────────────────────

export const createNonConformitySchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  supplierId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  type: z.enum(ncTypeValues),
  severity: z.enum(severityValues),
  description: z.string().min(10).max(2000),
  notes: z.string().max(1000).optional(),
})

export const updateNonConformitySchema = z.object({
  type: z.enum(ncTypeValues).optional(),
  severity: z.enum(severityValues).optional(),
  description: z.string().min(10).max(2000).optional(),
  notes: z.string().max(1000).optional(),
})

// Transições de status
export const analyzeNcSchema = z.object({
  notes: z.string().max(1000).optional(), // notas ao iniciar análise
})

export const resolveNcSchema = z.object({
  resolution: z.string().min(10).max(2000),
})

export const rejectNcSchema = z.object({
  resolution: z.string().min(5).max(2000), // motivo da rejeição
})

export const nonConformityResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().nullable(),
  purchaseOrderNumber: z.string().nullable(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  productId: z.string().uuid().nullable(),
  productName: z.string().nullable(),
  type: z.enum(ncTypeValues),
  severity: z.enum(severityValues),
  description: z.string(),
  status: z.enum(ncStatusValues),
  resolution: z.string().nullable(),
  notes: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdById: z.string(),
  createdByName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  comments: z.array(ncCommentResponseSchema).optional(), // só no GET :id
})

export type CreateNonConformityDto = z.infer<typeof createNonConformitySchema>
export type UpdateNonConformityDto = z.infer<typeof updateNonConformitySchema>
export type AnalyzeNcDto = z.infer<typeof analyzeNcSchema>
export type ResolveNcDto = z.infer<typeof resolveNcSchema>
export type RejectNcDto = z.infer<typeof rejectNcSchema>
export type NonConformityResponse = z.infer<typeof nonConformityResponseSchema>
export type AddNcCommentDto = z.infer<typeof addNcCommentSchema>
export type NcCommentResponse = z.infer<typeof ncCommentResponseSchema>
