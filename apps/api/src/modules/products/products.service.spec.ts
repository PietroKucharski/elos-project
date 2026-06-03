import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import { DRIZZLE } from '../../db.module'
import { ProductsService } from './products.service'

const compradorUser: SessionUser = {
  id: 'user-comprador',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'company-1',
}

const mockProduct = {
  id: 'product-1',
  companyId: 'company-1',
  name: 'Parafuso M6',
  code: 'PAR-M6',
  description: null,
  unit: 'UN',
  minStock: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ProductsService', () => {
  let service: ProductsService
  let qb: Record<string, ReturnType<typeof vi.fn>>
  let mockDb: Record<string, unknown>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  // O service consome as queries como arrays (`const [row] = await ...` ou
  // `.then((r) => r[0] ?? null)`). Envolvemos o valor em array para que ambos os
  // padrões funcionem: enqueue(undefined) → linha ausente; enqueue(obj) → 1 linha.
  function enqueue(result: unknown) {
    // biome-ignore lint/suspicious/noThenProperty: thenable que emula o query builder do Drizzle (honra o resolve)
    qb.then = vi.fn((resolve: (v: unknown) => void) => resolve([result]))
  }

  beforeEach(async () => {
    qb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockProduct]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noThenProperty: thenable que emula o query builder do Drizzle (honra o resolve)
      then: vi.fn((resolve: (v: unknown) => void) => resolve(null)),
    }

    // `qb` é o mesmo objeto em runtime; o cast apenas o expõe como chamável para o
    // TS. O acesso por membro `q['select'](...)` preserva `this = qb`, fazendo o
    // `.mockReturnThis()` devolver o próprio query builder e o encadeamento funcionar.
    const q = qb as Record<string, (...a: unknown[]) => unknown>
    mockDb = {
      select: (...a: unknown[]) => q.select?.(...a),
      insert: (...a: unknown[]) => q.insert?.(...a),
      update: (...a: unknown[]) => q.update?.(...a),
      delete: (...a: unknown[]) => q.delete?.(...a),
      transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(qb)),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(ProductsService)
  })

  describe('findAll', () => {
    it('retorna lista de produtos ativos por padrão', async () => {
      qb.orderBy = vi.fn().mockReturnThis()
      qb.limit = vi.fn().mockReturnThis()
      qb.offset = vi.fn().mockResolvedValue([mockProduct])
      const result = await service.findAll(compradorUser, {})
      expect(Array.isArray(result)).toBe(true)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.findAll(compradorUser, {})).rejects.toThrow(ForbiddenException)
    })

    it('lança BadRequestException para unit inválida', async () => {
      await expect(service.findAll(compradorUser, { unit: 'INVALIDO' })).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create({ name: 'Produto', unit: 'UN', isActive: true }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ConflictException quando código já existe', async () => {
      enqueue({ id: 'outro-product' }) // código duplicado encontrado
      await expect(
        service.create(
          { name: 'Produto', unit: 'UN', code: 'PAR-M6', isActive: true },
          compradorUser,
        ),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findOne', () => {
    it('lança NotFoundException quando não encontrado', async () => {
      enqueue(undefined)
      await expect(service.findOne('nao-existe', compradorUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('deactivate', () => {
    it('lança NotFoundException quando produto não encontrado', async () => {
      enqueue(undefined)
      await expect(service.deactivate('nao-existe', compradorUser)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockProduct)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.deactivate('product-1', compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('linkSupplier', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.linkSupplier(
          'product-1',
          { supplierId: 'supplier-1', isPreferred: false },
          compradorUser,
        ),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança NotFoundException quando produto não pertence ao tenant', async () => {
      enqueue(undefined)
      await expect(
        service.linkSupplier(
          'product-1',
          { supplierId: 'supplier-1', isPreferred: false },
          compradorUser,
        ),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
