import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  it('retorna status ok com timestamp ISO válido', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()

    const controller = module.get(HealthController)
    const result = controller.check()

    expect(result.status).toBe('ok')
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
  })
})
