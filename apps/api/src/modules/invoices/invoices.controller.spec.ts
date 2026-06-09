import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'

describe('InvoicesController', () => {
  let controller: InvoicesController
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
  const mockUser = { id: 'u1', role: 'ANALISTA_FINANCEIRO', companyId: 'c1' } as any
  const mockInvoice = { id: 'inv1', status: 'PENDING' }

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockInvoice]),
    findOne: vi.fn().mockResolvedValue({ ...mockInvoice, items: [] }),
    create: vi.fn().mockResolvedValue(mockInvoice),
    update: vi.fn().mockResolvedValue(mockInvoice),
    validate: vi.fn().mockResolvedValue({ ...mockInvoice, status: 'VALIDATED' }),
    reject: vi.fn().mockResolvedValue({ ...mockInvoice, status: 'REJECTED' }),
    addItem: vi.fn().mockResolvedValue({ id: 'item1', description: 'Produto X' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(InvoicesController)
  })

  it('GET / — lista NFs', async () =>
    expect(await controller.findAll(mockUser)).toEqual([mockInvoice]))
  it('POST / — cria NF', async () => {
    const dto = {
      purchaseOrderId: 'po1',
      supplierId: 's1',
      number: 'NF-1',
      issueDate: new Date().toISOString(),
      totalAmount: 100,
    }
    expect(await controller.create(dto, mockUser)).toMatchObject({ id: 'inv1' })
  })
  it('GET /:id — detalhe', async () =>
    expect(await controller.findOne('inv1', mockUser)).toMatchObject({ items: [] }))
  it('PATCH /:id — atualiza', async () =>
    expect(await controller.update('inv1', { number: 'NF-2' }, mockUser)).toMatchObject({
      id: 'inv1',
    }))
  it('POST /:id/validate — valida', async () =>
    expect(await controller.validate('inv1', {}, mockUser)).toMatchObject({ status: 'VALIDATED' }))
  it('POST /:id/reject — rejeita', async () =>
    expect(
      await controller.reject('inv1', { rejectionReason: 'Valores divergentes' }, mockUser),
    ).toMatchObject({ status: 'REJECTED' }))
  it('POST /:id/items — adiciona item', async () =>
    expect(
      await controller.addItem(
        'inv1',
        { description: 'Produto X', quantity: 1, unitPrice: 100, totalPrice: 100 },
        mockUser,
      ),
    ).toMatchObject({ id: 'item1' }))
})
