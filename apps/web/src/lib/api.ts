import type {
  AddNcCommentDto,
  AnalyzeNcDto,
  ApproveSupplierDto,
  AuditLogResponse,
  BidComparisonResponse,
  BidItemResponse,
  BidResponse,
  CompanyResponse,
  CreateBidDto,
  CreateBidItemDto,
  CreateCompanyDto,
  CreateInvoiceDto,
  CreateInvoiceItemDto,
  CreateNonConformityDto,
  CreatePaymentDto,
  CreateProductDto,
  CreatePurchaseOrderDto,
  CreateQuotationDto,
  CreateQuotationItemDto,
  CreateReceiptDto,
  CreateSupplierBankAccountDto,
  CreateSupplierContactDto,
  CreateSupplierDto,
  CreateWarehouseDto,
  InstallmentResponse,
  InventoryResponse,
  InviteMemberDto,
  InviteSupplierToQuotationDto,
  InvoiceItemResponse,
  InvoiceResponse,
  LinkProductSupplierDto,
  MemberResponse,
  MyCompany,
  NcCommentResponse,
  NonConformityResponse,
  PayInstallmentDto,
  PaymentResponse,
  ProductResponse,
  ProductSupplierResponse,
  PurchaseOrderItemResponse,
  PurchaseOrderResponse,
  QuotationItemResponse,
  QuotationResponse,
  QuotationSupplierResponse,
  ReceiptResponse,
  RejectInvoiceDto,
  RejectNcDto,
  RejectSupplierDto,
  ResolveNcDto,
  SelectWinnerDto,
  SupplierBankAccountResponse,
  SupplierContactResponse,
  SupplierResponse,
  UpdateCompanyDto,
  UpdateInvoiceDto,
  UpdateMemberRoleDto,
  UpdateNonConformityDto,
  UpdatePaymentDto,
  UpdateProductDto,
  UpdateProductSupplierDto,
  UpdateQuotationDto,
  UpdateQuotationItemDto,
  UpdateSupplierBankAccountDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
  UpdateWarehouseDto,
  ValidateInvoiceDto,
  WarehouseResponse,
} from '@elos/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// ── Server-side (Server Components) ─────────────────────────────────────────
// Usa fetch nativo com cookie da sessão passado via headers(). `next/headers`
// é importado dinamicamente em cada função para que este módulo possa ser
// importado por Client Components (que usam apenas as mutações abaixo) sem
// arrastar a dependência server-only para o bundle do cliente.

async function sessionHeaders(): Promise<Record<string, string>> {
  const { headers } = await import('next/headers')
  const hdrs = await headers()
  return { cookie: hdrs.get('cookie') ?? '' }
}

export async function getMyCompaniesServer(): Promise<MyCompany[]> {
  const res = await fetch(`${API_URL}/v1/me/companies`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<MyCompany[]>
}

export async function getCompanyServer(cnpj: string): Promise<CompanyResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<CompanyResponse>
}

export async function getMembersServer(cnpj: string): Promise<MemberResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/members`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<MemberResponse[]>
}

export async function getAllCompaniesServer(): Promise<CompanyResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<CompanyResponse[]>
}

// ── Client-side (mutações via ky) ───────────────────────────────────────────
// Importação dinâmica do ky client evita que ele seja bundleado em Server
// Components. O export do client é `api` (ver lib/api-client.ts).

async function client() {
  const { api } = await import('@/lib/api-client')
  return api
}

export async function updateCompany(
  cnpj: string,
  data: UpdateCompanyDto,
): Promise<CompanyResponse> {
  return (await client()).patch(`v1/companies/${cnpj}`, { json: data }).json<CompanyResponse>()
}

export async function createCompany(data: CreateCompanyDto): Promise<CompanyResponse> {
  return (await client()).post('v1/companies', { json: data }).json<CompanyResponse>()
}

export async function inviteMember(cnpj: string, data: InviteMemberDto): Promise<MemberResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/members`, { json: data })
    .json<MemberResponse>()
}

export async function updateMemberRole(
  cnpj: string,
  userId: string,
  data: UpdateMemberRoleDto,
): Promise<void> {
  await (await client()).patch(`v1/companies/${cnpj}/members/${userId}`, { json: data })
}

