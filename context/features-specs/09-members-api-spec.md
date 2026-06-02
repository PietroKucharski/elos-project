# Feature Spec — 1.3 Members Module (API)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 1 — Auth e Empresas  
**Unidade:** 1.3  
**Pré-requisito:** 1.2 concluído (CompaniesModule); 1.1 concluído (schemas `InviteMemberDto`, `MemberResponse`, `MyCompany`)  
**Commit convencional esperado:** `feat(api): add members module with invite and management endpoints`

---

## Objetivo

Criar o módulo NestJS `MembersModule` com as rotas de gestão de membros de uma
empresa: listagem, convite, atualização de papel e remoção. Adicionar também o
endpoint `GET /v1/me/companies` — necessário para o company switcher do frontend.
O fluxo de "convite" na v1 é simplificado: se o e-mail já pertence a um usuário,
cria apenas o vínculo; caso contrário, cria o usuário com senha temporária gerada
automaticamente (o usuário redefine pelo fluxo "esqueci a senha" quando disponível).

---

## Escopo

### In

- `apps/api/src/modules/members/members.module.ts`
- `apps/api/src/modules/members/members.controller.ts`
- `apps/api/src/modules/members/members.service.ts`
- `apps/api/src/modules/members/members.service.spec.ts`
- `apps/api/src/modules/members/members.controller.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `CompanyMember`
- Modificação em `apps/api/src/app.module.ts` — importar `MembersModule`

### Out (não implementar nesta unidade)

- Envio real de e-mail de boas-vindas com link de ativação (requer serviço de e-mail — Fase futura)
- UI de membros (→ 1.5)
- Auto-inscrição de usuário em empresa (fora do escopo v1)

---

## Rotas

| Método | Caminho                                         | Papel mínimo    | Descrição                                         |
| ------ | ----------------------------------------------- | --------------- | ------------------------------------------------- |
| GET    | `/v1/companies/:cnpj/members`                   | `ADMIN_EMPRESA` | Lista membros da empresa                          |
| POST   | `/v1/companies/:cnpj/members`                   | `ADMIN_EMPRESA` | Convida novo membro (cria usuário se não existe)  |
| PATCH  | `/v1/companies/:cnpj/members/:userId`           | `ADMIN_EMPRESA` | Atualiza papel do membro                          |
| DELETE | `/v1/companies/:cnpj/members/:userId`           | `ADMIN_EMPRESA` | Remove membro da empresa                          |
| GET    | `/v1/me/companies`                              | Autenticado     | Lista empresas do usuário logado (para switcher)  |

> **Restrições de segurança:**  
> - Um `ADMIN_EMPRESA` não pode promover outro usuário para `SUPER_ADMIN`  
>   (os schemas de 1.1 já excluem `SUPER_ADMIN` de `assignableRoles`)  
> - Um membro não pode remover a si mesmo  
> - Não é possível remover o último `ADMIN_EMPRESA` de uma empresa

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    members/
      members.module.ts             ← criar
      members.controller.ts         ← criar
      members.controller.spec.ts    ← criar
      members.service.ts            ← criar
      members.service.spec.ts       ← criar
  common/
    ability/
      ability.factory.ts            ← modificar (regras CompanyMember)
  app.module.ts                     ← modificar (importar MembersModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras para `CompanyMember`

```typescript
// — dentro do switch(user.role) —

case 'ADMIN_EMPRESA':
  // já existem: Company read/update
  can('read',   'CompanyMember', { companyId: user.companyId })
  can('create', 'CompanyMember', { companyId: user.companyId })
  can('update', 'CompanyMember', { companyId: user.companyId })
  can('delete', 'CompanyMember', { companyId: user.companyId })
  break

case 'COMPRADOR':
case 'ALMOXARIFE':
case 'ANALISTA_FINANCEIRO':
case 'TRANSPORTADOR':
  // Podem ver a lista de membros (útil para atribuição de tarefas futuras)
  can('read', 'CompanyMember', { companyId: user.companyId })
  break
```

---

### 2. `members.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, count } from 'drizzle-orm'
import { auth } from '../auth/better-auth'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { companies, companyMembers } from '../../db/schema/companies'
import { users } from '../../db/schema/auth'
import type { DrizzleDB } from '../../db/types'
import type { SessionUser } from '../../common/types/session-user'
import type { InviteMemberDto, UpdateMemberRoleDto } from '@elos/shared'

