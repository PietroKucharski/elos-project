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
import { QuotationsService } from './quotations.service'

const compradorUser: SessionUser = {
  id: 'user-comprador',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'company-1',
}

const mockQuotation = {
  id: 'quotation-1',
  companyId: 'company-1',
  number: 'COT-2024-0001',
  title: 'Cotação de Materiais',
  description: null,
  deadline: new Date('2024-12-31'),
  paymentTerms: null,
  status: 'DRAFT' as const,
  createdBy: 'user-comprador',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('QuotationsService', () => {
  let service: QuotationsService
  let qb: Record<string, ReturnType<typeof vi.fn>>
  let mockDb: Record<string, unknown>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  // Fila sequencial de resultados de SELECT. Vários métodos do service encadeiam
  // dois ou mais selects no mesmo fluxo (ex.: inviteSupplier → cotação, fornecedor,
  // convite duplicado); a fila garante que cada `await` consuma o próximo resultado
  // na ordem, em vez de todos lerem o último valor enfileirado.
  let resultsQueue: unknown[][]

  function enqueue(result: unknown) {
    resultsQueue.push([result])
  }

  beforeEach(async () => {
    resultsQueue = []

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
      returning: vi.fn().mockResolvedValue([mockQuotation]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noThenProperty: thenable que emula o query builder do Drizzle (honra o resolve)
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve(resultsQueue.length ? resultsQueue.shift() : [null]),
      ),
    }

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
        QuotationsService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(QuotationsService)
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create({ title: 'Cotação', deadline: '2024-12-31T23:59:59.000Z' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('cria cotação com status DRAFT e número gerado', async () => {
      // count retorna 0 (primeira cotação do ano)
      enqueue({ count: 0 })
      const result = await service.create(
        { title: 'Cotação Q4', deadline: '2024-12-31T23:59:59.000Z' },
        compradorUser,
      )
      expect(result).toBeDefined()
    })
  })

  describe('findOne', () => {
    it('lança NotFoundException quando não encontrada', async () => {
      enqueue(undefined)
      await expect(service.findOne('nao-existe', compradorUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('lança BadRequestException quando status não é DRAFT', async () => {
      enqueue({ ...mockQuotation, status: 'OPEN' })
      await expect(
        service.update('quotation-1', { title: 'Novo Título' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockQuotation)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.update('quotation-1', { title: 'Novo Título' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('publish', () => {
    it('lança NotFoundException quando cotação não encontrada', async () => {
      enqueue(undefined)
      await expect(service.publish('nao-existe', compradorUser)).rejects.toThrow(NotFoundException)
    })

    it('lança BadRequestException quando status não é DRAFT', async () => {
      enqueue({ ...mockQuotation, status: 'OPEN' })
      await expect(service.publish('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança BadRequestException sem itens', async () => {
      enqueue(mockQuotation) // findOne
      enqueue({ itemCount: 0 }) // count de itens
      await expect(service.publish('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockQuotation)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.publish('quotation-1', compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('close', () => {
    it('lança BadRequestException quando status não é OPEN', async () => {
      enqueue({ ...mockQuotation, status: 'DRAFT' })
      await expect(service.close('quotation-1', compradorUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('cancel', () => {
    it('lança BadRequestException quando status é CLOSED', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      await expect(service.cancel('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('inviteSupplier', () => {
    it('lança BadRequestException quando fornecedor não está APPROVED', async () => {
      enqueue(mockQuotation) // assertQuotation
      enqueue({ id: 'supplier-1', status: 'PENDING' }) // supplier lookup
      await expect(
        service.inviteSupplier('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ConflictException quando fornecedor já convidado', async () => {
      enqueue(mockQuotation) // assertQuotation
      enqueue({ id: 'supplier-1', status: 'APPROVED' }) // supplier lookup
      enqueue({ id: 'existing-invite' }) // convite duplicado
      await expect(
        service.inviteSupplier('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })
  })
})
