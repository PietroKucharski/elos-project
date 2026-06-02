import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../modules/auth/better-auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock('better-auth/node', () => ({
  fromNodeHeaders: (h: unknown) => h,
}))
import { auth } from '../../modules/auth/better-auth'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { AuthGuard } from './auth.guard'

// Request memoizado: o guard e o teste enxergam o mesmo objeto, então a
// mutação de `request.user` feita pelo guard é observável na asserção.
const makeContext = (
  params: Record<string, string> = {},
  request: { params: Record<string, string>; headers: Record<string, string>; user?: unknown } = {
    params,
    headers: {},
  },
): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext

// Mock do query builder Drizzle: cada cadeia `.select()....then(cb)` consome o
// próximo conjunto de linhas da fila e aplica o callback, como uma promise real.
function makeDb(rowQueue: unknown[][]) {
  let i = 0
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    // biome-ignore lint/suspicious/noThenProperty: thenable que emula o query builder do Drizzle
    then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(resolve(rowQueue[i++] ?? [])),
  }
  return chain
}

// Reflector ciente da chave consultada: IS_PUBLIC_KEY e ALLOW_PLATFORM_ROUTE_KEY.
const reflector = (opts: { isPublic?: boolean; allowPlatform?: boolean } = {}): Reflector =>
  ({
    getAllAndOverride: vi.fn((key: string) =>
      key === IS_PUBLIC_KEY ? (opts.isPublic ?? false) : (opts.allowPlatform ?? false),
    ),
  }) as unknown as Reflector

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.mocked(auth.api.getSession).mockReset()
  })

  it('permite rota @Public() sem verificar sessão', async () => {
    const guard = new AuthGuard(makeDb([]) as never, reflector({ isPublic: true }))
    const result = await guard.canActivate(makeContext())
    expect(result).toBe(true)
    expect(auth.api.getSession).not.toHaveBeenCalled()
  })

  it('lança UnauthorizedException sem sessão válida', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    const guard = new AuthGuard(makeDb([]) as never, reflector())
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException)
  })

  it('enriquece request.user com role e companyId quando membership encontrado', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    } as never)

    const request = { params: { cnpj: '00000000000191' }, headers: {} as Record<string, string> }
    const ctx = makeContext(request.params, request)
    const guard = new AuthGuard(
      makeDb([[{ role: 'COMPRADOR', companyId: 'c1' }]]) as never,
      reflector(),
    )

    await guard.canActivate(ctx)

    expect(request).toMatchObject({ user: { role: 'COMPRADOR', companyId: 'c1' } })
  })

  it('lança ForbiddenException se sem membership e não é SUPER_ADMIN', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    } as never)

    // 1ª query (membership) → []; 2ª query (super admin) → []
    const guard = new AuthGuard(makeDb([[], []]) as never, reflector())

    await expect(guard.canActivate(makeContext({ cnpj: '00000000000191' }))).rejects.toThrow(
      ForbiddenException,
    )
  })

  // --- Rotas de plataforma (sem :cnpj) ---

  it('eleva a SUPER_ADMIN em rota de plataforma quando o usuário é SUPER_ADMIN', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    } as never)

    const request = { params: {} as Record<string, string>, headers: {} as Record<string, string> }
    const ctx = makeContext(request.params, request)
    // Query de SUPER_ADMIN em qualquer empresa → encontrada
    const guard = new AuthGuard(makeDb([[{ role: 'SUPER_ADMIN' }]]) as never, reflector())

    await guard.canActivate(ctx)

    expect(request).toMatchObject({ user: { role: 'SUPER_ADMIN', companyId: null } })
  })

  it('fail-closed: ForbiddenException em rota de plataforma para não-SUPER_ADMIN sem opt-in', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    } as never)

    // Não é SUPER_ADMIN em nenhuma empresa → []
    const guard = new AuthGuard(makeDb([[]]) as never, reflector())

    await expect(guard.canActivate(makeContext())).rejects.toThrow(ForbiddenException)
  })

  it('permite rota de plataforma com @AllowPlatformRoute() para não-SUPER_ADMIN (role null)', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    } as never)

    const request = { params: {} as Record<string, string>, headers: {} as Record<string, string> }
    const ctx = makeContext(request.params, request)
    const guard = new AuthGuard(makeDb([[]]) as never, reflector({ allowPlatform: true }))

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
    expect(request).toMatchObject({ user: { role: null, companyId: null } })
  })
})
