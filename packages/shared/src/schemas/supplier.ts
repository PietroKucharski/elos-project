import { z } from 'zod'

// ─── Supplier ───────────────────────────────────────────────────────────────

const cnpjSchema = z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos numéricos')

const cpfSchema = z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos')

const cepSchema = z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos numéricos')

// Endereço embutido no fornecedor (upsert no mesmo endpoint)
export const supplierAddressSchema = z.object({
  street: z.string().min(2).max(255),
  number: z.string().min(1).max(20),
  complement: z.string().max(100).optional(),
  city: z.string().min(2).max(100),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode: cepSchema,
})
export type SupplierAddressDto = z.infer<typeof supplierAddressSchema>

// Criação de fornecedor
// type + cnpj/cpf são mutuamente dependentes via .superRefine
export const createSupplierSchema = z
  .object({
    name: z.string().min(2).max(255),
    type: z.enum(['PJ', 'PF']),
    cnpj: cnpjSchema.optional(),
    cpf: cpfSchema.optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    notes: z.string().max(2000).optional(),
    address: supplierAddressSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'PJ' && !data.cnpj) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ é obrigatório para Pessoa Jurídica.',
        path: ['cnpj'],
      })
    }
    if (data.type === 'PF' && !data.cpf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF é obrigatório para Pessoa Física.',
        path: ['cpf'],
      })
    }
  })

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>

// Atualização — type é imutável após criação; cnpj/cpf podem ser corrigidos
export const updateSupplierSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  cnpj: cnpjSchema.optional(),
  cpf: cpfSchema.optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  address: supplierAddressSchema.optional(),
})

export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>

// Aprovação — pode registrar um rating (1–5) e observações
export const approveSupplierSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
})

export type ApproveSupplierDto = z.infer<typeof approveSupplierSchema>

// Rejeição — motivo é obrigatório
export const rejectSupplierSchema = z.object({
  notes: z.string().min(5).max(2000),
})

export type RejectSupplierDto = z.infer<typeof rejectSupplierSchema>

// Response shape — campos nullable espelham a tabela
export const supplierResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['PJ', 'PF']),
  cnpj: z.string().nullable(),
  cpf: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  rating: z.string().nullable(), // numeric vem como string no postgres.js
  notes: z.string().nullable(),
  address: z
    .object({
      id: z.string().uuid(),
      street: z.string(),
      number: z.string(),
      complement: z.string().nullable(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SupplierResponse = z.infer<typeof supplierResponseSchema>

// ─── Supplier Contact ────────────────────────────────────────────────────────

export const createSupplierContactSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  role: z.string().max(100).optional(),
  isMain: z.boolean().default(false),
})

export type CreateSupplierContactDto = z.infer<typeof createSupplierContactSchema>

export const updateSupplierContactSchema = createSupplierContactSchema.partial()

export type UpdateSupplierContactDto = z.infer<typeof updateSupplierContactSchema>

export const supplierContactResponseSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable(),
  isMain: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SupplierContactResponse = z.infer<typeof supplierContactResponseSchema>

// ─── Supplier Bank Account ───────────────────────────────────────────────────

export const bankAccountTypeValues = ['CHECKING', 'SAVINGS'] as const
export type BankAccountType = (typeof bankAccountTypeValues)[number]

export const createSupplierBankAccountSchema = z.object({
  bank: z.string().min(2).max(100),
  agency: z.string().min(1).max(20),
  account: z.string().min(1).max(30),
  accountType: z.enum(bankAccountTypeValues),
  pixKey: z.string().max(255).optional(),
  isPrimary: z.boolean().default(false),
})

export type CreateSupplierBankAccountDto = z.infer<typeof createSupplierBankAccountSchema>

export const updateSupplierBankAccountSchema = createSupplierBankAccountSchema.partial()

export type UpdateSupplierBankAccountDto = z.infer<typeof updateSupplierBankAccountSchema>

export const supplierBankAccountResponseSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  bank: z.string(),
  agency: z.string(),
  account: z.string(),
  accountType: z.enum(bankAccountTypeValues),
  pixKey: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SupplierBankAccountResponse = z.infer<typeof supplierBankAccountResponseSchema>