export async function removeMember(cnpj: string, userId: string): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/members/${userId}`)
}

// ── Suppliers (server-side) ─────────────────────────────────────────────────

export async function getSuppliersServer(
  cnpj: string,
  params?: { status?: string; search?: string },
): Promise<SupplierResponse[]> {
  const url = new URL(`${API_URL}/v1/companies/${cnpj}/suppliers`)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.search) url.searchParams.set('search', params.search)
  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<SupplierResponse[]>
}

export async function getSupplierServer(
  cnpj: string,
  id: string,
): Promise<SupplierResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/suppliers/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<SupplierResponse>
}

export async function getSupplierContactsServer(
  cnpj: string,
  supplierId: string,
): Promise<SupplierContactResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/suppliers/${supplierId}/contacts`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<SupplierContactResponse[]>
}

export async function getSupplierBankAccountsServer(
  cnpj: string,
  supplierId: string,
): Promise<SupplierBankAccountResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<SupplierBankAccountResponse[]>
}

// ── Suppliers (client-side) ─────────────────────────────────────────────────

export async function createSupplier(
  cnpj: string,
  data: CreateSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers`, { json: data })
    .json<SupplierResponse>()
}

export async function updateSupplier(
  cnpj: string,
  id: string,
  data: UpdateSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/suppliers/${id}`, { json: data })
    .json<SupplierResponse>()
}

export async function approveSupplier(
  cnpj: string,
  id: string,
  data: ApproveSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${id}/approve`, { json: data })
    .json<SupplierResponse>()
}

export async function rejectSupplier(
  cnpj: string,
  id: string,
  data: RejectSupplierDto,
): Promise<SupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${id}/reject`, { json: data })
    .json<SupplierResponse>()
}

export async function addContact(
  cnpj: string,
  supplierId: string,
  data: CreateSupplierContactDto,
): Promise<SupplierContactResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${supplierId}/contacts`, { json: data })
    .json<SupplierContactResponse>()
}

export async function updateContact(
  cnpj: string,
  supplierId: string,
  contactId: string,
  data: UpdateSupplierContactDto,
): Promise<SupplierContactResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/suppliers/${supplierId}/contacts/${contactId}`, { json: data })
    .json<SupplierContactResponse>()
}

export async function removeContact(
  cnpj: string,
  supplierId: string,
  contactId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/suppliers/${supplierId}/contacts/${contactId}`,
  )
}

export async function addBankAccount(
  cnpj: string,
  supplierId: string,
  data: CreateSupplierBankAccountDto,
): Promise<SupplierBankAccountResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts`, { json: data })
    .json<SupplierBankAccountResponse>()
}

export async function updateBankAccount(
  cnpj: string,
  supplierId: string,
  accountId: string,
  data: UpdateSupplierBankAccountDto,
): Promise<SupplierBankAccountResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts/${accountId}`, {
      json: data,
    })
    .json<SupplierBankAccountResponse>()
}

export async function removeBankAccount(
  cnpj: string,
  supplierId: string,
  accountId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/suppliers/${supplierId}/bank-accounts/${accountId}`,
  )
}

// ── Products (server-side) ──────────────────────────────────────────────────

export async function getProductsServer(
  cnpj: string,
  params?: { search?: string; isActive?: string; unit?: string },
): Promise<ProductResponse[]> {
  const url = new URL(`${API_URL}/v1/companies/${cnpj}/products`)
  if (params?.search) url.searchParams.set('search', params.search)
  if (params?.isActive) url.searchParams.set('isActive', params.isActive)
  if (params?.unit) url.searchParams.set('unit', params.unit)
  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<ProductResponse[]>
}

export async function getProductServer(cnpj: string, id: string): Promise<ProductResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/products/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<ProductResponse>
}

// ── Products (client-side) ──────────────────────────────────────────────────

export async function createProduct(
  cnpj: string,
  data: CreateProductDto,
): Promise<ProductResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/products`, { json: data })
    .json<ProductResponse>()
}

export async function updateProduct(
  cnpj: string,
  id: string,
  data: UpdateProductDto,
): Promise<ProductResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/products/${id}`, { json: data })
    .json<ProductResponse>()
}

