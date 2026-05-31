# Elos — Contexto de UI

## Linguagem Visual

Elos é uma ferramenta de trabalho B2B — a interface deve ser **clara, densa e
confiável**. O design language é um workspace profissional claro (light mode primário),
com superfícies limpas, hierarquia de informação bem definida e um accent vibrante
que reforça a identidade da marca.

Sem modo escuro na v1. Foco total em legibilidade e densidade de dados.

---

## Cores

Todos os componentes devem usar os CSS custom properties abaixo. **Nenhum valor hex
hardcoded** fora deste arquivo e do `globals.css`.

### Tokens de Cor

| Papel                  | CSS Variable            | Valor HSL / Hex    | Tailwind equivalente |
| ---------------------- | ----------------------- | ------------------ | -------------------- |
| Fundo da página        | `--background`          | `0 0% 98%`         | `slate-50`           |
| Superfície (card)      | `--card`                | `0 0% 100%`        | `white`              |
| Superfície elevada     | `--muted`               | `210 40% 96%`      | `slate-100`          |
| Texto primário         | `--foreground`          | `222 47% 11%`      | `slate-900`          |
| Texto secundário       | `--muted-foreground`    | `215 16% 47%`      | `slate-500`          |
| Accent primário        | `--primary`             | `243 75% 59%`      | `indigo-500`         |
| Accent primário hover  | `--primary` + `hover:`  | `243 75% 50%`      | `indigo-600`         |
| Texto sobre accent     | `--primary-foreground`  | `0 0% 100%`        | `white`              |
| Borda padrão           | `--border`              | `214 32% 91%`      | `slate-200`          |
| Input borda            | `--input`               | `214 32% 91%`      | `slate-200`          |
| Anel de foco           | `--ring`                | `243 75% 59%`      | `indigo-500`         |
| Destrutivo / Erro      | `--destructive`         | `0 84% 60%`        | `red-500`            |
| Sucesso                | `--success`             | `142 71% 45%`      | `green-500`          |
| Aviso                  | `--warning`             | `38 92% 50%`       | `amber-500`          |
| Info                   | `--info`                | `199 89% 48%`      | `sky-500`            |

### Uso de Cor para Status de Entidades

| Status                | Cor de badge         | Variável           |
| --------------------- | -------------------- | ------------------ |
| PENDENTE / RASCUNHO   | Amarelo/Âmbar        | `--warning`        |
| APROVADO / ATIVO      | Verde                | `--success`        |
| REPROVADO / CANCELADO | Vermelho             | `--destructive`    |
| EM ANÁLISE / ENVIADO  | Azul                 | `--info`           |
| CONCLUÍDO / PAGO      | Indigo               | `--primary`        |

---

## Tipografia

| Papel         | Fonte         | Variable       | Classe Tailwind   |
| ------------- | ------------- | -------------- | ----------------- |
| UI / Corpo    | Inter         | `--font-sans`  | `font-sans`       |
| Código / Mono | Geist Mono    | `--font-mono`  | `font-mono`       |

Escala de tamanho:

| Contexto              | Tamanho  | Peso    |
| --------------------- | -------- | ------- |
| Título de página (h1) | `text-2xl` | `font-semibold` |
| Título de seção (h2)  | `text-lg`  | `font-semibold` |
| Label de campo        | `text-sm`  | `font-medium`   |
| Corpo / tabela        | `text-sm`  | `font-normal`   |
| Legenda / muted       | `text-xs`  | `font-normal`   |

---

## Border Radius

Seguir a escala padrão do shadcn/ui (variável `--radius: 0.5rem`):

| Contexto                | Classe            |
| ----------------------- | ----------------- |
| Botões, inputs, badges  | `rounded-md`      |
| Cards, painéis          | `rounded-lg`      |
| Modais, drawers         | `rounded-xl`      |
| Tooltips, popovers      | `rounded-md`      |

---

## Biblioteca de Componentes

**shadcn/ui** sobre Tailwind CSS 4. Componentes vivem em `components/ui/`.

- **Adicionar novos componentes via CLI**: `npx shadcn@latest add <component>` — nunca
  escrever primitivos do zero.
