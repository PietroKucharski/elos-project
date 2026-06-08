import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ReceiptsController } from './receipts.controller'
import { ReceiptsService } from './receipts.service'
import { StockMovementsService } from './stock-movements.service'

describe('ReceiptsController', () => {
  let controller: ReceiptsController
  const mockUser = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockReceipt = { id: 'r1', status: 'COMPLETE' }

  const mockReceiptsService = {
    findAll: vi.fn().mockResolvedValue([mockReceipt]),
    findOne: vi.fn().mockResolvedValue({ ...mockReceipt, items: [] }),
    create: vi.fn().mockResolvedValue(mockReceipt),
  }
  const mockMovementsService = {
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'm1', type: 'ENTRY' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReceiptsController],
      providers: [
        { provide: ReceiptsService, useValue: mockReceiptsService },
        { provide: StockMovementsService, useValue: mockMovementsService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(ReceiptsController)
  })

  it('GET /receipts — lista', async () =>
    expect(await controller.findAll(mockUser)).toEqual([mockReceipt]))
  it('POST /receipts — cria recebimento', async () => {
    const dto = {
      purchaseOrderId: 'po-1',
      warehouseId: 'w-1',
      receivedAt: new Date().toISOString(),
      items: [],
    }
    expect(await controller.create(dto as any, mockUser)).toMatchObject({ id: 'r1' })
  })
  it('GET /receipts/:id — detalhe', async () =>
    expect(await controller.findOne('r1', mockUser)).toMatchObject({ items: [] }))
  it('GET /stock-movements — lista', async () =>
    expect(await controller.findMovements(mockUser)).toEqual([]))
  it('POST /stock-movements — cria', async () => {
    const dto = { warehouseId: 'w1', productId: 'p1', type: 'ENTRY' as const, quantity: 10 }
    expect(await controller.createMovement(dto, mockUser)).toMatchObject({ type: 'ENTRY' })
  })
})
