import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { WarehousesService } from './warehouses.service'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const companyId = '00000000-0000-0000-0000-000000000001'
const warehouseId = '00000000-0000-0000-0000-000000000002'
const userId = 'user-001'

const mockWarehouse = {
  id: warehouseId,
  companyId,
  name: 'Armazém Central',
  code: 'AC01',
  location: 'Galpão A',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser = {
  id: userId,
  email: 'test@test.com',
  name: 'Test',
  role: 'ALMOXARIFE',
  companyId,
} as any

// ─── Mock do Drizzle ─────────────────────────────────────────────────────────

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

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('WarehousesService', () => {
  let service: WarehousesService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']

  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db
    enqueue = eq

    const module = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()

    service = module.get(WarehousesService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('findAll', () => {
    it('retorna lista de armazéns', async () => {
      enqueue(mockWarehouse)
      const result = await service.findAll(mockUser, {})
      expect(result).toBeDefined()
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(mockUser, {})).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findOne', () => {
    it('retorna armazém pelo id', async () => {
      enqueue(mockWarehouse)
      const result = await service.findOne(warehouseId, mockUser)
      expect(result).toMatchObject({ name: 'Armazém Central' })
    })

    it('retorna 404 se não encontrado', async () => {
      enqueue(undefined)
      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('cria armazém com sucesso', async () => {
      enqueue(undefined) // sem código duplicado
      enqueue(mockWarehouse) // insert returning
      const result = await service.create({ name: 'Armazém Central', code: 'AC01' }, mockUser)
      expect(result).toMatchObject({ name: 'Armazém Central' })
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create({ name: 'Armazém' }, mockUser)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('retorna 409 se código já existe', async () => {
      enqueue(mockWarehouse) // código duplicado encontrado
      await expect(service.create({ name: 'Novo', code: 'AC01' }, mockUser)).rejects.toThrow(
        ConflictException,
      )
    })
  })

  describe('deactivate', () => {
    it('desativa armazém sem estoque', async () => {
      enqueue(mockWarehouse) // existing
      enqueue(undefined) // sem estoque (stockEntry)
      enqueue({ ...mockWarehouse, isActive: false }) // update returning
      const result = await service.deactivate(warehouseId, mockUser)
      expect(result).toEqual({ success: true })
    })

    it('retorna 400 se há estoque no armazém', async () => {
      enqueue(mockWarehouse) // existing
      enqueue({ id: 'inv-1' }) // stockEntry com quantidade > 0
      await expect(service.deactivate(warehouseId, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 404 se armazém não encontrado', async () => {
      enqueue(undefined)
      await expect(service.deactivate('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockWarehouse)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.deactivate(warehouseId, mockUser)).rejects.toThrow(ForbiddenException)
    })
  })
})
