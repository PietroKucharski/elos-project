import { z } from 'zod'

// CNPJ: 14 dígitos numéricos sem pontuação
const cnpjSchema = z.string().regex(/^\d{14}$/, 'CNPJ deve ter exatamente 14 dígitos numéricos')

// CEP: 8 dígitos numéricos sem hífen
const zipCodeSchema = z
  .string()
  .regex(/^\d{8}$/, 'CEP deve ter exatamente 8 dígitos numéricos')
  .optional()

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  tradeName: z.string().max(255).optional(),
  cnpj: cnpjSchema,
  email: z.string().email('E-mail inválido').optional(),
  phone: z.string().max(20).optional(),
  street: z.string().max(255).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 caracteres').optional(),
  zipCode: zipCodeSchema,
})

// CNPJ não pode ser alterado após criação (chave de tenant)
export const updateCompanySchema = createCompanySchema.omit({ cnpj: true }).partial()

// Shape da resposta da API (o que o backend retorna)
export const companyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tradeName: z.string().nullable(),
  cnpj: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  street: z.string().nullable(),
  number: z.string().nullable(),
  complement: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type CreateCompanyDto = z.infer<typeof createCompanySchema>
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>
export type CompanyResponse = z.infer<typeof companyResponseSchema>
