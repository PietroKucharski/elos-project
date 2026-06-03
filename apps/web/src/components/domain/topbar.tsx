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
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card pr-[18px] pl-5">
      {/* Esquerda: toggle + logo + company switcher */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Alternar menu lateral"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
        >
          <PanelLeft size={19} strokeWidth={1.6} />
        </button>

        {/* Separador */}
        <div className="h-[26px] w-px bg-border" />

        <Logo size={18} />

        {/* Separador */}
        <div className="mx-0.5 h-[26px] w-px bg-border" />

        <CompanySwitcher
          currentCnpj={companyCnpj}
          currentName={companyName}
          companies={myCompanies}
        />
      </div>

      {/* Direita: notificações + user menu */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
        >
          <Bell size={19} strokeWidth={1.6} />
          {/* Ponto de notificação */}
          <span className="absolute top-2 right-[9px] h-[7px] w-[7px] rounded-full border-[1.5px] border-card bg-destructive" />
        </button>

        <div className="mx-1 h-[26px] w-px bg-border" />

        <UserMenu name={userName} email={userEmail} currentCnpj={companyCnpj} />
      </div>
    </header>
  )
}
