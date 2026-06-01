import { type ExecutionContext, createParamDecorator } from '@nestjs/common'
import type { SessionUser } from '../types/session-user'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as SessionUser
  },
)
