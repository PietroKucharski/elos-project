# Git Workflow — Elos

Convenções obrigatórias de branch, commit e Pull Request deste repositório.
Toda contribuição (humana ou AI) deve seguir este documento à risca.

---

## Branches

| Branch        | Papel                                                      |
| ------------- | ---------------------------------------------------------- |
| `main`        | Produção. Só recebe merge via PR a partir de `development`. |
| `development` | Integração de desenvolvimento. Base de toda feature branch. |

**Cada alteração ou feature recebe a sua própria branch**, criada a partir de
`development` e nomeada com base no que foi feito:

```
<tipo>/<descrição-curta-em-kebab-case>
```

- `tipo` espelha o tipo do Conventional Commit (`feat`, `fix`, `chore`,
  `docs`, `refactor`, `test`, ...).
- Exemplos: `feat/supplier-crud`, `fix/auth-cookie-expiry`,
  `docs/docker-strategy`, `chore/tooling-biome-husky`.

Fluxo: branch a partir de `development` → commits → PR para `development`.
Merges de `development` → `main` representam um release para produção.

---

## Commits

Seguem **Conventional Commits, sem escopo entre parênteses**:

```
<tipo>: <descrição no imperativo, em inglês, uma única linha>
```

Regras inegociáveis:

- **Sem escopo / sem parênteses.** Use `feat: ...`, nunca `feat(api): ...`.
- **Mensagem em inglês.**
- **Uma única linha** (apenas o subject; sem corpo de parágrafo).
- Imperativo, minúsculo no início da descrição, sem ponto final.

Tipos aceitos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`,
`build`, `ci`.

| ✅ Correto                                          | ❌ Errado                                  |
| --------------------------------------------------- | ------------------------------------------ |
| `feat: add supplier registration endpoint`          | `feat(suppliers): add registration`        |
| `chore: add biome, husky and lint-staged`           | `chore: tooling setup.`                    |
| `fix: scope quotation query to current tenant`      | `fixed tenant bug`                         |

> **Nota de ferramenta:** ao commitar via shell, use aspas simples do bash
> (`git commit -m 'feat: ...'`). **Não** use here-string do PowerShell
> (`@'...'@`) dentro do bash — o `@` vaza para dentro da mensagem.

---

## Pull Request

Imediatamente após criar o commit, gere a descrição do PR em **markdown, em
inglês**, com exatamente estas quatro seções:

```markdown
## What was done
...

## Why
...

## Changes
...

## Impact
...
```

---

## Push

**Todo `git push` é feito manualmente pelo desenvolvedor.** Nenhuma automação
(nem a AI) executa push. Após o commit, apenas o comando de push é
disponibilizado para execução manual.
