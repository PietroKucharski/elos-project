# Feature Spec — 2.2 Suppliers API (NestJS)

**Fase:** 2 — Fornecedores e Produtos  
**Unidade:** 2.2  
**Pré-requisito:** 2.1 concluído (schemas `CreateSupplierDto`, `SupplierResponse`, etc.)  
**Commit convencional esperado:** `feat(api): add suppliers module with crud, approval and sub-resources`

---

## Objetivo

Criar o módulo NestJS `SuppliersModule` com rotas completas de gestão de
fornecedores: CRUD básico, aprovação/rejeição de status, e sub-recursos de
contatos e contas bancárias. O endereço é gerenciado via upsert na mesma
transação do supplier. Audit log em todas as mutações.

---

## Escopo

### In

- `apps/api/src/modules/suppliers/suppliers.module.ts`
- `apps/api/src/modules/suppliers/suppliers.controller.ts`
- `apps/api/src/modules/suppliers/suppliers.controller.spec.ts`
- `apps/api/src/modules/suppliers/suppliers.service.ts`
- `apps/api/src/modules/suppliers/suppliers.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Supplier`
- Modificação em `apps/api/src/app.module.ts` — importar `SuppliersModule`

### Out (não implementar nesta unidade)

- Envio de e-mail de notificação para o fornecedor quando aprovado/rejeitado
- Upload de documentos do fornecedor (Supabase Storage — Fase futura)
- UI de fornecedores (→ 2.4)
- Vinculação produto↔fornecedor (→ 2.3)

---

## Rotas

| Método | Caminho                                                        | Papel mínimo    | Descrição                              |
| ------ | -------------------------------------------------------------- | --------------- | -------------------------------------- |
| GET    | `/v1/companies/:cnpj/suppliers`                                | Autenticado     | Lista fornecedores (filtros opcionais) |
| POST   | `/v1/companies/:cnpj/suppliers`                                | `COMPRADOR`     | Cria fornecedor                        |
| GET    | `/v1/companies/:cnpj/suppliers/:id`                            | Autenticado     | Detalhe do fornecedor com endereço     |
| PATCH  | `/v1/companies/:cnpj/suppliers/:id`                            | `COMPRADOR`     | Atualiza dados do fornecedor           |
| POST   | `/v1/companies/:cnpj/suppliers/:id/approve`                    | `COMPRADOR`     | Aprova fornecedor (PENDING → APPROVED) |
| POST   | `/v1/companies/:cnpj/suppliers/:id/reject`                     | `COMPRADOR`     | Rejeita fornecedor (PENDING → REJECTED)|
| GET    | `/v1/companies/:cnpj/suppliers/:id/contacts`                   | Autenticado     | Lista contatos do fornecedor           |
| POST   | `/v1/companies/:cnpj/suppliers/:id/contacts`                   | `COMPRADOR`     | Adiciona contato                       |
| PATCH  | `/v1/companies/:cnpj/suppliers/:id/contacts/:contactId`        | `COMPRADOR`     | Atualiza contato                       |
| DELETE | `/v1/companies/:cnpj/suppliers/:id/contacts/:contactId`        | `COMPRADOR`     | Remove contato                         |
| GET    | `/v1/companies/:cnpj/suppliers/:id/bank-accounts`              | Autenticado     | Lista contas bancárias                 |
| POST   | `/v1/companies/:cnpj/suppliers/:id/bank-accounts`              | `COMPRADOR`     | Adiciona conta bancária                |
| PATCH  | `/v1/companies/:cnpj/suppliers/:id/bank-accounts/:accountId`   | `COMPRADOR`     | Atualiza conta bancária                |
| DELETE | `/v1/companies/:cnpj/suppliers/:id/bank-accounts/:accountId`   | `COMPRADOR`     | Remove conta bancária                  |

