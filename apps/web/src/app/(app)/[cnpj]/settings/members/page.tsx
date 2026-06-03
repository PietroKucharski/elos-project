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
      <div className="mb-[22px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Membros da empresa e seus papéis de acesso.
          </p>
        </div>
        <InviteMemberSheet cnpj={cnpj} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <MembersTable cnpj={cnpj} members={members} currentUserId={session?.user.id ?? ''} />
      </div>
    </div>
  )
}
