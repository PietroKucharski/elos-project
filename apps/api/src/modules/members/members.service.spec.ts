import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Evita instanciar o Better-Auth real (db + secret de env) ao importar o service.
vi.mock('../auth/better-auth', () => ({
  auth: { api: { signUpEmail: vi.fn() } },
}))

import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import { DRIZZLE } from '../../db.module'
import { MembersService } from './members.service'

const adminUser: SessionUser = {
  id: 'user-admin',
  email: 'admin@empresa.com',
  name: 'Admin',
  role: 'ADMIN_EMPRESA',
  companyId: 'company-1',
}

const mockMember = {
  id: 'member-1',
  companyId: 'company-1',
  userId: 'user-2',
  role: 'COMPRADOR',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('MembersService', () => {
  let service: MembersService
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }
  // Fila de resultados consumida pelo thenable do query builder (cada query
  // encadeada puxa o próximo conjunto de linhas).
  let rowQueue: unknown[][]

  // Enfileira o resultado da próxima query (`null` simula "nenhuma linha").
  const enqueue = (value: unknown) => rowQueue.push(value == null ? [] : [value])

  beforeEach(async () => {
    rowQueue = []

    // O query builder (qb) é thenable e encadeável; fica SEPARADO do mockDb
    // injetado para o NestJS 11 não adotar o thenable e substituir o provider.
    // biome-ignore lint/suspicious/noExplicitAny: mock dinâmico do query builder
    const qb: Record<string, any> = {}
    const chain = () => qb
    qb.select = vi.fn(chain)
    qb.from = vi.fn(chain)
    qb.where = vi.fn(chain)
    qb.innerJoin = vi.fn(chain)
    qb.limit = vi.fn(chain)
    qb.orderBy = vi.fn(chain)
    qb.values = vi.fn(chain)
    qb.set = vi.fn(chain)
    qb.insert = vi.fn(chain)
    qb.update = vi.fn(chain)
    qb.delete = vi.fn(chain)
    qb.returning = vi.fn(() => Promise.resolve([mockMember]))
    // biome-ignore lint/suspicious/noThenProperty: thenable que emula o query builder do Drizzle (honra o resolve)
    qb.then = (resolve: (rows: unknown[]) => unknown) =>
      Promise.resolve(resolve(rowQueue.length ? (rowQueue.shift() as unknown[]) : []))

    // mockDb injetado: NÃO é thenable; apenas delega os pontos de entrada ao qb.
    const mockDb = {
      select: vi.fn((...args: unknown[]) => qb.select(...args)),
      insert: vi.fn((...args: unknown[]) => qb.insert(...args)),
      update: vi.fn((...args: unknown[]) => qb.update(...args)),
      delete: vi.fn((...args: unknown[]) => qb.delete(...args)),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(MembersService)
  })

  describe('findAll', () => {
    it('retorna lista de membros para ADMIN_EMPRESA', async () => {
      const result = await service.findAll(adminUser)
      expect(Array.isArray(result)).toBe(true)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.findAll(adminUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('invite', () => {
    it('lança ConflictException quando membro já existe', async () => {
      // Simula: usuário existe E já é membro
      enqueue({ id: 'user-2' }) // usuário encontrado
      enqueue({ id: 'member-1' }) // membership encontrada

      await expect(
        service.invite({ email: 'x@x.com', name: 'X', role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(ConflictException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.invite({ email: 'x@x.com', name: 'X', role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('updateRole', () => {
    it('lança BadRequestException ao tentar alterar o próprio papel', async () => {
      await expect(
        service.updateRole(adminUser.id, { role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança NotFoundException quando membro não existe', async () => {
      enqueue(null) // membership não encontrada
      await expect(
        service.updateRole('outro-user', { role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('lança BadRequestException ao tentar remover a si mesmo', async () => {
      await expect(service.remove(adminUser.id, adminUser)).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException ao remover último ADMIN_EMPRESA', async () => {
      const adminMember = { ...mockMember, role: 'ADMIN_EMPRESA', userId: 'outro-admin' }
      enqueue(adminMember) // membership encontrada
      enqueue({ count: '1' }) // apenas 1 admin

      await expect(service.remove('outro-admin', adminUser)).rejects.toThrow(BadRequestException)
    })

    it('lança NotFoundException quando membro não existe', async () => {
      enqueue(null) // membership não encontrada
      await expect(service.remove('user-inexistente', adminUser)).rejects.toThrow(NotFoundException)
    })
  })
})
