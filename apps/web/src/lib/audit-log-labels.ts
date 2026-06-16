// Rótulos PT-BR para entidades e ações do audit log, compartilhados entre o
// filtro (dropdowns), a lista (resumo da mudança) e o detalhe. O backend
// armazena entity/action em inglês (ver auditLogEntities/auditLogActions em
// @elos/shared); aqui só traduzimos para exibição.

interface EntityLabel {
  label: string
  // `f` = gênero feminino, para concordância do particípio no resumo
  // (ex.: "Cotação criada" vs. "Fornecedor aprovado").
  f: boolean
}

const ENTITY_LABELS: Record<string, EntityLabel> = {
  Company: { label: 'Empresa', f: true },
  CompanyMember: { label: 'Membro', f: false },
  Supplier: { label: 'Fornecedor', f: false },
  SupplierContact: { label: 'Contato do fornecedor', f: false },
  SupplierBankAccount: { label: 'Conta bancária', f: true },
  Product: { label: 'Produto', f: false },
  ProductSupplier: { label: 'Vínculo de fornecedor', f: false },
  Quotation: { label: 'Cotação', f: true },
  QuotationItem: { label: 'Item de cotação', f: false },
  QuotationSupplier: { label: 'Fornecedor da cotação', f: false },
  Bid: { label: 'Lance', f: false },
  BidItem: { label: 'Item do lance', f: false },
  PurchaseOrder: { label: 'Pedido de compra', f: false },
  Receipt: { label: 'Recebimento', f: false },
  StockMovement: { label: 'Movimentação de estoque', f: true },
  Warehouse: { label: 'Armazém', f: false },
  NonConformity: { label: 'Não-conformidade', f: true },
  Invoice: { label: 'NF', f: true },
  InvoiceItem: { label: 'Item da NF', f: false },
  Payment: { label: 'Pagamento', f: false },
  PaymentInstallment: { label: 'Parcela', f: true },
}

// Particípio passado masculino/feminino por ação.
const ACTION_PARTICIPLES: Record<string, { m: string; f: string }> = {
  CREATE: { m: 'criado', f: 'criada' },
  UPDATE: { m: 'atualizado', f: 'atualizada' },
  DELETE: { m: 'removido', f: 'removida' },
  DEACTIVATE: { m: 'desativado', f: 'desativada' },
  APPROVE: { m: 'aprovado', f: 'aprovada' },
  REJECT: { m: 'rejeitado', f: 'rejeitada' },
  PUBLISH: { m: 'publicado', f: 'publicada' },
  CLOSE: { m: 'fechado', f: 'fechada' },
  CANCEL: { m: 'cancelado', f: 'cancelada' },
  SUBMIT: { m: 'enviado', f: 'enviada' },
  SELECT_WINNER: { m: 'com vencedor selecionado', f: 'com vencedor selecionado' },
  SEND: { m: 'enviado', f: 'enviada' },
  RECEIVE: { m: 'recebido', f: 'recebida' },
  ANALYZE: { m: 'analisado', f: 'analisada' },
  RESOLVE: { m: 'resolvido', f: 'resolvida' },
  VALIDATE: { m: 'validado', f: 'validada' },
  PAY: { m: 'pago', f: 'paga' },
  COMPLETE: { m: 'concluído', f: 'concluída' },
}

// Rótulo curto da ação, para o dropdown e a coluna "ação" da tabela.
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Remoção',
  DEACTIVATE: 'Desativação',
  APPROVE: 'Aprovação',
  REJECT: 'Rejeição',
  PUBLISH: 'Publicação',
  CLOSE: 'Fechamento',
  CANCEL: 'Cancelamento',
  SUBMIT: 'Envio',
  SELECT_WINNER: 'Seleção de vencedor',
  SEND: 'Envio',
  RECEIVE: 'Recebimento',
  ANALYZE: 'Análise',
  RESOLVE: 'Resolução',
  VALIDATE: 'Validação',
  PAY: 'Pagamento',
  COMPLETE: 'Conclusão',
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity]?.label ?? entity
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

// Frase curta para a coluna "resumo da mudança" (ex.: "Cotação criada").
export function changeSummary(entity: string, action: string): string {
  const e = ENTITY_LABELS[entity] ?? { label: entity, f: false }
  const participle = ACTION_PARTICIPLES[action]
  if (!participle) return `${e.label} — ${actionLabel(action)}`
  return `${e.label} ${e.f ? participle.f : participle.m}`
}
