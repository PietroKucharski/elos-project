import type {
  ApproveSupplierDto,
  BidComparisonResponse,
  BidItemResponse,
  BidResponse,
  CompanyResponse,
  CreateBidDto,
  CreateBidItemDto,
  CreateCompanyDto,
  CreateProductDto,
  CreatePurchaseOrderDto,
  CreateQuotationDto,
  CreateQuotationItemDto,
  CreateSupplierBankAccountDto,
  CreateSupplierContactDto,
  CreateSupplierDto,
  InviteMemberDto,
  InviteSupplierToQuotationDto,
  LinkProductSupplierDto,
  MemberResponse,
  MyCompany,
  ProductResponse,
  ProductSupplierResponse,
  PurchaseOrderItemResponse,
  PurchaseOrderResponse,
  QuotationItemResponse,
  QuotationResponse,
  QuotationSupplierResponse,
  RejectSupplierDto,
  SelectWinnerDto,
  SupplierBankAccountResponse,
  SupplierContactResponse,
  SupplierResponse,
  UpdateCompanyDto,
  UpdateMemberRoleDto,
  UpdateProductDto,
  UpdateProductSupplierDto,
  UpdateQuotationDto,
  UpdateQuotationItemDto,
  UpdateSupplierBankAccountDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
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
  if (!res.ok) return []
  return res.json() as Promise<PurchaseOrderResponse[]>
}

export async function getPurchaseOrderServer(
  cnpj: string,
  id: string,
): Promise<(PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }) | null> {
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/purchase-orders/${id}`, {
    headers: await sessionHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }>
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
