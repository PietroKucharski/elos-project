import { relations } from 'drizzle-orm'
import { auditLogs } from './audit-logs'
import { accounts, sessions, users } from './auth'
import { companies, companyMembers } from './companies'
import { invoiceItems, invoices } from './invoices'
import { shipments } from './logistics'
import { ncAttachments, ncComments, nonConformities } from './non-conformities'
import { paymentInstallments, payments } from './payments'
import { productSuppliers, products } from './products'
import { purchaseOrderItems, purchaseOrders } from './purchase-orders'
import { bidItems, bids, quotationInvites, quotationItems, quotations } from './quotations'
import { receiptItems, receipts } from './receipts'
import { supplierAddresses, supplierBankAccounts, supplierContacts, suppliers } from './suppliers'
import { inventory, stockMovements, warehouses } from './warehouses'

// ─── Auth ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  companyMembers: many(companyMembers),
  auditLogs: many(auditLogs),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

// ─── Companies ────────────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyMembers),
  suppliers: many(suppliers),
  products: many(products),
  quotations: many(quotations),
  purchaseOrders: many(purchaseOrders),
  warehouses: many(warehouses),
  invoices: many(invoices),
  payments: many(payments),
  auditLogs: many(auditLogs),
}))

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, { fields: [companyMembers.companyId], references: [companies.id] }),
  user: one(users, { fields: [companyMembers.userId], references: [users.id] }),
}))

// ─── Suppliers ────────────────────────────────────────────────────────────

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  company: one(companies, { fields: [suppliers.companyId], references: [companies.id] }),
  contacts: many(supplierContacts),
  bankAccounts: many(supplierBankAccounts),
  addresses: many(supplierAddresses),
  products: many(productSuppliers),
  bids: many(bids),
  invites: many(quotationInvites),
}))

export const supplierContactsRelations = relations(supplierContacts, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierContacts.supplierId], references: [suppliers.id] }),
}))

export const supplierBankAccountsRelations = relations(supplierBankAccounts, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierBankAccounts.supplierId],
    references: [suppliers.id],
  }),
}))

export const supplierAddressesRelations = relations(supplierAddresses, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierAddresses.supplierId], references: [suppliers.id] }),
}))

// ─── Products ─────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
  suppliers: many(productSuppliers),
  inventory: many(inventory),
}))

export const productSuppliersRelations = relations(productSuppliers, ({ one }) => ({
  product: one(products, { fields: [productSuppliers.productId], references: [products.id] }),
  supplier: one(suppliers, { fields: [productSuppliers.supplierId], references: [suppliers.id] }),
}))

// ─── Quotations ───────────────────────────────────────────────────────────

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  company: one(companies, { fields: [quotations.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [quotations.createdById], references: [users.id] }),
  items: many(quotationItems),
  invites: many(quotationInvites),
  bids: many(bids),
}))

export const quotationItemsRelations = relations(quotationItems, ({ one, many }) => ({
  quotation: one(quotations, { fields: [quotationItems.quotationId], references: [quotations.id] }),
  product: one(products, { fields: [quotationItems.productId], references: [products.id] }),
  bidItems: many(bidItems),
}))

export const quotationInvitesRelations = relations(quotationInvites, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationInvites.quotationId],
    references: [quotations.id],
  }),
  supplier: one(suppliers, { fields: [quotationInvites.supplierId], references: [suppliers.id] }),
}))

export const bidsRelations = relations(bids, ({ one, many }) => ({
  quotation: one(quotations, { fields: [bids.quotationId], references: [quotations.id] }),
  supplier: one(suppliers, { fields: [bids.supplierId], references: [suppliers.id] }),
  company: one(companies, { fields: [bids.companyId], references: [companies.id] }),
  items: many(bidItems),
}))

export const bidItemsRelations = relations(bidItems, ({ one }) => ({
  bid: one(bids, { fields: [bidItems.bidId], references: [bids.id] }),
  quotationItem: one(quotationItems, {
    fields: [bidItems.quotationItemId],
    references: [quotationItems.id],
  }),
}))

