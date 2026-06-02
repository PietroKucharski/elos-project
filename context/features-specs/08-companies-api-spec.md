# Feature Spec — 1.2 Companies Module (API)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 1 — Auth e Empresas  
**Unidade:** 1.2  
**Pré-requisito:** 1.1 concluído (schemas em `@elos/shared`); 0.4 concluído (NestJS bootstrap, guards, CASL)  
**Commit convencional esperado:** `feat(api): add companies module with crud endpoints`

---

## Objetivo

Criar o módulo NestJS `CompaniesModule` com as rotas de criação, listagem,
consulta e atualização de empresas. Inclui dois ajustes cirúrgicos em arquivos
existentes: (1) o `AuthGuard` ganha detecção de SUPER_ADMIN em rotas sem
parâmetro `:cnpj`; (2) o `AbilityFactory` recebe as regras de permissão para
o subject `Company`. Ao final, `POST /v1/companies` e `GET /v1/companies/:cnpj`
respondem corretamente com as regras de acesso esperadas.

---

## Escopo

### In

- `apps/api/src/modules/companies/companies.module.ts`
- `apps/api/src/modules/companies/companies.controller.ts`
- `apps/api/src/modules/companies/companies.service.ts`
- `apps/api/src/modules/companies/companies.service.spec.ts`
- `apps/api/src/modules/companies/companies.controller.spec.ts`
- Modificação em `apps/api/src/common/guards/auth.guard.ts` — bloco SUPER_ADMIN sem `:cnpj`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Company`
- Modificação em `apps/api/src/app.module.ts` — importar `CompaniesModule`

### Out (não implementar nesta unidade)

- Endpoint de membros (→ 1.3)
- Endpoint `GET /v1/me/companies` (→ 1.3)
- UI de listagem ou formulário (→ 1.5)
- Upload de logo de empresa (→ Fase 6)

---

## Rotas

| Método | Caminho                   | Papel mínimo      | Descrição                         |
| ------ | ------------------------- | ----------------- | --------------------------------- |
| POST   | `/v1/companies`           | `SUPER_ADMIN`     | Cria nova empresa (tenant)        |
| GET    | `/v1/companies`           | `SUPER_ADMIN`     | Lista todas as empresas           |
| GET    | `/v1/companies/:cnpj`     | Qualquer membro   | Retorna dados da empresa          |
| PATCH  | `/v1/companies/:cnpj`     | `ADMIN_EMPRESA`   | Atualiza dados da empresa         |

> **Sem `DELETE`**: empresas não são excluídas na v1 — desativação futura via
> campo `isActive` (Fase 7 / Admin).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    companies/
      companies.module.ts             ← criar
      companies.controller.ts         ← criar
      companies.controller.spec.ts    ← criar
      companies.service.ts            ← criar
      companies.service.spec.ts       ← criar
  common/
    guards/
      auth.guard.ts                   ← modificar (SUPER_ADMIN sem :cnpj)
    ability/
      ability.factory.ts              ← modificar (regras Company)
  app.module.ts                       ← modificar (importar CompaniesModule)
```

---

## Implementação Detalhada

### 1. Modificar `auth.guard.ts` — SUPER_ADMIN sem `:cnpj`

O guard atual (0.4) enriquece `role` e `companyId` apenas quando o parâmetro
`:cnpj` está presente na rota. Para rotas de plataforma como `GET /v1/companies`
(sem `:cnpj`), o SUPER_ADMIN ficaria com `role = null`, impedindo que o CASL
reconheça sua permissão.

**Ajuste:** quando não há `:cnpj`, verificar se o usuário tem `SUPER_ADMIN` em
qualquer empresa e, se sim, definir `role = 'SUPER_ADMIN'` (com `companyId = null`).

