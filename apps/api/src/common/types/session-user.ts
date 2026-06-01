import type { Role } from '@elos/shared'

export interface SessionUser {
  id: string // Better-Auth user id (text no banco)
  email: string
  name: string
  role: Role | null // papel na empresa ativa; null em rotas sem /:cnpj
  companyId: string | null // uuid da empresa ativa no banco
}
