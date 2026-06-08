import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { StockMovementsService } from './stock-movements.service'

const companyId = '00000000-0000-0000-0000-000000000001'
const warehouseId = '00000000-0000-0000-0000-000000000002'
const productId = '00000000-0000-0000-0000-000000000003'
const userId = 'user-001'

const mockWarehouse = { id: warehouseId, companyId, isActive: true }
const mockProduct = { id: productId, companyId, isActive: true }
const mockUser = { id: userId, role: 'ALMOXARIFE', companyId } as any

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: () => qb,
    insert: () => qb,
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }
  return { mockDb, enqueue }
}

describe('StockMovementsService', () => {
  let service: StockMovementsService
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
        StockMovementsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(StockMovementsService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('create', () => {
    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(
        service.create({ warehouseId, productId, type: 'ENTRY', quantity: 10 }, mockUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se armazém não encontrado', async () => {
      enqueue(undefined)
      await expect(
        service.create({ warehouseId, productId, type: 'ENTRY', quantity: 10 }, mockUser),
      ).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se EXIT sem saldo suficiente', async () => {
      enqueue(mockWarehouse) // warehouse
      enqueue(mockProduct) // product
      enqueue({ quantity: '5.000' }) // inventory — apenas 5
      await expect(
        service.create({ warehouseId, productId, type: 'EXIT', quantity: 10 }, mockUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('retorna 400 se TRANSFER sem toWarehouseId', async () => {
      enqueue(mockWarehouse) // warehouse
      await expect(
        service.create({ warehouseId, productId, type: 'TRANSFER', quantity: 10 }, mockUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('cria movimentação ENTRY com sucesso', async () => {
      enqueue(mockWarehouse) // warehouse
      enqueue(mockProduct) // product
      enqueue({ id: 'mov-1', type: 'ENTRY' }) // insert returning
      const result = await service.create(
        { warehouseId, productId, type: 'ENTRY', quantity: 50 },
        mockUser,
      )
      expect(result).toMatchObject({ type: 'ENTRY' })
    })
  })
})
