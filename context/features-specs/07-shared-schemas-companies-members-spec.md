# Feature Spec — 1.1 Shared Schemas: Empresas e Membros

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 1 — Auth e Empresas  
**Unidade:** 1.1  
**Pré-requisito:** 0.6 concluído; `packages/shared/src/enums.ts` com `Role` já existe (0.3)  
**Commit convencional esperado:** `feat: add company and member zod schemas`

---

## Objetivo

Definir em `packages/shared` os schemas Zod e tipos TypeScript para os domínios
`Company` e `CompanyMember`. Estes schemas são a fonte de verdade dos contratos de
API para os endpoints da Fase 1 — consumidos pelo backend (validação via
`ZodValidationPipe`) e pelo frontend (validação de formulários e tipagem de
respostas). Nenhum código de API ou UI é criado nesta unidade.

---

## Escopo

### In

- `packages/shared/src/schemas/company.ts` — schemas Zod de empresa
- `packages/shared/src/schemas/member.ts` — schemas Zod de membro
- `packages/shared/src/types/company.ts` — tipos derivados via `z.infer`
- `packages/shared/src/types/member.ts` — tipos derivados via `z.infer`
- Atualização do barrel `packages/shared/src/index.ts`

### Out (não implementar nesta unidade)

- Controllers, Services, módulos NestJS (→ 1.2 e 1.3)
- Componentes React (→ 1.4 e 1.5)
- Schemas Zod de outros domínios (→ Fases 2–7)

---

## Arquivos a Criar / Modificar

```
packages/shared/src/
  schemas/
    company.ts      ← criar
    member.ts       ← criar
  types/
    company.ts      ← criar
  index.ts          ← modificar (re-exportar schemas e tipos novos)
```

> `packages/shared/src/types/member.ts` não é criado separadamente — os tipos de
> membro são exportados diretamente de `schemas/member.ts` via `z.infer`.

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/company.ts`

```typescript
import { z } from 'zod'

// CNPJ: 14 dígitos numéricos sem pontuação
const cnpjSchema = z
  .string()
  .regex(/^\d{14}$/, 'CNPJ deve ter exatamente 14 dígitos numéricos')

// CEP: 8 dígitos numéricos sem hífen
const zipCodeSchema = z
  .string()
  .regex(/^\d{8}$/, 'CEP deve ter exatamente 8 dígitos numéricos')
  .optional()

export const createCompanySchema = z.object({
  name:       z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  tradeName:  z.string().max(255).optional(),
  cnpj:       cnpjSchema,
  email:      z.string().email('E-mail inválido').optional(),
  phone:      z.string().max(20).optional(),
  street:     z.string().max(255).optional(),
  number:     z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  city:       z.string().max(100).optional(),
  state:      z.string().length(2, 'UF deve ter 2 caracteres').optional(),
  zipCode:    zipCodeSchema,
})

// CNPJ não pode ser alterado após criação (chave de tenant)
export const updateCompanySchema = createCompanySchema
  .omit({ cnpj: true })
  .partial()

// Shape da resposta da API (o que o backend retorna)
export const companyResponseSchema = z.object({
  id:         z.string().uuid(),
  name:       z.string(),
  tradeName:  z.string().nullable(),
  cnpj:       z.string(),
  email:      z.string().nullable(),
  phone:      z.string().nullable(),
  street:     z.string().nullable(),
  number:     z.string().nullable(),
  complement: z.string().nullable(),
  city:       z.string().nullable(),
  state:      z.string().nullable(),
  zipCode:    z.string().nullable(),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
})

export type CreateCompanyDto  = z.infer<typeof createCompanySchema>
export type UpdateCompanyDto  = z.infer<typeof updateCompanySchema>
export type CompanyResponse   = z.infer<typeof companyResponseSchema>
```

---

### 2. `packages/shared/src/schemas/member.ts`

```typescript
import { z } from 'zod'
import { Role } from '../enums'

// Roles que um ADMIN_EMPRESA pode atribuir a outros usuários.
// SUPER_ADMIN não pode ser atribuído via este endpoint — é gerenciado
// fora do fluxo de empresa normal.
const assignableRoles = [
  Role.ADMIN_EMPRESA,
  Role.COMPRADOR,
  Role.ALMOXARIFE,
  Role.ANALISTA_FINANCEIRO,
  Role.TRANSPORTADOR,
] as const

export const inviteMemberSchema = z.object({
  email: z.string().email('E-mail inválido'),
  name:  z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  role:  z.enum(assignableRoles, {
    errorMap: () => ({ message: 'Papel inválido para atribuição' }),
  }),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(assignableRoles, {
    errorMap: () => ({ message: 'Papel inválido para atribuição' }),
  }),
})

// Shape aninhado: membro + dados do usuário (JOIN no Service)
export const memberResponseSchema = z.object({
  id:        z.string().uuid(),
  companyId: z.string().uuid(),
  userId:    z.string(),
  role:      z.nativeEnum(Role),
  createdAt: z.string().datetime(),
  user: z.object({
    id:    z.string(),
    name:  z.string(),
    email: z.string().email(),
  }),
})

// Shape resumido para o company switcher no frontend
export const myCompanySchema = z.object({
  companyId:   z.string().uuid(),
  companyName: z.string(),
  cnpj:        z.string(),
  role:        z.nativeEnum(Role),
})

export type InviteMemberDto    = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>
export type MemberResponse     = z.infer<typeof memberResponseSchema>
export type MyCompany          = z.infer<typeof myCompanySchema>
```

---

### 3. `packages/shared/src/index.ts` — atualizar barrel

Adicionar as novas re-exportações ao barrel existente:

```typescript
// Schemas — adicionar ao que já existe:
export * from './schemas/company'
export * from './schemas/member'

// Enums — já existia:
export * from './enums'
```

> Se o projeto ainda não tiver a pasta `schemas/` no barrel, criar um bloco
> separado `// Schemas` para facilitar a leitura.

---

## Verificação

- [ ] `pnpm --filter shared build` passa sem erros de TypeScript
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo (biome)
- [ ] Os tipos `CreateCompanyDto`, `UpdateCompanyDto`, `CompanyResponse`,
      `InviteMemberDto`, `UpdateMemberRoleDto`, `MemberResponse` e `MyCompany`
      são importáveis via `import { ... } from '@elos/shared'`
- [ ] `assignableRoles` não inclui `SUPER_ADMIN` (invariante de segurança)
- [ ] `cnpjSchema` rejeita strings com menos ou mais de 14 dígitos e strings
      com pontuação (ex: `"12.345.678/0001-99"` deve falhar)
