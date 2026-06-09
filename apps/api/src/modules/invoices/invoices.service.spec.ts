import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { InvoicesService } from './invoices.service'

const companyId = '00000000-0000-0000-0000-000000000001'
const invoiceId = '00000000-0000-0000-0000-000000000002'
const supplierId = '00000000-0000-0000-0000-000000000003'
const purchaseOrderId = '00000000-0000-0000-0000-000000000004'
const itemId = '00000000-0000-0000-0000-000000000005'
const userId = 'user-001'

const mockInvoice = {
  id: invoiceId,
  companyId,
  purchaseOrderId,
  supplierId,
  number: 'NF-12345',
  issueDate: new Date(),
  totalAmount: '1500.00',
  taxAmount: '150.00',
  status: 'PENDING',
  fileUrl: null,
  rejectionReason: null,
  validatedById: null,
  validatedAt: null,
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
  return { mockDb, enqueue }
}

describe('InvoicesService', () => {
  let service: InvoicesService
  let enqueue: ReturnType<typeof makeDb>['enqueue']
  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    enqueue = eq
    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: DRIZZLE, useValue: db },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(InvoicesService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('create', () => {
    const dto = {
      purchaseOrderId,
      supplierId,
      number: 'NF-12345',
      issueDate: new Date().toISOString(),
      totalAmount: 1500,
      taxAmount: 150,
    }

    it('cria NF com sucesso', async () => {
      enqueue({ id: purchaseOrderId, status: 'SENT' }) // PO
      enqueue({ id: supplierId, status: 'APPROVED' }) // fornecedor
      enqueue(mockInvoice) // insert returning
      const result = await service.create(dto, mockUser)
      expect(result).toMatchObject({ status: 'PENDING', number: 'NF-12345' })
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create(dto, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined)
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se PO não está SENT/RECEIVED', async () => {
      enqueue({ id: purchaseOrderId, status: 'DRAFT' })
      await expect(service.create(dto, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 404 se fornecedor não encontrado', async () => {
      enqueue({ id: purchaseOrderId, status: 'RECEIVED' })
      enqueue(undefined)
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se fornecedor não está APPROVED', async () => {
      enqueue({ id: purchaseOrderId, status: 'SENT' })
      enqueue({ id: supplierId, status: 'PENDING' })
      await expect(service.create(dto, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('update', () => {
    it('retorna 400 se NF não está PENDING', async () => {
      enqueue({ ...mockInvoice, status: 'VALIDATED' })
      await expect(service.update(invoiceId, { number: 'NF-99' }, mockUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockInvoice)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.update(invoiceId, {}, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se não encontrada', async () => {
      enqueue(undefined)
      await expect(service.update('nonexistent', {}, mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('validate', () => {
    it('transição PENDING → VALIDATED', async () => {
      enqueue(mockInvoice) // existing PENDING
      enqueue({ ...mockInvoice, status: 'VALIDATED' }) // update returning
      const result = await service.validate(invoiceId, {}, mockUser)
      expect(result.status).toBe('VALIDATED')
    })

    it('retorna 400 se NF não está PENDING', async () => {
      enqueue({ ...mockInvoice, status: 'VALIDATED' })
      await expect(service.validate(invoiceId, {}, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('reject', () => {
    it('transição PENDING → REJECTED', async () => {
      enqueue(mockInvoice) // existing PENDING
      enqueue({ ...mockInvoice, status: 'REJECTED' }) // update returning
      const result = await service.reject(
        invoiceId,
        { rejectionReason: 'Valores divergentes do pedido.' },
        mockUser,
      )
      expect(result.status).toBe('REJECTED')
    })

    it('retorna 400 se NF não está PENDING', async () => {
      enqueue({ ...mockInvoice, status: 'REJECTED' })
      await expect(
        service.reject(invoiceId, { rejectionReason: 'Sem fundamento.' }, mockUser),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('addItem', () => {
    const itemDto = {
      description: 'Produto X',
      quantity: 10,
      unitPrice: 100,
      totalPrice: 1000,
    }

    it('adiciona item à NF', async () => {
      enqueue({ id: invoiceId, status: 'PENDING' }) // NF encontrada
      enqueue({ id: itemId, description: 'Produto X' }) // insert returning
      const result = await service.addItem(invoiceId, itemDto, mockUser)
      expect(result).toMatchObject({ description: 'Produto X' })
    })

    it('retorna 400 se NF não está PENDING', async () => {
      enqueue({ id: invoiceId, status: 'VALIDATED' })
      await expect(service.addItem(invoiceId, itemDto, mockUser)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('removeItem', () => {
    it('remove item da NF', async () => {
      enqueue({ id: invoiceId, status: 'PENDING' }) // NF encontrada
      enqueue({ id: itemId, description: 'Produto X' }) // delete returning
      const result = await service.removeItem(invoiceId, itemId, mockUser)
      expect(result).toEqual({ success: true })
    })

    it('retorna 404 se item não encontrado', async () => {
      enqueue({ id: invoiceId, status: 'PENDING' }) // NF encontrada
      enqueue(undefined) // delete returning vazio
      await expect(service.removeItem(invoiceId, 'nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
