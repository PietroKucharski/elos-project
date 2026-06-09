import {
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { purchaseOrders } from './purchase-orders'
import { suppliers } from './suppliers'

export const invoiceStatusEnum = pgEnum('invoice_status', ['PENDING', 'VALIDATED', 'REJECTED'])

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    number: varchar('number', { length: 100 }).notNull(),
    issueDate: timestamp('issue_date', { withTimezone: true }).notNull(),
    totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 15, scale: 2 }),
    status: invoiceStatusEnum('status').notNull().default('PENDING'),
    fileUrl: text('file_url'),
    rejectionReason: text('rejection_reason'),
    validatedById: text('validated_by_id').references(() => users.id),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Número fiscal é externo (atribuído pelo fornecedor); único por empresa.
    companyNumberUnique: uniqueIndex('invoices_company_id_number_unique').on(
      table.companyId,
      table.number,
    ),
  }),
)

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Invoice = typeof invoices.$inferSelect
