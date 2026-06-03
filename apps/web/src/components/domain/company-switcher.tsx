'use client'

import { cn } from '@/lib/utils'
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
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Trocar empresa"
        aria-expanded={open}
        className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-transparent pr-2.5 pl-3 transition-colors hover:bg-muted"
      >
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-primary/[0.13] text-primary">
          <Building2 size={15} strokeWidth={1.6} />
        </div>
        <div className="text-left leading-[1.2]">
          <div className="max-w-[180px] truncate text-[13px] font-semibold text-foreground">
            {currentName}
          </div>
          <div className="font-mono text-[10.5px] text-muted-foreground">{currentCnpj}</div>
        </div>
        <ChevronsUpDown size={15} strokeWidth={1.6} className="ml-0.5 text-subtle-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[300px] rounded-lg border border-border bg-card p-[5px] shadow-pop [animation:popIn_0.14s_ease]">
          {/* Header */}
          <div className="px-[9px] pt-[7px] pb-[5px] text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
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
                className="flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left transition-colors hover:bg-muted"
              >
                <Check
                  size={15}
                  strokeWidth={2}
                  className={cn('shrink-0 text-primary', isActive ? 'opacity-100' : 'opacity-0')}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-[13.5px] leading-[1.3] text-foreground',
                      isActive ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {company.companyName}
                  </div>
                  <div className="font-mono text-[10.5px] leading-[1.3] text-muted-foreground">
                    {company.cnpj} · {company.role}
                  </div>
                </div>
              </button>
            )
          })}

          {/* Divider */}
          <div className="-mx-[5px] my-[5px] h-px bg-border" />

          {/* Gerenciar empresas (SUPER_ADMIN) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              router.push('/admin/companies')
            }}
            className="flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted"
          >
            <Settings size={15} strokeWidth={1.6} className="shrink-0 text-muted-foreground" />
            Gerenciar empresas
          </button>
        </div>
      )}
    </div>
  )
}
