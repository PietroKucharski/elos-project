'use client'

// apps/web/src/components/domain/create-supplier-sheet.tsx

import { SupplierForm } from '@/components/domain/supplier-form'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { useState } from 'react'

interface CreateSupplierSheetProps {
  cnpj: string
}

// Sheet construído sobre as primitivas do Radix Dialog (e não sobre
// components/ui/sheet.tsx, intocável pela regra #10) para controlar o
// scrim com blur e a animação de entrada usando os keyframes do projeto
// (overlayIn / sheetIn definidos em globals.css).
export function CreateSupplierSheet({ cnpj }: CreateSupplierSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
      <SheetPrimitive.Trigger asChild>
        <Button>
          <Plus className="mr-1.5 h-[15px] w-[15px]" />
          Novo Fornecedor
        </Button>
      </SheetPrimitive.Trigger>

      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[5px] [animation:overlayIn_.2s_ease]" />

        <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-pop outline-none [animation:sheetIn_.32s_cubic-bezier(.32,.72,0,1)]">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <SheetPrimitive.Title className="text-base font-semibold text-foreground">
                Novo fornecedor
              </SheetPrimitive.Title>
              <SheetPrimitive.Description className="mt-0.5 text-[13px] text-muted-foreground">
                Cadastre um novo fornecedor para sua empresa.
              </SheetPrimitive.Description>
            </div>
            <SheetPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={17} strokeWidth={1.7} />
              </button>
            </SheetPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* SupplierForm já chama router.refresh() no sucesso, atualizando a lista. */}
            <SupplierForm
              mode="create"
              cnpj={cnpj}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  )
}
