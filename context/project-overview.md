# Elos — Visão Geral do Produto

## Overview

**Elos** é um SaaS B2B multi-tenant de gestão de cadeia de suprimentos para o mercado
brasileiro. Centraliza em uma única plataforma todo o ciclo de compras: onboarding de
fornecedores, cotações competitivas, pedidos de compra, recebimento de mercadorias,
faturamento, pagamentos e rastreabilidade de não-conformidades — com controle de acesso
baseado em papéis para cada tipo de usuário.

Cada empresa (tenant) é isolada por CNPJ. Um usuário pode pertencer a múltiplas empresas
com papéis diferentes em cada uma.

---

## Objetivos

1. Eliminar planilhas e e-mails no processo de compras, centralizando fornecedores,
   cotações e pedidos em um único sistema auditável.
2. Habilitar rastreabilidade completa do pedido até o pagamento: cotação → lance →
   pedido de compra → recebimento → nota fiscal → pagamento.
3. Garantir que cada usuário veja e faça apenas o que seu papel permite (RBAC estrito
   via CASL).
4. Suportar múltiplos tenants (empresas) de forma segura, com isolamento total de dados
   por CNPJ.

---

## Papéis de Usuário

| Papel               | Responsabilidade principal                                         |
| ------------------- | ------------------------------------------------------------------ |
| `SUPER_ADMIN`       | Administra a plataforma Elos; acessa todos os tenants              |
| `ADMIN_EMPRESA`     | Gerencia usuários, fornecedores e configurações da sua empresa     |
| `COMPRADOR`         | Cria cotações, aprova pedidos de compra, gerencia fornecedores     |
| `ALMOXARIFE`        | Registra recebimentos, movimentações de estoque e armazéns         |
| `ANALISTA_FINANCEIRO` | Processa notas fiscais, pagamentos e conciliação financeira      |
| `TRANSPORTADOR`     | Registra e acompanha logística de entregas                         |

---

## Fluxo Core

1. **Onboarding** — Admin cria a empresa (CNPJ) e convida usuários com seus papéis.
2. **Fornecedores** — Comprador cadastra e aprova fornecedores (pessoa física ou
   jurídica), com dados bancários, contatos e documentos.
3. **Produtos** — Comprador cadastra o catálogo de produtos vinculados a fornecedores.
4. **Cotação** — Comprador abre uma cotação com itens e prazo; fornecedores submetem
   lances com preço, prazo e condições.
5. **Pedido de Compra** — Comprador seleciona o lance vencedor; sistema gera o pedido
   de compra automaticamente.
6. **Recebimento** — Almoxarife registra o recebimento da mercadoria, confirma
   quantidades e aciona inspeção de qualidade.
7. **Não-Conformidade** — Se mercadoria chegar com problema, Almoxarife abre uma
   não-conformidade linkada ao pedido/fornecedor.
8. **Nota Fiscal** — Analista Financeiro vincula a nota fiscal ao pedido de compra e
   valida os valores.
9. **Pagamento** — Analista Financeiro registra o pagamento e fecha o ciclo.
10. **Auditoria** — Todo evento relevante é registrado no audit log com usuário,
    timestamp e diff.

---

## Features

### Gestão de Empresas e Usuários

- Cadastro de empresa com CNPJ como chave de tenant
- Convite e gestão de usuários por empresa
- Cada usuário pode ter papéis diferentes em empresas diferentes
- Troca de contexto de empresa (company switcher) na interface

### Fornecedores

- Cadastro de fornecedor (PJ e PF) com CNPJ/CPF, razão social, contatos e endereço
- Dados bancários do fornecedor
- Múltiplos contatos por fornecedor
- Status de aprovação: PENDENTE → APROVADO / REPROVADO
- Avaliação de fornecedores

### Produtos e Catálogo

- Cadastro de produto com nome, unidade de medida e quantidade padrão
- Vinculação produto ↔ fornecedor
- Controle de estoque mínimo

### Cotações e Lances

- Criação de cotação com lista de itens, prazo e condições
- Convite de fornecedores específicos para participar
- Submissão de lances com preço unitário, prazo de entrega e condições de pagamento
- Comparativo de lances por item
- Seleção de lance vencedor (pode ser por item ou por fornecedor)

### Pedidos de Compra

- Geração automática de PO a partir do lance vencedor
- Edição e aprovação do pedido
- Status: RASCUNHO → APROVADO → ENVIADO → RECEBIDO → CANCELADO
- Itens do pedido com quantidade, preço unitário e total

### Recebimento e Armazéns

- Registro de recebimento parcial ou total de um pedido
- Gestão de armazéns (localização física)
- Movimentações de estoque (entrada, saída, transferência)
- Inventário por produto e armazém

### Não-Conformidades

- Abertura de NC vinculada a pedido, fornecedor e produto
- Classificação por tipo e severidade
- Fluxo de resolução: ABERTA → EM ANÁLISE → RESOLVIDA / REJEITADA
- Anexos e comentários

### Notas Fiscais

- Upload e vinculação de NF ao pedido de compra
- Validação de valores e impostos
- Status: PENDENTE → VALIDADA → REJEITADA

### Pagamentos

- Registro de pagamento contra NF aprovada
- Parcelamento
- Formas de pagamento (boleto, PIX, transferência)
- Conciliação de valores pagos vs. pedido

### Logística

- Registro de transporte vinculado ao pedido
- Rastreamento de status de entrega
- Vinculação a transportador

### Audit Log

- Registro automático de todas as mutações relevantes
- Campos: entidade, ação, usuário, timestamp, antes/depois (JSON diff)
- Disponível para consulta por Admins

---

## Escopo

### Dentro do Escopo (v1)

- Todos os módulos acima para o fluxo de compras B2B
- Multi-tenancy por CNPJ com isolamento total de dados
- RBAC com os 6 papéis definidos
- API REST documentada via OpenAPI/Swagger
- Interface web responsiva (desktop-first)
- Audit log de todas as mutações

### Fora do Escopo (v1)

- App mobile nativo
- Portal de autoatendimento para fornecedores (fornecedor acessar o sistema Elos)
- Integração com ERP externo (SAP, TOTVS)
- Emissão de NF-e (apenas upload e vinculação)
- Módulo financeiro completo (contas a pagar/receber automatizadas)
- Relatórios analíticos avançados / BI

---

## Critérios de Sucesso

1. Um usuário COMPRADOR consegue executar o fluxo completo: criar cotação → receber
   lances → gerar pedido de compra → confirmar recebimento, sem erros.
2. Dois tenants diferentes nunca veem dados um do outro, mesmo com o mesmo usuário em
   ambas as empresas.
3. Um usuário sem o papel correto recebe HTTP 403 ao tentar acessar recursos fora da
   sua permissão.
4. Toda mutação relevante aparece no audit log com usuário, timestamp e dados corretos.
5. A suíte de testes (unit + integração) passa com ≥ 80% de cobertura nos caminhos
   de lógica de negócio críticos (auth, RBAC, fluxo de cotação, fluxo de pedido).
6. `npm run build` passa sem erros de TypeScript em todos os pacotes do monorepo.