export async function deactivateProduct(cnpj: string, id: string): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/products/${id}`)
}

export async function linkSupplierToProduct(
  cnpj: string,
  productId: string,
  data: LinkProductSupplierDto,
): Promise<ProductSupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/products/${productId}/suppliers`, { json: data })
    .json<ProductSupplierResponse>()
}

export async function updateProductSupplierLink(
  cnpj: string,
  productId: string,
  supplierId: string,
  data: UpdateProductSupplierDto,
): Promise<ProductSupplierResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/products/${productId}/suppliers/${supplierId}`, { json: data })
    .json<ProductSupplierResponse>()
}

export async function unlinkSupplierFromProduct(
  cnpj: string,
  productId: string,
  supplierId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/products/${productId}/suppliers/${supplierId}`,
  )
}

// ── Quotations (server-side) ────────────────────────────────────────────────

export async function getQuotationsServer(
  cnpj: string,
  params?: { status?: string; search?: string },
): Promise<QuotationResponse[]> {
  const url = new URL(`${API_URL}/v1/companies/${cnpj}/quotations`)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.search) url.searchParams.set('search', params.search)
  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<QuotationResponse[]>
}

export async function getQuotationServer(
  cnpj: string,
  id: string,
): Promise<QuotationResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/quotations/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<QuotationResponse>
}

export async function getQuotationItemsServer(
  cnpj: string,
  quotationId: string,
): Promise<QuotationItemResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/items`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<QuotationItemResponse[]>
}

export async function getQuotationSuppliersServer(
  cnpj: string,
  quotationId: string,
): Promise<QuotationSupplierResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/suppliers`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<QuotationSupplierResponse[]>
}

// ── Quotations (client-side) ────────────────────────────────────────────────

export async function createQuotation(
  cnpj: string,
  data: CreateQuotationDto,
): Promise<QuotationResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations`, { json: data })
    .json<QuotationResponse>()
}

export async function updateQuotation(
  cnpj: string,
  id: string,
  data: UpdateQuotationDto,
): Promise<QuotationResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/quotations/${id}`, { json: data })
    .json<QuotationResponse>()
}

export async function publishQuotation(cnpj: string, id: string): Promise<QuotationResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${id}/publish`)
    .json<QuotationResponse>()
}

export async function closeQuotation(cnpj: string, id: string): Promise<QuotationResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${id}/close`)
    .json<QuotationResponse>()
}

export async function cancelQuotation(cnpj: string, id: string): Promise<void> {
  await (await client()).post(`v1/companies/${cnpj}/quotations/${id}/cancel`)
}

// ── Quotation Items (client-side) ───────────────────────────────────────────

export async function addQuotationItem(
  cnpj: string,
  quotationId: string,
  data: CreateQuotationItemDto,
): Promise<QuotationItemResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/items`, { json: data })
    .json<QuotationItemResponse>()
}

export async function updateQuotationItem(
  cnpj: string,
  quotationId: string,
  itemId: string,
  data: UpdateQuotationItemDto,
): Promise<QuotationItemResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/quotations/${quotationId}/items/${itemId}`, { json: data })
    .json<QuotationItemResponse>()
}

export async function removeQuotationItem(
  cnpj: string,
  quotationId: string,
  itemId: string,
): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/quotations/${quotationId}/items/${itemId}`)
}

// ── Quotation Suppliers / convites (client-side) ────────────────────────────

export async function inviteSupplierToQuotation(
  cnpj: string,
  quotationId: string,
  data: InviteSupplierToQuotationDto,
): Promise<QuotationSupplierResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/suppliers`, { json: data })
    .json<QuotationSupplierResponse>()
}

export async function removeSupplierFromQuotation(
  cnpj: string,
  quotationId: string,
  supplierId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/quotations/${quotationId}/suppliers/${supplierId}`,
  )
}

// ── Bids / Lances (server-side) ─────────────────────────────────────────────
// O detalhe de um lance (findOne) traz os itens junto; tipamos esse shape aqui
// pois `bidResponseSchema` em @elos/shared cobre apenas o lance "raso".

export type BidWithItems = BidResponse & { items: BidItemResponse[] }

export async function getBidsServer(cnpj: string, quotationId: string): Promise<BidResponse[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/bids`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<BidResponse[]>
  // 404 (cotação inexistente) é o único "vazio" esperado; demais status são
  // falhas reais e devem propagar para o error boundary da rota.
  if (res.status === 404) return []
  throw new Error(`getBidsServer falhou (${res.status}): ${await res.text()}`)
}

