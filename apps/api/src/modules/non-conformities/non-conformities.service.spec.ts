import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { NonConformitiesService } from './non-conformities.service'

const companyId = '00000000-0000-0000-0000-000000000001'
const ncId = '00000000-0000-0000-0000-000000000002'
const supplierId = '00000000-0000-0000-0000-000000000003'
const userId = 'user-001'

const mockNc = {
  id: ncId,
  companyId,
  supplierId,
  status: 'OPEN',
  type: 'QUALITY',
  severity: 'HIGH',
  description: 'Produto com defeito na embalagem',
  resolution: null,
  resolvedAt: null,
  notes: null,
  createdById: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// biome-ignore lint/suspicious/noExplicitAny: test fixture
const mockUser = {
  id: userId,
  email: 'almox@test.com',
  name: 'Almox',
  role: 'ALMOXARIFE',
  companyId,
} as any
const mockComprador = { ...mockUser, role: 'COMPRADOR' }

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: () => qb,
    insert: () => qb,
    update: () => qb,
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }
  return { mockDb, enqueue }
}

describe('NonConformitiesService', () => {
  let service: NonConformitiesService
  let enqueue: ReturnType<typeof makeDb>['enqueue']
  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    enqueue = eq
    const module = await Test.createTestingModule({
      providers: [
        NonConformitiesService,
        { provide: DRIZZLE, useValue: db },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(NonConformitiesService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('create', () => {
    const dto = {
      supplierId,
      type: 'QUALITY' as const,
      severity: 'HIGH' as const,
      description: 'Produto com defeito na embalagem',
    }

    it('cria NC com sucesso', async () => {
      enqueue({ id: supplierId }) // supplier
      enqueue(mockNc) // insert returning
      const result = await service.create(dto, mockUser)
      expect(result).toMatchObject({ status: 'OPEN' })
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create(dto, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se fornecedor não encontrado', async () => {
      enqueue(undefined)
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('retorna 400 se NC não está OPEN', async () => {
      enqueue({ ...mockNc, status: 'ANALYZING' })
      await expect(service.update(ncId, { severity: 'LOW' as const }, mockUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockNc)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.update(ncId, {}, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se não encontrada', async () => {
      enqueue(undefined)
      await expect(service.update('nonexistent', {}, mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('analyze', () => {
    it('transição OPEN → ANALYZING', async () => {
      enqueue(mockNc) // existing OPEN
      enqueue({ ...mockNc, status: 'ANALYZING' }) // update returning
      const result = await service.analyze(ncId, {}, mockComprador)
      expect(result.status).toBe('ANALYZING')
    })

    it('retorna 400 se NC não está OPEN', async () => {
      enqueue({ ...mockNc, status: 'ANALYZING' })
      await expect(service.analyze(ncId, {}, mockComprador)).rejects.toThrow(BadRequestException)
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockNc)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.analyze(ncId, {}, mockUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('resolve', () => {
    const analyzing = { ...mockNc, status: 'ANALYZING' }

    it('transição ANALYZING → RESOLVED', async () => {
      enqueue(analyzing)
      enqueue({ ...analyzing, status: 'RESOLVED' })
      const result = await service.resolve(
        ncId,
        { resolution: 'Produto devolvido ao fornecedor.' },
        mockComprador,
      )
      expect(result.status).toBe('RESOLVED')
    })

    it('retorna 400 se NC não está ANALYZING', async () => {
      enqueue(mockNc) // OPEN
      await expect(service.resolve(ncId, { resolution: 'OK' }, mockComprador)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('reject', () => {
    it('retorna 400 se NC não está ANALYZING', async () => {
      enqueue(mockNc) // OPEN
      await expect(
        service.reject(ncId, { resolution: 'Sem fundamento.' }, mockComprador),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('addComment', () => {
    it('adiciona comentário à NC', async () => {
      enqueue({ id: ncId }) // NC encontrada
      enqueue({ id: 'cmt-1', text: 'Verificado.' }) // insert returning
      const result = await service.addComment(ncId, { text: 'Verificado.' }, mockUser)
      expect(result).toMatchObject({ text: 'Verificado.' })
    })

    it('retorna 404 se NC não encontrada', async () => {
      enqueue(undefined)
      await expect(service.addComment('nonexistent', { text: 'X' }, mockUser)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
