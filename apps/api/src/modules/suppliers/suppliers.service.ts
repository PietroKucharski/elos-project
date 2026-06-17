import { subject } from '@casl/ability'
import type {
  ApproveSupplierDto,
  CreateSupplierBankAccountDto,
  CreateSupplierContactDto,
  CreateSupplierDto,
  RejectSupplierDto,
  UpdateSupplierBankAccountDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
} from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, count, desc, eq, ilike, inArray } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { productSuppliers, products } from '../../db/schema/products'
import { purchaseOrderItems, purchaseOrders } from '../../db/schema/purchase-orders'
import {
  supplierAddresses,
  supplierBankAccounts,
  supplierContacts,
  suppliers,
} from '../../db/schema/suppliers'

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
    @Inject(AbilityFactory) private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?: string | undefined
      search?: string | undefined
      page?: number | undefined
      limit?: number | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para listar fornecedores.')
    }

    const limit = Math.min(query.limit ?? 20, 100)
    const offset = ((query.page ?? 1) - 1) * limit

    const conditions = [eq(suppliers.companyId, user.companyId!)]

    if (query.status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const
      if (!validStatuses.includes(query.status as never)) {
        throw new BadRequestException('Status inválido.')
      }
      conditions.push(eq(suppliers.status, query.status as 'PENDING' | 'APPROVED' | 'REJECTED'))
    }

    if (query.search) {
      conditions.push(ilike(suppliers.name, `%${query.search}%`))
    }

    const rows = await this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(desc(suppliers.createdAt))
      .limit(limit)
      .offset(offset)

    return rows
  }

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para visualizar fornecedor.')
    }

    const [row] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!row) throw new NotFoundException('Fornecedor não encontrado.')

    // Buscar endereço junto
    const [address] = await this.db
      .select()
      .from(supplierAddresses)
      .where(eq(supplierAddresses.supplierId, id))
      .limit(1)

    return { ...row, address: address ?? null }
  }

  async create(dto: CreateSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para criar fornecedor.')
    }

    // Verificar duplicidade de CNPJ/CPF dentro do tenant
    if (dto.cnpj) {
      const existing = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, user.companyId!), eq(suppliers.cnpj, dto.cnpj)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (existing) throw new ConflictException('Já existe um fornecedor com este CNPJ.')
    }

    if (dto.cpf) {
      const existing = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, user.companyId!), eq(suppliers.cpf, dto.cpf)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (existing) throw new ConflictException('Já existe um fornecedor com este CPF.')
    }

    const { address, ...supplierData } = dto

    const result = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(suppliers)
        .values({ ...supplierData, companyId: user.companyId! })
        .returning()

      if (!created) throw new BadRequestException('Falha ao criar fornecedor.')

      // Upsert de endereço (se fornecido)
      let addressRow = null
      if (address) {
        const [addr] = await tx
          .insert(supplierAddresses)
          .values({ ...address, supplierId: created.id })
          .returning()
        addressRow = addr ?? null
      }

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: created.id,
        action: 'CREATE',
        before: null,
        after: created,
        userId: user.id,
        companyId: user.companyId,
      })

      return { ...created, address: addressRow }
    })

    return result
  }

  async update(id: string, dto: UpdateSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Fornecedor não encontrado.')

    if (ability.cannot('update', subject('Supplier', existing))) {
      throw new ForbiddenException('Sem permissão para atualizar fornecedor.')
    }

    // Verificar duplicidade de CNPJ/CPF (excluindo o próprio registro)
    if (dto.cnpj && dto.cnpj !== existing.cnpj) {
      const dup = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, user.companyId!), eq(suppliers.cnpj, dto.cnpj)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (dup) throw new ConflictException('Já existe um fornecedor com este CNPJ.')
    }

    const { address, ...supplierData } = dto

    const result = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(suppliers)
        .set({ ...supplierData, updatedAt: new Date() })
        .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Fornecedor não encontrado.')

      let addressRow = null
      if (address) {
        // Upsert: tenta atualizar, senão insere
        const [existingAddr] = await tx
          .select({ id: supplierAddresses.id })
          .from(supplierAddresses)
          .where(eq(supplierAddresses.supplierId, id))
          .limit(1)

        if (existingAddr) {
          const [addr] = await tx
            .update(supplierAddresses)
            .set({ ...address, updatedAt: new Date() })
            .where(eq(supplierAddresses.id, existingAddr.id))
            .returning()
          addressRow = addr ?? null
        } else {
          const [addr] = await tx
            .insert(supplierAddresses)
            .values({ ...address, supplierId: id })
            .returning()
          addressRow = addr ?? null
        }
      }

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: id,
        action: 'UPDATE',
        before: existing,
        after: updated,
        userId: user.id,
        companyId: user.companyId,
      })

      return { ...updated, address: addressRow }
    })

    return result
  }

  async approve(id: string, dto: ApproveSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Fornecedor não encontrado.')

    if (ability.cannot('update', subject('Supplier', existing))) {
      throw new ForbiddenException('Sem permissão para aprovar fornecedor.')
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas fornecedores com status PENDING podem ser aprovados. Status atual: ${existing.status}.`,
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(suppliers)
        .set({
          status: 'APPROVED',
          rating: dto.rating != null ? String(dto.rating) : existing.rating,
          notes: dto.notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: id,
        action: 'APPROVE',
        before: { status: existing.status },
        after: { status: 'APPROVED', rating: dto.rating },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Fornecedor não encontrado.')
    return updated
  }

  async reject(id: string, dto: RejectSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Fornecedor não encontrado.')

    if (ability.cannot('update', subject('Supplier', existing))) {
      throw new ForbiddenException('Sem permissão para rejeitar fornecedor.')
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas fornecedores com status PENDING podem ser rejeitados. Status atual: ${existing.status}.`,
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(suppliers)
        .set({ status: 'REJECTED', notes: dto.notes, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: id,
        action: 'REJECT',
        before: { status: existing.status },
        after: { status: 'REJECTED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Fornecedor não encontrado.')
    return updated
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────

  private async assertSupplierBelongsToCompany(supplierId: string, companyId: string) {
    const [row] = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.companyId, companyId)))
      .limit(1)

    if (!row) throw new NotFoundException('Fornecedor não encontrado.')
  }

  async findContacts(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    return this.db
      .select()
      .from(supplierContacts)
      .where(eq(supplierContacts.supplierId, supplierId))
      .orderBy(supplierContacts.createdAt)
  }

  async addContact(supplierId: string, dto: CreateSupplierContactDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para adicionar contato.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    // isMain como string 'Y'/'N' para o banco
    const [contact] = await this.db
      .insert(supplierContacts)
      .values({
        supplierId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        isMain: dto.isMain ? 'Y' : 'N',
      })
      .returning()

    if (!contact) throw new BadRequestException('Falha ao criar contato.')
    return { ...contact, isMain: contact.isMain === 'Y' }
  }

  async updateContact(
    supplierId: string,
    contactId: string,
    dto: UpdateSupplierContactDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para atualizar contato.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.email !== undefined) updateData.email = dto.email
    if (dto.phone !== undefined) updateData.phone = dto.phone
    if (dto.role !== undefined) updateData.role = dto.role
    if (dto.isMain !== undefined) updateData.isMain = dto.isMain ? 'Y' : 'N'

    const [updated] = await this.db
      .update(supplierContacts)
      .set(updateData)
      .where(and(eq(supplierContacts.id, contactId), eq(supplierContacts.supplierId, supplierId)))
      .returning()

    if (!updated) throw new NotFoundException('Contato não encontrado.')
    return { ...updated, isMain: updated.isMain === 'Y' }
  }

  async removeContact(supplierId: string, contactId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para remover contato.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    await this.db
      .delete(supplierContacts)
      .where(and(eq(supplierContacts.id, contactId), eq(supplierContacts.supplierId, supplierId)))

    return { success: true }
  }

  // ─── Produtos fornecidos ─────────────────────────────────────────────────────

  async findProducts(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    return this.db
      .select({
        linkId: productSuppliers.id,
        productId: products.id,
        name: products.name,
        code: products.code,
        unit: products.unit,
        isPreferred: productSuppliers.isPreferred,
      })
      .from(productSuppliers)
      .innerJoin(products, eq(products.id, productSuppliers.productId))
      .where(
        and(eq(productSuppliers.supplierId, supplierId), eq(products.companyId, user.companyId!)),
      )
      .orderBy(desc(productSuppliers.isPreferred), products.name)
  }

  // ─── Pedidos emitidos ──────────────────────────────────────────────────────

  async findPurchaseOrders(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    return this.db
      .select({
        id: purchaseOrders.id,
        number: purchaseOrders.number,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        itemCount: count(purchaseOrderItems.id),
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(purchaseOrderItems, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .where(
        and(
          eq(purchaseOrders.supplierId, supplierId),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
      .groupBy(purchaseOrders.id)
      .orderBy(desc(purchaseOrders.createdAt))
  }

  // ─── Avaliações (timeline de APPROVE/REJECT a partir dos audit logs) ─────────

  async findEvaluations(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entity, 'Supplier'),
          eq(auditLogs.entityId, supplierId),
          eq(auditLogs.companyId, user.companyId!),
          inArray(auditLogs.action, ['APPROVE', 'REJECT']),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))

    return rows.map((row) => {
      const after = (row.after ?? null) as { rating?: number; notes?: string } | null
      return {
        id: row.id,
        action: row.action as 'APPROVE' | 'REJECT',
        rating: after?.rating ?? null,
        notes: after?.notes ?? null,
        createdAt: row.createdAt,
      }
    })
  }

  // ─── Bank Accounts ─────────────────────────────────────────────────────────

  async findBankAccounts(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    return this.db
      .select()
      .from(supplierBankAccounts)
      .where(eq(supplierBankAccounts.supplierId, supplierId))
      .orderBy(supplierBankAccounts.createdAt)
  }

  async addBankAccount(supplierId: string, dto: CreateSupplierBankAccountDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para adicionar conta bancária.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const [account] = await this.db
      .insert(supplierBankAccounts)
      .values({
        supplierId,
        bank: dto.bank,
        agency: dto.agency,
        account: dto.account,
        accountType: dto.accountType,
        pixKey: dto.pixKey,
        isPrimary: dto.isPrimary ? 'Y' : 'N',
      })
      .returning()

    if (!account) throw new BadRequestException('Falha ao criar conta bancária.')
    return { ...account, isPrimary: account.isPrimary === 'Y' }
  }

  async updateBankAccount(
    supplierId: string,
    accountId: string,
    dto: UpdateSupplierBankAccountDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para atualizar conta bancária.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.bank !== undefined) updateData.bank = dto.bank
    if (dto.agency !== undefined) updateData.agency = dto.agency
    if (dto.account !== undefined) updateData.account = dto.account
    if (dto.accountType !== undefined) updateData.accountType = dto.accountType
    if (dto.pixKey !== undefined) updateData.pixKey = dto.pixKey
    if (dto.isPrimary !== undefined) updateData.isPrimary = dto.isPrimary ? 'Y' : 'N'

    const [updated] = await this.db
      .update(supplierBankAccounts)
      .set(updateData)
      .where(
        and(
          eq(supplierBankAccounts.id, accountId),
          eq(supplierBankAccounts.supplierId, supplierId),
        ),
      )
      .returning()

    if (!updated) throw new NotFoundException('Conta bancária não encontrada.')
    return { ...updated, isPrimary: updated.isPrimary === 'Y' }
  }

  async removeBankAccount(supplierId: string, accountId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para remover conta bancária.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    await this.db
      .delete(supplierBankAccounts)
      .where(
        and(
          eq(supplierBankAccounts.id, accountId),
          eq(supplierBankAccounts.supplierId, supplierId),
        ),
      )

    return { success: true }
  }
}
