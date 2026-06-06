import {
  AbilityBuilder,
  type ForcedSubject,
  type MongoAbility,
  createMongoAbility,
} from '@casl/ability'
import { Injectable } from '@nestjs/common'
import type { Company, CompanyMember } from '../../db/schema/companies'
import type { Product } from '../../db/schema/products'
import type { PurchaseOrder } from '../../db/schema/purchase-orders'
import type { Bid, Quotation } from '../../db/schema/quotations'
import type { Supplier } from '../../db/schema/suppliers'
import type { Warehouse } from '../../db/schema/warehouses'
import type { SessionUser } from '../types/session-user'

export type Actions =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage' // shorthand para todas as ações
  | 'approve'
  | 'reject'
  | 'submit'
  | 'select' // selecionar lance vencedor em cotação
  | 'receive' // transição SENT→RECEIVED de pedido de compra (ALMOXARIFE)

export type Subjects =
  // 'Company' aceita tanto a string (checagem por tipo: can('read', 'Company'))
  // quanto a row tagueada (ForcedSubject) para condições por objeto
  // (ex.: { id: companyId }) e passar a row do Drizzle direto ao CASL. Os
  // demais subjects permanecem strings até precisarem de escopo por objeto.
  | 'Company'
  | (Company & ForcedSubject<'Company'>)
  // 'CompanyMember' tagueado (como 'Company') para suportar condições por objeto
  // — ex.: can('read', 'CompanyMember', { companyId }) — sem cair em MongoQuery<never>
  | 'CompanyMember'
  | (CompanyMember & ForcedSubject<'CompanyMember'>)
  // 'Supplier' tagueado (como 'Company') para suportar condições por objeto via
  // subject('Supplier', row) no SuppliersService — sem cair em MongoQuery<never>
  | 'Supplier'
  | (Supplier & ForcedSubject<'Supplier'>)
  | 'SupplierContact'
  | 'SupplierBankAccount'
  // 'Product' tagueado (como 'Supplier') para suportar condições por objeto via
  // subject('Product', row) no ProductsService — sem cair em MongoQuery<never>
  | 'Product'
  | (Product & ForcedSubject<'Product'>)
  | 'ProductSupplier'
  // 'Quotation' tagueado (como 'Supplier') para suportar condições por objeto via
  // subject('Quotation', row) no QuotationsService — sem cair em MongoQuery<never>
  | 'Quotation'
  | (Quotation & ForcedSubject<'Quotation'>)
  | 'QuotationItem'
  | 'QuotationInvite'
  // 'Bid' tagueado (como 'Quotation') para suportar condições por objeto via
  // subject('Bid', row) no BidsService — sem cair em MongoQuery<never>
  | 'Bid'
  | (Bid & ForcedSubject<'Bid'>)
  | 'BidItem'
  // 'PurchaseOrder' tagueado (como 'Bid') para suportar condições por objeto via
  // subject('PurchaseOrder', row) no PurchaseOrdersService — sem cair em MongoQuery<never>
  | 'PurchaseOrder'
  | (PurchaseOrder & ForcedSubject<'PurchaseOrder'>)
  | 'PurchaseOrderItem'
  | 'Receipt'
  // 'Warehouse' tagueado (como 'PurchaseOrder') para suportar condições por objeto
  // via subject('Warehouse', row) no WarehousesService — sem cair em MongoQuery<never>
  | 'Warehouse'
  | (Warehouse & ForcedSubject<'Warehouse'>)
  | 'Inventory'
  | 'StockMovement'
  | 'NonConformity'
  | 'Invoice'
  | 'Payment'
  | 'Shipment'
  | 'AuditLog'
  | 'all'

export type AppAbility = MongoAbility<[Actions, Subjects]>

@Injectable()
export class AbilityFactory {
  createForUser(user: SessionUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    // Empresa ativa do usuário; '' nunca casa um uuid real (deny seguro se null).
    const companyId = user.companyId ?? ''

    switch (user.role) {
      case 'SUPER_ADMIN':
        can('manage', 'all')
        break

      case 'ADMIN_EMPRESA':
        can('read', 'Company', { id: companyId })
        can('update', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('create', 'CompanyMember', { companyId })
        can('update', 'CompanyMember', { companyId })
        can('delete', 'CompanyMember', { companyId })
        can('manage', 'Supplier')
        can('manage', 'SupplierContact')
        can('manage', 'SupplierBankAccount')
        can('manage', 'Product')
        can('manage', 'ProductSupplier')
        can('manage', 'Quotation')
        can('read', 'Bid', { companyId })
        can('create', 'Bid', { companyId })
        can('update', 'Bid', { companyId })
        can('delete', 'Bid', { companyId })
        can('manage', 'PurchaseOrder')
        can('manage', 'Warehouse')
        can('manage', 'Inventory')
        can('manage', 'StockMovement')
        can('manage', 'NonConformity')
        can('manage', 'Invoice')
        can('manage', 'Payment')
        can('manage', 'Shipment')
        can('read', 'AuditLog')
        break

      case 'COMPRADOR':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can(['read', 'create', 'update'], 'Supplier')
        can('approve', 'Supplier')
        can('reject', 'Supplier')
        can('manage', 'SupplierContact')
        can('manage', 'SupplierBankAccount')
        can('manage', 'Product')
        can('manage', 'ProductSupplier')
        can('manage', 'Quotation')
        can('manage', 'QuotationItem')
        can('manage', 'QuotationInvite')
        can('read', 'Bid', { companyId })
        can('create', 'Bid', { companyId })
        can('update', 'Bid', { companyId })
        can('delete', 'Bid', { companyId })
        can('manage', 'PurchaseOrder')
        can('approve', 'PurchaseOrder')
        can('read', 'Warehouse', { companyId })
        can('read', 'Receipt')
        can('read', 'NonConformity')
        can('read', 'Invoice')
        can('read', 'AuditLog')
        break

      case 'ALMOXARIFE':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('read', 'Product')
        can('read', 'Quotation')
        can('read', 'Bid', { companyId })
        can('read', 'PurchaseOrder')
        can('receive', 'PurchaseOrder') // transição SENT→RECEIVED
        can('manage', 'Receipt')
        can('manage', 'Warehouse')
        can('manage', 'Inventory')
        can('manage', 'StockMovement')
        can('manage', 'NonConformity')
        break

      case 'ANALISTA_FINANCEIRO':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('read', 'Product')
        can('read', 'Quotation')
        can('read', 'Bid', { companyId })
        can('read', 'PurchaseOrder')
        can('read', 'Warehouse', { companyId })
        can('read', 'Receipt')
        can('manage', 'Invoice')
        can('manage', 'Payment')
        break

      case 'TRANSPORTADOR':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('read', 'Product')
        can('read', 'Quotation')
        can('read', 'Bid', { companyId })
        can('read', 'PurchaseOrder')
        can('read', 'Warehouse', { companyId })
        can('manage', 'Shipment')
        break

      default:
        // Sem papel — sem permissões
        break
    }

    return build()
  }
}
