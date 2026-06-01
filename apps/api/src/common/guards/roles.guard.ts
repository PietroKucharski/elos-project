import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import type { SessionUser } from '../types/session-user'

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user as SessionUser | undefined

    if (!user) return false

    const cnpj: string | undefined = request.params?.cnpj
    if (cnpj && !user.role) {
      throw new ForbiddenException('Usuário sem papel nesta empresa.')
    }

    return true
  }
}
