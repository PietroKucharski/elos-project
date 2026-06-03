import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
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

export const products = pgTable(
  'products',
  {
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
  },
  // Código interno único por empresa (tenant). `code` é nullable: o Postgres trata
  // NULLs como distintos, então produtos sem código não colidem entre si.
  (table) => [uniqueIndex('products_company_id_code_unique').on(table.companyId, table.code)],
)

// Vínculo produto ↔ fornecedor (quais fornecedores podem suprir este produto)
export const productSuppliers = pgTable(
  'product_suppliers',
  {
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
  },
  // Um fornecedor só pode estar vinculado uma vez a cada produto
  (table) => [
    unique('product_suppliers_product_id_supplier_id_unique').on(table.productId, table.supplierId),
  ],
)

export type Product = typeof products.$inferSelect
export type InsertProduct = typeof products.$inferInsert