- **Nunca editar arquivos em `components/ui/`** diretamente (são regenerados pelo CLI).
- Componentes de domínio compostos ficam em `components/domain/` e podem importar
  livremente os primitivos de `components/ui/`.

Componentes shadcn utilizados na v1 (adicionar conforme necessidade):
`button`, `input`, `select`, `dialog`, `sheet`, `card`, `table`, `badge`, `form`,
`label`, `textarea`, `dropdown-menu`, `avatar`, `separator`, `skeleton`, `toast`,
`alert`, `breadcrumb`, `tabs`, `command`, `popover`, `calendar`, `date-picker`.

---

## Padrões de Layout

### Shell principal (páginas protegidas)

```
┌─────────────────────────────────────────────────────┐
│  Topbar (64px) — logo, company switcher, user menu  │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Sidebar    │   Área de conteúdo principal         │
│   (240px)    │   (flex-1, overflow-y-auto)          │
│   fixo       │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

- **Topbar**: `h-16`, `border-b`, fundo `--card`, fixo no topo.
- **Sidebar**: `w-60`, `border-r`, fundo `--background`, fixo; colapsa para ícones
  em `< lg`.
- **Área de conteúdo**: `flex-1`, padding `p-6`, fundo `--background`.

### Páginas de listagem (tabelas)

```
┌─ Cabeçalho de página ─────────────────────────────────┐
│  Título (h1)    [Botão de ação primária]               │
├─ Filtros e busca ─────────────────────────────────────┤
│  [Input de busca]  [Selects de filtro]  [Reset]        │
├─ Tabela ──────────────────────────────────────────────┤
│  Colunas com sort  ...                  [Ações]        │
├─ Paginação ───────────────────────────────────────────┤
│  Anterior  [1] [2] [3]  Próximo                       │
└───────────────────────────────────────────────────────┘
```

### Formulários de criação/edição

- Usar `Sheet` (drawer lateral) para formulários simples (até ~8 campos).
- Usar página dedicada (`/new`, `/[id]/edit`) para formulários complexos ou
  multi-etapas.
- Campos obrigatórios sempre sinalizados com `*` no label.
- Mensagens de erro abaixo do campo, em `text-destructive text-xs`.

### Modais

- Reservados para confirmações destrutivas (deletar, cancelar pedido) e
  ações rápidas (aprovar, reprovar).
- Sempre com título claro, descrição do impacto e dois botões (confirmar +
  cancelar).

---

## Estados de UI

Todo elemento assíncrono **deve** ter os três estados implementados:

| Estado    | Implementação                                              |
| --------- | ---------------------------------------------------------- |
| Loading   | Componente `Skeleton` de mesmo tamanho do conteúdo final  |
| Empty     | Empty state com ícone Lucide + mensagem + CTA quando aplicável |
| Error     | `Alert` com variante `destructive` + botão de retry       |

Usar `loading.tsx` e `error.tsx` no App Router do Next.js para estados de rota.

---

## Ícones

**Lucide React** — stroke-based apenas.

| Contexto               | Tamanho        |
| ---------------------- | -------------- |
| Inline / texto         | `h-4 w-4`      |
| Botões                 | `h-4 w-4`      |
| Navegação sidebar      | `h-5 w-5`      |
| Empty states           | `h-10 w-10` com `text-muted-foreground` |
| Indicadores de status  | `h-3 w-3`      |

Stroke width padrão: `strokeWidth={1.5}`.

---

## Acessibilidade

- Todo `<input>` deve ter `<label>` associado via `htmlFor` + `id` correspondente.
- Componentes de formulário devem usar `aria-describedby` apontando para a
  mensagem de erro quando houver erro.
- Botões de ação destrutiva devem ter `aria-label` descritivo quando o texto
  for ambíguo (ex: ícone de lixeira sem texto).
- Contraste mínimo WCAG AA em todos os textos.
- Navegação por teclado garantida para modais e dropdowns (shadcn/Radix já fornece
  isso para seus primitivos — não quebrar esse comportamento).
