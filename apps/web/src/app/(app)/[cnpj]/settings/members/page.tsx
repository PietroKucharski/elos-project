import { InviteMemberSheet } from '@/components/domain/invite-member-sheet'
import { MembersTable } from '@/components/domain/members-table'
import { getMembersServer } from '@/lib/api'
import { auth } from '@/lib/server-auth'
// apps/web/src/app/(app)/[cnpj]/settings/members/page.tsx
import { headers } from 'next/headers'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function MembersPage({ params }: Props) {
  const { cnpj } = await params
  const [session, members] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getMembersServer(cnpj),
  ])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 22,
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Usuários</h1>
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            Membros da empresa e seus papéis de acesso.
          </p>
        </div>
        <InviteMemberSheet cnpj={cnpj} />
      </div>

      <div
        style={{
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
          overflow: 'hidden',
        }}
      >
        <MembersTable cnpj={cnpj} members={members} currentUserId={session?.user.id ?? ''} />
      </div>
    </div>
  )
}
