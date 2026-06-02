'use client'

import type { MyCompany } from '@elos/shared'
import { Bell, PanelLeft } from 'lucide-react'
import { CompanySwitcher } from './company-switcher'
import { Logo } from './logo'
import { UserMenu } from './user-menu'

interface TopbarProps {
  companyName: string
  companyCnpj: string
  myCompanies: MyCompany[]
  userName: string
  userEmail: string
}

// Contexto simples de colapso da sidebar — compartilhado via DOM
export function Topbar({
  companyName,
  companyCnpj,
  myCompanies,
  userName,
  userEmail,
}: TopbarProps) {
  function toggleSidebar() {
    const sidebar = document.getElementById('elos-sidebar')
    if (!sidebar) return
    const isCollapsed = sidebar.getAttribute('data-collapsed') === 'true'
    sidebar.setAttribute('data-collapsed', String(!isCollapsed))
    sidebar.style.width = !isCollapsed ? '64px' : '240px'
  }

  return (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        background: 'hsl(0 0% 100%)',
        borderBottom: '1px solid hsl(214 32% 91%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px 0 20px',
        gap: 16,
        zIndex: 30,
      }}
    >
      {/* Esquerda: toggle + logo + company switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Alternar menu lateral"
          style={{
            width: 36,
            height: 36,
            borderRadius: '0.375rem',
            border: 'none',
            background: 'transparent',
            color: 'hsl(215 16% 47%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <PanelLeft size={19} strokeWidth={1.6} />
        </button>

        {/* Separador */}
        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)' }} />

        <Logo size={18} />

        {/* Separador */}
        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)', margin: '0 2px' }} />

        <CompanySwitcher
          currentCnpj={companyCnpj}
          currentName={companyName}
          companies={myCompanies}
        />
      </div>

      {/* Direita: notificações + user menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          aria-label="Notificações"
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: '0.375rem',
            border: 'none',
            background: 'transparent',
            color: 'hsl(215 16% 47%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Bell size={19} strokeWidth={1.6} />
          {/* Ponto de notificação */}
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 9,
              width: 7,
              height: 7,
              borderRadius: 99,
              background: 'hsl(0 72% 51%)',
              border: '1.5px solid hsl(0 0% 100%)',
            }}
          />
        </button>

        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)', margin: '0 4px' }} />

        <UserMenu name={userName} email={userEmail} currentCnpj={companyCnpj} />
      </div>
    </header>
  )
}
