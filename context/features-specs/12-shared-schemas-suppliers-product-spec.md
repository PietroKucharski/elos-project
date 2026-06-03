# Feature Spec — 2.1 Shared Schemas: Fornecedores e Produtos

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 2 — Fornecedores e Produtos  
**Unidade:** 2.1  
**Pré-requisito:** 1.5 concluído (Fase 1 completa)  
**Commit convencional esperado:** `feat(shared): add supplier and product zod schemas`

---

## Objetivo

Definir os schemas Zod de contrato de API para os domínios de Fornecedores e
Produtos em `packages/shared`. Esses schemas são a **única fonte de verdade**
para validação de request/response entre o backend (NestJS) e o frontend
(Next.js). As unidades 2.2–2.5 os importam diretamente.

---

## Escopo

### In

- `packages/shared/src/schemas/supplier.ts` — schemas de fornecedor, contatos,
  contas bancárias e endereço
- `packages/shared/src/schemas/product.ts` — schemas de produto e vínculo
  produto↔fornecedor
- `packages/shared/src/index.ts` — re-exportar os novos schemas
- Tipos derivados via `z.infer<typeof schema>` (exportados pelos próprios arquivos
  de schema, como já é feito em `company.ts` e `member.ts`)

### Out (não implementar nesta unidade)

- Módulos NestJS de suppliers/products (→ 2.2 e 2.3)
- UI de suppliers/products (→ 2.4 e 2.5)
- Schema de quotation (→ Fase 3)

---

## Arquivos a Criar / Modificar

```
packages/shared/src/
  schemas/
    supplier.ts     ← criar
    product.ts      ← criar
  index.ts          ← modificar (adicionar re-exports)
```

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/supplier.ts`

```typescript
import { z } from 'zod'

// ─── Supplier ───────────────────────────────────────────────────────────────

const cnpjSchema = z
  .string()
  .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos numéricos')

const cpfSchema = z
  .string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos')

const cepSchema = z
  .string()
  .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos numéricos')

// Endereço embutido no fornecedor (upsert no mesmo endpoint)
export const supplierAddressSchema = z.object({
  street:     z.string().min(2).max(255),
  number:     z.string().min(1).max(20),
  complement: z.string().max(100).optional(),
  city:       z.string().min(2).max(100),
  state:      z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode:    cepSchema,
})
export type SupplierAddressDto = z.infer<typeof supplierAddressSchema>

// Criação de fornecedor
// type + cnpj/cpf são mutuamente dependentes via .superRefine
export const createSupplierSchema = z
  .object({
    name:    z.string().min(2).max(255),
    type:    z.enum(['PJ', 'PF']),
    cnpj:    cnpjSchema.optional(),
    cpf:     cpfSchema.optional(),
    email:   z.string().email().optional(),
    phone:   z.string().max(20).optional(),
    notes:   z.string().max(2000).optional(),
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
  name:    z.string().min(2).max(255).optional(),
  cnpj:    cnpjSchema.optional(),
  cpf:     cpfSchema.optional(),
  email:   z.string().email().optional(),
  phone:   z.string().max(20).optional(),
  notes:   z.string().max(2000).optional(),
  address: supplierAddressSchema.optional(),
})

export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>

// Aprovação — pode registrar um rating (1–5) e observações
export const approveSupplierSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  notes:  z.string().max(2000).optional(),
})

export type ApproveSupplierDto = z.infer<typeof approveSupplierSchema>

// Rejeição — motivo é obrigatório
export const rejectSupplierSchema = z.object({
  notes: z.string().min(5).max(2000),
})

export type RejectSupplierDto = z.infer<typeof rejectSupplierSchema>

