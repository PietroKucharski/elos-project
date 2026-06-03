import type {
  ApproveSupplierDto,
  CompanyResponse,
  CreateCompanyDto,
  CreateSupplierBankAccountDto,
  CreateSupplierContactDto,
  CreateSupplierDto,
  InviteMemberDto,
  MemberResponse,
  MyCompany,
  RejectSupplierDto,
  SupplierBankAccountResponse,
  SupplierContactResponse,
  SupplierResponse,
  UpdateCompanyDto,
  UpdateMemberRoleDto,
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
