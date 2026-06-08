import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { NonConformitiesController } from './non-conformities.controller'
import { NonConformitiesService } from './non-conformities.service'

describe('NonConformitiesController', () => {
  let controller: NonConformitiesController
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
  const mockUser = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockNc = { id: 'nc1', status: 'OPEN' }

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockNc]),
    findOne: vi.fn().mockResolvedValue({ ...mockNc, comments: [] }),
    create: vi.fn().mockResolvedValue(mockNc),
    update: vi.fn().mockResolvedValue(mockNc),
    analyze: vi.fn().mockResolvedValue({ ...mockNc, status: 'ANALYZING' }),
    resolve: vi.fn().mockResolvedValue({ ...mockNc, status: 'RESOLVED' }),
    reject: vi.fn().mockResolvedValue({ ...mockNc, status: 'REJECTED' }),
    addComment: vi.fn().mockResolvedValue({ id: 'cmt1', text: 'OK' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [NonConformitiesController],
      providers: [{ provide: NonConformitiesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(NonConformitiesController)
  })

  it('GET / — lista NCs', async () => expect(await controller.findAll(mockUser)).toEqual([mockNc]))
  it('POST / — abre NC', async () => {
    const dto = {
      supplierId: 's1',
      type: 'QUALITY' as const,
      severity: 'HIGH' as const,
      description: 'Problema na embalagem',
    }
    expect(await controller.create(dto, mockUser)).toMatchObject({ id: 'nc1' })
  })
  it('GET /:id — detalhe', async () =>
    expect(await controller.findOne('nc1', mockUser)).toMatchObject({ comments: [] }))
  it('POST /:id/analyze', async () =>
    expect(await controller.analyze('nc1', {}, mockUser)).toMatchObject({ status: 'ANALYZING' }))
  it('POST /:id/resolve', async () =>
    expect(await controller.resolve('nc1', { resolution: 'OK resolvido' }, mockUser)).toMatchObject(
      { status: 'RESOLVED' },
    ))
  it('POST /:id/reject', async () =>
    expect(
      await controller.reject('nc1', { resolution: 'Sem fundamento' }, mockUser),
    ).toMatchObject({ status: 'REJECTED' }))
  it('POST /:id/comments', async () =>
    expect(await controller.addComment('nc1', { text: 'Comentário' }, mockUser)).toMatchObject({
      id: 'cmt1',
    }))
})
