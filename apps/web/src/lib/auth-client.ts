import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // BETTER_AUTH_URL aponta para a API onde o Better-Auth está montado
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
