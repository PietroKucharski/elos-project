'use client'

import type { MyCompany } from '@elos/shared'
import { Building2, Check, ChevronsUpDown, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface CompanySwitcherProps {
  currentCnpj: string
  currentName: string
  companies: MyCompany[]
}

export function CompanySwitcher({ currentCnpj, currentName, companies }: CompanySwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Trocar empresa"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 40,
          padding: '0 10px 0 12px',
          background: 'transparent',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.375rem',
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
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'hsl(243 75% 59% / 0.13)',
            color: 'hsl(243 75% 59%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Building2 size={15} strokeWidth={1.6} />
        </div>
        <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'hsl(222 47% 11%)',
            }}
          >
            {currentName}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: 'hsl(215 16% 47%)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {currentCnpj}
          </div>
        </div>
        <ChevronsUpDown
          size={15}
          strokeWidth={1.6}
          style={{ color: 'hsl(215 20% 65%)', marginLeft: 2 }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            width: 300,
            background: 'hsl(0 0% 100%)',
            border: '1px solid hsl(214 32% 91%)',
            borderRadius: '0.5rem',
            boxShadow:
              '0 4px 16px -2px hsl(222 47% 11% / 0.12), 0 2px 6px -2px hsl(222 47% 11% / 0.08)',
            padding: 5,
            animation: 'popIn .14s ease',
          }}
        >
          {/* Header */}
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
            Empresas
          </div>

          {companies.map((company) => {
            const isActive = company.cnpj === currentCnpj
            return (
              <button
                type="button"
                key={company.cnpj}
                onClick={() => {
                  setOpen(false)
                  if (!isActive) router.push(`/${company.cnpj}/dashboard`)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Check
                  size={15}
                  strokeWidth={2}
                  style={{ color: 'hsl(243 75% 59%)', opacity: isActive ? 1 : 0, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 600 : 500,
                      color: 'hsl(222 47% 11%)',
                      lineHeight: 1.3,
                    }}
                  >
                    {company.companyName}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(215 16% 47%)',
                      fontFamily: 'monospace',
                      lineHeight: 1.3,
                    }}
                  >
                    {company.cnpj} · {company.role}
                  </div>
                </div>
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'hsl(214 32% 91%)', margin: '5px -5px' }} />

          {/* Gerenciar empresas (SUPER_ADMIN) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              router.push('/admin/companies')
            }}
            style={{
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
              color: 'hsl(222 47% 11%)',
              cursor: 'pointer',
              transition: 'background .12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Settings
              size={15}
              strokeWidth={1.6}
              style={{ color: 'hsl(215 16% 47%)', flexShrink: 0 }}
            />
            Gerenciar empresas
          </button>
        </div>
      )}
    </div>
  )
}