```typescript
// apps/api/src/common/guards/auth.guard.ts
// — adicionar bloco "sem cnpj" após o bloco existente de resolução de empresa —

if (cnpj) {
  // bloco existente de 0.4: lookup por cnpj → membership
  // ...
} else {
  // Rotas de plataforma (sem contexto de empresa no URL)
  // Verificar se o usuário é SUPER_ADMIN em alguma empresa
  const superAdminMembership = await this.db
    .select({ role: companyMembers.role })
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.userId, session.user.id),
        eq(companyMembers.role, 'SUPER_ADMIN'),
      )
    )
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (superAdminMembership) {
    role = 'SUPER_ADMIN'
    // companyId permanece null — queries sem escopo de tenant
  }
  // Usuários não-SUPER_ADMIN em rotas sem :cnpj ficam com role=null e companyId=null
  // O CASL check no Service rejeitará com ForbiddenException
}

request['user'] = {
  ...session.user,
  role,
  companyId,
}
```

> **Invariante mantida:** o guard nunca concede acesso — apenas enriquece o
> objeto `user`. O CASL no Service é quem rejeita ou permite.

---

### 2. Modificar `ability.factory.ts` — regras para `Company`

Adicionar ao `AbilityFactory` as permissões por papel para o subject `'Company'`:

```typescript
// apps/api/src/common/ability/ability.factory.ts
// — dentro do switch(user.role) já existente —

case 'SUPER_ADMIN':
  can('manage', 'all')  // já existia — cobre Company também
  break

case 'ADMIN_EMPRESA':
  // Permissões já existentes para outros subjects...
  can('read',   'Company', { id: user.companyId })
  can('update', 'Company', { id: user.companyId })
  break

case 'COMPRADOR':
case 'ALMOXARIFE':
case 'ANALISTA_FINANCEIRO':
case 'TRANSPORTADOR':
  can('read', 'Company', { id: user.companyId })
  break
```

> CASL usa condições de objeto (segundo argumento de `can`) para escopar regras
> por `companyId`. Para SUPER_ADMIN, `can('manage', 'all')` já cobre tudo.

---

### 3. `companies.service.ts`

```typescript
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { companies } from '../../db/schema/companies'
import type { DrizzleDB } from '../../db/types'
import type { SessionUser } from '../../common/types/session-user'
import type {
  CreateCompanyDto,
  UpdateCompanyDto,
} from '@elos/shared'

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  // POST /v1/companies — SUPER_ADMIN
  async create(dto: CreateCompanyDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Company')) {
      throw new ForbiddenException('Apenas SUPER_ADMIN pode criar empresas.')
    }

    const existing = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.cnpj, dto.cnpj))
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (existing) {
      throw new ConflictException('Já existe uma empresa com este CNPJ.')
    }

    const [company] = await this.db
      .insert(companies)
      .values(dto)
      .returning()

    return company
  }

  // GET /v1/companies — SUPER_ADMIN
  async findAll(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Company')) {
      throw new ForbiddenException('Acesso restrito a SUPER_ADMIN.')
    }

    return this.db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt))
  }

  // GET /v1/companies/:cnpj
  async findByCnpj(cnpj: string, user: SessionUser) {
    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.cnpj, cnpj))
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (!company) throw new NotFoundException('Empresa não encontrada.')

    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', company)) {
      throw new ForbiddenException('Sem permissão para acessar esta empresa.')
    }

    return company
  }

  // PATCH /v1/companies/:cnpj
  async update(cnpj: string, dto: UpdateCompanyDto, user: SessionUser) {
    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.cnpj, cnpj))
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (!company) throw new NotFoundException('Empresa não encontrada.')

    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', company)) {
      throw new ForbiddenException('Sem permissão para atualizar esta empresa.')
    }

    const [updated] = await this.db
      .update(companies)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(companies.id, company.id))
      .returning()

    return updated
  }
}
```

> **Nota sobre `DrizzleDB`:** criar `apps/api/src/db/types.ts` com o tipo
> inferido da instância Drizzle se ainda não existir:
>
> ```typescript
> // apps/api/src/db/types.ts
> import { drizzle } from 'drizzle-orm/postgres-js'
> import * as schema from './schema'
>
> export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>
> ```

---

### 4. `companies.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { createCompanySchema, updateCompanySchema } from '@elos/shared'
import type { CreateCompanyDto, UpdateCompanyDto } from '@elos/shared'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { CompaniesService } from './companies.service'

