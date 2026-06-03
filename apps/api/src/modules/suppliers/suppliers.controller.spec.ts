import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { SuppliersController } from './suppliers.controller'
import { SuppliersService } from './suppliers.service'

describe('SuppliersController', () => {
  let controller: SuppliersController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'supplier-1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'supplier-1' }),
      update: vi.fn().mockResolvedValue({ id: 'supplier-1' }),
      approve: vi.fn().mockResolvedValue({ id: 'supplier-1', status: 'APPROVED' }),
      reject: vi.fn().mockResolvedValue({ id: 'supplier-1', status: 'REJECTED' }),
      findContacts: vi.fn().mockResolvedValue([]),
      addContact: vi.fn().mockResolvedValue({ id: 'contact-1' }),
      findBankAccounts: vi.fn().mockResolvedValue([]),
      addBankAccount: vi.fn().mockResolvedValue({ id: 'account-1' }),
    }

    const module = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(SuppliersController)
  })

  it('findAll delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.findAll(user)
    expect(service.findAll).toHaveBeenCalledWith(user, expect.any(Object))
  })

  it('create delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    const dto = { name: 'Forn', type: 'PJ' as const, cnpj: '12345678000195' }
    await controller.create(dto, user)
    expect(service.create).toHaveBeenCalledWith(dto, user)
  })

  it('approve delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.approve('supplier-1', {}, user)
    expect(service.approve).toHaveBeenCalledWith('supplier-1', {}, user)
  })

  it('reject delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.reject('supplier-1', { notes: 'Motivo' }, user)
    expect(service.reject).toHaveBeenCalledWith('supplier-1', { notes: 'Motivo' }, user)
  })
})
