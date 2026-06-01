import { beforeEach, describe, expect, it } from 'vitest'
import type { SessionUser } from '../types/session-user'
import { AbilityFactory } from './ability.factory'

const makeUser = (role: SessionUser['role']): SessionUser => ({
  id: 'u1',
  email: 'test@test.com',
  name: 'Test',
  role,
  companyId: 'c1',
})

describe('AbilityFactory', () => {
  let factory: AbilityFactory

  beforeEach(() => {
    factory = new AbilityFactory()
  })

  it('SUPER_ADMIN pode fazer tudo', () => {
    const ability = factory.createForUser(makeUser('SUPER_ADMIN'))
    expect(ability.can('manage', 'all')).toBe(true)
    expect(ability.can('delete', 'AuditLog')).toBe(true)
  })

  it('COMPRADOR pode criar cotação e aprovar fornecedor', () => {
    const ability = factory.createForUser(makeUser('COMPRADOR'))
    expect(ability.can('create', 'Quotation')).toBe(true)
    expect(ability.can('approve', 'Supplier')).toBe(true)
  })

  it('COMPRADOR não pode gerenciar pagamentos', () => {
    const ability = factory.createForUser(makeUser('COMPRADOR'))
    expect(ability.can('create', 'Payment')).toBe(false)
  })

  it('ALMOXARIFE pode criar recebimento mas não aprovar fornecedor', () => {
    const ability = factory.createForUser(makeUser('ALMOXARIFE'))
    expect(ability.can('create', 'Receipt')).toBe(true)
    expect(ability.can('approve', 'Supplier')).toBe(false)
  })

  it('ANALISTA_FINANCEIRO pode gerenciar invoice e payment', () => {
    const ability = factory.createForUser(makeUser('ANALISTA_FINANCEIRO'))
    expect(ability.can('manage', 'Invoice')).toBe(true)
    expect(ability.can('manage', 'Payment')).toBe(true)
  })

  it('TRANSPORTADOR pode gerenciar shipment mas não invoice', () => {
    const ability = factory.createForUser(makeUser('TRANSPORTADOR'))
    expect(ability.can('manage', 'Shipment')).toBe(true)
    expect(ability.can('manage', 'Invoice')).toBe(false)
  })

  it('usuário sem papel não pode fazer nada', () => {
    const ability = factory.createForUser(makeUser(null))
    expect(ability.can('read', 'Supplier')).toBe(false)
  })
})
