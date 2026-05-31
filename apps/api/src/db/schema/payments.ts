import { numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { companies } from './companies'
import { invoices } from './invoices'

export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'CANCELLED'])

export const paymentMethodEnum = pgEnum('payment_method', ['BOLETO', 'PIX', 'TRANSFER', 'CHECK'])

export const installmentStatusEnum = pgEnum('installment_status', ['PENDING', 'PAID', 'OVERDUE'])

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  notes: text('notes'),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const paymentInstallments = pgTable('payment_installments', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  installmentNumber: numeric('installment_number', { precision: 3, scale: 0 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  status: installmentStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Payment = typeof payments.$inferSelect