export async function getBidItemsServer(
  cnpj: string,
  quotationId: string,
  bidId: string,
): Promise<BidItemResponse[]> {
  const res = await fetch(
    `${API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/bids/${bidId}/items`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (res.ok) return res.json() as Promise<BidItemResponse[]>
  if (res.status === 404) return []
  throw new Error(`getBidItemsServer falhou (${res.status}): ${await res.text()}`)
}

export async function getBidComparisonServer(
  cnpj: string,
  quotationId: string,
): Promise<BidComparisonResponse | null> {
  const res = await fetch(
    `${API_URL}/v1/companies/${cnpj}/quotations/${quotationId}/bids/compare`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (res.ok) return res.json() as Promise<BidComparisonResponse>
  if (res.status === 404) return null
  throw new Error(`getBidComparisonServer falhou (${res.status}): ${await res.text()}`)
}

// ── Bids / Lances (client-side) ─────────────────────────────────────────────

export async function createBid(
  cnpj: string,
  quotationId: string,
  data: CreateBidDto,
): Promise<BidResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/bids`, { json: data })
    .json<BidResponse>()
}

export async function removeBid(cnpj: string, quotationId: string, bidId: string): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/quotations/${quotationId}/bids/${bidId}`)
}

export async function submitBid(
  cnpj: string,
  quotationId: string,
  bidId: string,
): Promise<BidResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/bids/${bidId}/submit`)
    .json<BidResponse>()
}

export async function addBidItem(
  cnpj: string,
  quotationId: string,
  bidId: string,
  data: CreateBidItemDto,
): Promise<BidItemResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/bids/${bidId}/items`, { json: data })
    .json<BidItemResponse>()
}

export async function removeBidItem(
  cnpj: string,
  quotationId: string,
  bidId: string,
  itemId: string,
): Promise<void> {
  await (await client()).delete(
    `v1/companies/${cnpj}/quotations/${quotationId}/bids/${bidId}/items/${itemId}`,
  )
}

export async function selectWinner(
  cnpj: string,
  quotationId: string,
  data: SelectWinnerDto,
): Promise<{ success: boolean; winnerBidId: string }> {
  return (await client())
    .post(`v1/companies/${cnpj}/quotations/${quotationId}/select-winner`, { json: data })
    .json<{ success: boolean; winnerBidId: string }>()
}

// ── Purchase Orders / Pedidos de Compra (server-side) ───────────────────────

export async function getPurchaseOrdersServer(
  cnpj: string,
  params?: {
    status?: string
    search?: string
    supplierId?: string
    page?: string
    limit?: string
  },
): Promise<PurchaseOrderResponse[]> {
  const url = new URL(`${API_URL}/v1/companies/${cnpj}/purchase-orders`)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.search) url.searchParams.set('search', params.search)
  if (params?.supplierId) url.searchParams.set('supplierId', params.supplierId)
  if (params?.page) url.searchParams.set('page', params.page)
  if (params?.limit) url.searchParams.set('limit', params.limit)

  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<PurchaseOrderResponse[]>
  // 404 (empresa/rota inexistente) é o único "vazio" esperado; 403/500/auth
  // devem propagar para o error boundary da rota.
  if (res.status === 404) return []
  throw new Error(`getPurchaseOrdersServer falhou (${res.status}): ${await res.text()}`)
}

export async function getPurchaseOrderServer(
  cnpj: string,
  id: string,
): Promise<(PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }) | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/purchase-orders/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok)
    return res.json() as Promise<PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }>
  // 404 (PO inexistente) → null para o caller chamar notFound(); demais falhas propagam.
  if (res.status === 404) return null
  throw new Error(`getPurchaseOrderServer falhou (${res.status}): ${await res.text()}`)
}

// ── Purchase Orders / Pedidos de Compra (client-side) ───────────────────────
// `receive` (SENT→RECEIVED) é acionado pela Fase 5 (Receipts), não pelo web aqui.