> **Query params em GET /suppliers:** `status` (PENDING|APPROVED|REJECTED),
> `search` (substring do nome — usa `ilike`), `page` e `limit` (paginação simples,
> default limit=20, max=100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    suppliers/
      suppliers.module.ts          ← criar
      suppliers.controller.ts      ← criar
      suppliers.controller.spec.ts ← criar
      suppliers.service.ts         ← criar
      suppliers.service.spec.ts    ← criar
  common/
    ability/
      ability.factory.ts           ← modificar (regras Supplier)
  app.module.ts                    ← modificar (importar SuppliersModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `Supplier`

```typescript
// — dentro do switch(user.role) —

case 'SUPER_ADMIN':
  // já existente: can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // já existentes: Company + CompanyMember
  can('create', 'Supplier', { companyId: companyId })
  can('read',   'Supplier', { companyId: companyId })
  can('update', 'Supplier', { companyId: companyId })
  can('delete', 'Supplier', { companyId: companyId })
  // approve e reject tratados como ação 'update' no CASL
  break

case 'COMPRADOR':
  can('create', 'Supplier', { companyId: companyId })
  can('read',   'Supplier', { companyId: companyId })
  can('update', 'Supplier', { companyId: companyId })
  break

case 'ALMOXARIFE':
case 'ANALISTA_FINANCEIRO':
case 'TRANSPORTADOR':
  can('read', 'Supplier', { companyId: companyId })
  break
```

> **Nota:** approve e reject verificam `ability.cannot('update', 'Supplier')`.
> COMPRADOR e ADMIN_EMPRESA podem ambos aprovar/rejeitar. SUPER_ADMIN herda via
> `manage all`. Não existe ação CASL separada para approve/reject — a verificação
> de status (apenas PENDING pode ser aprovado/rejeitado) é regra de negócio no
> Service, não de permissão.

Adicionar `'Supplier'` (string) e `Supplier & ForcedSubject<'Supplier'>` ao union
`Subjects` em `ability.factory.ts`, seguindo o mesmo padrão de `Company` (1.2).

---

### 2. `suppliers.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import {
  suppliers,
  supplierContacts,
  supplierBankAccounts,
  supplierAddresses,
} from '../../db/schema/suppliers'
import { auditLogs } from '../../db/schema/audit-logs'
import type {
  CreateSupplierDto,
  UpdateSupplierDto,
  ApproveSupplierDto,
  RejectSupplierDto,
  CreateSupplierContactDto,
  UpdateSupplierContactDto,
  CreateSupplierBankAccountDto,
  UpdateSupplierBankAccountDto,
} from '@elos/shared'

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para listar fornecedores.')
    }

    const limit = Math.min(query.limit ?? 20, 100)
    const offset = ((query.page ?? 1) - 1) * limit

    const conditions = [eq(suppliers.companyId, user.companyId!)]

    if (query.status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const
      if (!validStatuses.includes(query.status as never)) {
        throw new BadRequestException('Status inválido.')
      }
      conditions.push(eq(suppliers.status, query.status as 'PENDING' | 'APPROVED' | 'REJECTED'))
    }

    if (query.search) {
      conditions.push(ilike(suppliers.name, `%${query.search}%`))
    }

    const rows = await this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(desc(suppliers.createdAt))
      .limit(limit)
      .offset(offset)

    return rows
  }

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para visualizar fornecedor.')
    }

    const [row] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!row) throw new NotFoundException('Fornecedor não encontrado.')

    // Buscar endereço junto
    const [address] = await this.db
      .select()
      .from(supplierAddresses)
      .where(eq(supplierAddresses.supplierId, id))
      .limit(1)

    return { ...row, address: address ?? null }
  }

  async create(dto: CreateSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para criar fornecedor.')
    }

    // Verificar duplicidade de CNPJ/CPF dentro do tenant
    if (dto.cnpj) {
      const existing = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, user.companyId!), eq(suppliers.cnpj, dto.cnpj)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (existing) throw new ConflictException('Já existe um fornecedor com este CNPJ.')
    }

    if (dto.cpf) {
      const existing = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, user.companyId!), eq(suppliers.cpf, dto.cpf)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (existing) throw new ConflictException('Já existe um fornecedor com este CPF.')
    }

    const { address, ...supplierData } = dto

    const result = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(suppliers)
        .values({ ...supplierData, companyId: user.companyId! })
        .returning()

      if (!created) throw new BadRequestException('Falha ao criar fornecedor.')

      // Upsert de endereço (se fornecido)
      let addressRow = null
      if (address) {
        const [addr] = await tx
          .insert(supplierAddresses)
          .values({ ...address, supplierId: created.id })
          .returning()
        addressRow = addr ?? null
      }

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: created.id,
        action: 'CREATE',
        before: null,
        after: created,
        userId: user.id,
        companyId: user.companyId,
      })

      return { ...created, address: addressRow }
    })

    return result
  }

  async update(id: string, dto: UpdateSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Fornecedor não encontrado.')

    if (ability.cannot('update', subject('Supplier', existing))) {
      throw new ForbiddenException('Sem permissão para atualizar fornecedor.')
    }

    // Verificar duplicidade de CNPJ/CPF (excluindo o próprio registro)
    if (dto.cnpj && dto.cnpj !== existing.cnpj) {
      const dup = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.companyId, user.companyId!), eq(suppliers.cnpj, dto.cnpj)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (dup) throw new ConflictException('Já existe um fornecedor com este CNPJ.')
    }

    const { address, ...supplierData } = dto

    const result = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(suppliers)
        .set({ ...supplierData, updatedAt: new Date() })
        .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Fornecedor não encontrado.')

      let addressRow = null
      if (address) {
        // Upsert: tenta atualizar, senão insere
        const [existingAddr] = await tx
          .select({ id: supplierAddresses.id })
          .from(supplierAddresses)
          .where(eq(supplierAddresses.supplierId, id))
          .limit(1)

        if (existingAddr) {
          const [addr] = await tx
            .update(supplierAddresses)
            .set({ ...address, updatedAt: new Date() })
            .where(eq(supplierAddresses.id, existingAddr.id))
            .returning()
          addressRow = addr ?? null
        } else {
          const [addr] = await tx
            .insert(supplierAddresses)
            .values({ ...address, supplierId: id })
            .returning()
          addressRow = addr ?? null
        }
      }

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: id,
        action: 'UPDATE',
        before: existing,
        after: updated,
        userId: user.id,
        companyId: user.companyId,
      })

      return { ...updated, address: addressRow }
    })

    return result
  }

  async approve(id: string, dto: ApproveSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Fornecedor não encontrado.')

    if (ability.cannot('update', subject('Supplier', existing))) {
      throw new ForbiddenException('Sem permissão para aprovar fornecedor.')
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas fornecedores com status PENDING podem ser aprovados. Status atual: ${existing.status}.`,
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(suppliers)
        .set({
          status: 'APPROVED',
          rating: dto.rating != null ? String(dto.rating) : existing.rating,
          notes: dto.notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: id,
        action: 'APPROVE',
        before: { status: existing.status },
        after: { status: 'APPROVED', rating: dto.rating },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Fornecedor não encontrado.')
    return updated
  }

  async reject(id: string, dto: RejectSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Fornecedor não encontrado.')

    if (ability.cannot('update', subject('Supplier', existing))) {
      throw new ForbiddenException('Sem permissão para rejeitar fornecedor.')
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas fornecedores com status PENDING podem ser rejeitados. Status atual: ${existing.status}.`,
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(suppliers)
        .set({ status: 'REJECTED', notes: dto.notes, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: id,
        action: 'REJECT',
        before: { status: existing.status },
        after: { status: 'REJECTED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Fornecedor não encontrado.')
    return updated
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────

  private async assertSupplierBelongsToCompany(supplierId: string, companyId: string) {
    const [row] = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.companyId, companyId)))
      .limit(1)

    if (!row) throw new NotFoundException('Fornecedor não encontrado.')
  }

  async findContacts(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    return this.db
      .select()
      .from(supplierContacts)
      .where(eq(supplierContacts.supplierId, supplierId))
      .orderBy(supplierContacts.createdAt)
  }

  async addContact(supplierId: string, dto: CreateSupplierContactDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para adicionar contato.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    // isMain como string 'Y'/'N' para o banco
    const [contact] = await this.db
      .insert(supplierContacts)
      .values({
        supplierId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        isMain: dto.isMain ? 'Y' : 'N',
      })
      .returning()

    if (!contact) throw new BadRequestException('Falha ao criar contato.')
    return { ...contact, isMain: contact.isMain === 'Y' }
  }

  async updateContact(
    supplierId: string,
    contactId: string,
    dto: UpdateSupplierContactDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para atualizar contato.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.name !== undefined)   updateData['name'] = dto.name
    if (dto.email !== undefined)  updateData['email'] = dto.email
    if (dto.phone !== undefined)  updateData['phone'] = dto.phone
    if (dto.role !== undefined)   updateData['role'] = dto.role
    if (dto.isMain !== undefined) updateData['isMain'] = dto.isMain ? 'Y' : 'N'

    const [updated] = await this.db
      .update(supplierContacts)
      .set(updateData)
      .where(
        and(
          eq(supplierContacts.id, contactId),
          eq(supplierContacts.supplierId, supplierId),
        ),
      )
      .returning()

    if (!updated) throw new NotFoundException('Contato não encontrado.')
    return { ...updated, isMain: updated.isMain === 'Y' }
  }

  async removeContact(supplierId: string, contactId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para remover contato.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    await this.db
      .delete(supplierContacts)
      .where(
        and(
          eq(supplierContacts.id, contactId),
          eq(supplierContacts.supplierId, supplierId),
        ),
      )

    return { success: true }
  }

  // ─── Bank Accounts ─────────────────────────────────────────────────────────

  async findBankAccounts(supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Supplier')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    return this.db
      .select()
      .from(supplierBankAccounts)
      .where(eq(supplierBankAccounts.supplierId, supplierId))
      .orderBy(supplierBankAccounts.createdAt)
  }

  async addBankAccount(
    supplierId: string,
    dto: CreateSupplierBankAccountDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para adicionar conta bancária.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const [account] = await this.db
      .insert(supplierBankAccounts)
      .values({
        supplierId,
        bank: dto.bank,
        agency: dto.agency,
        account: dto.account,
        accountType: dto.accountType,
        pixKey: dto.pixKey,
        isPrimary: dto.isPrimary ? 'Y' : 'N',
      })
      .returning()

    if (!account) throw new BadRequestException('Falha ao criar conta bancária.')
    return { ...account, isPrimary: account.isPrimary === 'Y' }
  }

  async updateBankAccount(
    supplierId: string,
    accountId: string,
    dto: UpdateSupplierBankAccountDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para atualizar conta bancária.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.bank !== undefined)        updateData['bank'] = dto.bank
    if (dto.agency !== undefined)      updateData['agency'] = dto.agency
    if (dto.account !== undefined)     updateData['account'] = dto.account
    if (dto.accountType !== undefined) updateData['accountType'] = dto.accountType
    if (dto.pixKey !== undefined)      updateData['pixKey'] = dto.pixKey
    if (dto.isPrimary !== undefined)   updateData['isPrimary'] = dto.isPrimary ? 'Y' : 'N'

    const [updated] = await this.db
      .update(supplierBankAccounts)
      .set(updateData)
      .where(
        and(
          eq(supplierBankAccounts.id, accountId),
          eq(supplierBankAccounts.supplierId, supplierId),
        ),
      )
      .returning()

    if (!updated) throw new NotFoundException('Conta bancária não encontrada.')
    return { ...updated, isPrimary: updated.isPrimary === 'Y' }
  }

  async removeBankAccount(supplierId: string, accountId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para remover conta bancária.')
    }

    await this.assertSupplierBelongsToCompany(supplierId, user.companyId!)

    await this.db
      .delete(supplierBankAccounts)
      .where(
        and(
          eq(supplierBankAccounts.id, accountId),
          eq(supplierBankAccounts.supplierId, supplierId),
        ),
      )

    return { success: true }
  }
}
```

---

### 3. `suppliers.controller.ts`

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
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  approveSupplierSchema,
  createSupplierBankAccountSchema,
  createSupplierContactSchema,
  createSupplierSchema,
  rejectSupplierSchema,
  updateSupplierBankAccountSchema,
  updateSupplierContactSchema,
  updateSupplierSchema,
} from '@elos/shared'
import type {
  ApproveSupplierDto,
  CreateSupplierBankAccountDto,
  CreateSupplierContactDto,
  CreateSupplierDto,
  RejectSupplierDto,
  UpdateSupplierBankAccountDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
} from '@elos/shared'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { SuppliersService } from './suppliers.service'

@ApiTags('suppliers')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar fornecedores' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.findAll(user, {
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar fornecedor' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 409 })
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do fornecedor (com endereço)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.update(id, body, user)
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é PENDING.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  approve(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(approveSupplierSchema)) body: ApproveSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.approve(id, body, user)
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeitar fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é PENDING ou motivo ausente.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectSupplierSchema)) body: RejectSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.reject(id, body, user)
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Listar contatos do fornecedor' })
  findContacts(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findContacts(id, user)
  }

  @Post(':id/contacts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar contato' })
  addContact(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSupplierContactSchema)) body: CreateSupplierContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.addContact(id, body, user)
  }

  @Patch(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Atualizar contato' })
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body(new ZodValidationPipe(updateSupplierContactSchema)) body: UpdateSupplierContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.updateContact(id, contactId, body, user)
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover contato' })
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.removeContact(id, contactId, user)
  }

  // ─── Bank Accounts ─────────────────────────────────────────────────────────

  @Get(':id/bank-accounts')
  @ApiOperation({ summary: 'Listar contas bancárias do fornecedor' })
  findBankAccounts(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findBankAccounts(id, user)
  }

  @Post(':id/bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar conta bancária' })
  addBankAccount(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSupplierBankAccountSchema)) body: CreateSupplierBankAccountDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.addBankAccount(id, body, user)
  }

  @Patch(':id/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  updateBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(updateSupplierBankAccountSchema)) body: UpdateSupplierBankAccountDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.updateBankAccount(id, accountId, body, user)
  }

  @Delete(':id/bank-accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover conta bancária' })
  removeBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.removeBankAccount(id, accountId, user)
  }
}
```

