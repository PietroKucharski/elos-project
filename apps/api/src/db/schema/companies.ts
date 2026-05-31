import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const roleEnum = pgEnum('role', [
  'SUPER_ADMIN',
  'ADMIN_EMPRESA',
  'COMPRADOR',
  'ALMOXARIFE',
  'ANALISTA_FINANCEIRO',
  'TRANSPORTADOR',
])

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  cnpj: varchar('cnpj', { length: 14 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  // Endereço inline (sem tabela separada para empresa)
  street: varchar('street', { length: 255 }),
  number: varchar('number', { length: 20 }),
  complement: varchar('complement', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zip_code', { length: 8 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const companyMembers = pgTable('company_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Company = typeof companies.$inferSelect
export type InsertCompany = typeof companies.$inferInsert
export type CompanyMember = typeof companyMembers.$inferSelect
export type InsertCompanyMember = typeof companyMembers.$inferInsert
