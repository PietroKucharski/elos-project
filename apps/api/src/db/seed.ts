import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { auth } from '../modules/auth/better-auth'
import * as schema from './schema'
import { companies, companyMembers } from './schema'

async function seed() {
  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client, { schema })

  console.log('🌱 Iniciando seed...')

  // ─── 1. SUPER_ADMIN ─────────────────────────────────────────────────────
  console.log('Criando SUPER_ADMIN...')
  const superAdminResult = await auth.api.signUpEmail({
    body: {
      name: 'Super Admin',
      email: 'admin@elos.com.br',
      password: 'Elos@2024!', // dev only — alterar em produção
    },
  })

  if (!superAdminResult?.user) {
    throw new Error('Falha ao criar SUPER_ADMIN via Better-Auth')
  }
  const superAdminId = superAdminResult.user.id

  // ─── 2. Empresa de exemplo ──────────────────────────────────────────────
  console.log('Criando empresa de exemplo...')
  const [company] = await db
    .insert(companies)
    .values({
      name: 'Elos Demo Ltda.',
      tradeName: 'Elos Demo',
      cnpj: '00000000000191', // CNPJ inválido — apenas para dev
      email: 'contato@elosdemo.com.br',
      city: 'São Paulo',
      state: 'SP',
    })
    .returning()

  // ─── 3. SUPER_ADMIN como membro da empresa (role SUPER_ADMIN) ───────────
  await db.insert(companyMembers).values({
    companyId: company.id,
    userId: superAdminId,
    role: 'SUPER_ADMIN',
  })

  // ─── 4. ADMIN_EMPRESA (usuário separado) ────────────────────────────────
  console.log('Criando ADMIN_EMPRESA...')
  const adminResult = await auth.api.signUpEmail({
    body: {
      name: 'Admin Empresa',
      email: 'admin-empresa@elosdemo.com.br',
      password: 'Elos@2024!',
    },
  })

  if (!adminResult?.user) {
    throw new Error('Falha ao criar ADMIN_EMPRESA via Better-Auth')
  }

  await db.insert(companyMembers).values({
    companyId: company.id,
    userId: adminResult.user.id,
    role: 'ADMIN_EMPRESA',
  })

  console.log('✅ Seed concluído.')
  console.log(`   Empresa: ${company.name} (CNPJ: ${company.cnpj})`)
  console.log('   SUPER_ADMIN: admin@elos.com.br')
  console.log('   ADMIN_EMPRESA: admin-empresa@elosdemo.com.br')
  console.log('   Senha padrão dev: Elos@2024!')

  await client.end()
}

seed().catch((err) => {
  console.error('❌ Seed falhou:', err)
  process.exit(1)
})
