import type { ArgumentsHost } from '@nestjs/common'
import { HttpException, HttpStatus } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalExceptionFilter } from './global-exception.filter'

function makeHost(url = '/test'): ArgumentsHost {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter

  beforeEach(() => {
    filter = new GlobalExceptionFilter()
  })

  it('retorna 400 para HttpException com shape correto', () => {
    const host = makeHost()
    const { status, json } = extractMocks(host)

    filter.catch(new HttpException('Dado inválido.', HttpStatus.BAD_REQUEST), host)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'Dado inválido.', path: '/test' }),
    )
  })

  it('retorna 500 para erros inesperados sem expor o stack', () => {
    const host = makeHost()
    const { status, json } = extractMocks(host)

    filter.catch(new Error('db connection lost'), host)

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Erro interno do servidor.' }),
    )
  })
})

function extractMocks(host: ArgumentsHost) {
  const res = host.switchToHttp().getResponse() as any
  return { status: res.status, json: res.status().json }
}
