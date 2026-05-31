# Feature Spec — 0.3 Schema Drizzle e Banco

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 0 — Fundação  
**Unidade:** 0.3  
**Pré-requisito:** 0.2 (tooling, `.env.example` e Docker configurados)  
**Commit convencional esperado:** `feat(db): add drizzle schema, migrations and seed`

---

## Objetivo

Definir o schema completo do banco de dados em TypeScript (Drizzle ORM), gerar
a primeira migration e aplicar no Supabase. Ao final desta unidade, o banco tem
todas as tabelas do domínio Elos prontas para receber dados; o `DrizzleModule`
está configurado e injetável no NestJS; e o seed cria os registros mínimos para
testar o sistema.

---

## Escopo

### In

- Dependências Drizzle instaladas em `apps/api`
- `drizzle.config.ts` em `apps/api/`
- Schema completo em `apps/api/src/db/schema/`:
  - `auth.ts` — tabelas Better-Auth
  - Todos os domínios de negócio (13 arquivos)
  - `relations.ts` — relações Drizzle centralizadas
  - `index.ts` — re-exporta tudo
- `DrizzleModule` (`apps/api/src/db.module.ts`)
- `enums.ts` em `packages/shared/src/` — enums compartilhados (Role, Status)
- Primeira migration gerada e aplicada
- Seed básico (`apps/api/src/db/seed.ts`)

### Out (não implementar nesta unidade)

- Schemas Zod de contratos de API em `packages/shared` (→ junto com cada módulo)
- Services e Controllers (→ Fase 1 em diante)
- Testes dos Services (→ Fase 1 em diante)
- Supabase Storage (→ Fase 6, upload de NFs)

---

## Arquivos a Criar / Modificar

```
apps/api/
  drizzle.config.ts                        ← criar
  src/
    db/
      schema/
        auth.ts                            ← criar
        companies.ts                       ← criar
        suppliers.ts                       ← criar
        products.ts                        ← criar
        quotations.ts                      ← criar
        purchase-orders.ts                 ← criar
        receipts.ts                        ← criar
        warehouses.ts                      ← criar
        non-conformities.ts                ← criar
        invoices.ts                        ← criar
        payments.ts                        ← criar
        logistics.ts                       ← criar
        audit-logs.ts                      ← criar
        relations.ts                       ← criar
        index.ts                           ← criar
      migrations/                          ← gerado pelo drizzle-kit
      seed.ts                              ← criar
    db.module.ts                           ← criar

packages/shared/src/
  enums.ts                                 ← criar (Role e outros enums compartilhados)
```

---

## Implementação Detalhada

### 1. Instalar dependências

```bash
# Runtime — driver + ORM
pnpm add drizzle-orm postgres drizzle-zod --filter api

# Dev — CLI de migrations
pnpm add -D drizzle-kit --filter api

# Zod já está em packages/shared — garantir que também está em apps/api
pnpm add zod --filter api
```

---

### 2. `drizzle.config.ts` (raiz de `apps/api/`)

Usa `DIRECT_URL` para migrations (conexão direta, sem PgBouncer) e `DATABASE_URL`
para o DrizzleModule em runtime (pooler). Se `DIRECT_URL` não estiver definida,
cai para `DATABASE_URL`.

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // DIRECT_URL para migrations: conexão direta, sem pgBouncer
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
```

Scripts a adicionar em `apps/api/package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:studio":   "drizzle-kit studio",
    "db:seed":     "tsx src/db/seed.ts"
  }
}
```

---

### 3. `packages/shared/src/enums.ts`

Enums compartilhados entre frontend e backend. Os enums de banco (`pgEnum`)
usam os mesmos valores mas são definidos nos arquivos de schema da API.

```typescript
// Role: papel do usuário dentro de uma empresa
export const Role = {
  SUPER_ADMIN:         'SUPER_ADMIN',
  ADMIN_EMPRESA:       'ADMIN_EMPRESA',
  COMPRADOR:           'COMPRADOR',
  ALMOXARIFE:          'ALMOXARIFE',
  ANALISTA_FINANCEIRO: 'ANALISTA_FINANCEIRO',
  TRANSPORTADOR:       'TRANSPORTADOR',
} as const
export type Role = (typeof Role)[keyof typeof Role]

// SupplierStatus
export const SupplierStatus = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus]

// QuotationStatus
export const QuotationStatus = {
  DRAFT:     'DRAFT',
  OPEN:      'OPEN',
  CLOSED:    'CLOSED',
  CANCELLED: 'CANCELLED',
} as const
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus]

// BidStatus
export const BidStatus = {
  DRAFT:     'DRAFT',
  SUBMITTED: 'SUBMITTED',
  SELECTED:  'SELECTED',
  REJECTED:  'REJECTED',
} as const
export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus]

