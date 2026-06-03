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
import { BidsService } from './bids.service'

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
  title: 'Cotação Q4',
  description: null,
  deadline: new Date('2024-12-31'),
  paymentTerms: null,
  status: 'OPEN' as const,
  createdBy: 'user-comprador',
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockBid = {
  id: 'bid-1',
  quotationId: 'quotation-1',
  supplierId: 'supplier-1',
  companyId: 'company-1',
  status: 'DRAFT' as const,
  paymentTerms: null,
  observations: null,
  submittedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('BidsService', () => {
  let service: BidsService
  let qb: Record<string, ReturnType<typeof vi.fn>>
  let mockDb: Record<string, unknown>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  // Fila sequencial de resultados de SELECT: vários métodos encadeiam dois ou mais
  // selects no mesmo fluxo (ex.: create → cotação, convite, lance duplicado); a fila
  // garante que cada `await` consuma o próximo resultado na ordem, em vez de todos
  // lerem o último valor enfileirado.
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
      orderBy: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockBid]),
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
        BidsService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(BidsService)
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança NotFoundException quando cotação não encontrada', async () => {
      enqueue(undefined)
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(NotFoundException)
    })

    it('lança BadRequestException quando cotação não está OPEN', async () => {
      enqueue({ ...mockQuotation, status: 'DRAFT' })
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException quando fornecedor não está convidado', async () => {
      enqueue(mockQuotation) // cotação OK
      enqueue(undefined) // convite não encontrado
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ConflictException quando lance duplicado', async () => {
      enqueue(mockQuotation) // cotação OK
      enqueue({ id: 'invite-1' }) // convite existe
      enqueue({ id: 'bid-exists' }) // lance já existe
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('submit', () => {
    it('lança BadRequestException quando status não é DRAFT', async () => {
      enqueue(mockQuotation) // cotação OK
      enqueue({ ...mockBid, status: 'SUBMITTED' }) // bid já submetido
      await expect(service.submit('quotation-1', 'bid-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança BadRequestException quando lance não tem itens', async () => {
      enqueue(mockQuotation) // cotação OK
      enqueue(mockBid) // bid DRAFT
      enqueue({ itemCount: 0 }) // sem itens
      await expect(service.submit('quotation-1', 'bid-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockQuotation)
      enqueue(mockBid)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.submit('quotation-1', 'bid-1', compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('selectWinner', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança BadRequestException quando cotação não está CLOSED', async () => {
      enqueue(mockQuotation) // status OPEN, não CLOSED
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException quando lance não está SUBMITTED', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      enqueue({ ...mockBid, status: 'DRAFT' }) // não submetido
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ConflictException quando já há vencedor', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      enqueue({ ...mockBid, status: 'SUBMITTED' })
      enqueue({ id: 'winner-bid' }) // já existe SELECTED
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('addBidItem', () => {
    it('lança ConflictException quando item já adicionado ao lance', async () => {
      enqueue(mockQuotation) // cotação OK
      enqueue(mockBid) // bid OK
      enqueue({ id: 'qitem-1' }) // quotation item existe
      enqueue({ id: 'existing' }) // bid item já existe
      await expect(
        service.addBidItem(
          'quotation-1',
          'bid-1',
          { quotationItemId: 'qitem-1', unitPrice: 10, deliveryDays: 5 },
          compradorUser,
        ),
      ).rejects.toThrow(ConflictException)
    })
  })
})
