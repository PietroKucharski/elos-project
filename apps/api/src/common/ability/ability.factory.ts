import {
  AbilityBuilder,
  type ForcedSubject,
  type MongoAbility,
  createMongoAbility,
} from '@casl/ability'
import { Injectable } from '@nestjs/common'
import type { Company, CompanyMember } from '../../db/schema/companies'
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
  | 'Supplier'
  | 'SupplierContact'
  | 'SupplierBankAccount'
  | 'Product'
  | 'ProductSupplier'
  | 'Quotation'
  | 'QuotationItem'
  | 'QuotationInvite'
  | 'Bid'
  | 'BidItem'
  | 'PurchaseOrder'
  | 'PurchaseOrderItem'
  | 'Receipt'
  | 'Warehouse'
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
        can('read', 'Bid')
        can('select', 'Bid')
        can('manage', 'PurchaseOrder')
        can('approve', 'PurchaseOrder')
        can('read', 'Receipt')
        can('read', 'NonConformity')
        can('read', 'Invoice')
        can('read', 'AuditLog')
        break

      case 'ALMOXARIFE':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('read', 'PurchaseOrder')
        can('manage', 'Receipt')
        can('manage', 'Warehouse')
        can('manage', 'Inventory')
        can('manage', 'StockMovement')
        can('manage', 'NonConformity')
        break

      case 'ANALISTA_FINANCEIRO':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('read', 'PurchaseOrder')
        can('read', 'Receipt')
        can('manage', 'Invoice')
        can('manage', 'Payment')
        break

      case 'TRANSPORTADOR':
        can('read', 'Company', { id: companyId })
        can('read', 'CompanyMember', { companyId })
        can('read', 'PurchaseOrder')
        can('manage', 'Shipment')
        break

      default:
        // Sem papel — sem permissões
        break
    }

    return build()
  }
}
