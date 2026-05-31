import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { bids, quotations } from './quotations'
import { suppliers } from './suppliers'

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'DRAFT',
  'APPROVED',
  'SENT',
  'RECEIVED',
  'CANCELLED',
])

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  quotationId: uuid('quotation_id').references(() => quotations.id),
  bidId: uuid('bid_id').references(() => bids.id),
  number: varchar('number', { length: 50 }).notNull().unique(),
  status: purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  approvedById: text('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseOrderId: uuid('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 15, scale: 2 }).notNull(),
  receivedQuantity: numeric('received_quantity', { precision: 15, scale: 3 })
    .notNull()
    .default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert
