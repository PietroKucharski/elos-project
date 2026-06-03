import type { Role } from '@elos/shared'
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { fromNodeHeaders } from 'better-auth/node'
import { and, eq } from 'drizzle-orm'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { companies, companyMembers } from '../../db/schema'
import { auth } from '../../modules/auth/better-auth'
import { ALLOW_PLATFORM_ROUTE_KEY } from '../decorators/platform-route.decorator'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // @Inject explícito: o runtime tsx/esbuild não emite `emitDecoratorMetadata`,
    // então a DI por tipo (sem token) resolveria `undefined`.
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rotas marcadas com @Public() são livres
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()

    // 1. Verificar sessão Better-Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })
    if (!session) throw new UnauthorizedException('Sessão inválida ou expirada.')

    // 2. Resolver empresa ativa (se rota tem /:cnpj)
    const cnpj: string | undefined = request.params?.cnpj
    let role: Role | null = null
    let companyId: string | null = null

    if (cnpj) {
      // Tenta encontrar membership direto na empresa
      const membership = await this.db
        .select({ role: companyMembers.role, companyId: companies.id })
        .from(companyMembers)
        .innerJoin(companies, eq(companies.id, companyMembers.companyId))
        .where(and(eq(companyMembers.userId, session.user.id), eq(companies.cnpj, cnpj)))
        .limit(1)
        .then((rows) => rows[0] ?? null)

      if (membership) {
        role = membership.role as Role
        companyId = membership.companyId
      } else {
        // Sem membership direto — verifica se é SUPER_ADMIN em qualquer empresa
        const isSuperAdmin = await this.db
          .select({ role: companyMembers.role })
          .from(companyMembers)
          .where(
            and(eq(companyMembers.userId, session.user.id), eq(companyMembers.role, 'SUPER_ADMIN')),
          )
          .limit(1)
          .then((rows) => rows.length > 0)

        if (!isSuperAdmin) {
          throw new ForbiddenException('Acesso negado a esta empresa.')
        }

        // Resolve o companyId pelo CNPJ para o SUPER_ADMIN
        const company = await this.db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.cnpj, cnpj))
          .limit(1)
          .then((rows) => rows[0] ?? null)

        if (!company) throw new NotFoundException('Empresa não encontrada.')

        role = 'SUPER_ADMIN'
        companyId = company.id
      }
    } else {
      // Rotas de plataforma (sem contexto de empresa no URL).
      // Verifica se o usuário é SUPER_ADMIN em alguma empresa; se sim, assume
      // esse papel com companyId null (queries sem escopo de tenant).
      const superAdminMembership = await this.db
        .select({ role: companyMembers.role })
        .from(companyMembers)
        .where(
          and(eq(companyMembers.userId, session.user.id), eq(companyMembers.role, 'SUPER_ADMIN')),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)

      if (superAdminMembership) {
        role = 'SUPER_ADMIN'
        // companyId permanece null — sem escopo de tenant
      } else {
        // Fail-closed: rotas de plataforma exigem SUPER_ADMIN, exceto quando a rota
        // opta explicitamente via @AllowPlatformRoute() (ex.: GET /v1/me/companies,
        // que depende apenas de session.user.id, sem contexto de tenant).
        const allowPlatformRoute = this.reflector.getAllAndOverride<boolean>(
          ALLOW_PLATFORM_ROUTE_KEY,
          [context.getHandler(), context.getClass()],
        )
        if (!allowPlatformRoute) {
          throw new ForbiddenException('Acesso restrito a SUPER_ADMIN.')
        }
        // role/companyId permanecem null; a rota opt-in usa session.user.id direto.
      }
    }

    // 3. Enriquecer request.user
    request.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
      companyId,
    }

    return true
  }
}
