'use client'

import type { Role } from '@elos/shared'
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
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
        key: 'audit',
        label: 'Audit Log',
        icon: ScrollText,
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
      style={{
        width: 'var(--sidebar-w, 240px)',
        flexShrink: 0,
        background: 'hsl(210 40% 98%)',
        borderRight: '1px solid hsl(214 32% 91%)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width .2s ease',
        padding: '14px 12px',
      }}
    >
      {NAV_GROUPS.map((section) => {
        const visible = section.items.filter((item) => item.roles.includes(role))
        if (visible.length === 0) return null

        return (
          <div key={section.group} style={{ marginBottom: 6 }}>
            {/* Label do grupo — oculto quando colapsado via CSS calc */}
            <div
              style={{
                padding: '10px 10px 6px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'hsl(215 20% 65%)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    width: '100%',
                    height: 38,
                    padding: '0 10px',
                    borderRadius: '0.375rem',
                    position: 'relative',
                    marginBottom: 2,
                    textDecoration: 'none',
                    background: isActive ? 'hsl(243 75% 96%)' : 'transparent',
                    color: isActive ? 'hsl(243 75% 59%)' : 'hsl(217 33% 17%)',
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 500,
                    transition: 'background .12s, color .12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = 'hsl(210 40% 96.1%)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {/* Indicador de item ativo: barra vertical esquerda */}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: -12,
                        top: 7,
                        bottom: 7,
                        width: 3,
                        background: 'hsl(243 75% 59%)',
                        borderRadius: '0 3px 3px 0',
                      }}
                    />
                  )}
                  <Icon size={19} strokeWidth={isActive ? 1.9 : 1.6} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge != null && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        minWidth: 19,
                        height: 19,
                        padding: '0 5px',
                        borderRadius: 99,
                        background: 'hsl(0 72% 51%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
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
      <div style={{ marginTop: 'auto', padding: 12 }}>
        <div
          style={{
            background: 'hsl(210 40% 96.1%)',
            borderRadius: '0.5rem',
            padding: '12px 13px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <HelpCircle
            size={17}
            strokeWidth={1.5}
            style={{ color: 'hsl(215 16% 47%)', marginTop: 1, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              Central de ajuda
            </div>
            <div style={{ fontSize: 11.5, color: 'hsl(215 16% 47%)', marginTop: 1 }}>
              Guias e atalhos do Elos
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
