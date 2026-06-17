import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

describe('DashboardController', () => {
  let controller: DashboardController
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
  const mockUser = { id: 'u1', role: 'ADMIN_EMPRESA', companyId: 'c1' } as any
  const mockDashboard = { kpis: { quotationsOpen: 1 }, recentActivity: [] }

  const mockService = {
    getDashboard: vi.fn().mockResolvedValue(mockDashboard),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(DashboardController)
  })

  it('GET / — retorna dashboard', async () =>
    expect(await controller.getDashboard(mockUser)).toEqual(mockDashboard))
})
