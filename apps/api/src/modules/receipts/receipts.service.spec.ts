import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service'
import { ReceiptsService } from './receipts.service'

const companyId = '00000000-0000-0000-0000-000000000001'
const poId = '00000000-0000-0000-0000-000000000002'
const warehouseId = '00000000-0000-0000-0000-000000000003'
const poItemId = '00000000-0000-0000-0000-000000000004'
const productId = '00000000-0000-0000-0000-000000000005'
const userId = 'user-001'

const mockPO = { id: poId, status: 'SENT', companyId, number: 'PO-2024-0001' }
const mockWarehouse = { id: warehouseId, companyId, name: 'Central', isActive: true }
const mockPOItem = { id: poItemId, productId, quantity: '10.000', receivedQuantity: '0.000' }

const mockUser = {
  id: userId,
  email: 'almox@test.com',
  name: 'Almox',
  role: 'ALMOXARIFE',
  companyId,
} as any

// Mock thenable do Drizzle ciente de escrita-vs-leitura. O `create` faz vários
// writes "fire-and-forget" dentro da transação (insert de receipt_items, update
// do PO item, insert do stock movement) entre o insert do receipt e a releitura
// dos itens / update final do status. Só as LEITURAS (selects e cadeias com
// `.returning()`) consomem a fila enfileirada — writes sem `.returning()`
// resolvem `[]` sem deslocar a fila, mantendo o alinhamento com os `enqueue`.
function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])

  let isWrite = false
  let hasReturning = false
  const reset = () => {
    isWrite = false
    hasReturning = false
  }

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(() => {
      hasReturning = true
      return qb
    }),
    execute: vi.fn().mockResolvedValue([]),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => {
    // Write sem returning não retorna linhas — não consome a fila de leituras.
    const result = isWrite && !hasReturning ? [] : (resultsQueue.shift() ?? [])
    reset()
    resolve(result)
  }

  const mockDb = {
    select: () => {
      reset()
      return qb
    },
    insert: () => {
      reset()
      isWrite = true
      return qb
    },
    update: () => {
      reset()
      isWrite = true
      return qb
    },
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }

  return { mockDb, enqueue }
}

describe('ReceiptsService', () => {
  let service: ReceiptsService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']

  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }
  const mockPoService = { receive: vi.fn().mockResolvedValue({ status: 'RECEIVED' }) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db
    enqueue = eq

    const module = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
        { provide: PurchaseOrdersService, useValue: mockPoService },
      ],
    }).compile()

    service = module.get(ReceiptsService)
    mockAbility.cannot.mockReturnValue(false)
    mockPoService.receive.mockClear()
  })

  describe('findAll', () => {
    it('lista recebimentos', async () => {
      enqueue({})
      const r = await service.findAll(mockUser, {})
      expect(r).toBeDefined()
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(mockUser, {})).rejects.toThrow(ForbiddenException)
    })
  })

  describe('create', () => {
    const dto = {
      purchaseOrderId: poId,
      warehouseId,
      receivedAt: new Date().toISOString(),
      items: [{ purchaseOrderItemId: poItemId, receivedQuantity: 10 }],
    }

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create(dto, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined) // PO
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se PO não está SENT', async () => {
      enqueue({ ...mockPO, status: 'APPROVED' })
      await expect(service.create(dto, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 404 se armazém não encontrado', async () => {
      enqueue(mockPO) // PO válido
      enqueue(undefined) // armazém não encontrado
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se quantidade excede saldo pendente', async () => {
      enqueue(mockPO) // PO
      enqueue(mockWarehouse) // warehouse
      enqueue({ ...mockPOItem, receivedQuantity: '5.000' }) // PO items — 5 já recebidos, restam 5
      await expect(
        service.create(
          { ...dto, items: [{ purchaseOrderItemId: poItemId, receivedQuantity: 6 }] },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('retorna 400 se item não pertence ao PO', async () => {
      enqueue(mockPO) // PO
      enqueue(mockWarehouse) // warehouse
      enqueue(mockPOItem) // PO items (não inclui o item do dto)
      await expect(
        service.create(
          {
            ...dto,
            items: [
              { purchaseOrderItemId: '00000000-0000-0000-0000-000000000099', receivedQuantity: 1 },
            ],
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('chama purchaseOrdersService.receive quando COMPLETE', async () => {
      enqueue(mockPO) // PO
      enqueue(mockWarehouse) // warehouse
      enqueue(mockPOItem) // PO items para mapa
      // dentro da transação:
      enqueue({ id: 'receipt-1', status: 'PARTIAL' }) // receipt insert
      enqueue([{ quantity: '10.000', receivedQuantity: '10.000' }]) // updatedItems (COMPLETE)
      enqueue({ id: 'receipt-1', status: 'COMPLETE' }) // update status returning

      await service.create(dto, mockUser)
      expect(mockPoService.receive).toHaveBeenCalledWith(poId, mockUser)
    })

    it('não chama purchaseOrdersService.receive quando PARTIAL', async () => {
      enqueue(mockPO)
      enqueue(mockWarehouse)
      enqueue(mockPOItem)
      enqueue({ id: 'receipt-1', status: 'PARTIAL' })
      enqueue([{ quantity: '10.000', receivedQuantity: '5.000' }]) // PARTIAL
      enqueue({ id: 'receipt-1', status: 'PARTIAL' })

      await service.create(
        { ...dto, items: [{ purchaseOrderItemId: poItemId, receivedQuantity: 5 }] },
        mockUser,
      )
      expect(mockPoService.receive).not.toHaveBeenCalled()
    })
  })
})
