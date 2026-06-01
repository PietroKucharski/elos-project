import { All, Controller, Req, Res } from '@nestjs/common'
import { toNodeHandler } from 'better-auth/node'
import type { Request, Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { auth } from './better-auth'

// Handler pré-construído — evita recriar a closure a cada request
const authHandler = toNodeHandler(auth)

@Controller()
@Public()
export class AuthController {
  @All('api/auth/*')
  handler(@Req() req: Request, @Res() res: Response): void {
    authHandler(req, res)
  }
}
