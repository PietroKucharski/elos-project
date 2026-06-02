import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import type { SessionUser } from '../../common/types/session-user'
import { CompaniesController } from './companies.controller'
import { CompaniesService } from './companies.service'

const mockCompany = { id: 'uuid-1', name: 'Empresa', cnpj: '12345678000195' }
const superAdmin: SessionUser = {
  id: 'u1',
  email: 'a@b.com',
  name: 'A',
  role: 'SUPER_ADMIN',
  companyId: null,
}

describe('CompaniesController', () => {
  let controller: CompaniesController
  let service: {
    create: ReturnType<typeof vi.fn>
    findAll: ReturnType<typeof vi.fn>
    findByCnpj: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(mockCompany),
      findAll: vi.fn().mockResolvedValue([mockCompany]),
      findByCnpj: vi.fn().mockResolvedValue(mockCompany),
      update: vi.fn().mockResolvedValue(mockCompany),
    }

    const module = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: service }],
    })
      // O controller declara @UseGuards(AuthGuard); sobrescreve para não exigir
      // DRIZZLE/Reflector no módulo de teste (o comportamento do guard é testado à parte).
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(CompaniesController)
  })

  it('create → delega ao service', async () => {
    const result = await controller.create({ name: 'Empresa', cnpj: '12345678000195' }, superAdmin)
    expect(service.create).toHaveBeenCalledWith(
      { name: 'Empresa', cnpj: '12345678000195' },
      superAdmin,
    )
    expect(result).toEqual(mockCompany)
  })

  it('findAll → delega ao service', async () => {
    const result = await controller.findAll(superAdmin)
    expect(result).toHaveLength(1)
  })

  it('findOne → delega ao service com cnpj', async () => {
    await controller.findOne('12345678000195', superAdmin)
    expect(service.findByCnpj).toHaveBeenCalledWith('12345678000195', superAdmin)
  })

  it('update → delega ao service', async () => {
    await controller.update('12345678000195', { name: 'X' }, superAdmin)
    expect(service.update).toHaveBeenCalledWith('12345678000195', { name: 'X' }, superAdmin)
  })
})