export async function createPurchaseOrder(
  cnpj: string,
  data: CreatePurchaseOrderDto,
): Promise<PurchaseOrderResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/purchase-orders`, { json: data })
    .json<PurchaseOrderResponse>()
}

export async function approvePurchaseOrder(
  cnpj: string,
  id: string,
): Promise<PurchaseOrderResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/purchase-orders/${id}/approve`)
    .json<PurchaseOrderResponse>()
}

export async function sendPurchaseOrder(cnpj: string, id: string): Promise<PurchaseOrderResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/purchase-orders/${id}/send`)
    .json<PurchaseOrderResponse>()
}

export async function cancelPurchaseOrder(
  cnpj: string,
  id: string,
): Promise<PurchaseOrderResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/purchase-orders/${id}/cancel`)
    .json<PurchaseOrderResponse>()
}

// ── Warehouses / Armazéns (server-side) ─────────────────────────────────────

export async function getWarehousesServer(
  cnpj: string,
  params?: { includeInactive?: string },
): Promise<WarehouseResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/warehouses${qs}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<WarehouseResponse[]>
}

export async function getWarehouseServer(
  cnpj: string,
  id: string,
): Promise<WarehouseResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/warehouses/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<WarehouseResponse>
}

export async function getInventoryServer(
  cnpj: string,
  params?: {
    warehouseId?: string
    productId?: string
    search?: string
    page?: string
    limit?: string
  },
): Promise<InventoryResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/warehouses/inventory${qs}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<InventoryResponse[]>
}

export async function getWarehouseInventoryServer(
  cnpj: string,
  warehouseId: string,
  params?: { search?: string; page?: string; limit?: string },
): Promise<InventoryResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(
    `${API_URL}/v1/companies/${cnpj}/warehouses/${warehouseId}/inventory${qs}`,
    { headers: await sessionHeaders(), cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json() as Promise<InventoryResponse[]>
}

// ── Warehouses / Armazéns (client-side) ─────────────────────────────────────

export async function createWarehouse(
  cnpj: string,
  data: CreateWarehouseDto,
): Promise<WarehouseResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/warehouses`, { json: data })
    .json<WarehouseResponse>()
}

export async function updateWarehouse(
  cnpj: string,
  id: string,
  data: UpdateWarehouseDto,
): Promise<WarehouseResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/warehouses/${id}`, { json: data })
    .json<WarehouseResponse>()
}

export async function deactivateWarehouse(cnpj: string, id: string): Promise<{ success: boolean }> {
  return (await client())
    .post(`v1/companies/${cnpj}/warehouses/${id}/deactivate`)
    .json<{ success: boolean }>()
}

// ── Recebimentos (server-side) ──────────────────────────────────────────────

export async function getReceiptsServer(
  cnpj: string,
  params?: {
    purchaseOrderId?: string
    warehouseId?: string
    status?: string
    page?: string
    limit?: string
  },
): Promise<ReceiptResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/receipts${qs}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<ReceiptResponse[]>
  // 404 (empresa/rota inexistente) é o único "vazio" esperado; 403/500/auth
  // devem propagar para o error boundary da rota.
  if (res.status === 404) return []
  throw new Error(`getReceiptsServer falhou (${res.status}): ${await res.text()}`)
}

export async function getReceiptServer(cnpj: string, id: string): Promise<ReceiptResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/receipts/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<ReceiptResponse>
  // 404 (recebimento inexistente) → null para o caller chamar notFound(); demais falhas propagam.
  if (res.status === 404) return null
  throw new Error(`getReceiptServer falhou (${res.status}): ${await res.text()}`)
}

// ── Recebimentos (client-side) ──────────────────────────────────────────────

