'use client'

import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { LogOut, Settings, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Paleta de cores para avatar (igual ao protótipo)
const PALETTE = [
  '243 75% 59%',
  '199 89% 42%',
  '142 60% 40%',
  '262 60% 55%',
  '20 85% 52%',
  '330 65% 52%',
]
function avatarColor(name: string): string {
  return PALETTE[name.charCodeAt(0) % PALETTE.length] ?? PALETTE[0]!
}

interface UserMenuProps {
  name: string
  email: string
  currentCnpj: string
}

// Classe base dos itens do menu (cor e hover variam por item)
const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left text-[13.5px] transition-colors'

export function UserMenu({ name, email, currentCnpj }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const color = avatarColor(name)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function handleSignOut() {
    try {
      await authClient.signOut()
      router.push('/sign-in')
    } catch (error) {
      console.error('[UserMenu.signOut]', error)
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        className="cursor-pointer rounded-full p-px"
      >
        <div
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[13px] font-semibold tracking-[0.01em]"
          style={{
            background: `hsl(${color} / 0.13)`,
            color: `hsl(${color})`,
            borderColor: `hsl(${color} / 0.2)`,
          }}
        >
          {getInitials(name)}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-50 w-[230px] rounded-lg border border-border bg-card p-[5px] shadow-pop [animation:popIn_0.14s_ease]">
          {/* Nome do usuário */}
          <div className="px-[9px] pt-[7px] pb-[5px] text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            {name}
          </div>
          <div className="px-[9px] pb-[7px] text-[12.5px] text-muted-foreground">{email}</div>

          <div className="-mx-[5px] my-[5px] h-px bg-border" />

          <button type="button" className={cn(MENU_ITEM, 'text-foreground hover:bg-muted')}>
            <User size={15} strokeWidth={1.6} className="text-muted-foreground" /> Meu perfil
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              router.push(`/${currentCnpj}/settings`)
            }}
            className={cn(MENU_ITEM, 'text-foreground hover:bg-muted')}
          >
            <Settings size={15} strokeWidth={1.6} className="text-muted-foreground" /> Configurações
          </button>

          <div className="-mx-[5px] my-[5px] h-px bg-border" />

          <button
            type="button"
            onClick={handleSignOut}
            className={cn(MENU_ITEM, 'text-destructive hover:bg-destructive-soft')}
          >
            <LogOut size={15} strokeWidth={1.6} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
