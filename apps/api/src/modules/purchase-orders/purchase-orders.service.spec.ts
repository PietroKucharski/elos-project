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
import { PurchaseOrdersService } from './purchase-orders.service'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const companyId = '00000000-0000-0000-0000-000000000001'
const supplierId = '00000000-0000-0000-0000-000000000002'
const quotationId = '00000000-0000-0000-0000-000000000003'
const bidId = '00000000-0000-0000-0000-000000000004'
const poId = '00000000-0000-0000-0000-000000000005'
const productId = '00000000-0000-0000-0000-000000000006'
const userId = 'user-001'

const mockBid = {
  id: bidId,
  status: 'SELECTED',
  supplierId,
  quotationId,
  companyId,
}

const mockBidItem = {
  quotationItemId: '00000000-0000-0000-0000-000000000007',
  unitPrice: '100.00',
  quantity: '5.000',
  productId,
  description: 'Produto teste',
}

const mockPO = {
  id: poId,
  companyId,
  supplierId,
  quotationId,
  bidId,
  number: 'PO-2024-0001',
  status: 'DRAFT',
  totalAmount: '500.00',
  notes: null,
  approvedById: null,
  approvedAt: null,
  sentAt: null,
  createdById: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser = {
  id: userId,
  email: 'test@test.com',
  name: 'Test',
  role: 'COMPRADOR',
  companyId,
} as any

// ─── Mock do Drizzle ─────────────────────────────────────────────────────────

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])
  const enqueueMany = (results: unknown[]) => resultsQueue.push(results)

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
    groupBy: vi.fn().mockReturnThis(),
    as: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: (..._args: unknown[]) => {
      qb.select = vi.fn().mockReturnThis()
      return qb
    },
    insert: (..._args: unknown[]) => {
      qb.insert = vi.fn().mockReturnThis()
      return qb
    },
    update: (..._args: unknown[]) => {
      qb.update = vi.fn().mockReturnThis()
      return qb
    },
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }

  return { mockDb, enqueue, enqueueMany }
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']

  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db
    enqueue = eq

    const module = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()

    service = module.get(PurchaseOrdersService)
    mockAbility.cannot.mockReturnValue(false)
  })

  // ─── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista de POs', async () => {
      enqueue(mockPO) // rows retornadas
      const result = await service.findAll(mockUser, {})
      expect(result).toBeDefined()
    })

    it('retorna 403 se sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(mockUser, {})).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna PO com itens', async () => {
      enqueue(mockPO) // PO encontrado
      enqueue({ ...mockBidItem, productName: 'Prod', productCode: null, unit: 'UN' }) // item
      const result = await service.findOne(poId, mockUser)
      expect(result).toBeDefined()
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined) // nenhum PO
      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria PO a partir de lance SELECTED', async () => {
      enqueue(mockBid) // bid encontrado
      enqueue(undefined) // sem PO existente
      enqueue(mockBidItem) // bid items
      enqueue(undefined) // lastPO (nenhum anterior)
      enqueue(mockPO) // insert returning

      const result = await service.create({ bidId, notes: undefined }, mockUser)
      expect(result).toMatchObject({ status: 'DRAFT' })
    })

    it('retorna 403 se sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se lance não encontrado', async () => {
      enqueue(undefined) // bid não encontrado
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se lance não é SELECTED', async () => {
      enqueue({ ...mockBid, status: 'SUBMITTED' })
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 409 se já existe PO para o lance', async () => {
      enqueue(mockBid) // bid SELECTED
      enqueue(mockPO) // PO já existente
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(ConflictException)
    })

    it('retorna 400 se item não tem produto vinculado', async () => {
      enqueue(mockBid) // bid SELECTED
      enqueue(undefined) // sem PO existente
      enqueue({ ...mockBidItem, productId: null }) // item sem produto
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── approve ────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('aprova PO em DRAFT', async () => {
      enqueue(mockPO) // PO DRAFT
      enqueue({ ...mockPO, status: 'APPROVED' }) // update returning

      const result = await service.approve(poId, mockUser)
      expect(result.status).toBe('APPROVED')
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined)
      await expect(service.approve('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se PO não está em DRAFT', async () => {
      enqueue({ ...mockPO, status: 'SENT' })
      await expect(service.approve(poId, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 403 se sem permissão', async () => {
      enqueue(mockPO)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.approve(poId, mockUser)).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── send ───────────────────────────────────────────────────────────────

  describe('send', () => {
    it('envia PO aprovado', async () => {
      enqueue({ ...mockPO, status: 'APPROVED' })
      enqueue({ ...mockPO, status: 'SENT' })

      const result = await service.send(poId, mockUser)
      expect(result.status).toBe('SENT')
    })

    it('retorna 400 se PO não está em APPROVED', async () => {
      enqueue(mockPO) // DRAFT
      await expect(service.send(poId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── cancel ─────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancela PO em DRAFT', async () => {
      enqueue(mockPO)
      enqueue({ ...mockPO, status: 'CANCELLED' })

      const result = await service.cancel(poId, mockUser)
      expect(result.status).toBe('CANCELLED')
    })

    it('cancela PO em APPROVED', async () => {
      enqueue({ ...mockPO, status: 'APPROVED' })
      enqueue({ ...mockPO, status: 'CANCELLED' })

      const result = await service.cancel(poId, mockUser)
      expect(result.status).toBe('CANCELLED')
    })

    it('retorna 400 se PO está em SENT', async () => {
      enqueue({ ...mockPO, status: 'SENT' })
      await expect(service.cancel(poId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── receive ────────────────────────────────────────────────────────────

  describe('receive', () => {
    it('marca PO como RECEIVED', async () => {
      const almoxUser = { ...mockUser, role: 'ALMOXARIFE' }
      enqueue({ ...mockPO, status: 'SENT' })
      enqueue({ ...mockPO, status: 'RECEIVED' })

      const result = await service.receive(poId, almoxUser)
      expect(result.status).toBe('RECEIVED')
    })

    it('retorna 400 se PO não está em SENT', async () => {
      enqueue(mockPO) // DRAFT
      await expect(service.receive(poId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })
})