---

### 4. `suppliers.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { SuppliersController } from './suppliers.controller'
import { SuppliersService } from './suppliers.service'

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
```

> `exports: [SuppliersService]` — o ProductsService (2.3) precisará verificar se
> um supplier pertence à empresa antes de criar um vínculo.

---

### 5. Atualizar `app.module.ts`

```typescript
import { SuppliersModule } from './modules/suppliers/suppliers.module'

// Adicionar ao array imports:
SuppliersModule,
```

---

### 6. `suppliers.service.spec.ts`

Cobrir: create (happy path + 409 duplicado + 403 sem permissão), findAll (filtro
de status), findOne (404), approve (happy path + 400 status inválido), reject
(happy path + 400 status inválido + 403).

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
import { SuppliersService } from './suppliers.service'
import type { SessionUser } from '../../common/types/session-user'

const compradorUser: SessionUser = {
  id: 'user-comprador',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'company-1',
}

const mockSupplier = {
  id: 'supplier-1',
  companyId: 'company-1',
  name: 'Fornecedor Teste Ltda',
  type: 'PJ',
  cnpj: '12345678000195',
  cpf: null,
  email: 'contato@fornecedor.com',
  phone: null,
  status: 'PENDING',
  rating: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SuppliersService', () => {
  let service: SuppliersService
  let qb: Record<string, ReturnType<typeof vi.fn>>
  let mockDb: Record<string, unknown>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  function enqueue(result: unknown) {
    qb['then'] = vi.fn((resolve: (v: unknown) => void) => resolve(result))
  }

  beforeEach(async () => {
    qb = {
      select:    vi.fn().mockReturnThis(),
      from:      vi.fn().mockReturnThis(),
      where:     vi.fn().mockReturnThis(),
      limit:     vi.fn().mockReturnThis(),
      offset:    vi.fn().mockReturnThis(),
      orderBy:   vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert:    vi.fn().mockReturnThis(),
      values:    vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockSupplier]),
      update:    vi.fn().mockReturnThis(),
      set:       vi.fn().mockReturnThis(),
      delete:    vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve(null)),
    }

    mockDb = {
      select:      (...a: unknown[]) => qb['select']!(...a),
      insert:      (...a: unknown[]) => qb['insert']!(...a),
      update:      (...a: unknown[]) => qb['update']!(...a),
      delete:      (...a: unknown[]) => qb['delete']!(...a),
      transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(qb)),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(SuppliersService)
  })

  describe('findAll', () => {
    it('retorna lista de fornecedores', async () => {
      qb['orderBy'] = vi.fn().mockReturnThis()
      qb['limit'] = vi.fn().mockReturnThis()
      qb['offset'] = vi.fn().mockResolvedValue([mockSupplier])
      const result = await service.findAll(compradorUser, {})
      expect(Array.isArray(result)).toBe(true)
    })

    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.findAll(compradorUser, {})).rejects.toThrow(ForbiddenException)
    })

    it('lança BadRequestException para status inválido', async () => {
      await expect(
        service.findAll(compradorUser, { status: 'INVALIDO' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create(
          { name: 'Fornecedor', type: 'PJ', cnpj: '12345678000195' },
          compradorUser,
        ),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ConflictException quando CNPJ já existe', async () => {
      enqueue({ id: 'outro-supplier' }) // CNPJ duplicado encontrado
      await expect(
        service.create(
          { name: 'Fornecedor', type: 'PJ', cnpj: '12345678000195' },
          compradorUser,
        ),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findOne', () => {
    it('lança NotFoundException quando não encontrado', async () => {
      enqueue(undefined) // select retorna undefined (sem row)
      // segundo select (endereço) não será chamado
      await expect(service.findOne('nao-existe', compradorUser)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('approve', () => {
    it('lança NotFoundException quando fornecedor não encontrado', async () => {
      enqueue(undefined)
      await expect(service.approve('nao-existe', {}, compradorUser)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('lança BadRequestException quando status não é PENDING', async () => {
      enqueue({ ...mockSupplier, status: 'APPROVED' })
      await expect(
        service.approve('supplier-1', {}, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockSupplier)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.approve('supplier-1', {}, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('reject', () => {
    it('lança BadRequestException quando status não é PENDING', async () => {
      enqueue({ ...mockSupplier, status: 'REJECTED' })
      await expect(
        service.reject('supplier-1', { notes: 'Motivo de rejeição' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockSupplier)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.reject('supplier-1', { notes: 'Motivo' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
```

