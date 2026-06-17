import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { auth } from '../modules/auth/better-auth'
import * as schema from './schema'
import {
  auditLogs,
  bidItems,
  bids,
  companies,
  companyMembers,
  inventory,
  invoiceItems,
  invoices,
  ncAttachments,
  ncComments,
  nonConformities,
  paymentInstallments,
  payments,
  productSuppliers,
  products,
  purchaseOrderItems,
  purchaseOrders,
  quotationItems,
  quotationSuppliers,
  quotations,
  receiptItems,
  receipts,
  shipments,
  stockMovements,
  supplierAddresses,
  supplierBankAccounts,
  supplierContacts,
  suppliers,
  warehouses,
} from './schema'

const DEV_PASSWORD = 'Elos@2024!' // dev only — alterar em produção

// Helpers de data relativos a "agora" — mantêm o seed coerente a cada execução.
const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)
const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000)

async function seed() {
  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client, { schema })

  console.log('🌱 Iniciando seed...')

  // ─── 0. Reset ─────────────────────────────────────────────────────────────
  // TRUNCATE … CASCADE limpa todas as tabelas (inclusive as do Better-Auth) para
  // que o seed seja idempotente — pode rodar quantas vezes for preciso em dev.
  console.log('Limpando tabelas existentes...')
  await db.execute(sql`
    TRUNCATE TABLE
      "audit_logs",
      "shipments",
      "payment_installments", "payments",
      "invoice_items", "invoices",
      "nc_comments", "nc_attachments", "non_conformities",
      "receipt_items", "receipts",
      "stock_movements", "inventory", "warehouses",
      "purchase_order_items", "purchase_orders",
      "bid_items", "bids", "quotation_suppliers", "quotation_items", "quotations",
      "product_suppliers", "products",
      "supplier_addresses", "supplier_bank_accounts", "supplier_contacts", "suppliers",
      "company_members", "companies",
      "verification", "account", "session", "user"
    RESTART IDENTITY CASCADE
  `)

  // ─── 1. Empresa ─────────────────────────────────────────────────────────────
  console.log('Criando empresa de exemplo...')
  const [company] = await db
    .insert(companies)
    .values({
      name: 'Elos Demo Ltda.',
      tradeName: 'Elos Demo',
      cnpj: '00000000000191', // CNPJ inválido — apenas para dev
      email: 'contato@elosdemo.com.br',
      phone: '1140041234',
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Conjunto 101',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    })
    .returning()

  if (!company) throw new Error('Falha ao criar empresa de exemplo')
  const companyId = company.id

  // ─── 2. Usuários + vínculos (cobre os 6 papéis) ──────────────────────────────
  // signUpEmail popula as tabelas `user` e `account` do Better-Auth.
  async function createUser(name: string, email: string, role: schema.CompanyMember['role']) {
    const result = await auth.api.signUpEmail({
      body: { name, email, password: DEV_PASSWORD },
    })
    if (!result?.user) throw new Error(`Falha ao criar usuário ${email}`)
    await db.insert(companyMembers).values({ companyId, userId: result.user.id, role })
    return result.user.id
  }

  console.log('Criando usuários e vínculos...')
  await createUser('Super Admin', 'admin@elos.com.br', 'SUPER_ADMIN')
  const adminId = await createUser(
    'Admin Empresa',
    'admin-empresa@elosdemo.com.br',
    'ADMIN_EMPRESA',
  )
  const compradorId = await createUser('Carla Compradora', 'comprador@elosdemo.com.br', 'COMPRADOR')
  const almoxarifeId = await createUser(
    'Alex Almoxarife',
    'almoxarife@elosdemo.com.br',
    'ALMOXARIFE',
  )
  const financeiroId = await createUser(
    'Fábio Financeiro',
    'financeiro@elosdemo.com.br',
    'ANALISTA_FINANCEIRO',
  )
  const transportadorId = await createUser(
    'Tânia Transportadora',
    'transportador@elosdemo.com.br',
    'TRANSPORTADOR',
  )

  // ─── 3. Fornecedores (+ contatos, contas bancárias, endereços) ───────────────
  console.log('Criando fornecedores...')
  const [supplierAco, supplierParafusos] = await db
    .insert(suppliers)
    .values([
      {
        companyId: company.id,
        name: 'Aço Brasil Indústria S.A.',
        type: 'PJ',
        cnpj: '11444777000161',
        email: 'vendas@acobrasil.com.br',
        phone: '1133221100',
        status: 'APPROVED',
        rating: '4.50',
        notes: 'Fornecedor estratégico de chapas e perfis de aço.',
      },
      {
        companyId: company.id,
        name: 'Parafusos & Fixadores Ltda.',
        type: 'PJ',
        cnpj: '22555888000172',
        email: 'comercial@parafusosfix.com.br',
        phone: '4732104567',
        status: 'APPROVED',
        rating: '4.00',
      },
    ])
    .returning()

  if (!supplierAco || !supplierParafusos) throw new Error('Falha ao criar fornecedores')

  await db.insert(supplierContacts).values([
    {
      supplierId: supplierAco.id,
      name: 'Roberto Vendas',
      email: 'roberto@acobrasil.com.br',
      phone: '11999990001',
      role: 'Gerente Comercial',
      isMain: 'Y',
    },
    {
      supplierId: supplierParafusos.id,
      name: 'Sandra Comercial',
      email: 'sandra@parafusosfix.com.br',
      phone: '47999990002',
      role: 'Representante',
      isMain: 'Y',
    },
  ])

  await db.insert(supplierBankAccounts).values([
    {
      supplierId: supplierAco.id,
      bank: 'Banco do Brasil',
      agency: '1234-5',
      account: '67890-1',
      accountType: 'CHECKING',
      pixKey: 'vendas@acobrasil.com.br',
      isPrimary: 'Y',
    },
    {
      supplierId: supplierParafusos.id,
      bank: 'Itaú',
      agency: '4321',
      account: '10987-6',
      accountType: 'CHECKING',
      pixKey: '22555888000172',
      isPrimary: 'Y',
    },
  ])

  await db.insert(supplierAddresses).values([
    {
      supplierId: supplierAco.id,
      street: 'Rod. Anhanguera, km 110',
      number: 's/n',
      city: 'Sumaré',
      state: 'SP',
      zipCode: '13170000',
    },
    {
      supplierId: supplierParafusos.id,
      street: 'Rua das Indústrias',
      number: '450',
      complement: 'Galpão 3',
      city: 'Joinville',
      state: 'SC',
      zipCode: '89220000',
    },
  ])

  // ─── 4. Produtos (+ vínculo produto↔fornecedor) ──────────────────────────────
  console.log('Criando produtos...')
  const [chapaAco, parafusoM8, tintaInd] = await db
    .insert(products)
    .values([
      {
        companyId: company.id,
        name: 'Chapa de Aço 2mm',
        code: 'CHAPA-2MM',
        description: 'Chapa de aço carbono laminada a frio, espessura 2mm.',
        unit: 'KG',
        minStock: '500.000',
      },
      {
        companyId: company.id,
        name: 'Parafuso Sextavado M8',
        code: 'PARA-M8',
        description: 'Parafuso sextavado M8 x 30mm, aço zincado.',
        unit: 'UN',
        minStock: '1000.000',
      },
      {
        companyId: company.id,
        name: 'Tinta Industrial Cinza',
        code: 'TINTA-CINZA',
        description: 'Tinta industrial epóxi cinza, balde 18L.',
        unit: 'L',
        minStock: '50.000',
      },
    ])
    .returning()

  if (!chapaAco || !parafusoM8 || !tintaInd) throw new Error('Falha ao criar produtos')

  await db.insert(productSuppliers).values([
    { productId: chapaAco.id, supplierId: supplierAco.id, isPreferred: true },
    { productId: parafusoM8.id, supplierId: supplierParafusos.id, isPreferred: true },
    { productId: tintaInd.id, supplierId: supplierParafusos.id, isPreferred: false },
  ])

  // ─── 5. Cotação (+ itens, fornecedores convidados, propostas e itens) ─────────
  console.log('Criando cotação, propostas e itens...')
  const [quotation] = await db
    .insert(quotations)
    .values({
      companyId: company.id,
      number: 'COT-2026-0001',
      title: 'Reposição de chapas e parafusos',
      description: 'Cotação para reposição de estoque do segundo trimestre.',
      deadline: daysAhead(5),
      paymentTerms: '30/60 dias',
      status: 'CLOSED',
      createdBy: compradorId,
      closedAt: daysAgo(2),
    })
    .returning()

  if (!quotation) throw new Error('Falha ao criar cotação')

  const [qiChapa, qiParafuso] = await db
    .insert(quotationItems)
    .values([
      {
        quotationId: quotation.id,
        productId: chapaAco.id,
        description: 'Chapa de Aço 2mm',
        quantity: '1000.000',
        unit: 'KG',
      },
      {
        quotationId: quotation.id,
        productId: parafusoM8.id,
        description: 'Parafuso Sextavado M8',
        quantity: '5000.000',
        unit: 'UN',
      },
    ])
    .returning()

  if (!qiChapa || !qiParafuso) throw new Error('Falha ao criar itens da cotação')

  await db.insert(quotationSuppliers).values([
    {
      quotationId: quotation.id,
      supplierId: supplierAco.id,
      status: 'RESPONDED',
      respondedAt: daysAgo(3),
    },
    {
      quotationId: quotation.id,
      supplierId: supplierParafusos.id,
      status: 'RESPONDED',
      respondedAt: daysAgo(3),
    },
  ])

  const [bidAco, bidParafusos] = await db
    .insert(bids)
    .values([
      {
        quotationId: quotation.id,
        supplierId: supplierAco.id,
        companyId: company.id,
        status: 'SELECTED',
        paymentTerms: '30 dias',
        observations: 'Melhor preço para a chapa.',
        submittedAt: daysAgo(3),
      },
      {
        quotationId: quotation.id,
        supplierId: supplierParafusos.id,
        companyId: company.id,
        status: 'SUBMITTED',
        paymentTerms: '30/60 dias',
        submittedAt: daysAgo(3),
      },
    ])
    .returning()

  if (!bidAco || !bidParafusos) throw new Error('Falha ao criar propostas')

  await db.insert(bidItems).values([
    {
      bidId: bidAco.id,
      quotationItemId: qiChapa.id,
      unitPrice: '12.50',
      deliveryDays: '7',
      observations: 'Entrega CIF.',
    },
    { bidId: bidAco.id, quotationItemId: qiParafuso.id, unitPrice: '0.35', deliveryDays: '10' },
    { bidId: bidParafusos.id, quotationItemId: qiChapa.id, unitPrice: '13.20', deliveryDays: '12' },
    {
      bidId: bidParafusos.id,
      quotationItemId: qiParafuso.id,
      unitPrice: '0.30',
      deliveryDays: '5',
    },
  ])

  // ─── 6. Pedidos de compra (+ itens) ──────────────────────────────────────────
  console.log('Criando pedidos de compra...')
  // PO recebido por completo (alimenta recebimento, estoque, NF, pagamento, frete).
  const [poRecebido] = await db
    .insert(purchaseOrders)
    .values({
      companyId: company.id,
      supplierId: supplierAco.id,
      quotationId: quotation.id,
      bidId: bidAco.id,
      number: 'PO-2026-0001',
      status: 'RECEIVED',
      totalAmount: '14250.00',
      notes: 'Pedido referente à cotação COT-2026-0001.',
      approvedById: adminId,
      approvedAt: daysAgo(8),
      sentAt: daysAgo(7),
      createdById: compradorId,
    })
    .returning()

  if (!poRecebido) throw new Error('Falha ao criar pedido de compra recebido')

  const [poiChapa, poiParafuso] = await db
    .insert(purchaseOrderItems)
    .values([
      {
        purchaseOrderId: poRecebido.id,
        productId: chapaAco.id,
        quantity: '1000.000',
        unitPrice: '12.50',
        totalPrice: '12500.00',
        receivedQuantity: '1000.000',
      },
      {
        purchaseOrderId: poRecebido.id,
        productId: parafusoM8.id,
        quantity: '5000.000',
        unitPrice: '0.35',
        totalPrice: '1750.00',
        receivedQuantity: '5000.000',
      },
    ])
    .returning()

  if (!poiChapa || !poiParafuso) throw new Error('Falha ao criar itens do pedido recebido')

  // PO enviado, aguardando recebimento.
  const [poPendente] = await db
    .insert(purchaseOrders)
    .values({
      companyId: company.id,
      supplierId: supplierParafusos.id,
      number: 'PO-2026-0002',
      status: 'SENT',
      totalAmount: '9000.00',
      approvedById: adminId,
      approvedAt: daysAgo(2),
      sentAt: daysAgo(1),
      createdById: compradorId,
    })
    .returning()

  if (!poPendente) throw new Error('Falha ao criar pedido de compra pendente')

  await db.insert(purchaseOrderItems).values({
    purchaseOrderId: poPendente.id,
    productId: tintaInd.id,
    quantity: '200.000',
    unitPrice: '45.00',
    totalPrice: '9000.00',
    receivedQuantity: '0.000',
  })

  // ─── 7. Armazéns, estoque e movimentações ────────────────────────────────────
  console.log('Criando armazéns, estoque e movimentações...')
  const [armazemCentral, armazemSecundario] = await db
    .insert(warehouses)
    .values([
      {
        companyId: company.id,
        name: 'Armazém Central',
        code: 'CENTRAL',
        location: 'Galpão principal — São Paulo/SP',
      },
      {
        companyId: company.id,
        name: 'Armazém Secundário',
        code: 'SEC-01',
        location: 'Filial — Guarulhos/SP',
      },
    ])
    .returning()

  if (!armazemCentral || !armazemSecundario) throw new Error('Falha ao criar armazéns')

  // ─── 8. Recebimento (+ itens) do PO recebido ─────────────────────────────────
  console.log('Criando recebimento...')
  const [receipt] = await db
    .insert(receipts)
    .values({
      companyId: company.id,
      purchaseOrderId: poRecebido.id,
      warehouseId: armazemCentral.id,
      receivedById: almoxarifeId,
      status: 'COMPLETE',
      notes: 'Mercadoria conferida e armazenada.',
      receivedAt: daysAgo(5),
    })
    .returning()

  if (!receipt) throw new Error('Falha ao criar recebimento')

  await db.insert(receiptItems).values([
    { receiptId: receipt.id, purchaseOrderItemId: poiChapa.id, receivedQuantity: '1000.000' },
    { receiptId: receipt.id, purchaseOrderItemId: poiParafuso.id, receivedQuantity: '5000.000' },
  ])

  // Movimentações: entradas do recebimento + uma saída manual de parafusos.
  await db.insert(stockMovements).values([
    {
      companyId: company.id,
      warehouseId: armazemCentral.id,
      productId: chapaAco.id,
      type: 'ENTRY',
      quantity: '1000.000',
      referenceType: 'receipt',
      referenceId: receipt.id,
      createdById: almoxarifeId,
    },
    {
      companyId: company.id,
      warehouseId: armazemCentral.id,
      productId: parafusoM8.id,
      type: 'ENTRY',
      quantity: '5000.000',
      referenceType: 'receipt',
      referenceId: receipt.id,
      createdById: almoxarifeId,
    },
    {
      companyId: company.id,
      warehouseId: armazemCentral.id,
      productId: parafusoM8.id,
      type: 'EXIT',
      quantity: '200.000',
      notes: 'Consumo em ordem de produção.',
      createdById: almoxarifeId,
    },
  ])

  // Saldo atual coerente com as movimentações acima.
  await db.insert(inventory).values([
    {
      companyId: company.id,
      warehouseId: armazemCentral.id,
      productId: chapaAco.id,
      quantity: '1000.000',
      minStock: '500.000',
    },
    {
      companyId: company.id,
      warehouseId: armazemCentral.id,
      productId: parafusoM8.id,
      quantity: '4800.000',
      minStock: '1000.000',
    },
  ])

  // ─── 9. Não conformidade (+ anexo, comentário) ───────────────────────────────
  console.log('Criando não conformidade...')
  const [nc] = await db
    .insert(nonConformities)
    .values({
      companyId: company.id,
      purchaseOrderId: poRecebido.id,
      supplierId: supplierAco.id,
      productId: parafusoM8.id,
      type: 'QUALITY',
      severity: 'MEDIUM',
      description: 'Lote de parafusos com rosca defeituosa em ~2% das peças.',
      status: 'ANALYZING',
      notes: 'Aguardando posição do fornecedor.',
      createdById: almoxarifeId,
    })
    .returning()

  if (!nc) throw new Error('Falha ao criar não conformidade')

  await db.insert(ncAttachments).values({
    nonConformityId: nc.id,
    fileName: 'foto-parafuso-defeito.jpg',
    fileUrl: 'https://storage.local/nc/foto-parafuso-defeito.jpg',
    fileSize: '184320',
    mimeType: 'image/jpeg',
    uploadedById: almoxarifeId,
  })

  await db.insert(ncComments).values({
    nonConformityId: nc.id,
    userId: adminId,
    text: 'Acionar fornecedor e solicitar reposição das peças defeituosas.',
  })

  // ─── 10. Nota fiscal (+ itens) ────────────────────────────────────────────────
  console.log('Criando nota fiscal...')
  const [invoice] = await db
    .insert(invoices)
    .values({
      companyId: company.id,
      purchaseOrderId: poRecebido.id,
      supplierId: supplierAco.id,
      number: 'NF-2026-00123',
      issueDate: daysAgo(5),
      totalAmount: '14250.00',
      taxAmount: '2565.00',
      status: 'VALIDATED',
      fileUrl: 'https://storage.local/nf/NF-2026-00123.pdf',
      validatedById: financeiroId,
      validatedAt: daysAgo(4),
    })
    .returning()

  if (!invoice) throw new Error('Falha ao criar nota fiscal')

  await db.insert(invoiceItems).values([
    {
      invoiceId: invoice.id,
      productId: chapaAco.id,
      description: 'Chapa de Aço 2mm',
      quantity: '1000.000',
      unitPrice: '12.50',
      totalPrice: '12500.00',
    },
    {
      invoiceId: invoice.id,
      productId: parafusoM8.id,
      description: 'Parafuso Sextavado M8',
      quantity: '5000.000',
      unitPrice: '0.35',
      totalPrice: '1750.00',
    },
  ])

  // ─── 11. Pagamento (+ parcelas) ───────────────────────────────────────────────
  console.log('Criando pagamento e parcelas...')
  const [payment] = await db
    .insert(payments)
    .values({
      companyId: company.id,
      invoiceId: invoice.id,
      totalAmount: '14250.00',
      method: 'BOLETO',
      status: 'PENDING',
      notes: 'Pagamento em 2 parcelas (30/60 dias).',
      createdById: financeiroId,
    })
    .returning()

  if (!payment) throw new Error('Falha ao criar pagamento')

  await db.insert(paymentInstallments).values([
    {
      paymentId: payment.id,
      installmentNumber: '1',
      amount: '7125.00',
      dueDate: daysAgo(1),
      paidAt: daysAgo(1),
      status: 'PAID',
    },
    {
      paymentId: payment.id,
      installmentNumber: '2',
      amount: '7125.00',
      dueDate: daysAhead(29),
      status: 'PENDING',
    },
  ])

  // ─── 12. Frete / expedição ────────────────────────────────────────────────────
  console.log('Criando frete...')
  await db.insert(shipments).values({
    companyId: company.id,
    purchaseOrderId: poRecebido.id,
    carrier: 'Transportadora Veloz',
    trackingCode: 'BR123456789',
    status: 'DELIVERED',
    estimatedDelivery: daysAgo(6),
    deliveredAt: daysAgo(5),
    notes: 'Entregue no Armazém Central.',
    createdById: transportadorId,
  })

  // ─── 13. Logs de auditoria ──────────────────────────────────────────────────
  console.log('Criando logs de auditoria...')
  await db.insert(auditLogs).values([
    {
      companyId: company.id,
      userId: compradorId,
      entity: 'PurchaseOrder',
      entityId: poRecebido.id,
      action: 'CREATE',
      after: { number: poRecebido.number, status: 'DRAFT', totalAmount: '14250.00' },
      ipAddress: '127.0.0.1',
    },
    {
      companyId: company.id,
      userId: adminId,
      entity: 'PurchaseOrder',
      entityId: poRecebido.id,
      action: 'APPROVE',
      before: { status: 'DRAFT' },
      after: { status: 'APPROVED' },
      ipAddress: '127.0.0.1',
    },
    {
      companyId: company.id,
      userId: financeiroId,
      entity: 'Invoice',
      entityId: invoice.id,
      action: 'VALIDATE',
      before: { status: 'PENDING' },
      after: { status: 'VALIDATED' },
      ipAddress: '127.0.0.1',
    },
  ])

  console.log('✅ Seed concluído.')
  console.log(`   Empresa: ${company.name} (CNPJ: ${company.cnpj})`)
  console.log('   Usuários (senha dev: Elos@2024!):')
  console.log('     SUPER_ADMIN ........ admin@elos.com.br')
  console.log('     ADMIN_EMPRESA ...... admin-empresa@elosdemo.com.br')
  console.log('     COMPRADOR .......... comprador@elosdemo.com.br')
  console.log('     ALMOXARIFE ......... almoxarife@elosdemo.com.br')
  console.log('     ANALISTA_FINANCEIRO  financeiro@elosdemo.com.br')
  console.log('     TRANSPORTADOR ...... transportador@elosdemo.com.br')

  await client.end()
}

seed().catch((err) => {
  console.error('❌ Seed falhou:', err)
  process.exit(1)
})
