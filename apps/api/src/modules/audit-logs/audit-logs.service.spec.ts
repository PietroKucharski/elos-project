import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { AuditLogsService } from './audit-logs.service'

const companyId = '00000000-0000-0000-0000-000000000001'
const logId = '00000000-0000-0000-0000-000000000002'
const entityId = '00000000-0000-0000-0000-000000000003'
const userId = 'user-001'

const mockLog = {
  id: logId,
  companyId,
  userId,
  userName: 'Admin',
  userEmail: 'admin@test.com',
  entity: 'Supplier',
  entityId,
  action: 'CREATE',
  before: null,
  after: { name: 'Fornecedor' },
  ipAddress: null,
  createdAt: new Date(),
}

// biome-ignore lint/suspicious/noExplicitAny: test fixture
const adminUser = {
  id: userId,
  email: 'admin@test.com',
  name: 'Admin',
  role: 'ADMIN_EMPRESA',
  companyId,
} as any

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])
  const enqueueMany = (rows: unknown[]) => resultsQueue.push(rows)

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    selectDistinct: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: () => qb,
    selectDistinct: () => qb,
  }
  return { mockDb, enqueue, enqueueMany }
}

describe('AuditLogsService', () => {
  let service: AuditLogsService
  let enqueue: ReturnType<typeof makeDb>['enqueue']
  let enqueueMany: ReturnType<typeof makeDb>['enqueueMany']
  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq, enqueueMany: em } = makeDb()
    enqueue = eq
    enqueueMany = em
    const module = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: DRIZZLE, useValue: db },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(AuditLogsService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('findAll', () => {
    it('retorna lista de logs', async () => {
      enqueueMany([mockLog])
      const result = await service.findAll(adminUser, { page: 1, limit: 50 })
      expect(result).toEqual([mockLog])
    })

    it('lança ForbiddenException sem permissão (COMPRADOR)', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(adminUser, { page: 1, limit: 50 })).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('aplica filtro de entity', async () => {
      enqueueMany([mockLog])
      const result = await service.findAll(adminUser, { entity: 'Supplier', page: 1, limit: 50 })
      expect(result).toEqual([mockLog])
    })

    it('aplica filtro de data', async () => {
      enqueueMany([mockLog])
      const result = await service.findAll(adminUser, {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        page: 1,
        limit: 50,
      })
      expect(result).toEqual([mockLog])
    })
  })

  describe('findOne', () => {
    it('retorna o log', async () => {
      enqueue(mockLog)
      const result = await service.findOne(logId, adminUser)
      expect(result).toMatchObject({ id: logId, entity: 'Supplier' })
    })

    it('lança NotFoundException se não encontrado', async () => {
      enqueue(undefined)
      await expect(service.findOne('nonexistent', adminUser)).rejects.toThrow(NotFoundException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findOne(logId, adminUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getDistinctEntities', () => {
    it('retorna lista de entidades distintas', async () => {
      enqueueMany([{ entity: 'Product' }, { entity: 'Supplier' }])
      const result = await service.getDistinctEntities(adminUser)
      expect(result).toEqual(['Product', 'Supplier'])
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.getDistinctEntities(adminUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getDistinctActions', () => {
    it('retorna lista de ações distintas', async () => {
      enqueueMany([{ action: 'CREATE' }, { action: 'UPDATE' }])
      const result = await service.getDistinctActions(adminUser)
      expect(result).toEqual(['CREATE', 'UPDATE'])
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.getDistinctActions(adminUser)).rejects.toThrow(ForbiddenException)
    })
  })
})
