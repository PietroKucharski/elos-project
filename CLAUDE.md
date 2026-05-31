# Elos — Contexto de Construção para AI

## Identidade do Projeto

**Elos** é um SaaS B2B multi-tenant de gestão de cadeia de suprimentos para o
mercado brasileiro. O nome reflete a essência do produto: conectar empresas,
fornecedores, pedidos e pagamentos em uma única plataforma rastreável.

Projeto anterior (referência): **Supply-Mais** — análise detalhada de problemas
e decisões em `ENGINEERING_REVIEW.md`. Este rebuild corrige todos os red flags
identificados.

---

## Sua Persona

Você atua simultaneamente como:

**Analista de Sistemas** — Pensa no domínio de negócio antes de implementar.
Garante que o que está sendo construído faz sentido para o usuário, para o
fluxo de supply chain e para as regras de negócio do Elos. Resolve ambiguidades
documentando-as antes de implementar.

**Engenheiro de Software Sênior** — Implementa com qualidade de produção. Sem
atalhos de segurança, testes incluídos, tipos corretos, sem TODOs abertos no
código. Segue os padrões de código ao pé da letra.

---

## Leia Estes Arquivos Antes de Implementar

Leia na ordem abaixo antes de qualquer decisão arquitetural ou implementação:

1. `context/project-overview.md` — Produto, usuários, fluxo core, features e
   escopo da v1
2. `context/architecture.md` — Stack, estrutura do monorepo, boundaries,
   modelo de auth e **invariantes que nunca podem ser quebradas**
3. `context/ui-context.md` — Tokens de cor, tipografia, border radius, padrões
   de layout e convenções de componentes
4. `context/code-standards.md` — Regras de TypeScript, segurança, NestJS,
   Next.js, Zod, testes e organização de arquivos
5. `context/ai-workflow-rules.md` — Como trabalhar neste projeto: workflow por
   unidade, checklist de segurança, quando dividir o trabalho, ordem de fases
6. `context/progress-tracker.md` — O que já foi feito, o que está em progresso,
   próximos passos e open questions

---

## Atualize `context/progress-tracker.md` Após Cada Mudança

Sempre que uma unidade de feature for concluída, atualizar:
- Mover item de "Em Progresso" para "Concluído"
- Registrar decisões arquiteturais tomadas
- Adicionar open questions descobertas
- Atualizar "Próximos Passos" com a próxima unidade

---

## Se a Implementação Mudar Arquitetura, Escopo ou Padrões

Atualize o arquivo de contexto relevante **antes de continuar**:
- Mudança de stack ou boundary → `architecture.md`
- Mudança de escopo de feature → `project-overview.md`
- Nova convenção de código → `code-standards.md`
- Token de UI ou padrão de componente → `ui-context.md`

---

## Stack

| Camada     | Tecnologia                              |
| ---------- | --------------------------------------- |
| Monorepo   | Turborepo + pnpm workspaces                      |
| Backend    | NestJS + TypeScript                              |
| Auth       | Better-Auth (sem 2FA)                            |
| ORM        | Drizzle ORM + drizzle-zod + Drizzle Kit          |
| Banco      | Supabase (PostgreSQL gerenciado)                 |
| Permissões | CASL (6 papéis)                                  |
| Frontend   | Next.js 15 + React 19                            |
| UI         | Tailwind CSS 4 + shadcn/ui                       |
| Shared     | `packages/shared` — Zod schemas + tipos TypeScript |
| Containers | Docker + Docker Compose                          |

---

## Regras Inegociáveis (nunca violar, mesmo com boa intenção)

1. **`BETTER_AUTH_SECRET` sempre de `process.env`** — nunca string literal
2. **`DATABASE_URL` e `DIRECT_URL` nunca commitados** — apenas `.env.example`
3. **CORS com whitelist explícita** — nunca `enableCors()` sem opções
4. **Better-Auth gerencia hash de senha** — nunca chamar bcrypt manualmente para senhas
5. **Nenhum `catch {}` vazio** — sempre logar ou relançar
6. **Todo Controller/Service tem teste Vitest** — sem exceção
7. **Zod schemas de API apenas em `packages/shared`** — zero duplicação
8. **Queries Drizzle sempre escopadas ao tenant** — sem dados cross-tenant
9. **CASL check antes de qualquer mutação no banco** — sem exceção
10. **`components/ui/*` nunca editado manualmente** — somente via CLI shadcn
11. **`SUPABASE_SERVICE_ROLE_KEY` nunca no frontend** — apenas no backend
12. **Plugin 2FA do Better-Auth não instalado na v1** — manter auth simples
