import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { purchaseOrders } from './purchase-orders'

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'PENDING',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
])

export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id),
  carrier: varchar('carrier', { length: 255 }),
  trackingCode: varchar('tracking_code', { length: 100 }),
  status: shipmentStatusEnum('status').notNull().default('PENDING'),
  estimatedDelivery: timestamp('estimated_delivery', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  notes: text('notes'),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Shipment = typeof shipments.$inferSelect
