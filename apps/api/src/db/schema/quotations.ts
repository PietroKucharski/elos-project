import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
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

export const inviteStatusEnum = pgEnum('invite_status', ['PENDING', 'ACCEPTED', 'DECLINED'])

export const bidStatusEnum = pgEnum('bid_status', ['DRAFT', 'SUBMITTED', 'SELECTED', 'REJECTED'])

export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  status: quotationStatusEnum('status').notNull().default('DRAFT'),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 10 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotationInvites = pgTable('quotation_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  status: inviteStatusEnum('status').notNull().default('PENDING'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
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
