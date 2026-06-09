import { subject } from '@casl/ability'
import type { CreatePaymentDto, PayInstallmentDto, UpdatePaymentDto } from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
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
import { invoices } from '../../db/schema/invoices'
import { paymentInstallments, payments } from '../../db/schema/payments'

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?: string | undefined
      method?: string | undefined
      invoiceId?: string | undefined
      search?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Payment')) {
      throw new ForbiddenException('Sem permissão para listar pagamentos.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN; cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
    const limit = Math.min(100, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(payments.companyId, user.companyId!)]
    if (query.status) conditions.push(eq(payments.status, query.status as 'PENDING'))
    if (query.method) conditions.push(eq(payments.method, query.method as 'PIX'))
    if (query.invoiceId) conditions.push(eq(payments.invoiceId, query.invoiceId))
    if (query.search) conditions.push(ilike(invoices.number, `%${query.search}%`))

    return this.db
      .select({
        id: payments.id,
        companyId: payments.companyId,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.number,
        totalAmount: payments.totalAmount,
        method: payments.method,
        status: payments.status,
        paidAt: payments.paidAt,
        notes: payments.notes,
        createdById: payments.createdById,
        createdByName: users.name,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(users, eq(users.id, payments.createdById))
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Payment')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [payment] = await this.db
      .select({
        id: payments.id,
        companyId: payments.companyId,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.number,
        totalAmount: payments.totalAmount,
        method: payments.method,
        status: payments.status,
        paidAt: payments.paidAt,
        notes: payments.notes,
        createdById: payments.createdById,
        createdByName: users.name,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(users, eq(users.id, payments.createdById))
      .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
      .limit(1)

    if (!payment) throw new NotFoundException('Pagamento não encontrado.')

    const installments = await this.db
      .select()
      .from(paymentInstallments)
      .where(eq(paymentInstallments.paymentId, id))
      .orderBy(paymentInstallments.installmentNumber)

    return { ...payment, installments }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Payment')) {
      throw new ForbiddenException('Sem permissão para criar pagamento.')
    }

    // Validar NF (deve pertencer à empresa e estar VALIDATED)
    const [invoice] = await this.db
      .select({
        id: invoices.id,
        status: invoices.status,
        companyId: invoices.companyId,
      })
      .from(invoices)
      .where(and(eq(invoices.id, dto.invoiceId), eq(invoices.companyId, user.companyId!)))
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'VALIDATED') {
      throw new BadRequestException(
        `A nota fiscal deve estar validada para registrar pagamento. Status atual: ${invoice.status}.`,
      )
    }

    // Dedup: verificar se já existe pagamento para esta NF
    const [existingPayment] = await this.db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.invoiceId, dto.invoiceId), eq(payments.companyId, user.companyId!)))
      .limit(1)

    if (existingPayment) {
      throw new ConflictException('Já existe um pagamento registrado para esta nota fiscal.')
    }

    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          companyId: user.companyId!,
          invoiceId: dto.invoiceId,
          totalAmount: String(dto.totalAmount),
          method: dto.method,
          status: 'PENDING',
          notes: dto.notes ?? null,
          createdById: user.id,
        })
        .returning()

      if (!payment) throw new Error('Falha ao criar pagamento.')

      // Inserir parcelas
      for (const inst of dto.installments) {
        await tx.insert(paymentInstallments).values({
          paymentId: payment.id,
          installmentNumber: String(inst.installmentNumber),
          amount: String(inst.amount),
          dueDate: new Date(inst.dueDate),
          status: 'PENDING',
        })
      }

      await tx.insert(auditLogs).values({
        entity: 'Payment',
        entityId: payment.id,
        action: 'CREATE',
        after: {
          invoiceId: dto.invoiceId,
          totalAmount: dto.totalAmount,
          method: dto.method,
          installmentCount: dto.installments.length,
          status: 'PENDING',
        },
        userId: user.id,
        companyId: user.companyId,
      })

      return payment
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePaymentDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pagamento não encontrado.')
    if (ability.cannot('update', subject('Payment', existing))) {
      throw new ForbiddenException('Sem permissão para editar este pagamento.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Somente pagamentos pendentes podem ser editados.')
    }

    const [updated] = await this.db
      .update(payments)
      .set({ notes: dto.notes ?? null, updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
      .returning()

    return updated
  }

  // ─── cancel ───────────────────────────────────────────────────────────────

  async cancel(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pagamento não encontrado.')
    if (ability.cannot('update', subject('Payment', existing))) {
      throw new ForbiddenException('Sem permissão para cancelar este pagamento.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Somente pagamentos pendentes podem ser cancelados.')
    }

    // Verificar se alguma parcela já foi paga
    const paidInstallments = await this.db
      .select({ id: paymentInstallments.id })
      .from(paymentInstallments)
      .where(and(eq(paymentInstallments.paymentId, id), eq(paymentInstallments.status, 'PAID')))
      .limit(1)

    if (paidInstallments.length > 0) {
      throw new BadRequestException('Não é possível cancelar um pagamento com parcelas já pagas.')
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(payments)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Pagamento não encontrado.')

      // Parcelas mantêm status PENDING — o pagamento é quem carrega CANCELLED
      await tx
        .update(paymentInstallments)
        .set({ status: 'PENDING', updatedAt: new Date() })
        .where(eq(paymentInstallments.paymentId, id))

      await tx.insert(auditLogs).values({
        entity: 'Payment',
        entityId: id,
        action: 'CANCEL',
        before: { status: 'PENDING' },
        after: { status: 'CANCELLED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── payInstallment ─────────────────────────────────────────────────────────

  async payInstallment(
    paymentId: string,
    installmentId: string,
    dto: PayInstallmentDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Payment')) {
      throw new ForbiddenException('Sem permissão.')
    }

    // Verificar que o pagamento pertence à empresa e está PENDING
    const [payment] = await this.db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.companyId, user.companyId!)))
      .limit(1)

    if (!payment) throw new NotFoundException('Pagamento não encontrado.')
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Somente pagamentos pendentes aceitam pagamento de parcelas.')
    }

    return this.db.transaction(async (tx) => {
      const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date()

      const [updated] = await tx
        .update(paymentInstallments)
        .set({ status: 'PAID', paidAt, updatedAt: new Date() })
        .where(
          and(
            eq(paymentInstallments.id, installmentId),
            eq(paymentInstallments.paymentId, paymentId),
            eq(paymentInstallments.status, 'PENDING'),
          ),
        )
        .returning()

      if (!updated) {
        throw new BadRequestException('Parcela não encontrada ou já paga.')
      }

      await tx.insert(auditLogs).values({
        entity: 'PaymentInstallment',
        entityId: installmentId,
        action: 'PAY',
        before: { status: 'PENDING' },
        after: { status: 'PAID', paidAt: paidAt.toISOString() },
        userId: user.id,
        companyId: user.companyId,
      })

      // Verificar se todas as parcelas estão pagas → auto-completar pagamento
      const pendingInstallments = await tx
        .select({ id: paymentInstallments.id })
        .from(paymentInstallments)
        .where(
          and(
            eq(paymentInstallments.paymentId, paymentId),
            eq(paymentInstallments.status, 'PENDING'),
          ),
        )
        .limit(1)

      if (pendingInstallments.length === 0) {
        // Todas pagas → marcar pagamento como PAID
        await tx
          .update(payments)
          .set({ status: 'PAID', paidAt: new Date(), updatedAt: new Date() })
          .where(eq(payments.id, paymentId))

        await tx.insert(auditLogs).values({
          entity: 'Payment',
          entityId: paymentId,
          action: 'COMPLETE',
          before: { status: 'PENDING' },
          after: { status: 'PAID' },
          userId: user.id,
          companyId: user.companyId,
        })
      }

      return updated
    })
  }
}