@Injectable()
export class MembersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  // GET /v1/companies/:cnpj/members
  async findAll(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para listar membros.')
    }

    return this.db
      .select({
        id:        companyMembers.id,
        companyId: companyMembers.companyId,
        userId:    companyMembers.userId,
        role:      companyMembers.role,
        createdAt: companyMembers.createdAt,
        user: {
          id:    users.id,
          name:  users.name,
          email: users.email,
        },
      })
      .from(companyMembers)
      .innerJoin(users, eq(users.id, companyMembers.userId))
      .where(eq(companyMembers.companyId, user.companyId!))
      .orderBy(companyMembers.createdAt)
  }

  // POST /v1/companies/:cnpj/members
  async invite(dto: InviteMemberDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para convidar membros.')
    }

    // Verificar se usuário já existe pelo e-mail
    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1)
      .then(rows => rows[0] ?? null)

    let targetUserId: string

    if (existingUser) {
      // Verificar se já é membro desta empresa
      const existingMembership = await this.db
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, existingUser.id),
            eq(companyMembers.companyId, user.companyId!),
          )
        )
        .limit(1)
        .then(rows => rows[0] ?? null)

      if (existingMembership) {
        throw new ConflictException('Este usuário já é membro desta empresa.')
      }

      targetUserId = existingUser.id
    } else {
      // Criar usuário com senha temporária
      // O usuário deverá redefinir a senha (fluxo "esqueci a senha")
      const tempPassword = generateTempPassword()

      const newUser = await auth.api.signUpEmail({
        body: {
          email:    dto.email,
          name:     dto.name,
          password: tempPassword,
        },
      })

      if (!newUser?.user?.id) {
        throw new BadRequestException('Não foi possível criar o usuário.')
      }

      targetUserId = newUser.user.id
    }

    // Criar vínculo de membro
    const [member] = await this.db
      .insert(companyMembers)
      .values({
        companyId: user.companyId!,
        userId:    targetUserId,
        role:      dto.role,
      })
      .returning()

    // Buscar dados completos para retorno
    const [result] = await this.db
      .select({
        id:        companyMembers.id,
        companyId: companyMembers.companyId,
        userId:    companyMembers.userId,
        role:      companyMembers.role,
        createdAt: companyMembers.createdAt,
        user: {
          id:    users.id,
          name:  users.name,
          email: users.email,
        },
      })
      .from(companyMembers)
      .innerJoin(users, eq(users.id, companyMembers.userId))
      .where(eq(companyMembers.id, member.id))

    return result
  }

  // PATCH /v1/companies/:cnpj/members/:userId
  async updateRole(targetUserId: string, dto: UpdateMemberRoleDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para alterar papel de membro.')
    }

    // Um ADMIN_EMPRESA não pode alterar seu próprio papel
    if (targetUserId === user.id) {
      throw new BadRequestException('Não é possível alterar o próprio papel.')
    }

    const membership = await this.db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, targetUserId),
          eq(companyMembers.companyId, user.companyId!),
        )
      )
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (!membership) throw new NotFoundException('Membro não encontrado.')

    const [updated] = await this.db
      .update(companyMembers)
      .set({ role: dto.role, updatedAt: new Date() })
      .where(eq(companyMembers.id, membership.id))
      .returning()

    return updated
  }

  // DELETE /v1/companies/:cnpj/members/:userId
  async remove(targetUserId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('delete', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para remover membro.')
    }

    // Não pode remover a si mesmo
    if (targetUserId === user.id) {
      throw new BadRequestException('Não é possível remover a si mesmo.')
    }

    const membership = await this.db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, targetUserId),
          eq(companyMembers.companyId, user.companyId!),
        )
      )
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (!membership) throw new NotFoundException('Membro não encontrado.')

    // Garantir que não é o último ADMIN_EMPRESA
    if (membership.role === 'ADMIN_EMPRESA') {
      const adminCount = await this.db
        .select({ count: count() })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.companyId, user.companyId!),
            eq(companyMembers.role, 'ADMIN_EMPRESA'),
          )
        )
        .then(rows => rows[0]?.count ?? 0)

      if (Number(adminCount) <= 1) {
        throw new BadRequestException(
          'Não é possível remover o único ADMIN_EMPRESA da empresa.',
        )
      }
    }

    await this.db
      .delete(companyMembers)
      .where(eq(companyMembers.id, membership.id))

    return { success: true }
  }

  // GET /v1/me/companies — empresas do usuário logado (para company switcher)
  async getMyCompanies(user: SessionUser) {
    return this.db
      .select({
        companyId:   companyMembers.companyId,
        companyName: companies.name,
        cnpj:        companies.cnpj,
        role:        companyMembers.role,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, user.id))
      .orderBy(companies.name)
  }
}

// Gera senha temporária de 12 caracteres
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}
```

---

### 3. `members.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { inviteMemberSchema, updateMemberRoleSchema } from '@elos/shared'
import type { InviteMemberDto, UpdateMemberRoleDto } from '@elos/shared'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { MembersService } from './members.service'