// ─── Purchase Orders ──────────────────────────────────────────────────────

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company: one(companies, { fields: [purchaseOrders.companyId], references: [companies.id] }),
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  quotation: one(quotations, { fields: [purchaseOrders.quotationId], references: [quotations.id] }),
  bid: one(bids, { fields: [purchaseOrders.bidId], references: [bids.id] }),
  createdBy: one(users, { fields: [purchaseOrders.createdById], references: [users.id] }),
  approvedBy: one(users, { fields: [purchaseOrders.approvedById], references: [users.id] }),
  items: many(purchaseOrderItems),
  receipts: many(receipts),
  invoices: many(invoices),
  shipments: many(shipments),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, { fields: [purchaseOrderItems.productId], references: [products.id] }),
  receiptItems: many(receiptItems),
}))

// ─── Warehouses & Stock ───────────────────────────────────────────────────

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  company: one(companies, { fields: [warehouses.companyId], references: [companies.id] }),
  inventory: many(inventory),
  stockMovements: many(stockMovements),
  receipts: many(receipts),
}))

export const inventoryRelations = relations(inventory, ({ one }) => ({
  company: one(companies, { fields: [inventory.companyId], references: [companies.id] }),
  warehouse: one(warehouses, { fields: [inventory.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  company: one(companies, { fields: [stockMovements.companyId], references: [companies.id] }),
  warehouse: one(warehouses, { fields: [stockMovements.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  createdBy: one(users, { fields: [stockMovements.createdById], references: [users.id] }),
}))

// ─── Receipts ─────────────────────────────────────────────────────────────

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  company: one(companies, { fields: [receipts.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [receipts.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  warehouse: one(warehouses, { fields: [receipts.warehouseId], references: [warehouses.id] }),
  receivedBy: one(users, { fields: [receipts.receivedById], references: [users.id] }),
  items: many(receiptItems),
}))

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, { fields: [receiptItems.receiptId], references: [receipts.id] }),
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [receiptItems.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
}))

// ─── Non-conformities ─────────────────────────────────────────────────────

export const nonConformitiesRelations = relations(nonConformities, ({ one, many }) => ({
  company: one(companies, { fields: [nonConformities.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [nonConformities.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  supplier: one(suppliers, { fields: [nonConformities.supplierId], references: [suppliers.id] }),
  product: one(products, { fields: [nonConformities.productId], references: [products.id] }),
  createdBy: one(users, { fields: [nonConformities.createdById], references: [users.id] }),
  attachments: many(ncAttachments),
  comments: many(ncComments),
}))

export const ncAttachmentsRelations = relations(ncAttachments, ({ one }) => ({
  nonConformity: one(nonConformities, {
    fields: [ncAttachments.nonConformityId],
    references: [nonConformities.id],
  }),
  uploadedBy: one(users, { fields: [ncAttachments.uploadedById], references: [users.id] }),
}))

export const ncCommentsRelations = relations(ncComments, ({ one }) => ({
  nonConformity: one(nonConformities, {
    fields: [ncComments.nonConformityId],
    references: [nonConformities.id],
  }),
  user: one(users, { fields: [ncComments.userId], references: [users.id] }),
}))

// ─── Invoices ─────────────────────────────────────────────────────────────

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, { fields: [invoices.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [invoices.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  supplier: one(suppliers, { fields: [invoices.supplierId], references: [suppliers.id] }),
  validatedBy: one(users, { fields: [invoices.validatedById], references: [users.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}))

// ─── Payments ─────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  company: one(companies, { fields: [payments.companyId], references: [companies.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  createdBy: one(users, { fields: [payments.createdById], references: [users.id] }),
  installments: many(paymentInstallments),
}))

export const paymentInstallmentsRelations = relations(paymentInstallments, ({ one }) => ({
  payment: one(payments, { fields: [paymentInstallments.paymentId], references: [payments.id] }),
}))

// ─── Logistics ────────────────────────────────────────────────────────────

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  company: one(companies, { fields: [shipments.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [shipments.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  createdBy: one(users, { fields: [shipments.createdById], references: [users.id] }),
}))

// ─── Audit Logs ───────────────────────────────────────────────────────────

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, { fields: [auditLogs.companyId], references: [companies.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}))
