import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { BidsController } from './bids.controller'
import { BidsService } from './bids.service'

describe('BidsController', () => {
  let controller: BidsController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'bid-1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'bid-1' }),
      update: vi.fn().mockResolvedValue({ id: 'bid-1' }),
      remove: vi.fn().mockResolvedValue({ success: true }),
      submit: vi.fn().mockResolvedValue({ id: 'bid-1', status: 'SUBMITTED' }),
      findBidItems: vi.fn().mockResolvedValue([]),
      addBidItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
      updateBidItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
      removeBidItem: vi.fn().mockResolvedValue({ success: true }),
      compare: vi.fn().mockResolvedValue({ quotationId: 'q-1', bids: [], rows: [] }),
      selectWinner: vi.fn().mockResolvedValue({ success: true, winnerBidId: 'bid-1' }),
    }

    const module = await Test.createTestingModule({
      controllers: [BidsController],
      providers: [{ provide: BidsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(BidsController)
  })

  const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never

  it('findAll delega ao service', async () => {
    await controller.findAll('quotation-1', user)
    expect(service.findAll).toHaveBeenCalledWith('quotation-1', user)
  })

  it('create delega ao service', async () => {
    const dto = { supplierId: '123e4567-e89b-12d3-a456-426614174000' }
    await controller.create('quotation-1', dto, user)
    expect(service.create).toHaveBeenCalledWith('quotation-1', dto, user)
  })

  it('compare delega ao service', async () => {
    await controller.compare('quotation-1', user)
    expect(service.compare).toHaveBeenCalledWith('quotation-1', user)
  })

  it('findOne delega ao service', async () => {
    await controller.findOne('quotation-1', 'bid-1', user)
    expect(service.findOne).toHaveBeenCalledWith('quotation-1', 'bid-1', user)
  })

  it('submit delega ao service', async () => {
    await controller.submit('quotation-1', 'bid-1', user)
    expect(service.submit).toHaveBeenCalledWith('quotation-1', 'bid-1', user)
  })

  it('addBidItem delega ao service', async () => {
    const dto = {
      quotationItemId: '123e4567-e89b-12d3-a456-426614174000',
      unitPrice: 10,
      deliveryDays: 5,
    }
    await controller.addBidItem('quotation-1', 'bid-1', dto, user)
    expect(service.addBidItem).toHaveBeenCalledWith('quotation-1', 'bid-1', dto, user)
  })

  it('selectWinner delega ao service', async () => {
    const dto = { bidId: 'bid-1' }
    await controller.selectWinner('quotation-1', dto, user)
    expect(service.selectWinner).toHaveBeenCalledWith('quotation-1', dto, user)
  })
})
