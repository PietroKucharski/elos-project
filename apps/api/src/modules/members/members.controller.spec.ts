import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import type { SessionUser } from '../../common/types/session-user'
import { MembersController } from './members.controller'
import { MembersService } from './members.service'

const adminUser: SessionUser = {
  id: 'user-admin',
  email: 'admin@empresa.com',
  name: 'Admin',
  role: 'ADMIN_EMPRESA',
  companyId: 'company-1',
}

const mockMember = { id: 'member-1', companyId: 'company-1', userId: 'user-2', role: 'COMPRADOR' }
const mockCompany = {
  companyId: 'company-1',
  companyName: 'Empresa',
  cnpj: '12345678000195',
  role: 'ADMIN_EMPRESA',
}

describe('MembersController', () => {
  let controller: MembersController
  let service: {
    findAll: ReturnType<typeof vi.fn>
    invite: ReturnType<typeof vi.fn>
    updateRole: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    getMyCompanies: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockResolvedValue([mockMember]),
      invite: vi.fn().mockResolvedValue(mockMember),
      updateRole: vi.fn().mockResolvedValue(mockMember),
      remove: vi.fn().mockResolvedValue({ success: true }),
      getMyCompanies: vi.fn().mockResolvedValue([mockCompany]),
    }

    const module = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: service }],
    })
      // O controller declara @UseGuards(AuthGuard); sobrescreve para não exigir
      // DRIZZLE/Reflector no módulo de teste (o guard é testado à parte).
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(MembersController)
  })

  it('getMyCompanies → delega ao service', async () => {
    const result = await controller.getMyCompanies(adminUser)
    expect(service.getMyCompanies).toHaveBeenCalledWith(adminUser)
    expect(result).toHaveLength(1)
  })

  it('findAll → delega ao service', async () => {
    const result = await controller.findAll(adminUser)
    expect(service.findAll).toHaveBeenCalledWith(adminUser)
    expect(result).toHaveLength(1)
  })

  it('invite → delega ao service', async () => {
    const body = { email: 'x@x.com', name: 'X', role: 'COMPRADOR' as const }
    await controller.invite(body, adminUser)
    expect(service.invite).toHaveBeenCalledWith(body, adminUser)
  })

  it('updateRole → delega ao service com userId', async () => {
    await controller.updateRole('user-2', { role: 'ALMOXARIFE' }, adminUser)
    expect(service.updateRole).toHaveBeenCalledWith('user-2', { role: 'ALMOXARIFE' }, adminUser)
  })

  it('remove → delega ao service com userId', async () => {
    await controller.remove('user-2', adminUser)
    expect(service.remove).toHaveBeenCalledWith('user-2', adminUser)
  })
})
