// Role: papel do usuário dentro de uma empresa
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_EMPRESA: 'ADMIN_EMPRESA',
  COMPRADOR: 'COMPRADOR',
  ALMOXARIFE: 'ALMOXARIFE',
  ANALISTA_FINANCEIRO: 'ANALISTA_FINANCEIRO',
  TRANSPORTADOR: 'TRANSPORTADOR',
} as const
export type Role = (typeof Role)[keyof typeof Role]

// SupplierStatus
export const SupplierStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus]

// QuotationStatus
export const QuotationStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus]

// BidStatus
export const BidStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  SELECTED: 'SELECTED',
  REJECTED: 'REJECTED',
} as const
export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus]

// PurchaseOrderStatus
export const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus]

// ReceiptStatus
export const ReceiptStatus = {
  PARTIAL: 'PARTIAL',
  COMPLETE: 'COMPLETE',
} as const
export type ReceiptStatus = (typeof ReceiptStatus)[keyof typeof ReceiptStatus]

// NonConformityStatus
export const NonConformityStatus = {
  OPEN: 'OPEN',
  ANALYZING: 'ANALYZING',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const
export type NonConformityStatus = (typeof NonConformityStatus)[keyof typeof NonConformityStatus]

// NonConformityType
export const NonConformityType = {
  QUALITY: 'QUALITY',
  QUANTITY: 'QUANTITY',
  DELIVERY: 'DELIVERY',
  DOCUMENTATION: 'DOCUMENTATION',
  OTHER: 'OTHER',
} as const
export type NonConformityType = (typeof NonConformityType)[keyof typeof NonConformityType]

// Severity
export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const
export type Severity = (typeof Severity)[keyof typeof Severity]

// InvoiceStatus
export const InvoiceStatus = {
  PENDING: 'PENDING',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
} as const
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

// PaymentStatus
export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

// PaymentMethod
export const PaymentMethod = {
  BOLETO: 'BOLETO',
  PIX: 'PIX',
  TRANSFER: 'TRANSFER',
  CHECK: 'CHECK',
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

// ShipmentStatus
export const ShipmentStatus = {
  PENDING: 'PENDING',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus]

// StockMovementType
export const StockMovementType = {
  ENTRY: 'ENTRY',
  EXIT: 'EXIT',
  TRANSFER: 'TRANSFER',
} as const
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType]

// UnitOfMeasure
export const UnitOfMeasure = {
  UN: 'UN',
  KG: 'KG',
  G: 'G',
  L: 'L',
  ML: 'ML',
  M: 'M',
  M2: 'M2',
  M3: 'M3',
  CX: 'CX',
  PC: 'PC',
} as const
export type UnitOfMeasure = (typeof UnitOfMeasure)[keyof typeof UnitOfMeasure]