// Response shape — campos nullable espelham a tabela
export const supplierResponseSchema = z.object({
  id:        z.string().uuid(),
  companyId: z.string().uuid(),
  name:      z.string(),
  type:      z.enum(['PJ', 'PF']),
  cnpj:      z.string().nullable(),
  cpf:       z.string().nullable(),
  email:     z.string().nullable(),
  phone:     z.string().nullable(),
  status:    z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  rating:    z.string().nullable(), // numeric vem como string no postgres.js
  notes:     z.string().nullable(),
  address: z
    .object({
      id:         z.string().uuid(),
      street:     z.string(),
      number:     z.string(),
      complement: z.string().nullable(),
      city:       z.string(),
      state:      z.string(),
      zipCode:    z.string(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SupplierResponse = z.infer<typeof supplierResponseSchema>

// ─── Supplier Contact ────────────────────────────────────────────────────────

export const createSupplierContactSchema = z.object({
  name:   z.string().min(2).max(255),
  email:  z.string().email().optional(),
  phone:  z.string().max(20).optional(),
  role:   z.string().max(100).optional(),
  isMain: z.boolean().default(false),
})

export type CreateSupplierContactDto = z.infer<typeof createSupplierContactSchema>

export const updateSupplierContactSchema = createSupplierContactSchema.partial()

export type UpdateSupplierContactDto = z.infer<typeof updateSupplierContactSchema>

export const supplierContactResponseSchema = z.object({
  id:         z.string().uuid(),
  supplierId: z.string().uuid(),
  name:       z.string(),
  email:      z.string().nullable(),
  phone:      z.string().nullable(),
  role:       z.string().nullable(),
  isMain:     z.boolean(),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
})

export type SupplierContactResponse = z.infer<typeof supplierContactResponseSchema>

// ─── Supplier Bank Account ───────────────────────────────────────────────────

export const bankAccountTypeValues = ['CHECKING', 'SAVINGS'] as const
export type BankAccountType = (typeof bankAccountTypeValues)[number]

export const createSupplierBankAccountSchema = z.object({
  bank:        z.string().min(2).max(100),
  agency:      z.string().min(1).max(20),
  account:     z.string().min(1).max(30),
  accountType: z.enum(bankAccountTypeValues),
  pixKey:      z.string().max(255).optional(),
  isPrimary:   z.boolean().default(false),
})

export type CreateSupplierBankAccountDto = z.infer<typeof createSupplierBankAccountSchema>

export const updateSupplierBankAccountSchema = createSupplierBankAccountSchema.partial()

export type UpdateSupplierBankAccountDto = z.infer<typeof updateSupplierBankAccountSchema>

export const supplierBankAccountResponseSchema = z.object({
  id:          z.string().uuid(),
  supplierId:  z.string().uuid(),
  bank:        z.string(),
  agency:      z.string(),
  account:     z.string(),
  accountType: z.enum(bankAccountTypeValues),
  pixKey:      z.string().nullable(),
  isPrimary:   z.boolean(),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
})

export type SupplierBankAccountResponse = z.infer<typeof supplierBankAccountResponseSchema>
```

---

### 2. `packages/shared/src/schemas/product.ts`

```typescript
import { z } from 'zod'

// Valores válidos de unidade de medida — espelham o `unitOfMeasureEnum` do banco
export const unitOfMeasureValues = [
  'UN', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'CX', 'PC',
] as const
export type UnitOfMeasure = (typeof unitOfMeasureValues)[number]

// ─── Product ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name:        z.string().min(2).max(255),
  code:        z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  unit:        z.enum(unitOfMeasureValues),
  minStock:    z.number().nonnegative().optional(),
  isActive:    z.boolean().default(true),
})

export type CreateProductDto = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()

export type UpdateProductDto = z.infer<typeof updateProductSchema>

export const productResponseSchema = z.object({
  id:          z.string().uuid(),
  companyId:   z.string().uuid(),
  name:        z.string(),
  code:        z.string().nullable(),
  description: z.string().nullable(),
  unit:        z.enum(unitOfMeasureValues),
  minStock:    z.string().nullable(), // numeric vem como string
  isActive:    z.boolean(),
  suppliers:   z
    .array(
      z.object({
        id:          z.string().uuid(),
        supplierId:  z.string().uuid(),
        supplierName: z.string(),
        isPreferred: z.boolean(),
        notes:       z.string().nullable(),
      })
    )
    .optional(), // presente apenas no GET :id
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
})

export type ProductResponse = z.infer<typeof productResponseSchema>

// ─── Product ↔ Supplier link ─────────────────────────────────────────────────

export const linkProductSupplierSchema = z.object({
  supplierId:  z.string().uuid(),
  isPreferred: z.boolean().default(false),
  notes:       z.string().max(1000).optional(),
})

export type LinkProductSupplierDto = z.infer<typeof linkProductSupplierSchema>

export const updateProductSupplierSchema = z.object({
  isPreferred: z.boolean().optional(),
  notes:       z.string().max(1000).optional(),
})

export type UpdateProductSupplierDto = z.infer<typeof updateProductSupplierSchema>

export const productSupplierResponseSchema = z.object({
  id:           z.string().uuid(),
  productId:    z.string().uuid(),
  supplierId:   z.string().uuid(),
  supplierName: z.string(),
  isPreferred:  z.boolean(),
  notes:        z.string().nullable(),
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
})

export type ProductSupplierResponse = z.infer<typeof productSupplierResponseSchema>
```

---

### 3. Atualizar `packages/shared/src/index.ts`

Adicionar os dois novos re-exports ao barrel existente:

```typescript
export * from './schemas/supplier'
export * from './schemas/product'
```

---

## Notas de Implementação

**`isMain` e `isPrimary` como boolean no schema, varchar no banco** — O schema
Drizzle (0.3) define `isMain` e `isPrimary` como `varchar('...', { length: 1 })`
com valores `'Y'`/`'N'`. O service (2.2) faz a conversão ao salvar (`true` → `'Y'`)
e ao ler (`'Y'` === `isMain` → `true`). O schema Zod compartilhado usa `boolean`
para que o frontend não precise lidar com essa particularidade.

**`rating` como string no response** — O Drizzle/postgres.js retorna colunas
`numeric` como `string` para preservar precisão decimal. O response schema mapeia
para `z.string().nullable()`; o frontend converte via `parseFloat(rating)` quando
precisar exibir ou comparar numericamente.

**`minStock` como `number` no create, `string` no response** — Por consistência
com o padrão acima. O service converte `number` → `string` ao inserir via Drizzle
(o ORM aceita ambos para colunas `numeric`).

**`address` inline no supplier** — O banco possui tabela `supplier_addresses`
separada, mas o schema de API encapsula o endereço no próprio supplier para
simplificar o formulário do frontend. O service (2.2) faz upsert do registro de
endereço dentro da mesma transação que o supplier.

**Validação cruzada type↔documento no `createSupplierSchema`** — `.superRefine`
garante que PJ exige CNPJ e PF exige CPF. Essa validação acontece no
`ZodValidationPipe` do backend antes de qualquer lógica de negócio.

---

## Verificação

- [ ] `pnpm --filter @elos/shared build` — zero erros TypeScript
- [ ] `pnpm type-check` verde nos 3 workspaces (shared exportado → api e web
  resolvem os imports)
- [ ] `pnpm lint` limpo
- [ ] `createSupplierSchema.safeParse({ name: 'X', type: 'PJ' })` falha
  (cnpj obrigatório para PJ)
- [ ] `createSupplierSchema.safeParse({ name: 'Empresa', type: 'PJ', cnpj: '12345678000195' })`
  passa
- [ ] `createProductSchema.safeParse({ name: 'Parafuso', unit: 'UN' })` passa
- [ ] `createProductSchema.safeParse({ name: 'P', unit: 'XX' })` falha
  (name muito curto + unit inválida)
