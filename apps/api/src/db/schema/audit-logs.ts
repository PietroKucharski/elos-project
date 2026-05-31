import { json, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  userId: text('user_id').references(() => users.id),
  entity: varchar('entity', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  before: json('before'),
  after: json('after'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type InsertAuditLog = typeof auditLogs.$inferInsert
