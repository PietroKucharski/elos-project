'use client'

import { authClient } from '@/lib/auth-client'
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

  const menuItemBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '8px 9px',
    borderRadius: '0.375rem',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    fontSize: 13.5,
    cursor: 'pointer',
    transition: 'background .12s',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        style={{
          border: 'none',
          background: 'transparent',
          borderRadius: 999,
          padding: 1,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: `hsl(${color} / 0.13)`,
            color: `hsl(${color})`,
            border: `1px solid hsl(${color} / 0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          {getInitials(name)}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 50,
            width: 230,
            background: 'hsl(0 0% 100%)',
            border: '1px solid hsl(214 32% 91%)',
            borderRadius: '0.5rem',
            boxShadow:
              '0 4px 16px -2px hsl(222 47% 11% / 0.12), 0 2px 6px -2px hsl(222 47% 11% / 0.08)',
            padding: 5,
            animation: 'popIn .14s ease',
          }}
        >
          {/* Nome do usuário */}
          <div
            style={{
              padding: '7px 9px 5px',
              fontSize: 11,
              fontWeight: 600,
              color: 'hsl(215 16% 47%)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {name}
          </div>
          <div style={{ padding: '0 9px 7px', fontSize: 12.5, color: 'hsl(215 16% 47%)' }}>
            {email}
          </div>

          <div style={{ height: 1, background: 'hsl(214 32% 91%)', margin: '5px -5px' }} />

          <button
            type="button"
            style={{ ...menuItemBase, color: 'hsl(222 47% 11%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <User size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} /> Meu perfil
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              router.push(`/${currentCnpj}/settings`)
            }}
            style={{ ...menuItemBase, color: 'hsl(222 47% 11%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Settings size={15} strokeWidth={1.6} style={{ color: 'hsl(215 16% 47%)' }} />{' '}
            Configurações
          </button>

          <div style={{ height: 1, background: 'hsl(214 32% 91%)', margin: '5px -5px' }} />

          <button
            type="button"
            onClick={handleSignOut}
            style={{ ...menuItemBase, color: 'hsl(0 72% 51%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(0 86% 97%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={15} strokeWidth={1.6} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