@ApiTags('members')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // Rota de plataforma — sem cnpj no path; guard resolve userId
  @Get('me/companies')
  @ApiOperation({ summary: 'Listar empresas do usuário logado (para company switcher)' })
  @ApiResponse({ status: 200, description: 'Lista de empresas do usuário.' })
  getMyCompanies(@CurrentUser() user: SessionUser) {
    return this.membersService.getMyCompanies(user)
  }

  @Get('companies/:cnpj/members')
  @ApiOperation({ summary: 'Listar membros da empresa' })
  @ApiResponse({ status: 200, description: 'Lista de membros.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  findAll(@CurrentUser() user: SessionUser) {
    return this.membersService.findAll(user)
  }

  @Post('companies/:cnpj/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convidar novo membro' })
  @ApiResponse({ status: 201, description: 'Membro convidado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 409, description: 'Usuário já é membro.' })
  invite(
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.membersService.invite(body, user)
  }

  @Patch('companies/:cnpj/members/:userId')
  @ApiOperation({ summary: 'Atualizar papel do membro' })
  @ApiResponse({ status: 200, description: 'Papel atualizado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou auto-alteração.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado.' })
  updateRole(
    @Param('userId') targetUserId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: UpdateMemberRoleDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.membersService.updateRole(targetUserId, body, user)
  }

  @Delete('companies/:cnpj/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro da empresa' })
  @ApiResponse({ status: 204, description: 'Membro removido.' })
  @ApiResponse({ status: 400, description: 'Último ADMIN ou auto-remoção.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado.' })
  remove(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.membersService.remove(targetUserId, user)
  }
}
```

---

### 4. `members.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { MembersController } from './members.controller'
import { MembersService } from './members.service'

@Module({
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
```

---

### 5. Atualizar `app.module.ts`

```typescript
import { MembersModule } from './modules/members/members.module'

// Adicionar ao array imports:
MembersModule,
```

---

### 6. `members.service.spec.ts`

Testar os casos críticos: invite cria usuário quando não existe; invite detecta
membro duplicado; updateRole bloqueia auto-alteração; remove bloqueia último ADMIN.

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { MembersService } from './members.service'
import type { SessionUser } from '../../common/types/session-user'

const adminUser: SessionUser = {
  id: 'user-admin',
  email: 'admin@empresa.com',
  name: 'Admin',
  role: 'ADMIN_EMPRESA',
  companyId: 'company-1',
}

const mockMember = {
  id: 'member-1',
  companyId: 'company-1',
  userId: 'user-2',
  role: 'COMPRADOR',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('MembersService', () => {
  let service: MembersService
  let mockDb: Record<string, ReturnType<typeof vi.fn>>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    mockDb = {
      select:    vi.fn().mockReturnThis(),
      from:      vi.fn().mockReturnThis(),
      where:     vi.fn().mockReturnThis(),
      limit:     vi.fn().mockReturnThis(),
      orderBy:   vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert:    vi.fn().mockReturnThis(),
      values:    vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockMember]),
      update:    vi.fn().mockReturnThis(),
      set:       vi.fn().mockReturnThis(),
      delete:    vi.fn().mockReturnThis(),
      then:      vi.fn(),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(MembersService)
  })

  describe('findAll', () => {
    it('retorna lista de membros para ADMIN_EMPRESA', async () => {
      mockDb['orderBy'] = vi.fn().mockResolvedValue([])
      const result = await service.findAll(adminUser)
      expect(Array.isArray(result)).toBe(true)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.findAll(adminUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('invite', () => {
    it('lança ConflictException quando membro já existe', async () => {
      // Simula: usuário existe E já é membro
      mockDb['then'] = vi.fn()
        .mockResolvedValueOnce({ id: 'user-2' })    // usuário encontrado
        .mockResolvedValueOnce({ id: 'member-1' })   // membership encontrada

      await expect(
        service.invite({ email: 'x@x.com', name: 'X', role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(ConflictException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.invite({ email: 'x@x.com', name: 'X', role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('updateRole', () => {
    it('lança BadRequestException ao tentar alterar o próprio papel', async () => {
      await expect(
        service.updateRole(adminUser.id, { role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança NotFoundException quando membro não existe', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(null)
      await expect(
        service.updateRole('outro-user', { role: 'COMPRADOR' }, adminUser),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('lança BadRequestException ao tentar remover a si mesmo', async () => {
      await expect(service.remove(adminUser.id, adminUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança BadRequestException ao remover último ADMIN_EMPRESA', async () => {
      const adminMember = { ...mockMember, role: 'ADMIN_EMPRESA', userId: 'outro-admin' }
      mockDb['then'] = vi.fn()
        .mockResolvedValueOnce(adminMember)   // membership encontrada
        .mockResolvedValueOnce([{ count: '1' }]) // apenas 1 admin

      await expect(service.remove('outro-admin', adminUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança NotFoundException quando membro não existe', async () => {
      mockDb['then'] = vi.fn().mockResolvedValue(null)
      await expect(service.remove('user-inexistente', adminUser)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
```

---

## Verificação

- [ ] `pnpm vitest run --filter api` — todos os testes passando
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] Checklist de segurança:
  - [ ] `POST /v1/companies/:cnpj/members` retorna 403 para COMPRADOR
  - [ ] `DELETE /v1/companies/:cnpj/members/:userId` retorna 400 ao tentar auto-remoção
  - [ ] Remoção do último ADMIN_EMPRESA retorna 400
  - [ ] `inviteMemberSchema` bloqueia role `SUPER_ADMIN` (herdado de 1.1)
  - [ ] `GET /v1/me/companies` funciona sem `:cnpj` no path (role pode ser null para usuários sem empresa)
- [ ] `GET /reference` exibe o grupo `members` com todas as rotas
