import { subject } from '@casl/ability'
import type {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
  RejectInvoiceDto,
  UpdateInvoiceDto,
  ValidateInvoiceDto,
} from '@elos/shared'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { type SQL, and, desc, eq, ilike } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'
import { invoiceItems, invoices } from '../../db/schema/invoices'
import { products } from '../../db/schema/products'
import { purchaseOrders } from '../../db/schema/purchase-orders'
import { suppliers } from '../../db/schema/suppliers'

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?: string | undefined
      supplierId?: string | undefined
      purchaseOrderId?: string | undefined
      search?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Invoice')) {
      throw new ForbiddenException('Sem permissão para listar notas fiscais.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN; cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
    const limit = Math.min(100, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(invoices.companyId, user.companyId!)]
    if (query.status) conditions.push(eq(invoices.status, query.status as 'PENDING'))
    if (query.supplierId) conditions.push(eq(invoices.supplierId, query.supplierId))
    if (query.purchaseOrderId) {
      conditions.push(eq(invoices.purchaseOrderId, query.purchaseOrderId))
    }
    if (query.search) conditions.push(ilike(invoices.number, `%${query.search}%`))

    return this.db
      .select({
        id: invoices.id,
        companyId: invoices.companyId,
        purchaseOrderId: invoices.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId: invoices.supplierId,
        supplierName: suppliers.name,
        number: invoices.number,
        issueDate: invoices.issueDate,
        totalAmount: invoices.totalAmount,
        taxAmount: invoices.taxAmount,
        status: invoices.status,
        fileUrl: invoices.fileUrl,
        rejectionReason: invoices.rejectionReason,
        validatedById: invoices.validatedById,
        validatedAt: invoices.validatedAt,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, invoices.purchaseOrderId))
      .innerJoin(suppliers, eq(suppliers.id, invoices.supplierId))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({
        id: invoices.id,
        companyId: invoices.companyId,
        purchaseOrderId: invoices.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId: invoices.supplierId,
        supplierName: suppliers.name,
        number: invoices.number,
        issueDate: invoices.issueDate,
        totalAmount: invoices.totalAmount,
        taxAmount: invoices.taxAmount,
        status: invoices.status,
        fileUrl: invoices.fileUrl,
        rejectionReason: invoices.rejectionReason,
        validatedById: invoices.validatedById,
        validatedByName: users.name,
        validatedAt: invoices.validatedAt,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, invoices.purchaseOrderId))
      .innerJoin(suppliers, eq(suppliers.id, invoices.supplierId))
      .leftJoin(users, eq(users.id, invoices.validatedById))
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')

    const items = await this.db
      .select({
        id: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        productId: invoiceItems.productId,
        productName: products.name,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        totalPrice: invoiceItems.totalPrice,
        createdAt: invoiceItems.createdAt,
        updatedAt: invoiceItems.updatedAt,
      })
      .from(invoiceItems)
      .leftJoin(products, eq(products.id, invoiceItems.productId))
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.createdAt)

    return { ...invoice, items }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Invoice')) {
      throw new ForbiddenException('Sem permissão para criar nota fiscal.')
    }

    // Validar PO (deve pertencer à empresa e ter status SENT ou RECEIVED)
    const [po] = await this.db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, dto.purchaseOrderId),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!po) throw new NotFoundException('Pedido de compra não encontrado.')
    if (!['SENT', 'RECEIVED'].includes(po.status)) {
      throw new BadRequestException(
        `O pedido de compra deve ter status SENT ou RECEIVED. Status atual: ${po.status}.`,
      )
    }

    // Validar fornecedor (deve pertencer à empresa e estar APPROVED)
    const [supplier] = await this.db
      .select({ id: suppliers.id, status: suppliers.status })
      .from(suppliers)
      .where(and(eq(suppliers.id, dto.supplierId), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.')
    if (supplier.status !== 'APPROVED') {
      throw new BadRequestException('Apenas fornecedores aprovados podem ter NFs registradas.')
    }

    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          companyId: user.companyId!,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: dto.supplierId,
          number: dto.number,
          issueDate: new Date(dto.issueDate),
          totalAmount: String(dto.totalAmount),
          taxAmount: dto.taxAmount !== undefined ? String(dto.taxAmount) : null,
          fileUrl: dto.fileUrl ?? null,
          status: 'PENDING',
        })
        .returning()

      if (!invoice) throw new Error('Falha ao criar nota fiscal.')

      // Inserir itens se fornecidos
      if (dto.items?.length) {
        for (const item of dto.items) {
          await tx.insert(invoiceItems).values({
            invoiceId: invoice.id,
            productId: item.productId ?? null,
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.totalPrice),
          })
        }
      }

      await tx.insert(auditLogs).values({
        entity: 'Invoice',
        entityId: invoice.id,
        action: 'CREATE',
        after: {
          number: dto.number,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: dto.supplierId,
          totalAmount: dto.totalAmount,
          status: 'PENDING',
        },
        userId: user.id,
        companyId: user.companyId,
      })

      return invoice
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Nota fiscal não encontrada.')
    if (ability.cannot('update', subject('Invoice', existing))) {
      throw new ForbiddenException('Sem permissão para editar esta nota fiscal.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Somente notas fiscais pendentes (PENDING) podem ser editadas.')
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.number !== undefined) updateData.number = dto.number
      if (dto.issueDate !== undefined) updateData.issueDate = new Date(dto.issueDate)
      if (dto.totalAmount !== undefined) updateData.totalAmount = String(dto.totalAmount)
      if (dto.taxAmount !== undefined) updateData.taxAmount = String(dto.taxAmount)
      if (dto.fileUrl !== undefined) updateData.fileUrl = dto.fileUrl

      const [updated] = await tx
        .update(invoices)
        .set(updateData)
        .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Nota fiscal não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'Invoice',
        entityId: id,
        action: 'UPDATE',
        before: { number: existing.number, totalAmount: existing.totalAmount },
        after: updateData,
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── validate ─────────────────────────────────────────────────────────────

  async validate(id: string, _dto: ValidateInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Nota fiscal não encontrada.')
    if (ability.cannot('update', subject('Invoice', existing))) {
      throw new ForbiddenException('Sem permissão para validar esta nota fiscal.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas NFs pendentes podem ser validadas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(invoices)
        .set({
          status: 'VALIDATED',
          validatedById: user.id,
          validatedAt: now,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Nota fiscal não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'Invoice',
        entityId: id,
        action: 'VALIDATE',
        before: { status: 'PENDING' },
        after: { status: 'VALIDATED', validatedById: user.id },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── reject ───────────────────────────────────────────────────────────────

  async reject(id: string, dto: RejectInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Nota fiscal não encontrada.')
    if (ability.cannot('update', subject('Invoice', existing))) {
      throw new ForbiddenException('Sem permissão para rejeitar esta nota fiscal.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas NFs pendentes podem ser rejeitadas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(invoices)
        .set({
          status: 'REJECTED',
          rejectionReason: dto.rejectionReason,
          validatedById: user.id,
          validatedAt: now,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Nota fiscal não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'Invoice',
        entityId: id,
        action: 'REJECT',
        before: { status: 'PENDING' },
        after: { status: 'REJECTED', rejectionReason: dto.rejectionReason },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── addItem ──────────────────────────────────────────────────────────────

  async addItem(invoiceId: string, dto: CreateInvoiceItemDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Itens só podem ser adicionados a NFs pendentes.')
    }

    return this.db.transaction(async (tx) => {
      const [item] = await tx
        .insert(invoiceItems)
        .values({
          invoiceId,
          productId: dto.productId ?? null,
          description: dto.description,
          quantity: String(dto.quantity),
          unitPrice: String(dto.unitPrice),
          totalPrice: String(dto.totalPrice),
        })
        .returning()

      if (!item) throw new Error('Falha ao adicionar item.')

      await tx.insert(auditLogs).values({
        entity: 'InvoiceItem',
        entityId: item.id,
        action: 'CREATE',
        after: { invoiceId, description: dto.description },
        userId: user.id,
        companyId: user.companyId,
      })

      return item
    })
  }

  // ─── removeItem ─────────────────────────────────────────────────────────────

  async removeItem(invoiceId: string, itemId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Itens só podem ser removidos de NFs pendentes.')
    }

    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(invoiceItems)
        .where(and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)))
        .returning()

      if (!deleted) throw new NotFoundException('Item não encontrado.')

      await tx.insert(auditLogs).values({
        entity: 'InvoiceItem',
        entityId: itemId,
        action: 'DELETE',
        before: { description: deleted.description },
        userId: user.id,
        companyId: user.companyId,
      })

      return { success: true }
    })
  }

  // ─── uploadFile ─────────────────────────────────────────────────────────────

  // Nota: na v1, o upload usa Supabase Storage. O endpoint recebe a URL do arquivo
  // (o frontend faz upload direto para o bucket via signed URL) e grava em
  // invoices.fileUrl. Aceitar uma URL direta enquanto o Storage não estiver configurado.
  async uploadFile(id: string, fileUrl: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Upload só permitido em NFs pendentes.')
    }

    const [updated] = await this.db
      .update(invoices)
      .set({ fileUrl, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .returning()

    return updated
  }
}
