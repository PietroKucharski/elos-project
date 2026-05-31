import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const supplierStatusEnum = pgEnum('supplier_status', ['PENDING', 'APPROVED', 'REJECTED'])

export const supplierTypeEnum = pgEnum('supplier_type', ['PJ', 'PF'])

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: supplierTypeEnum('type').notNull().default('PJ'),
  cnpj: varchar('cnpj', { length: 14 }),
  cpf: varchar('cpf', { length: 11 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  status: supplierStatusEnum('status').notNull().default('PENDING'),
  rating: numeric('rating', { precision: 3, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const supplierContacts = pgTable('supplier_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 100 }),
  isMain: varchar('is_main', { length: 1 }).notNull().default('N'), // 'Y' | 'N'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const supplierBankAccounts = pgTable('supplier_bank_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'cascade' }),
  bank: varchar('bank', { length: 100 }).notNull(),
  agency: varchar('agency', { length: 20 }).notNull(),
  account: varchar('account', { length: 30 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // 'CHECKING' | 'SAVINGS'
  pixKey: varchar('pix_key', { length: 255 }),
  isPrimary: varchar('is_primary', { length: 1 }).notNull().default('N'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const supplierAddresses = pgTable('supplier_addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'cascade' }),
  street: varchar('street', { length: 255 }).notNull(),
  number: varchar('number', { length: 20 }).notNull(),
  complement: varchar('complement', { length: 100 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  zipCode: varchar('zip_code', { length: 8 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Supplier = typeof suppliers.$inferSelect
export type InsertSupplier = typeof suppliers.$inferInsert