// PurchaseOrderStatus
export const PurchaseOrderStatus = {
  DRAFT:     'DRAFT',
  APPROVED:  'APPROVED',
  SENT:      'SENT',
  RECEIVED:  'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus]

// ReceiptStatus
export const ReceiptStatus = {
  PARTIAL:  'PARTIAL',
  COMPLETE: 'COMPLETE',
} as const
export type ReceiptStatus = (typeof ReceiptStatus)[keyof typeof ReceiptStatus]

// NonConformityStatus
export const NonConformityStatus = {
  OPEN:      'OPEN',
  ANALYZING: 'ANALYZING',
  RESOLVED:  'RESOLVED',
  REJECTED:  'REJECTED',
} as const
export type NonConformityStatus = (typeof NonConformityStatus)[keyof typeof NonConformityStatus]

// NonConformityType
export const NonConformityType = {
  QUALITY:       'QUALITY',
  QUANTITY:      'QUANTITY',
  DELIVERY:      'DELIVERY',
  DOCUMENTATION: 'DOCUMENTATION',
  OTHER:         'OTHER',
} as const
export type NonConformityType = (typeof NonConformityType)[keyof typeof NonConformityType]

// Severity
export const Severity = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const
export type Severity = (typeof Severity)[keyof typeof Severity]

// InvoiceStatus
export const InvoiceStatus = {
  PENDING:   'PENDING',
  VALIDATED: 'VALIDATED',
  REJECTED:  'REJECTED',
} as const
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

// PaymentStatus
export const PaymentStatus = {
  PENDING:   'PENDING',
  PAID:      'PAID',
  CANCELLED: 'CANCELLED',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

// PaymentMethod
export const PaymentMethod = {
  BOLETO:    'BOLETO',
  PIX:       'PIX',
  TRANSFER:  'TRANSFER',
  CHECK:     'CHECK',
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

// ShipmentStatus
export const ShipmentStatus = {
  PENDING:    'PENDING',
  SHIPPED:    'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED:  'DELIVERED',
  CANCELLED:  'CANCELLED',
} as const
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus]

// StockMovementType
export const StockMovementType = {
  ENTRY:    'ENTRY',
  EXIT:     'EXIT',
  TRANSFER: 'TRANSFER',
} as const
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType]

// UnitOfMeasure
export const UnitOfMeasure = {
  UN:  'UN',
  KG:  'KG',
  G:   'G',
  L:   'L',
  ML:  'ML',
  M:   'M',
  M2:  'M2',
  M3:  'M3',
  CX:  'CX',
  PC:  'PC',
} as const
export type UnitOfMeasure = (typeof UnitOfMeasure)[keyof typeof UnitOfMeasure]
```

---

### 4. Schema Drizzle — Convenções Gerais

Antes de detalhar cada arquivo, as convenções que se aplicam a **todos** os
schemas:

- `id`: `uuid('id').defaultRandom().primaryKey()`
- `companyId` (quando presente): `uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' })`
- `userId` (FK para usuário): `text('user_id').notNull().references(() => users.id)` — Better-Auth usa `text` para IDs de usuário
- Timestamps: `timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`
- `updatedAt`: `timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()`
- Valores monetários: `numeric('amount', { precision: 15, scale: 2 })`
- Enums no banco: `pgEnum` — nomes snake_case, valores iguais aos de `packages/shared/enums.ts`

---

### 5. `apps/api/src/db/schema/auth.ts`

Tabelas gerenciadas pelo Better-Auth. Os nomes de coluna devem corresponder
exatamente ao esperado pelo adapter Drizzle do Better-Auth.

```typescript
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('user', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const sessions = pgTable('session', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const accounts = pgTable('account', {
  id:                      text('id').primaryKey(),
  userId:                  text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId:               text('account_id').notNull(),
  providerId:              text('provider_id').notNull(),
  accessToken:             text('access_token'),
  refreshToken:            text('refresh_token'),
  accessTokenExpiresAt:    timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt:   timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope:                   text('scope'),
  idToken:                 text('id_token'),
  password:                text('password'),
  createdAt:               timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt:               timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const verifications = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }),
  updatedAt:  timestamp('updated_at', { withTimezone: true }),
})
```

> **Importante:** o nome da tabela é `'user'` (singular), `'session'`, `'account'`
> e `'verification'` — sem plural e sem prefixo. Isso é o que o adapter do
> Better-Auth espera por padrão.

---

### 6. `apps/api/src/db/schema/companies.ts`

```typescript
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const roleEnum = pgEnum('role', [
  'SUPER_ADMIN',
  'ADMIN_EMPRESA',
  'COMPRADOR',
  'ALMOXARIFE',
  'ANALISTA_FINANCEIRO',
  'TRANSPORTADOR',
])

export const companies = pgTable('companies', {
  id:          uuid('id').defaultRandom().primaryKey(),
  name:        varchar('name', { length: 255 }).notNull(),
  tradeName:   varchar('trade_name', { length: 255 }),
  cnpj:        varchar('cnpj', { length: 14 }).notNull().unique(),
  email:       varchar('email', { length: 255 }),
  phone:       varchar('phone', { length: 20 }),
  // Endereço inline (sem tabela separada para empresa)
  street:      varchar('street', { length: 255 }),
  number:      varchar('number', { length: 20 }),
  complement:  varchar('complement', { length: 100 }),
  city:        varchar('city', { length: 100 }),
  state:       varchar('state', { length: 2 }),
  zipCode:     varchar('zip_code', { length: 8 }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const companyMembers = pgTable('company_members', {
  id:        uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:      roleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Company = typeof companies.$inferSelect
export type InsertCompany = typeof companies.$inferInsert
export type CompanyMember = typeof companyMembers.$inferSelect
export type InsertCompanyMember = typeof companyMembers.$inferInsert
```

---

### 7. `apps/api/src/db/schema/suppliers.ts`

```typescript
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const supplierStatusEnum = pgEnum('supplier_status', [
  'PENDING', 'APPROVED', 'REJECTED',
])

export const supplierTypeEnum = pgEnum('supplier_type', ['PJ', 'PF'])

export const suppliers = pgTable('suppliers', {
  id:        uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name:      varchar('name', { length: 255 }).notNull(),
  type:      supplierTypeEnum('type').notNull().default('PJ'),
  cnpj:      varchar('cnpj', { length: 14 }),
  cpf:       varchar('cpf', { length: 11 }),
  email:     varchar('email', { length: 255 }),
  phone:     varchar('phone', { length: 20 }),
  status:    supplierStatusEnum('status').notNull().default('PENDING'),
  rating:    numeric('rating', { precision: 3, scale: 2 }),
  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const supplierContacts = pgTable('supplier_contacts', {
  id:          uuid('id').defaultRandom().primaryKey(),
  supplierId:  uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 255 }).notNull(),
  email:       varchar('email', { length: 255 }),
  phone:       varchar('phone', { length: 20 }),
  role:        varchar('role', { length: 100 }),
  isMain:      varchar('is_main', { length: 1 }).notNull().default('N'), // 'Y' | 'N'
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const supplierBankAccounts = pgTable('supplier_bank_accounts', {
  id:          uuid('id').defaultRandom().primaryKey(),
  supplierId:  uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  bank:        varchar('bank', { length: 100 }).notNull(),
  agency:      varchar('agency', { length: 20 }).notNull(),
  account:     varchar('account', { length: 30 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // 'CHECKING' | 'SAVINGS'
  pixKey:      varchar('pix_key', { length: 255 }),
  isPrimary:   varchar('is_primary', { length: 1 }).notNull().default('N'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const supplierAddresses = pgTable('supplier_addresses', {
  id:         uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  street:     varchar('street', { length: 255 }).notNull(),
  number:     varchar('number', { length: 20 }).notNull(),
  complement: varchar('complement', { length: 100 }),
  city:       varchar('city', { length: 100 }).notNull(),
  state:      varchar('state', { length: 2 }).notNull(),
  zipCode:    varchar('zip_code', { length: 8 }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Supplier = typeof suppliers.$inferSelect
export type InsertSupplier = typeof suppliers.$inferInsert
```

---

### 8. `apps/api/src/db/schema/products.ts`

```typescript
import { boolean, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { suppliers } from './suppliers'

export const unitOfMeasureEnum = pgEnum('unit_of_measure', [
  'UN', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'CX', 'PC',
])

export const products = pgTable('products', {
  id:          uuid('id').defaultRandom().primaryKey(),
  companyId:   uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 255 }).notNull(),
  code:        varchar('code', { length: 100 }),
  description: text('description'),
  unit:        unitOfMeasureEnum('unit').notNull().default('UN'),
  minStock:    numeric('min_stock', { precision: 15, scale: 3 }),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Vínculo produto ↔ fornecedor (quais fornecedores podem suprir este produto)
export const productSuppliers = pgTable('product_suppliers', {
  id:          uuid('id').defaultRandom().primaryKey(),
  productId:   uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  supplierId:  uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  isPreferred: boolean('is_preferred').notNull().default(false),
  notes:       text('notes'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Product = typeof products.$inferSelect
export type InsertProduct = typeof products.$inferInsert
```

---

### 9. `apps/api/src/db/schema/quotations.ts`

```typescript
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { suppliers } from './suppliers'

export const quotationStatusEnum = pgEnum('quotation_status', [
  'DRAFT', 'OPEN', 'CLOSED', 'CANCELLED',
])

export const inviteStatusEnum = pgEnum('invite_status', [
  'PENDING', 'ACCEPTED', 'DECLINED',
])

export const bidStatusEnum = pgEnum('bid_status', [
  'DRAFT', 'SUBMITTED', 'SELECTED', 'REJECTED',
])

export const quotations = pgTable('quotations', {
  id:          uuid('id').defaultRandom().primaryKey(),
  companyId:   uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  deadline:    timestamp('deadline', { withTimezone: true }).notNull(),
  status:      quotationStatusEnum('status').notNull().default('DRAFT'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  closedAt:    timestamp('closed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotationItems = pgTable('quotation_items', {
  id:           uuid('id').defaultRandom().primaryKey(),
  quotationId:  uuid('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  productId:    uuid('product_id').notNull().references(() => products.id),
  quantity:     numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unit:         varchar('unit', { length: 10 }).notNull(),
  description:  text('description'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotationInvites = pgTable('quotation_invites', {
  id:           uuid('id').defaultRandom().primaryKey(),
  quotationId:  uuid('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  supplierId:   uuid('supplier_id').notNull().references(() => suppliers.id),
  status:       inviteStatusEnum('status').notNull().default('PENDING'),
  sentAt:       timestamp('sent_at', { withTimezone: true }),
  respondedAt:  timestamp('responded_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bids = pgTable('bids', {
  id:           uuid('id').defaultRandom().primaryKey(),
  quotationId:  uuid('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  supplierId:   uuid('supplier_id').notNull().references(() => suppliers.id),
  companyId:    uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  status:       bidStatusEnum('status').notNull().default('DRAFT'),
  paymentTerms: text('payment_terms'),
  observations: text('observations'),
  submittedAt:  timestamp('submitted_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bidItems = pgTable('bid_items', {
  id:              uuid('id').defaultRandom().primaryKey(),
  bidId:           uuid('bid_id').notNull().references(() => bids.id, { onDelete: 'cascade' }),
  quotationItemId: uuid('quotation_item_id').notNull().references(() => quotationItems.id),
  unitPrice:       numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  deliveryDays:    numeric('delivery_days', { precision: 5, scale: 0 }).notNull(),
  observations:    text('observations'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Quotation = typeof quotations.$inferSelect
export type Bid = typeof bids.$inferSelect
```

---

### 10. `apps/api/src/db/schema/purchase-orders.ts`

```typescript
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { bids, quotations } from './quotations'
import { suppliers } from './suppliers'

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'DRAFT', 'APPROVED', 'SENT', 'RECEIVED', 'CANCELLED',
])

export const purchaseOrders = pgTable('purchase_orders', {
  id:           uuid('id').defaultRandom().primaryKey(),
  companyId:    uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  supplierId:   uuid('supplier_id').notNull().references(() => suppliers.id),
  quotationId:  uuid('quotation_id').references(() => quotations.id),
  bidId:        uuid('bid_id').references(() => bids.id),
  number:       varchar('number', { length: 50 }).notNull().unique(),
  status:       purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
  totalAmount:  numeric('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes:        text('notes'),
  approvedById: text('approved_by_id').references(() => users.id),
  approvedAt:   timestamp('approved_at', { withTimezone: true }),
  sentAt:       timestamp('sent_at', { withTimezone: true }),
  createdById:  text('created_by_id').notNull().references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id:               uuid('id').defaultRandom().primaryKey(),
  purchaseOrderId:  uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId:        uuid('product_id').notNull().references(() => products.id),
  quantity:         numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unitPrice:        numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  totalPrice:       numeric('total_price', { precision: 15, scale: 2 }).notNull(),
  receivedQuantity: numeric('received_quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert
```

---

### 11. `apps/api/src/db/schema/warehouses.ts`

```typescript
import { boolean, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'ENTRY', 'EXIT', 'TRANSFER',
])

export const warehouses = pgTable('warehouses', {
  id:        uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name:      varchar('name', { length: 255 }).notNull(),
  code:      varchar('code', { length: 50 }),
  location:  text('location'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Saldo atual de estoque por produto/armazém — mantido via stock_movements
export const inventory = pgTable('inventory', {
  id:          uuid('id').defaultRandom().primaryKey(),
  companyId:   uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  productId:   uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity:    numeric('quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  minStock:    numeric('min_stock', { precision: 15, scale: 3 }),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const stockMovements = pgTable('stock_movements', {
  id:            uuid('id').defaultRandom().primaryKey(),
  companyId:     uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  warehouseId:   uuid('warehouse_id').notNull().references(() => warehouses.id),
  productId:     uuid('product_id').notNull().references(() => products.id),
  type:          stockMovementTypeEnum('type').notNull(),
  quantity:      numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  // Referência opcional ao documento origem (receipt, purchase_order, etc.)
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId:   uuid('reference_id'),
  notes:         text('notes'),
  createdById:   text('created_by_id').notNull().references(() => users.id),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Warehouse = typeof warehouses.$inferSelect
export type StockMovement = typeof stockMovements.$inferSelect
```

---

### 12. `apps/api/src/db/schema/receipts.ts`

```typescript
import { numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { purchaseOrderItems, purchaseOrders } from './purchase-orders'
import { warehouses } from './warehouses'

export const receiptStatusEnum = pgEnum('receipt_status', ['PARTIAL', 'COMPLETE'])

export const receipts = pgTable('receipts', {
  id:              uuid('id').defaultRandom().primaryKey(),
  companyId:       uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id),
  warehouseId:     uuid('warehouse_id').notNull().references(() => warehouses.id),
  receivedById:    text('received_by_id').notNull().references(() => users.id),
  status:          receiptStatusEnum('status').notNull(),
  notes:           text('notes'),
  receivedAt:      timestamp('received_at', { withTimezone: true }).notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const receiptItems = pgTable('receipt_items', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  receiptId:            uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  purchaseOrderItemId:  uuid('purchase_order_item_id').notNull().references(() => purchaseOrderItems.id),
  receivedQuantity:     numeric('received_quantity', { precision: 15, scale: 3 }).notNull(),
  notes:                text('notes'),
  createdAt:            timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Receipt = typeof receipts.$inferSelect
```

---

### 13. `apps/api/src/db/schema/non-conformities.ts`

```typescript
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { purchaseOrders } from './purchase-orders'
import { suppliers } from './suppliers'

export const ncStatusEnum = pgEnum('nc_status', [
  'OPEN', 'ANALYZING', 'RESOLVED', 'REJECTED',
])

export const ncTypeEnum = pgEnum('nc_type', [
  'QUALITY', 'QUANTITY', 'DELIVERY', 'DOCUMENTATION', 'OTHER',
])

export const severityEnum = pgEnum('severity', [
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
])

export const nonConformities = pgTable('non_conformities', {
  id:              uuid('id').defaultRandom().primaryKey(),
  companyId:       uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id),
  supplierId:      uuid('supplier_id').notNull().references(() => suppliers.id),
  productId:       uuid('product_id').references(() => products.id),
  type:            ncTypeEnum('type').notNull(),
  severity:        severityEnum('severity').notNull(),
  description:     text('description').notNull(),
  status:          ncStatusEnum('status').notNull().default('OPEN'),
  resolution:      text('resolution'),
  resolvedAt:      timestamp('resolved_at', { withTimezone: true }),
  createdById:     text('created_by_id').notNull().references(() => users.id),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const ncAttachments = pgTable('nc_attachments', {
  id:                uuid('id').defaultRandom().primaryKey(),
  nonConformityId:   uuid('non_conformity_id').notNull().references(() => nonConformities.id, { onDelete: 'cascade' }),
  fileName:          varchar('file_name', { length: 255 }).notNull(),
  fileUrl:           text('file_url').notNull(),
  fileSize:          varchar('file_size', { length: 20 }),
  mimeType:          varchar('mime_type', { length: 100 }),
  uploadedById:      text('uploaded_by_id').notNull().references(() => users.id),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const ncComments = pgTable('nc_comments', {
  id:              uuid('id').defaultRandom().primaryKey(),
  nonConformityId: uuid('non_conformity_id').notNull().references(() => nonConformities.id, { onDelete: 'cascade' }),
  userId:          text('user_id').notNull().references(() => users.id),
  text:            text('text').notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type NonConformity = typeof nonConformities.$inferSelect
```

---

### 14. `apps/api/src/db/schema/invoices.ts`

```typescript
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { purchaseOrders } from './purchase-orders'
import { suppliers } from './suppliers'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'PENDING', 'VALIDATED', 'REJECTED',
])

export const invoices = pgTable('invoices', {
  id:              uuid('id').defaultRandom().primaryKey(),
  companyId:       uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id),
  supplierId:      uuid('supplier_id').notNull().references(() => suppliers.id),
  number:          varchar('number', { length: 100 }).notNull(),
  issueDate:       timestamp('issue_date', { withTimezone: true }).notNull(),
  totalAmount:     numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  taxAmount:       numeric('tax_amount', { precision: 15, scale: 2 }),
  status:          invoiceStatusEnum('status').notNull().default('PENDING'),
  fileUrl:         text('file_url'),
  rejectionReason: text('rejection_reason'),
  validatedById:   text('validated_by_id').references(() => users.id),
  validatedAt:     timestamp('validated_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const invoiceItems = pgTable('invoice_items', {
  id:          uuid('id').defaultRandom().primaryKey(),
  invoiceId:   uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId:   uuid('product_id').references(() => products.id),
  description: varchar('description', { length: 255 }).notNull(),
  quantity:    numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unitPrice:   numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  totalPrice:  numeric('total_price', { precision: 15, scale: 2 }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Invoice = typeof invoices.$inferSelect
```

---

### 15. `apps/api/src/db/schema/payments.ts`

```typescript
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { invoices } from './invoices'

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING', 'PAID', 'CANCELLED',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'BOLETO', 'PIX', 'TRANSFER', 'CHECK',
])

export const installmentStatusEnum = pgEnum('installment_status', [
  'PENDING', 'PAID', 'OVERDUE',
])

export const payments = pgTable('payments', {
  id:          uuid('id').defaultRandom().primaryKey(),
  companyId:   uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  invoiceId:   uuid('invoice_id').notNull().references(() => invoices.id),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  method:      paymentMethodEnum('method').notNull(),
  status:      paymentStatusEnum('status').notNull().default('PENDING'),
  paidAt:      timestamp('paid_at', { withTimezone: true }),
  notes:       text('notes'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const paymentInstallments = pgTable('payment_installments', {
  id:                uuid('id').defaultRandom().primaryKey(),
  paymentId:         uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  installmentNumber: numeric('installment_number', { precision: 3, scale: 0 }).notNull(),
  amount:            numeric('amount', { precision: 15, scale: 2 }).notNull(),
  dueDate:           timestamp('due_date', { withTimezone: true }).notNull(),
  paidAt:            timestamp('paid_at', { withTimezone: true }),
  status:            installmentStatusEnum('status').notNull().default('PENDING'),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Payment = typeof payments.$inferSelect
```

---

### 16. `apps/api/src/db/schema/logistics.ts`

```typescript
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { purchaseOrders } from './purchase-orders'

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED',
])

export const shipments = pgTable('shipments', {
  id:                uuid('id').defaultRandom().primaryKey(),
  companyId:         uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId:   uuid('purchase_order_id').notNull().references(() => purchaseOrders.id),
  carrier:           varchar('carrier', { length: 255 }),
  trackingCode:      varchar('tracking_code', { length: 100 }),
  status:            shipmentStatusEnum('status').notNull().default('PENDING'),
  estimatedDelivery: timestamp('estimated_delivery', { withTimezone: true }),
  deliveredAt:       timestamp('delivered_at', { withTimezone: true }),
  notes:             text('notes'),
  createdById:       text('created_by_id').notNull().references(() => users.id),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Shipment = typeof shipments.$inferSelect
```

---

### 17. `apps/api/src/db/schema/audit-logs.ts`

Audit log é append-only — sem `updatedAt`, sem `onDelete: 'cascade'`.
O `userId` pode ser `null` para ações de sistema.

```typescript
import { json, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'

export const auditLogs = pgTable('audit_logs', {
  id:         uuid('id').defaultRandom().primaryKey(),
  companyId:  uuid('company_id').references(() => companies.id),
  userId:     text('user_id').references(() => users.id),
  entity:     varchar('entity', { length: 100 }).notNull(),
  entityId:   uuid('entity_id').notNull(),
  action:     varchar('action', { length: 50 }).notNull(),
  before:     json('before'),
  after:      json('after'),
  ipAddress:  varchar('ip_address', { length: 45 }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type InsertAuditLog = typeof auditLogs.$inferInsert
```

---

### 18. `apps/api/src/db/schema/relations.ts`

Todas as relações Drizzle centralizadas. Usadas para queries com `.with()`.

```typescript
import { relations } from 'drizzle-orm'
import { accounts, sessions, users, verifications } from './auth'
import { companies, companyMembers } from './companies'
import { auditLogs } from './audit-logs'
import { invoiceItems, invoices } from './invoices'
import { shipments } from './logistics'
import { ncAttachments, ncComments, nonConformities } from './non-conformities'
import { paymentInstallments, payments } from './payments'
import { productSuppliers, products } from './products'
import {
  purchaseOrderItems,
  purchaseOrders,
} from './purchase-orders'
import { bidItems, bids, quotationInvites, quotationItems, quotations } from './quotations'
import { receiptItems, receipts } from './receipts'
import {
  inventory,
  stockMovements,
  warehouses,
} from './warehouses'
import {
  supplierAddresses,
  supplierBankAccounts,
  supplierContacts,
  suppliers,
} from './suppliers'

// ─── Auth ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions:       many(sessions),
  accounts:       many(accounts),
  companyMembers: many(companyMembers),
  auditLogs:      many(auditLogs),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

// ─── Companies ────────────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  members:        many(companyMembers),
  suppliers:      many(suppliers),
  products:       many(products),
  quotations:     many(quotations),
  purchaseOrders: many(purchaseOrders),
  warehouses:     many(warehouses),
  invoices:       many(invoices),
  payments:       many(payments),
  auditLogs:      many(auditLogs),
}))

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, { fields: [companyMembers.companyId], references: [companies.id] }),
  user:    one(users, { fields: [companyMembers.userId], references: [users.id] }),
}))

// ─── Suppliers ────────────────────────────────────────────────────────────

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  company:      one(companies, { fields: [suppliers.companyId], references: [companies.id] }),
  contacts:     many(supplierContacts),
  bankAccounts: many(supplierBankAccounts),
  addresses:    many(supplierAddresses),
  products:     many(productSuppliers),
  bids:         many(bids),
  invites:      many(quotationInvites),
}))

export const supplierContactsRelations = relations(supplierContacts, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierContacts.supplierId], references: [suppliers.id] }),
}))

export const supplierBankAccountsRelations = relations(supplierBankAccounts, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierBankAccounts.supplierId], references: [suppliers.id] }),
}))

export const supplierAddressesRelations = relations(supplierAddresses, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierAddresses.supplierId], references: [suppliers.id] }),
}))

// ─── Products ─────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
  company:   one(companies, { fields: [products.companyId], references: [companies.id] }),
  suppliers: many(productSuppliers),
  inventory: many(inventory),
}))

export const productSuppliersRelations = relations(productSuppliers, ({ one }) => ({
  product:  one(products, { fields: [productSuppliers.productId], references: [products.id] }),
  supplier: one(suppliers, { fields: [productSuppliers.supplierId], references: [suppliers.id] }),
}))

// ─── Quotations ───────────────────────────────────────────────────────────

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  company:   one(companies, { fields: [quotations.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [quotations.createdById], references: [users.id] }),
  items:     many(quotationItems),
  invites:   many(quotationInvites),
  bids:      many(bids),
}))

export const quotationItemsRelations = relations(quotationItems, ({ one, many }) => ({
  quotation: one(quotations, { fields: [quotationItems.quotationId], references: [quotations.id] }),
  product:   one(products, { fields: [quotationItems.productId], references: [products.id] }),
  bidItems:  many(bidItems),
}))

export const quotationInvitesRelations = relations(quotationInvites, ({ one }) => ({
  quotation: one(quotations, { fields: [quotationInvites.quotationId], references: [quotations.id] }),
  supplier:  one(suppliers, { fields: [quotationInvites.supplierId], references: [suppliers.id] }),
}))

export const bidsRelations = relations(bids, ({ one, many }) => ({
  quotation: one(quotations, { fields: [bids.quotationId], references: [quotations.id] }),
  supplier:  one(suppliers, { fields: [bids.supplierId], references: [suppliers.id] }),
  company:   one(companies, { fields: [bids.companyId], references: [companies.id] }),
  items:     many(bidItems),
}))

export const bidItemsRelations = relations(bidItems, ({ one }) => ({
  bid:           one(bids, { fields: [bidItems.bidId], references: [bids.id] }),
  quotationItem: one(quotationItems, { fields: [bidItems.quotationItemId], references: [quotationItems.id] }),
}))

// ─── Purchase Orders ──────────────────────────────────────────────────────

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company:    one(companies, { fields: [purchaseOrders.companyId], references: [companies.id] }),
  supplier:   one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  quotation:  one(quotations, { fields: [purchaseOrders.quotationId], references: [quotations.id] }),
  bid:        one(bids, { fields: [purchaseOrders.bidId], references: [bids.id] }),
  createdBy:  one(users, { fields: [purchaseOrders.createdById], references: [users.id] }),
  approvedBy: one(users, { fields: [purchaseOrders.approvedById], references: [users.id] }),
  items:      many(purchaseOrderItems),
  receipts:   many(receipts),
  invoices:   many(invoices),
  shipments:  many(shipments),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.purchaseOrderId], references: [purchaseOrders.id] }),
  product:       one(products, { fields: [purchaseOrderItems.productId], references: [products.id] }),
  receiptItems:  many(receiptItems),
}))

// ─── Warehouses & Stock ───────────────────────────────────────────────────

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  company:        one(companies, { fields: [warehouses.companyId], references: [companies.id] }),
  inventory:      many(inventory),
  stockMovements: many(stockMovements),
  receipts:       many(receipts),
}))

export const inventoryRelations = relations(inventory, ({ one }) => ({
  company:   one(companies, { fields: [inventory.companyId], references: [companies.id] }),
  warehouse: one(warehouses, { fields: [inventory.warehouseId], references: [warehouses.id] }),
  product:   one(products, { fields: [inventory.productId], references: [products.id] }),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  company:   one(companies, { fields: [stockMovements.companyId], references: [companies.id] }),
  warehouse: one(warehouses, { fields: [stockMovements.warehouseId], references: [warehouses.id] }),
  product:   one(products, { fields: [stockMovements.productId], references: [products.id] }),
  createdBy: one(users, { fields: [stockMovements.createdById], references: [users.id] }),
}))

// ─── Receipts ─────────────────────────────────────────────────────────────

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  company:       one(companies, { fields: [receipts.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [receipts.purchaseOrderId], references: [purchaseOrders.id] }),
  warehouse:     one(warehouses, { fields: [receipts.warehouseId], references: [warehouses.id] }),
  receivedBy:    one(users, { fields: [receipts.receivedById], references: [users.id] }),
  items:         many(receiptItems),
}))

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt:           one(receipts, { fields: [receiptItems.receiptId], references: [receipts.id] }),
  purchaseOrderItem: one(purchaseOrderItems, { fields: [receiptItems.purchaseOrderItemId], references: [purchaseOrderItems.id] }),
}))

// ─── Non-conformities ─────────────────────────────────────────────────────

export const nonConformitiesRelations = relations(nonConformities, ({ one, many }) => ({
  company:       one(companies, { fields: [nonConformities.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [nonConformities.purchaseOrderId], references: [purchaseOrders.id] }),
  supplier:      one(suppliers, { fields: [nonConformities.supplierId], references: [suppliers.id] }),
  product:       one(products, { fields: [nonConformities.productId], references: [products.id] }),
  createdBy:     one(users, { fields: [nonConformities.createdById], references: [users.id] }),
  attachments:   many(ncAttachments),
  comments:      many(ncComments),
}))

export const ncAttachmentsRelations = relations(ncAttachments, ({ one }) => ({
  nonConformity: one(nonConformities, { fields: [ncAttachments.nonConformityId], references: [nonConformities.id] }),
  uploadedBy:    one(users, { fields: [ncAttachments.uploadedById], references: [users.id] }),
}))

export const ncCommentsRelations = relations(ncComments, ({ one }) => ({
  nonConformity: one(nonConformities, { fields: [ncComments.nonConformityId], references: [nonConformities.id] }),
  user:          one(users, { fields: [ncComments.userId], references: [users.id] }),
}))

// ─── Invoices ─────────────────────────────────────────────────────────────

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company:       one(companies, { fields: [invoices.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [invoices.purchaseOrderId], references: [purchaseOrders.id] }),
  supplier:      one(suppliers, { fields: [invoices.supplierId], references: [suppliers.id] }),
  validatedBy:   one(users, { fields: [invoices.validatedById], references: [users.id] }),
  items:         many(invoiceItems),
  payments:      many(payments),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}))

// ─── Payments ─────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  company:      one(companies, { fields: [payments.companyId], references: [companies.id] }),
  invoice:      one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  createdBy:    one(users, { fields: [payments.createdById], references: [users.id] }),
  installments: many(paymentInstallments),
}))

export const paymentInstallmentsRelations = relations(paymentInstallments, ({ one }) => ({
  payment: one(payments, { fields: [paymentInstallments.paymentId], references: [payments.id] }),
}))

// ─── Logistics ────────────────────────────────────────────────────────────

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  company:       one(companies, { fields: [shipments.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [shipments.purchaseOrderId], references: [purchaseOrders.id] }),
  createdBy:     one(users, { fields: [shipments.createdById], references: [users.id] }),
}))

// ─── Audit Logs ───────────────────────────────────────────────────────────

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, { fields: [auditLogs.companyId], references: [companies.id] }),
  user:    one(users, { fields: [auditLogs.userId], references: [users.id] }),
}))
```

---

### 19. `apps/api/src/db/schema/index.ts`

```typescript
export * from './auth'
export * from './companies'
export * from './suppliers'
export * from './products'
export * from './quotations'
export * from './purchase-orders'
export * from './warehouses'
export * from './receipts'
export * from './non-conformities'
export * from './invoices'
export * from './payments'
export * from './logistics'
export * from './audit-logs'
export * from './relations'
```

---

### 20. `apps/api/src/db.module.ts`

```typescript
import { Global, Module } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db/schema'

export const DRIZZLE = Symbol('DRIZZLE')

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const client = postgres(process.env.DATABASE_URL!, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
        })
        return drizzle(client, {
          schema,
          logger: process.env.NODE_ENV === 'development',
        })
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

> **Invariante:** `logger` é `true` apenas em development — nunca em produção.

---

### 21. Migrations

```bash
# 1. Gerar a migration a partir do schema TypeScript
cd apps/api
pnpm db:generate

# 2. Revisar o SQL gerado em src/db/migrations/
# Verificar: tabelas, enums, constraints, índices, FKs

# 3. Aplicar no banco
pnpm db:migrate

# 4. Opcional: inspecionar visualmente
pnpm db:studio
```

> **Regra:** nunca editar o arquivo `.sql` gerado. Se precisar corrigir,
> ajuste o schema TypeScript e gere uma nova migration.

#### Pontos de atenção na revisão do SQL

Ao revisar o SQL gerado, verificar que estão presentes:

- Todos os `pgEnum` criados **antes** das tabelas que os referenciam
- `UNIQUE` em `companies.cnpj`, `users.email`, `sessions.token`
- `UNIQUE` implícito em `purchase_orders.number`
- FKs com `ON DELETE CASCADE` onde especificado
- `withTimezone: true` nos timestamps → tipo `TIMESTAMPTZ` no SQL

---

### 22. `apps/api/src/db/seed.ts`

O seed usa a API interna do Better-Auth (`auth.api.signUpEmail`) para criar
usuários com senha corretamente hasheada — nunca bcrypt manual.

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { auth } from '../modules/auth/better-auth'
import * as schema from './schema'
import { companies, companyMembers } from './schema'

async function seed() {
  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client, { schema })

  console.log('🌱 Iniciando seed...')

  // ─── 1. SUPER_ADMIN ─────────────────────────────────────────────────────
  console.log('Criando SUPER_ADMIN...')
  const superAdminResult = await auth.api.signUpEmail({
    body: {
      name:     'Super Admin',
      email:    'admin@elos.com.br',
      password: 'Elos@2024!',   // dev only — alterar em produção
    },
  })

  if (!superAdminResult?.user) {
    throw new Error('Falha ao criar SUPER_ADMIN via Better-Auth')
  }
  const superAdminId = superAdminResult.user.id

  // ─── 2. Empresa de exemplo ──────────────────────────────────────────────
  console.log('Criando empresa de exemplo...')
  const [company] = await db
    .insert(companies)
    .values({
      name:     'Elos Demo Ltda.',
      tradeName: 'Elos Demo',
      cnpj:     '00000000000191',  // CNPJ inválido — apenas para dev
      email:    'contato@elosdemo.com.br',
      city:     'São Paulo',
      state:    'SP',
    })
    .returning()

  // ─── 3. SUPER_ADMIN como membro da empresa (role SUPER_ADMIN) ───────────
  await db.insert(companyMembers).values({
    companyId: company.id,
    userId:    superAdminId,
    role:      'SUPER_ADMIN',
  })

  // ─── 4. ADMIN_EMPRESA (usuário separado) ────────────────────────────────
  console.log('Criando ADMIN_EMPRESA...')
  const adminResult = await auth.api.signUpEmail({
    body: {
      name:     'Admin Empresa',
      email:    'admin-empresa@elosdemo.com.br',
      password: 'Elos@2024!',
    },
  })

  if (!adminResult?.user) {
    throw new Error('Falha ao criar ADMIN_EMPRESA via Better-Auth')
  }

  await db.insert(companyMembers).values({
    companyId: company.id,
    userId:    adminResult.user.id,
    role:      'ADMIN_EMPRESA',
  })

  console.log('✅ Seed concluído.')
  console.log(`   Empresa: ${company.name} (CNPJ: ${company.cnpj})`)
  console.log(`   SUPER_ADMIN: admin@elos.com.br`)
  console.log(`   ADMIN_EMPRESA: admin-empresa@elosdemo.com.br`)
  console.log('   Senha padrão dev: Elos@2024!')

  await client.end()
}

seed().catch((err) => {
  console.error('❌ Seed falhou:', err)
  process.exit(1)
})
```

> **Sobre o SUPER_ADMIN e `company_members`:** o SUPER_ADMIN é um papel de
> plataforma. Para que o `AuthGuard` funcione corretamente em rotas com `/:cnpj`,
> ele precisa ter uma entrada em `company_members` para cada empresa que acessa.
> Em produção, a lógica do `AuthGuard` pode adicionar um bypass para
> `SUPER_ADMIN` sem exigir membership — essa decisão está registrada em
> Open Questions abaixo.

---

## Checklist de Conclusão

- [ ] `pnpm db:generate` roda sem erros e gera o SQL em `src/db/migrations/`
- [ ] SQL gerado revisado: enums, tabelas, FKs e constraints presentes e corretos
- [ ] `pnpm db:migrate` aplica a migration sem erros
- [ ] `pnpm db:studio` abre o Drizzle Studio e exibe todas as tabelas
- [ ] `pnpm db:seed` cria os 3 registros sem erros
- [ ] Login com `admin@elos.com.br` + `Elos@2024!` funciona via Better-Auth
- [ ] `DrizzleModule` importado em `AppModule` — `pnpm type-check` passa sem erros
- [ ] `packages/shared/src/enums.ts` exporta todos os enums
- [ ] Nenhuma migration editada manualmente após gerada

---

## Invariantes Verificadas

| Invariante                                         | Como esta unidade cumpre |
| -------------------------------------------------- | ------------------------ |
| `DATABASE_URL` sempre via `process.env`            | `DrizzleModule` e `seed.ts` leem de `process.env` |
| Better-Auth gerencia hash de senha                 | Seed usa `auth.api.signUpEmail` — nunca bcrypt manual |
| `DIRECT_URL` para migrations                       | `drizzle.config.ts` usa `DIRECT_URL ?? DATABASE_URL` |
| Drizzle logger apenas em development               | `logger: process.env.NODE_ENV === 'development'` |
| Migrations históricas nunca editadas               | Workflow: ajustar schema TS → `db:generate` → revisar → `db:migrate` |
| Schema do banco em TypeScript, nunca editado direto | Todo schema em `apps/api/src/db/schema/` |

---

## Open Questions

- [ ] **SUPER_ADMIN bypass no AuthGuard:** O SUPER_ADMIN precisa de uma entrada
  em `company_members` para cada empresa que acessa, ou o AuthGuard deve ter um
  bypass explícito para `role === SUPER_ADMIN`? O seed atual insere o SUPER_ADMIN
  como membro da empresa de demo. Impacto: AuthGuard da Fase 1.

- [ ] **Numeração de PO:** `purchase_orders.number` é `UNIQUE` e `NOT NULL`.
  Como gerar o número? Auto-incremento (`SERIAL`), sequência PostgreSQL por empresa
  (ex: `PO-2024-0001`), ou UUID abreviado? Impacto: schema de `purchase_orders`
  e Service de criação de PO.

- [ ] **`inventory` upsert:** O saldo de estoque em `inventory` é atualizado a
  cada `stock_movement`. Estratégia: trigger PostgreSQL, ou upsert explícito no
  Service do Drizzle? Preferência do projeto: lógica no Service (sem triggers).