---

### 7. `suppliers.controller.spec.ts`

```typescript
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { SuppliersController } from './suppliers.controller'
import { SuppliersService } from './suppliers.service'

describe('SuppliersController', () => {
  let controller: SuppliersController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll:       vi.fn().mockResolvedValue([]),
      create:        vi.fn().mockResolvedValue({ id: 'supplier-1' }),
      findOne:       vi.fn().mockResolvedValue({ id: 'supplier-1' }),
      update:        vi.fn().mockResolvedValue({ id: 'supplier-1' }),
      approve:       vi.fn().mockResolvedValue({ id: 'supplier-1', status: 'APPROVED' }),
      reject:        vi.fn().mockResolvedValue({ id: 'supplier-1', status: 'REJECTED' }),
      findContacts:  vi.fn().mockResolvedValue([]),
      addContact:    vi.fn().mockResolvedValue({ id: 'contact-1' }),
      findBankAccounts: vi.fn().mockResolvedValue([]),
      addBankAccount: vi.fn().mockResolvedValue({ id: 'account-1' }),
    }

    const module = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(SuppliersController)
  })

  it('findAll delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.findAll(user)
    expect(service['findAll']).toHaveBeenCalledWith(user, expect.any(Object))
  })

  it('create delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    const dto = { name: 'Forn', type: 'PJ' as const, cnpj: '12345678000195' }
    await controller.create(dto, user)
    expect(service['create']).toHaveBeenCalledWith(dto, user)
  })

  it('approve delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.approve('supplier-1', {}, user)
    expect(service['approve']).toHaveBeenCalledWith('supplier-1', {}, user)
  })

  it('reject delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.reject('supplier-1', { notes: 'Motivo' }, user)
    expect(service['reject']).toHaveBeenCalledWith('supplier-1', { notes: 'Motivo' }, user)
  })
})
```

---

## Verificação

- [ ] `pnpm vitest run --filter api` — todos os testes passando
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] Checklist de segurança:
  - [ ] `POST /v1/companies/:cnpj/suppliers` retorna 403 para ALMOXARIFE
  - [ ] `POST /v1/companies/:cnpj/suppliers/:id/approve` retorna 400 quando status é APPROVED
  - [ ] `POST /v1/companies/:cnpj/suppliers/:id/reject` retorna 400 sem body `notes`
  - [ ] `GET /v1/companies/:cnpj/suppliers` retorna apenas fornecedores do tenant correto
  - [ ] Toda mutação gera registro em `audit_logs`
- [ ] `GET /reference` exibe o grupo `suppliers` com todas as rotas