@ApiTags('companies')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar empresa (SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Empresa criada.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado.' })
  create(
    @Body(new ZodValidationPipe(createCompanySchema)) body: CreateCompanyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.companiesService.create(body, user)
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as empresas (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de empresas.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  findAll(@CurrentUser() user: SessionUser) {
    return this.companiesService.findAll(user)
  }

  @Get(':cnpj')
  @ApiOperation({ summary: 'Buscar empresa por CNPJ' })
  @ApiResponse({ status: 200, description: 'Dados da empresa.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada.' })
  findOne(
    @Param('cnpj') cnpj: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.companiesService.findByCnpj(cnpj, user)
  }

  @Patch(':cnpj')
  @ApiOperation({ summary: 'Atualizar empresa (ADMIN_EMPRESA)' })
  @ApiResponse({ status: 200, description: 'Empresa atualizada.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada.' })
  update(
    @Param('cnpj') cnpj: string,
    @Body(new ZodValidationPipe(updateCompanySchema)) body: UpdateCompanyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.companiesService.update(cnpj, body, user)
  }
}
```

---

### 5. `companies.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { CompaniesController } from './companies.controller'
import { CompaniesService } from './companies.service'

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],  // exportar para uso em outros módulos (ex: AuthGuard)
})
export class CompaniesModule {}
```

---

### 6. Atualizar `app.module.ts`

```typescript
// Adicionar ao array imports do AppModule:
import { CompaniesModule } from './modules/companies/companies.module'

// ...
imports: [
  // existentes...
  CompaniesModule,
],
```

---

### 7. `companies.service.spec.ts`

```typescript
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { CompaniesService } from './companies.service'
import type { SessionUser } from '../../common/types/session-user'