export async function createReceipt(
  cnpj: string,
  data: CreateReceiptDto,
): Promise<ReceiptResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/receipts`, { json: data })
    .json<ReceiptResponse>()
}

// ── Não-Conformidades (server-side) ─────────────────────────────────────────

export async function getNonConformitiesServer(
  cnpj: string,
  params?: {
    status?: string
    type?: string
    severity?: string
    supplierId?: string
    purchaseOrderId?: string
    search?: string
    page?: string
    limit?: string
  },
): Promise<NonConformityResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/non-conformities${qs}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<NonConformityResponse[]>
}

export async function getNonConformityServer(
  cnpj: string,
  id: string,
): Promise<NonConformityResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/non-conformities/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<NonConformityResponse>
}

// ── Não-Conformidades (client-side) ─────────────────────────────────────────

export async function createNonConformity(
  cnpj: string,
  data: CreateNonConformityDto,
): Promise<NonConformityResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities`, { json: data })
    .json<NonConformityResponse>()
}

export async function updateNonConformity(
  cnpj: string,
  id: string,
  data: UpdateNonConformityDto,
): Promise<NonConformityResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/non-conformities/${id}`, { json: data })
    .json<NonConformityResponse>()
}

export async function analyzeNonConformity(
  cnpj: string,
  id: string,
  data?: AnalyzeNcDto,
): Promise<NonConformityResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/analyze`, { json: data ?? {} })
    .json<NonConformityResponse>()
}

export async function resolveNonConformity(
  cnpj: string,
  id: string,
  data: ResolveNcDto,
): Promise<NonConformityResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/resolve`, { json: data })
    .json<NonConformityResponse>()
}

export async function rejectNonConformity(
  cnpj: string,
  id: string,
  data: RejectNcDto,
): Promise<NonConformityResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/reject`, { json: data })
    .json<NonConformityResponse>()
}

export async function addNcComment(
  cnpj: string,
  id: string,
  data: AddNcCommentDto,
): Promise<NcCommentResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/non-conformities/${id}/comments`, { json: data })
    .json<NcCommentResponse>()
}

// ── Notas Fiscais / Invoices (server-side) ──────────────────────────────────

export async function getInvoicesServer(
  cnpj: string,
  params?: {
    status?: string
    supplierId?: string
    purchaseOrderId?: string
    search?: string
    page?: string
    limit?: string
  },
): Promise<InvoiceResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/invoices${qs}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<InvoiceResponse[]>
  // 404 (empresa/rota inexistente) é o único "vazio" esperado; 403/500/auth
  // devem propagar para o error boundary da rota.
  if (res.status === 404) return []
  throw new Error(`getInvoicesServer falhou (${res.status}): ${await res.text()}`)
}

export async function getInvoiceServer(cnpj: string, id: string): Promise<InvoiceResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/invoices/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<InvoiceResponse>
  // 404 (NF inexistente) → null para o caller chamar notFound(); demais falhas propagam.
  if (res.status === 404) return null
  throw new Error(`getInvoiceServer falhou (${res.status}): ${await res.text()}`)
}

// ── Notas Fiscais / Invoices (client-side) ──────────────────────────────────

export async function createInvoice(
  cnpj: string,
  data: CreateInvoiceDto,
): Promise<InvoiceResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/invoices`, { json: data })
    .json<InvoiceResponse>()
}

export async function updateInvoice(
  cnpj: string,
  id: string,
  data: UpdateInvoiceDto,
): Promise<InvoiceResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/invoices/${id}`, { json: data })
    .json<InvoiceResponse>()
}

export async function validateInvoice(
  cnpj: string,
  id: string,
  data: ValidateInvoiceDto,
): Promise<InvoiceResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/invoices/${id}/validate`, { json: data })
    .json<InvoiceResponse>()
}

export async function rejectInvoice(
  cnpj: string,
  id: string,
  data: RejectInvoiceDto,
): Promise<InvoiceResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/invoices/${id}/reject`, { json: data })
    .json<InvoiceResponse>()
}

export async function addInvoiceItem(
  cnpj: string,
  id: string,
  data: CreateInvoiceItemDto,
): Promise<InvoiceItemResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/invoices/${id}/items`, { json: data })
    .json<InvoiceItemResponse>()
}

export async function removeInvoiceItem(cnpj: string, id: string, itemId: string): Promise<void> {
  await (await client()).delete(`v1/companies/${cnpj}/invoices/${id}/items/${itemId}`)
}

// ── Pagamentos / Payments (server-side) ─────────────────────────────────────
// O detalhe (findOne) traz as parcelas junto; tipamos esse shape aqui pois
// `paymentResponseSchema` em @elos/shared marca `installments` como opcional.

