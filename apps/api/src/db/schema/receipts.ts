import { numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { purchaseOrderItems, purchaseOrders } from './purchase-orders'
import { warehouses } from './warehouses'

export const receiptStatusEnum = pgEnum('receipt_status', ['PARTIAL', 'COMPLETE'])

export const receipts = pgTable('receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  receivedById: text('received_by_id')
    .notNull()
    .references(() => users.id),
  status: receiptStatusEnum('status').notNull(),
  notes: text('notes'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const receiptItems = pgTable('receipt_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptId: uuid('receipt_id')
    .notNull()
    .references(() => receipts.id, { onDelete: 'cascade' }),
  purchaseOrderItemId: uuid('purchase_order_item_id')
    .notNull()
    .references(() => purchaseOrderItems.id),
  receivedQuantity: numeric('received_quantity', { precision: 15, scale: 3 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Receipt = typeof receipts.$inferSelect
