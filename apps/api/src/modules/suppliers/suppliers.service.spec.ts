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
import { SuppliersService } from './suppliers.service'

const compradorUser: SessionUser = {
  id: 'user-comprador',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'company-1',
}

const mockSupplier = {
  id: 'supplier-1',
  companyId: 'company-1',
  name: 'Fornecedor Teste Ltda',
  type: 'PJ',
  cnpj: '12345678000195',
  cpf: null,
  email: 'contato@fornecedor.com',
  phone: null,
  status: 'PENDING',
  rating: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SuppliersService', () => {
  let service: SuppliersService
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
      returning: vi.fn().mockResolvedValue([mockSupplier]),
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
        SuppliersService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(SuppliersService)
  })

  describe('findAll', () => {
    it('retorna lista de fornecedores', async () => {
      qb.orderBy = vi.fn().mockReturnThis()
      qb.limit = vi.fn().mockReturnThis()
      qb.offset = vi.fn().mockResolvedValue([mockSupplier])
      const result = await service.findAll(compradorUser, {})
      expect(Array.isArray(result)).toBe(true)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.findAll(compradorUser, {})).rejects.toThrow(ForbiddenException)
    })

    it('lança BadRequestException para status inválido', async () => {
      await expect(service.findAll(compradorUser, { status: 'INVALIDO' })).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create({ name: 'Fornecedor', type: 'PJ', cnpj: '12345678000195' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ConflictException quando CNPJ já existe', async () => {
      enqueue({ id: 'outro-supplier' }) // CNPJ duplicado encontrado
      await expect(
        service.create({ name: 'Fornecedor', type: 'PJ', cnpj: '12345678000195' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findOne', () => {
    it('lança NotFoundException quando não encontrado', async () => {
      enqueue(undefined) // select retorna undefined (sem row)
      // segundo select (endereço) não será chamado
      await expect(service.findOne('nao-existe', compradorUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('approve', () => {
    it('lança NotFoundException quando fornecedor não encontrado', async () => {
      enqueue(undefined)
      await expect(service.approve('nao-existe', {}, compradorUser)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('lança BadRequestException quando status não é PENDING', async () => {
      enqueue({ ...mockSupplier, status: 'APPROVED' })
      await expect(service.approve('supplier-1', {}, compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockSupplier)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.approve('supplier-1', {}, compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('reject', () => {
    it('lança BadRequestException quando status não é PENDING', async () => {
      enqueue({ ...mockSupplier, status: 'REJECTED' })
      await expect(
        service.reject('supplier-1', { notes: 'Motivo de rejeição' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockSupplier)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.reject('supplier-1', { notes: 'Motivo' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
