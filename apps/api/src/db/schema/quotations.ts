import {
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { suppliers } from './suppliers'

export const quotationStatusEnum = pgEnum('quotation_status', [
  'DRAFT',
  'OPEN',
  'CLOSED',
  'CANCELLED',
])

export const quotationSupplierStatusEnum = pgEnum('quotation_supplier_status', [
  'INVITED',
  'RESPONDED',
  'DECLINED',
])

export const bidStatusEnum = pgEnum('bid_status', ['DRAFT', 'SUBMITTED', 'SELECTED', 'REJECTED'])

export const quotations = pgTable(
  'quotations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    // Número gerado por empresa: COT-{ano}-{sequencial 4 dígitos} (ex: COT-2024-0001)
    number: varchar('number', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    deadline: timestamp('deadline', { withTimezone: true }).notNull(),
    paymentTerms: text('payment_terms'),
    status: quotationStatusEnum('status').notNull().default('DRAFT'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('quotations_company_number_unique').on(table.companyId, table.number)],
)

export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  // Vínculo opcional ao catálogo — itens podem existir sem produto cadastrado
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotationSuppliers = pgTable('quotation_suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  status: quotationSupplierStatusEnum('status').notNull().default('INVITED'),
  invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bids = pgTable('bids', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  status: bidStatusEnum('status').notNull().default('DRAFT'),
  paymentTerms: text('payment_terms'),
  observations: text('observations'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bidItems = pgTable('bid_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  bidId: uuid('bid_id')
    .notNull()
    .references(() => bids.id, { onDelete: 'cascade' }),
  quotationItemId: uuid('quotation_item_id')
    .notNull()
    .references(() => quotationItems.id),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  deliveryDays: numeric('delivery_days', { precision: 5, scale: 0 }).notNull(),
  observations: text('observations'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Quotation = typeof quotations.$inferSelect
export type Bid = typeof bids.$inferSelect
