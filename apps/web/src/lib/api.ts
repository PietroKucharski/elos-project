import type {
  CompanyResponse,
  CreateCompanyDto,
  InviteMemberDto,
  MemberResponse,
  MyCompany,
  UpdateCompanyDto,
  UpdateMemberRoleDto,
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
