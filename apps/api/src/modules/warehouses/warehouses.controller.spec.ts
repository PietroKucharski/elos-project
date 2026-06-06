import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'

describe('WarehousesController', () => {
  let controller: WarehousesController
  const mockUser = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockWarehouse = { id: 'w1', name: 'Central', isActive: true }

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockWarehouse]),
    findOne: vi.fn().mockResolvedValue(mockWarehouse),
    create: vi.fn().mockResolvedValue(mockWarehouse),
    update: vi.fn().mockResolvedValue(mockWarehouse),
    deactivate: vi.fn().mockResolvedValue({ success: true }),
    getInventory: vi.fn().mockResolvedValue([]),
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const module = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [{ provide: WarehousesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(WarehousesController)
  })

  it('GET / — lista armazéns e delega ao service', async () => {
    expect(await controller.findAll(mockUser)).toEqual([mockWarehouse])
    expect(mockService.findAll).toHaveBeenCalledTimes(1)
    expect(mockService.findAll).toHaveBeenCalledWith(mockUser, { includeInactive: undefined })
  })

  it('POST / — cria armazém e delega body + user', async () => {
    expect(await controller.create({ name: 'X' }, mockUser)).toMatchObject({ name: 'Central' })
    expect(mockService.create).toHaveBeenCalledTimes(1)
    expect(mockService.create).toHaveBeenCalledWith({ name: 'X' }, mockUser)
  })

  it('GET /inventory — saldo global e delega ao getInventory do service', async () => {
    expect(await controller.getGlobalInventory(mockUser)).toEqual([])
    expect(mockService.getInventory).toHaveBeenCalledTimes(1)
    expect(mockService.getInventory).toHaveBeenCalledWith(mockUser, {
      productId: undefined,
      search: undefined,
      page: undefined,
      limit: undefined,
    })
  })

  it('GET /:id — detalhe e delega id + user', async () => {
    expect(await controller.findOne('w1', mockUser)).toMatchObject({ id: 'w1' })
    expect(mockService.findOne).toHaveBeenCalledTimes(1)
    expect(mockService.findOne).toHaveBeenCalledWith('w1', mockUser)
  })

  it('PATCH /:id — atualiza e delega id + body + user', async () => {
    expect(await controller.update('w1', { name: 'Y' }, mockUser)).toMatchObject({ id: 'w1' })
    expect(mockService.update).toHaveBeenCalledTimes(1)
    expect(mockService.update).toHaveBeenCalledWith('w1', { name: 'Y' }, mockUser)
  })

  it('POST /:id/deactivate — desativa e delega id + user', async () => {
    expect(await controller.deactivate('w1', mockUser)).toEqual({ success: true })
    expect(mockService.deactivate).toHaveBeenCalledTimes(1)
    expect(mockService.deactivate).toHaveBeenCalledWith('w1', mockUser)
  })

  it('GET /:id/inventory — saldo do armazém e delega warehouseId no getInventory', async () => {
    expect(await controller.getInventory('w1', mockUser)).toEqual([])
    expect(mockService.getInventory).toHaveBeenCalledTimes(1)
    expect(mockService.getInventory).toHaveBeenCalledWith(mockUser, {
      warehouseId: 'w1',
      productId: undefined,
      search: undefined,
      page: undefined,
      limit: undefined,
    })
  })
})
