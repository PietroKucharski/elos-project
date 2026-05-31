import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { suppliers } from './suppliers'

export const unitOfMeasureEnum = pgEnum('unit_of_measure', [
  'UN',
  'KG',
  'G',
  'L',
  'ML',
  'M',
  'M2',
  'M3',
  'CX',
  'PC',
])

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }),
  description: text('description'),
  unit: unitOfMeasureEnum('unit').notNull().default('UN'),
  minStock: numeric('min_stock', { precision: 15, scale: 3 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Vínculo produto ↔ fornecedor (quais fornecedores podem suprir este produto)
export const productSuppliers = pgTable('product_suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'cascade' }),
  isPreferred: boolean('is_preferred').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Product = typeof products.$inferSelect
export type InsertProduct = typeof products.$inferInsert
