import { SetMetadata } from '@nestjs/common'

/**
 * Marca uma rota de plataforma (sem `:cnpj`) como acessível a qualquer usuário
 * autenticado — não apenas SUPER_ADMIN. Sem este flag, o `AuthGuard` rejeita
 * (fail-closed) rotas sem `:cnpj` para não-SUPER_ADMIN.
 *
 * Uso esperado: rotas como `GET /v1/me/companies`, que dependem apenas de
 * `session.user.id` e não de um contexto de empresa/tenant.
 */
export const ALLOW_PLATFORM_ROUTE_KEY = 'allowPlatformRoute'
export const AllowPlatformRoute = () => SetMetadata(ALLOW_PLATFORM_ROUTE_KEY, true)
