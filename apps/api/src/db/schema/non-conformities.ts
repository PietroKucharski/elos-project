import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { products } from './products'
import { purchaseOrders } from './purchase-orders'
import { suppliers } from './suppliers'

export const ncStatusEnum = pgEnum('nc_status', ['OPEN', 'ANALYZING', 'RESOLVED', 'REJECTED'])

export const ncTypeEnum = pgEnum('nc_type', [
  'QUALITY',
  'QUANTITY',
  'DELIVERY',
  'DOCUMENTATION',
  'OTHER',
])

export const severityEnum = pgEnum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const nonConformities = pgTable('non_conformities', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  productId: uuid('product_id').references(() => products.id),
  type: ncTypeEnum('type').notNull(),
  severity: severityEnum('severity').notNull(),
  description: text('description').notNull(),
  status: ncStatusEnum('status').notNull().default('OPEN'),
  resolution: text('resolution'),
  notes: text('notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const ncAttachments = pgTable('nc_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  nonConformityId: uuid('non_conformity_id')
    .notNull()
    .references(() => nonConformities.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: varchar('file_size', { length: 20 }),
  mimeType: varchar('mime_type', { length: 100 }),
  uploadedById: text('uploaded_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const ncComments = pgTable('nc_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  nonConformityId: uuid('non_conformity_id')
    .notNull()
    .references(() => nonConformities.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type NonConformity = typeof nonConformities.$inferSelect
