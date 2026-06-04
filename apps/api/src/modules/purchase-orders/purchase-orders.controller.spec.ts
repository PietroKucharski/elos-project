import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { PurchaseOrdersController } from './purchase-orders.controller'
import { PurchaseOrdersService } from './purchase-orders.service'

describe('PurchaseOrdersController', () => {
  let controller: PurchaseOrdersController
  const mockUser = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as any
  const mockPO = { id: 'po1', status: 'DRAFT', number: 'PO-2024-0001' } as any

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockPO]),
    findOne: vi.fn().mockResolvedValue({ ...mockPO, items: [] }),
    create: vi.fn().mockResolvedValue(mockPO),
    update: vi.fn().mockResolvedValue(mockPO),
    approve: vi.fn().mockResolvedValue({ ...mockPO, status: 'APPROVED' }),
    send: vi.fn().mockResolvedValue({ ...mockPO, status: 'SENT' }),
    cancel: vi.fn().mockResolvedValue({ ...mockPO, status: 'CANCELLED' }),
    receive: vi.fn().mockResolvedValue({ ...mockPO, status: 'RECEIVED' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [{ provide: PurchaseOrdersService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(PurchaseOrdersController)
  })

  it('GET / — lista POs', async () => {
    const result = await controller.findAll(mockUser)
    expect(result).toEqual([mockPO])
  })

  it('POST / — cria PO', async () => {
    const result = await controller.create({ bidId: 'bid-uuid' }, mockUser)
    expect(result).toMatchObject({ status: 'DRAFT' })
  })

  it('GET /:id — detalhe', async () => {
    const result = await controller.findOne('po1', mockUser)
    expect(result).toMatchObject({ items: [] })
  })

  it('POST /:id/approve — aprova', async () => {
    const result = await controller.approve('po1', mockUser)
    expect(result.status).toBe('APPROVED')
  })

  it('POST /:id/send — envia', async () => {
    const result = await controller.send('po1', mockUser)
    expect(result.status).toBe('SENT')
  })

  it('POST /:id/cancel — cancela', async () => {
    const result = await controller.cancel('po1', mockUser)
    expect(result.status).toBe('CANCELLED')
  })

  it('POST /:id/receive — recebe', async () => {
    const result = await controller.receive('po1', mockUser)
    expect(result.status).toBe('RECEIVED')
  })
})
