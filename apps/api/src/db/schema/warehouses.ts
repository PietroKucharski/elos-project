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
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'

export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['ENTRY', 'EXIT', 'TRANSFER'])

export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  location: text('location'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Saldo atual de estoque por produto/armazém — mantido via stock_movements
export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull().default('0'),
  minStock: numeric('min_stock', { precision: 15, scale: 3 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  // Referência opcional ao documento origem (receipt, purchase_order, etc.)
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Warehouse = typeof warehouses.$inferSelect
export type StockMovement = typeof stockMovements.$inferSelect
