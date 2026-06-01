import { headers } from 'next/headers'

export type AuthSession = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
    emailVerified: boolean
    createdAt: string
    updatedAt: string
  }
  session: {
    id: string
    expiresAt: string
    token: string
  }
} | null

/**
 * Verifica a sessão do usuário fazendo uma requisição à API.
 * Deve ser chamado apenas em Server Components ou Route Handlers.
 *
 * Uso:
 *   const session = await auth.api.getSession({ headers: await headers() })
 *   if (!session) redirect('/sign-in')
 */
export const auth = {
  api: {
    async getSession(opts?: {
      headers?: Headers | (ReturnType<typeof headers> extends Promise<infer T> ? T : never)
    }): Promise<AuthSession> {
      const reqHeaders = opts?.headers ?? (await headers())
      const cookie = reqHeaders.get('cookie') ?? ''

      if (!cookie) return null

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`, {
          headers: { cookie },
          cache: 'no-store',
        })

        if (!response.ok) return null
        return response.json() as Promise<AuthSession>
      } catch {
        return null
      }
    },
  },
}
