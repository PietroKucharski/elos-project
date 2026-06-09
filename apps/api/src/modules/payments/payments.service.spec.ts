import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { PaymentsService } from './payments.service'

const companyId = '00000000-0000-0000-0000-000000000001'
const paymentId = '00000000-0000-0000-0000-000000000002'
const invoiceId = '00000000-0000-0000-0000-000000000003'
const installmentId = '00000000-0000-0000-0000-000000000004'
const userId = 'user-001'

const mockPayment = {
  id: paymentId,
  companyId,
  invoiceId,
  totalAmount: '1500.00',
  method: 'PIX',
  status: 'PENDING',
  paidAt: null,
  notes: null,
  createdById: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// biome-ignore lint/suspicious/noExplicitAny: test fixture
const mockUser = {
  id: userId,
  email: 'financeiro@test.com',
  name: 'Financeiro',
  role: 'ANALISTA_FINANCEIRO',
  companyId,
} as any

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])
  const enqueueMany = (rows: unknown[]) => resultsQueue.push(rows)

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: () => qb,
    insert: () => qb,
    update: () => qb,
    delete: () => qb,
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }
  return { mockDb, enqueue, enqueueMany }
}

describe('PaymentsService', () => {
  let service: PaymentsService
  let enqueue: ReturnType<typeof makeDb>['enqueue']
  let enqueueMany: ReturnType<typeof makeDb>['enqueueMany']
  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq, enqueueMany: em } = makeDb()
    enqueue = eq
    enqueueMany = em
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: DRIZZLE, useValue: db },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(PaymentsService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('create', () => {
    const dto = {
      invoiceId,
      totalAmount: 1500,
      method: 'PIX' as const,
      installments: [{ installmentNumber: 1, amount: 1500, dueDate: new Date().toISOString() }],
    }

    it('cria pagamento com sucesso', async () => {
      enqueue({ id: invoiceId, status: 'VALIDATED', companyId }) // NF
      enqueue(undefined) // dedup: nenhum pagamento existente
      enqueue(mockPayment) // insert returning
      const result = await service.create(dto, mockUser)
      expect(result).toMatchObject({ status: 'PENDING', invoiceId })
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create(dto, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se NF não encontrada', async () => {
      enqueue(undefined)
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se NF não está VALIDATED', async () => {
      enqueue({ id: invoiceId, status: 'PENDING', companyId })
      await expect(service.create(dto, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 409 se já existe pagamento para a NF', async () => {
      enqueue({ id: invoiceId, status: 'VALIDATED', companyId })
      enqueue({ id: paymentId }) // pagamento já existente
      await expect(service.create(dto, mockUser)).rejects.toThrow(ConflictException)
    })
  })

  describe('update', () => {
    it('retorna 400 se pagamento não está PENDING', async () => {
      enqueue({ ...mockPayment, status: 'PAID' })
      await expect(service.update(paymentId, { notes: 'oi' }, mockUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockPayment)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.update(paymentId, {}, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se não encontrado', async () => {
      enqueue(undefined)
      await expect(service.update('nonexistent', {}, mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('cancel', () => {
    it('cancela pagamento com sucesso', async () => {
      enqueue(mockPayment) // existing PENDING
      enqueueMany([]) // nenhuma parcela paga
      enqueue({ ...mockPayment, status: 'CANCELLED' }) // update returning
      const result = await service.cancel(paymentId, mockUser)
      expect(result.status).toBe('CANCELLED')
    })

    it('retorna 400 se pagamento não está PENDING', async () => {
      enqueue({ ...mockPayment, status: 'PAID' })
      await expect(service.cancel(paymentId, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 400 se há parcela já paga', async () => {
      enqueue(mockPayment) // existing PENDING
      enqueueMany([{ id: installmentId }]) // parcela paga encontrada
      await expect(service.cancel(paymentId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('payInstallment', () => {
    it('marca parcela como paga', async () => {
      enqueue({ id: paymentId, status: 'PENDING' }) // pagamento
      enqueue({ id: installmentId, status: 'PAID' }) // update parcela returning
      enqueue(undefined) // insert audit log da parcela
      enqueueMany([{ id: 'outra' }]) // ainda há parcela pendente → não auto-completa
      const result = await service.payInstallment(paymentId, installmentId, {}, mockUser)
      expect(result).toMatchObject({ id: installmentId, status: 'PAID' })
    })

    it('auto-completa o pagamento quando a última parcela é paga', async () => {
      enqueue({ id: paymentId, status: 'PENDING' }) // pagamento
      enqueue({ id: installmentId, status: 'PAID' }) // update parcela returning
      enqueue(undefined) // insert audit log da parcela
      enqueueMany([]) // nenhuma parcela pendente → auto-completar
      const result = await service.payInstallment(paymentId, installmentId, {}, mockUser)
      expect(result).toMatchObject({ id: installmentId, status: 'PAID' })
    })

    it('retorna 400 se a parcela já está paga', async () => {
      enqueue({ id: paymentId, status: 'PENDING' }) // pagamento
      enqueue(undefined) // update returning vazio → parcela não encontrada/já paga
      await expect(service.payInstallment(paymentId, installmentId, {}, mockUser)).rejects.toThrow(
        BadRequestException,
      )
    })
  })
})