export type PaymentWithInstallments = PaymentResponse & { installments: InstallmentResponse[] }

export async function getPaymentsServer(
  cnpj: string,
  params?: {
    status?: string
    method?: string
    invoiceId?: string
    search?: string
    page?: string
    limit?: string
  },
): Promise<PaymentResponse[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/payments${qs}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<PaymentResponse[]>
  // 404 (empresa/rota inexistente) é o único "vazio" esperado; 403/500/auth
  // devem propagar para o error boundary da rota.
  if (res.status === 404) return []
  throw new Error(`getPaymentsServer falhou (${res.status}): ${await res.text()}`)
}

export async function getPaymentServer(
  cnpj: string,
  id: string,
): Promise<PaymentWithInstallments | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/payments/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<PaymentWithInstallments>
  // 404 (pagamento inexistente) → null para o caller chamar notFound(); demais falhas propagam.
  if (res.status === 404) return null
  throw new Error(`getPaymentServer falhou (${res.status}): ${await res.text()}`)
}

// ── Pagamentos / Payments (client-side) ─────────────────────────────────────

export async function createPayment(
  cnpj: string,
  data: CreatePaymentDto,
): Promise<PaymentResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/payments`, { json: data })
    .json<PaymentResponse>()
}

export async function updatePayment(
  cnpj: string,
  id: string,
  data: UpdatePaymentDto,
): Promise<PaymentResponse> {
  return (await client())
    .patch(`v1/companies/${cnpj}/payments/${id}`, { json: data })
    .json<PaymentResponse>()
}

export async function cancelPayment(cnpj: string, id: string): Promise<PaymentResponse> {
  return (await client()).post(`v1/companies/${cnpj}/payments/${id}/cancel`).json<PaymentResponse>()
}

export async function payInstallment(
  cnpj: string,
  paymentId: string,
  installmentId: string,
  data: PayInstallmentDto,
): Promise<InstallmentResponse> {
  return (await client())
    .post(`v1/companies/${cnpj}/payments/${paymentId}/installments/${installmentId}/pay`, {
      json: data,
    })
    .json<InstallmentResponse>()
}

// ── Audit Logs (server-side) ────────────────────────────────────────────────
// Read-only: o audit log não tem mutações no frontend (o insert é interno aos
// Services da API). Apenas consultas server-side.

export async function getAuditLogsServer(
  cnpj: string,
  params?: {
    entity?: string
    action?: string
    userId?: string
    startDate?: string
    endDate?: string
    page?: string
    limit?: string
  },
): Promise<AuditLogResponse[]> {
  const url = new URL(`${API_URL}/v1/companies/${cnpj}/audit-logs`)
  if (params?.entity) url.searchParams.set('entity', params.entity)
  if (params?.action) url.searchParams.set('action', params.action)
  if (params?.userId) url.searchParams.set('userId', params.userId)
  if (params?.startDate) url.searchParams.set('startDate', params.startDate)
  if (params?.endDate) url.searchParams.set('endDate', params.endDate)
  if (params?.page) url.searchParams.set('page', params.page)
  if (params?.limit) url.searchParams.set('limit', params.limit)

  const res = await fetch(url.toString(), {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<AuditLogResponse[]>
  // 404 (empresa/rota inexistente) é o único "vazio" esperado; 403/500/auth
  // devem propagar para o error boundary da rota.
  if (res.status === 404) return []
  throw new Error(`getAuditLogsServer falhou (${res.status}): ${await res.text()}`)
}

export async function getAuditLogServer(
  cnpj: string,
  id: string,
): Promise<AuditLogResponse | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/audit-logs/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (res.ok) return res.json() as Promise<AuditLogResponse>
  // 404 (registro inexistente) → null para o caller chamar notFound(); demais falhas propagam.
  if (res.status === 404) return null
  throw new Error(`getAuditLogServer falhou (${res.status}): ${await res.text()}`)
}

export async function getAuditLogEntitiesServer(cnpj: string): Promise<string[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/audit-logs/entities`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<string[]>
}

export async function getAuditLogActionsServer(cnpj: string): Promise<string[]> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/audit-logs/actions`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<string[]>
}
