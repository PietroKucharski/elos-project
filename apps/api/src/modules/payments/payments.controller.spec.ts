import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

describe('PaymentsController', () => {
  let controller: PaymentsController
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
  const mockUser = { id: 'u1', role: 'ANALISTA_FINANCEIRO', companyId: 'c1' } as any
  const mockPayment = { id: 'pay1', status: 'PENDING' }
  const mockInstallment = { id: 'inst1', status: 'PAID' }

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockPayment]),
    findOne: vi.fn().mockResolvedValue({ ...mockPayment, installments: [] }),
    create: vi.fn().mockResolvedValue(mockPayment),
    update: vi.fn().mockResolvedValue(mockPayment),
    cancel: vi.fn().mockResolvedValue({ ...mockPayment, status: 'CANCELLED' }),
    payInstallment: vi.fn().mockResolvedValue(mockInstallment),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(PaymentsController)
  })

  it('GET / — lista pagamentos', async () =>
    expect(await controller.findAll(mockUser)).toEqual([mockPayment]))
  it('POST / — cria pagamento', async () => {
    const dto = {
      invoiceId: 'inv1',
      totalAmount: 1500,
      method: 'PIX' as const,
      installments: [{ installmentNumber: 1, amount: 1500, dueDate: new Date().toISOString() }],
    }
    expect(await controller.create(dto, mockUser)).toMatchObject({ id: 'pay1' })
  })
  it('GET /:id — detalhe', async () =>
    expect(await controller.findOne('pay1', mockUser)).toMatchObject({ installments: [] }))
  it('PATCH /:id — atualiza', async () =>
    expect(await controller.update('pay1', { notes: 'ok' }, mockUser)).toMatchObject({
      id: 'pay1',
    }))
  it('POST /:id/cancel — cancela', async () =>
    expect(await controller.cancel('pay1', mockUser)).toMatchObject({ status: 'CANCELLED' }))
  it('POST /:id/installments/:instId/pay — paga parcela', async () =>
    expect(await controller.payInstallment('pay1', 'inst1', {}, mockUser)).toMatchObject({
      status: 'PAID',
    }))
})
