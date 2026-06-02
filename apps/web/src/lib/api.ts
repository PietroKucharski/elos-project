import type { CompanyResponse, MemberResponse, MyCompany } from '@elos/shared'
import { headers } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// ── Server-side (Server Components) ─────────────────────────────────────────
// Usa fetch nativo com cookie da sessão passado via headers()

export async function getMyCompaniesServer(): Promise<MyCompany[]> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/me/companies`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<MyCompany[]>
}

export async function getCompanyServer(cnpj: string): Promise<CompanyResponse | null> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<CompanyResponse>
}

export async function getMembersServer(cnpj: string): Promise<MemberResponse[]> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/companies/${cnpj}/members`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<MemberResponse[]>
}

export async function getAllCompaniesServer(): Promise<CompanyResponse[]> {
  const hdrs = await headers()
  const res = await fetch(`${API_URL}/v1/companies`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<CompanyResponse[]>
}