const mockCompany = {
  id: 'uuid-company-1',
  name: 'Empresa Teste',
  tradeName: null,
  cnpj: '12345678000195',
  email: null,
  phone: null,
  street: null,
  number: null,
  complement: null,
  city: null,
  state: null,
  zipCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const superAdminUser: SessionUser = {
  id: 'user-1',
  email: 'admin@elos.com',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  companyId: null,
}

const adminUser: SessionUser = {
  id: 'user-2',
  email: 'admin@empresa.com',
  name: 'Admin Empresa',
  role: 'ADMIN_EMPRESA',
  companyId: 'uuid-company-1',
}

const compradorUser: SessionUser = {
  id: 'user-3',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'uuid-company-1',
}

describe('CompaniesService', () => {
  let service: CompaniesService
  let mockDb: Record<string, ReturnType<typeof vi.fn>>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    mockDb = {
      select:    vi.fn().mockReturnThis(),
      from:      vi.fn().mockReturnThis(),
      where:     vi.fn().mockReturnThis(),
      limit:     vi.fn().mockReturnThis(),
      orderBy:   vi.fn().mockReturnThis(),
      insert:    vi.fn().mockReturnThis(),
      values:    vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockCompany]),
      update:    vi.fn().mockReturnThis(),
      set:       vi.fn().mockReturnThis(),
      then:      vi.fn(),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(CompaniesService)
  })

  describe('create', () => {
    it('cria empresa quando usuário é SUPER_ADMIN', async () => {
      // Simula: nenhuma empresa com CNPJ existente
      mockDb['then'] = vi.fn().mockResolvedValue(null)
      mockDb['returning'] = vi.fn().mockResolvedValue([mockCompany])

      const dto = { name: 'Empresa Teste', cnpj: '12345678000195' }
      const result = await service.create(dto, superAdminUser)

      expect(result).toEqual(mockCompany)
    })

    it('lança ForbiddenException quando não é SUPER_ADMIN', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)  // bloqueia

      await expect(
        service.create({ name: 'Empresa', cnpj: '12345678000195' }, adminUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ConflictException quando CNPJ já existe', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(false)
      // Simula: empresa já existe
      mockDb['then'] = vi.fn().mockResolvedValue(mockCompany)

      await expect(
        service.create({ name: 'Empresa', cnpj: '12345678000195' }, superAdminUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findAll', () => {
    it('retorna lista de empresas para SUPER_ADMIN', async () => {
      mockDb['orderBy'] = vi.fn().mockResolvedValue([mockCompany])

      const result = await service.findAll(superAdminUser)
      expect(result).toHaveLength(1)
    })

    it('lança ForbiddenException para não-SUPER_ADMIN', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)

      await expect(service.findAll(adminUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findByCnpj', () => {
    it('retorna empresa para membro da empresa', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(mockCompany)

      const result = await service.findByCnpj('12345678000195', adminUser)
      expect(result).toEqual(mockCompany)
    })

    it('lança NotFoundException quando empresa não existe', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(null)

      await expect(
        service.findByCnpj('00000000000000', adminUser),
      ).rejects.toThrow(NotFoundException)
    })

    it('lança ForbiddenException quando usuário não tem acesso', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(mockCompany)
      mockAbility.cannot = vi.fn().mockReturnValue(true)

      await expect(
        service.findByCnpj('12345678000195', compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    it('atualiza empresa quando usuário é ADMIN_EMPRESA', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(mockCompany)
      mockDb['returning'] = vi.fn().mockResolvedValue([{ ...mockCompany, name: 'Novo Nome' }])

      const result = await service.update('12345678000195', { name: 'Novo Nome' }, adminUser)
      expect(result.name).toBe('Novo Nome')
    })

    it('lança ForbiddenException para COMPRADOR', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(mockCompany)
      mockAbility.cannot = vi.fn().mockReturnValue(true)

      await expect(
        service.update('12345678000195', { name: 'X' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
```

---

### 8. `companies.controller.spec.ts`

```typescript
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompaniesController } from './companies.controller'
import { CompaniesService } from './companies.service'
import type { SessionUser } from '../../common/types/session-user'

const mockCompany = { id: 'uuid-1', name: 'Empresa', cnpj: '12345678000195' }
const superAdmin: SessionUser = { id: 'u1', email: 'a@b.com', name: 'A', role: 'SUPER_ADMIN', companyId: null }

describe('CompaniesController', () => {
  let controller: CompaniesController
  let service: { create: ReturnType<typeof vi.fn>; findAll: ReturnType<typeof vi.fn>; findByCnpj: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      create:     vi.fn().mockResolvedValue(mockCompany),
      findAll:    vi.fn().mockResolvedValue([mockCompany]),
      findByCnpj: vi.fn().mockResolvedValue(mockCompany),
      update:     vi.fn().mockResolvedValue(mockCompany),
    }

    const module = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: service }],
    }).compile()

    controller = module.get(CompaniesController)
  })

  it('create → delega ao service', async () => {
    const result = await controller.create({ name: 'Empresa', cnpj: '12345678000195' }, superAdmin)
    expect(service.create).toHaveBeenCalledWith({ name: 'Empresa', cnpj: '12345678000195' }, superAdmin)
    expect(result).toEqual(mockCompany)
  })

  it('findAll → delega ao service', async () => {
    const result = await controller.findAll(superAdmin)
    expect(result).toHaveLength(1)
  })

  it('findOne → delega ao service com cnpj', async () => {
    await controller.findOne('12345678000195', superAdmin)
    expect(service.findByCnpj).toHaveBeenCalledWith('12345678000195', superAdmin)
  })

  it('update → delega ao service', async () => {
    await controller.update('12345678000195', { name: 'X' }, superAdmin)
    expect(service.update).toHaveBeenCalledWith('12345678000195', { name: 'X' }, superAdmin)
  })
})
```

---

## Verificação

- [ ] `pnpm vitest run --filter api` — todos os testes passando (incluindo novos)
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] Checklist de segurança:
  - [ ] `POST /v1/companies` retorna 403 para usuário não-SUPER_ADMIN
  - [ ] `GET /v1/companies` retorna 403 para não-SUPER_ADMIN
  - [ ] `GET /v1/companies/:cnpj` retorna 403 para usuário de outra empresa
  - [ ] `PATCH /v1/companies/:cnpj` retorna 403 para COMPRADOR
  - [ ] Nenhuma query sem filtro de tenant (SUPER_ADMIN é exceção intencional em `findAll`)
- [ ] `GET /reference` (Scalar) exibe as rotas novas com o grupo `companies`
