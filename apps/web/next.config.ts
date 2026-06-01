import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Obrigatório para o Dockerfile da unidade 0.2
  output: 'standalone',

  // Permite importar de packages/shared no monorepo
  transpilePackages: ['@elos/shared'],

  experimental: {
    // React 19 server actions
    serverActions: { allowedOrigins: ['localhost:3333'] },
  },
}

export default nextConfig
