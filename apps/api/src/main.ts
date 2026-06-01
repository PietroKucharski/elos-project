import 'reflect-metadata'
import { RequestMethod } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  })

  // ─── CORS — nunca enableCors() sem opções (invariante) ────────────────────
  app.enableCors({
    origin: [process.env.FRONTEND_URL!],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })

  // ─── Prefixo global /v1 ───────────────────────────────────────────────────
  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'api/auth/(.*)', method: RequestMethod.ALL },
      { path: 'health', method: RequestMethod.GET },
      { path: 'reference', method: RequestMethod.GET },
      { path: 'openapi.json', method: RequestMethod.GET },
    ],
  })

  // ─── Filtro global de exceções ────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter())

  // ─── OpenAPI + Scalar ─────────────────────────────────────────────────────
  const openApiConfig = new DocumentBuilder()
    .setTitle('Elos API')
    .setDescription('API de gestão de cadeia de suprimentos B2B')
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
    .build()

  const document = SwaggerModule.createDocument(app, openApiConfig)

  // Scalar UI em /reference
  app.use(
    '/reference',
    apiReference({
      spec: { content: document },
      theme: 'default',
    }),
  )

  // Spec JSON em /openapi.json — para geração de client tipado
  app.use('/openapi.json', (_req: unknown, res: { json: (d: unknown) => void }) => {
    res.json(document)
  })

  // ─── Inicialização ────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3333
  await app.listen(port)
  console.log(`🚀 API rodando em http://localhost:${port}`)
  console.log(`📖 Docs em http://localhost:${port}/reference`)
}

bootstrap().catch((err: unknown) => {
  console.error('Falha ao inicializar a API:', err)
  process.exit(1)
})
