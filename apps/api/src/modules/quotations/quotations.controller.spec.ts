import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { QuotationsController } from './quotations.controller'
import { QuotationsService } from './quotations.service'

describe('QuotationsController', () => {
  let controller: QuotationsController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'quotation-1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'quotation-1' }),
      update: vi.fn().mockResolvedValue({ id: 'quotation-1' }),
      publish: vi.fn().mockResolvedValue({ id: 'quotation-1', status: 'OPEN' }),
      close: vi.fn().mockResolvedValue({ id: 'quotation-1', status: 'CLOSED' }),
      cancel: vi.fn().mockResolvedValue({ success: true }),
      findItems: vi.fn().mockResolvedValue([]),
      addItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
      removeItem: vi.fn().mockResolvedValue({ success: true }),
      findInvitedSuppliers: vi.fn().mockResolvedValue([]),
      inviteSupplier: vi.fn().mockResolvedValue({ id: 'invite-1' }),
      removeInvite: vi.fn().mockResolvedValue({ success: true }),
    }

    const module = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [{ provide: QuotationsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(QuotationsController)
  })

  const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never

  it('findAll delega ao service', async () => {
    await controller.findAll(user)
    expect(service.findAll).toHaveBeenCalled()
  })

  it('create delega ao service', async () => {
    const dto = { title: 'Cotação Q4', deadline: '2024-12-31T23:59:59.000Z' }
    await controller.create(dto, user)
    expect(service.create).toHaveBeenCalledWith(dto, user)
  })

  it('publish delega ao service', async () => {
    await controller.publish('quotation-1', user)
    expect(service.publish).toHaveBeenCalledWith('quotation-1', user)
  })

  it('close delega ao service', async () => {
    await controller.close('quotation-1', user)
    expect(service.close).toHaveBeenCalledWith('quotation-1', user)
  })

  it('cancel delega ao service', async () => {
    await controller.cancel('quotation-1', user)
    expect(service.cancel).toHaveBeenCalledWith('quotation-1', user)
  })
})
