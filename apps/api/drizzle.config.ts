import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // DIRECT_URL para migrations: conexão direta, sem pgBouncer
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
