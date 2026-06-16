import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { AuditLogsController } from './audit-logs.controller'
import { AuditLogsService } from './audit-logs.service'

describe('AuditLogsController', () => {
  let controller: AuditLogsController
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
  const mockUser = { id: 'u1', role: 'ADMIN_EMPRESA', companyId: 'c1' } as any
  const mockLog = { id: 'log1', entity: 'Supplier', action: 'CREATE' }

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockLog]),
    findOne: vi.fn().mockResolvedValue(mockLog),
    getDistinctEntities: vi.fn().mockResolvedValue(['Supplier', 'Product']),
    getDistinctActions: vi.fn().mockResolvedValue(['CREATE', 'UPDATE']),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(AuditLogsController)
  })

  it('GET / — lista logs', async () =>
    expect(await controller.findAll(mockUser, { page: 1, limit: 50 })).toEqual([mockLog]))
  it('GET /:id — detalhe', async () =>
    expect(await controller.findOne('log1', mockUser)).toMatchObject({ id: 'log1' }))
  it('GET /entities — lista entidades', async () =>
    expect(await controller.getEntities(mockUser)).toEqual(['Supplier', 'Product']))
  it('GET /actions — lista ações', async () =>
    expect(await controller.getActions(mockUser)).toEqual(['CREATE', 'UPDATE']))
})
