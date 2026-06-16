'use client'

import { cn } from '@/lib/utils'
import type { Role } from '@elos/shared'
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  HelpCircle,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  cnpj: string
  role: Role
}

interface NavItem {
  key: string
  label: string
  icon: React.ElementType
  roles: Role[]
  badge?: number
}

const NAV_GROUPS = [
  {
    group: 'Principal',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: [
          'SUPER_ADMIN',
          'ADMIN_EMPRESA',
          'COMPRADOR',
          'ALMOXARIFE',
          'ANALISTA_FINANCEIRO',
          'TRANSPORTADOR',
        ],
      },
    ] as NavItem[],
  },
  {
    group: 'Compras',
    items: [
      {
        key: 'suppliers',
        label: 'Fornecedores',
        icon: Building2,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR'],
      },
      {
        key: 'products',
        label: 'Produtos',
        icon: Package,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE'],
      },
      {
        key: 'quotations',
        label: 'Cotações',
        icon: ClipboardList,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR'],
      },
      {
        key: 'purchase-orders',
        label: 'Pedidos de Compra',
        icon: ShoppingCart,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE'],
      },
    ] as NavItem[],
  },
  {
    group: 'Operações',
    items: [
      {
        key: 'receipts',
        label: 'Recebimentos',
        icon: ClipboardCheck,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ALMOXARIFE'],
      },
      {
        key: 'warehouses',
        label: 'Armazéns',
        icon: Warehouse,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ALMOXARIFE'],
      },
      {
        key: 'non-conformities',
        label: 'Não-Conformidades',
        icon: AlertTriangle,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'COMPRADOR', 'ALMOXARIFE'],
      },
    ] as NavItem[],
  },
  {
    group: 'Financeiro',
    items: [
      {
        key: 'invoices',
        label: 'Notas Fiscais',
        icon: Receipt,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO'],
      },
      {
        key: 'payments',
        label: 'Pagamentos',
        icon: CreditCard,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO'],
      },
    ] as NavItem[],
  },
  {
    group: 'Logística',
    items: [
      {
        key: 'logistics',
        label: 'Transportes',
        icon: Truck,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'TRANSPORTADOR'],
      },
    ] as NavItem[],
  },
  {
    group: 'Administração',
    items: [
      {
        key: 'settings',
        label: 'Configurações',
        icon: Settings,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'],
      },
      { key: 'users', label: 'Usuários', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'] },
      {
        key: 'audit-logs',
        label: 'Audit Log',
        icon: History,
        roles: ['SUPER_ADMIN', 'ADMIN_EMPRESA'],
      },
    ] as NavItem[],
  },
]

export function Sidebar({ cnpj, role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      id="elos-sidebar"
      data-collapsed="false"
      className="flex w-[var(--sidebar-w,240px)] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-background px-3 py-3.5 transition-[width] duration-200 ease-in-out"
    >
      {NAV_GROUPS.map((section) => {
        const visible = section.items.filter((item) => item.roles.includes(role))
        if (visible.length === 0) return null

        return (
          <div key={section.group} className="mb-1.5">
            {/* Label do grupo — oculto quando colapsado via CSS calc */}
            <div className="overflow-hidden px-2.5 pt-2.5 pb-1.5 text-[10.5px] font-bold tracking-[0.06em] whitespace-nowrap text-subtle-foreground uppercase">
              {section.group}
            </div>

            {visible.map((item) => {
              const href = `/${cnpj}/${item.key}`
              const isActive = pathname.startsWith(href)
              const Icon = item.icon

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    'relative mb-0.5 flex h-[38px] w-full items-center gap-[11px] rounded-md px-2.5 text-[13.5px] no-underline transition-colors',
                    isActive
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'font-medium text-foreground-2 hover:bg-muted',
                  )}
                >
                  {/* Indicador de item ativo: barra vertical esquerda */}
                  {isActive && (
                    <span className="absolute top-[7px] bottom-[7px] -left-3 w-[3px] rounded-r-[3px] bg-primary" />
                  )}
                  <Icon size={19} strokeWidth={isActive ? 1.9 : 1.6} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge != null && (
                    <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-destructive px-[5px] text-[11px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )
      })}

      {/* Card de ajuda no rodapé */}
      <div className="mt-auto p-3">
        <div className="flex items-start gap-2.5 rounded-lg bg-muted px-[13px] py-3">
          <HelpCircle
            size={17}
            strokeWidth={1.5}
            className="mt-px shrink-0 text-muted-foreground"
          />
          <div>
            <div className="text-[12.5px] font-semibold text-foreground">Central de ajuda</div>
            <div className="mt-px text-[11.5px] text-muted-foreground">Guias e atalhos do Elos</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
