import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import { DRIZZLE } from '../../db.module'
import { CompaniesService } from './companies.service'

const mockCompany = {
  id: 'uuid-company-1',
  name: 'Empresa Teste',
  tradeName: null,
  cnpj: '12345678000195',
  email: null,
  phone: null,
  street: null,
  number: null,
  complement: null,
  city: null,
  state: null,
  zipCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const superAdminUser: SessionUser = {
  id: 'user-1',
  email: 'admin@elos.com',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  companyId: null,
}

const adminUser: SessionUser = {
  id: 'user-2',
  email: 'admin@empresa.com',
  name: 'Admin Empresa',
  role: 'ADMIN_EMPRESA',
  companyId: 'uuid-company-1',
}

const compradorUser: SessionUser = {
  id: 'user-3',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'uuid-company-1',
}

describe('CompaniesService', () => {
  let service: CompaniesService
  let mockDb: Record<string, ReturnType<typeof vi.fn>>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }
  // Linhas que o thenable do query builder entrega ao callback `.then(rows => ...)`.
  let queryRows: unknown[]

  // Configura o resultado da próxima query encadeada (`select().…`).
  // `null` simula "nenhuma linha"; um objeto simula uma linha encontrada.
  const setThenResult = (value: unknown) => {
    queryRows = value == null ? [] : [value]
  }

  beforeEach(async () => {
    queryRows = []
    // O thenable (folha do encadeamento) fica separado do `mockDb` injetado: se o
    // próprio `mockDb` fosse thenable, o NestJS o adotaria e substituiria a instância
    // do provider pelo valor resolvido. `.limit()` retorna esta folha; `.then()` honra
    // o callback do query builder do Drizzle entregando as linhas configuradas.
    const thenableLeaf = {
      // biome-ignore lint/suspicious/noThenProperty: thenable que emula o query builder do Drizzle (honra o resolve)
      then: vi.fn((resolve: (rows: unknown[]) => unknown) => Promise.resolve(resolve(queryRows))),
    }
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(thenableLeaf),
      orderBy: vi.fn().mockResolvedValue([mockCompany]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockCompany]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(CompaniesService)
  })

  describe('create', () => {
    it('cria empresa quando usuário é SUPER_ADMIN', async () => {
      // Simula: nenhuma empresa com CNPJ existente
      setThenResult(null)
      mockDb.returning = vi.fn().mockResolvedValue([mockCompany])

      const dto = { name: 'Empresa Teste', cnpj: '12345678000195' }
      const result = await service.create(dto, superAdminUser)

      expect(result).toEqual(mockCompany)
    })

    it('lança ForbiddenException quando não é SUPER_ADMIN', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true) // bloqueia

      await expect(
        service.create({ name: 'Empresa', cnpj: '12345678000195' }, adminUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ConflictException quando CNPJ já existe', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(false)
      // Simula: empresa já existe
      setThenResult(mockCompany)

      await expect(
        service.create({ name: 'Empresa', cnpj: '12345678000195' }, superAdminUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findAll', () => {
    it('retorna lista de empresas para SUPER_ADMIN', async () => {
      mockDb.orderBy = vi.fn().mockResolvedValue([mockCompany])

      const result = await service.findAll(superAdminUser)
      expect(result).toHaveLength(1)
    })

    it('lança ForbiddenException para não-SUPER_ADMIN', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)

      await expect(service.findAll(adminUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findByCnpj', () => {
    it('retorna empresa para membro da empresa', async () => {
      setThenResult(mockCompany)

      const result = await service.findByCnpj('12345678000195', adminUser)
      expect(result).toEqual(mockCompany)
    })

    it('lança NotFoundException quando empresa não existe', async () => {
      setThenResult(null)

      await expect(service.findByCnpj('00000000000000', adminUser)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('lança ForbiddenException quando usuário não tem acesso', async () => {
      setThenResult(mockCompany)
      mockAbility.cannot = vi.fn().mockReturnValue(true)

      await expect(service.findByCnpj('12345678000195', compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('update', () => {
    it('atualiza empresa quando usuário é ADMIN_EMPRESA', async () => {
      setThenResult(mockCompany)
      mockDb.returning = vi.fn().mockResolvedValue([{ ...mockCompany, name: 'Novo Nome' }])

      const result = await service.update('12345678000195', { name: 'Novo Nome' }, adminUser)
      expect(result?.name).toBe('Novo Nome')
    })

    it('lança ForbiddenException para COMPRADOR', async () => {
      setThenResult(mockCompany)
      mockAbility.cannot = vi.fn().mockReturnValue(true)

      await expect(service.update('12345678000195', { name: 'X' }, compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })
})
