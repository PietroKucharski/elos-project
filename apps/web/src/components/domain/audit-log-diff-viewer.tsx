'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

type JsonObject = Record<string, unknown>

function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isExpandable(v: unknown): v is JsonObject | unknown[] {
  return isObject(v) || Array.isArray(v)
}

function formatPrimitive(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

// Valor JSON renderizado de forma recursiva. Objetos e arrays são expansíveis;
// primitivos são exibidos inline.
function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 1)

  if (isExpandable(value)) {
    const entries: [string, unknown][] = Array.isArray(value)
      ? value.map((v, i) => [String(i), v])
      : Object.entries(value)

    if (entries.length === 0) {
      return (
        <span className="font-mono text-[12px] text-muted-foreground">
          {Array.isArray(value) ? '[ ]' : '{ }'}
        </span>
      )
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex cursor-pointer items-center gap-1 font-mono text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={cn('transition-transform', open && 'rotate-90')}
          />
          {Array.isArray(value) ? `Array(${entries.length})` : `Objeto(${entries.length})`}
        </button>
        {open && (
          <div className="mt-1 ml-1.5 border-l border-border pl-2.5">
            {entries.map(([k, v]) => (
              <div key={k} className="py-0.5">
                <span className="font-mono text-[12px] font-medium text-foreground-2">{k}: </span>
                <JsonValue value={v} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <span
      className={cn(
        'font-mono text-[12px] break-all',
        value === null || value === undefined ? 'text-muted-foreground italic' : 'text-foreground',
      )}
    >
      {formatPrimitive(value)}
    </span>
  )
}

type FieldStatus = 'added' | 'removed' | 'changed' | 'unchanged'

function fieldStatus(
  key: string,
  before: JsonObject | null,
  after: JsonObject | null,
): FieldStatus {
  // Status só faz sentido no modo lado a lado (before e after presentes).
  if (!before || !after) return 'unchanged'
  const inBefore = key in before
  const inAfter = key in after
  if (!inBefore) return 'added'
  if (!inAfter) return 'removed'
  return JSON.stringify(before[key]) === JSON.stringify(after[key]) ? 'unchanged' : 'changed'
}

const CELL_BG: Record<FieldStatus, string> = {
  added: 'bg-success-soft',
  removed: 'bg-destructive-soft',
  changed: 'bg-warning-soft',
  unchanged: '',
}

interface Props {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export function AuditLogDiffViewer({ before, after }: Props) {
  const showBefore = before !== null
  const showAfter = after !== null

  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ).sort()

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Sem dados de alteração para este registro.
      </div>
    )
  }

  // Layout de colunas: campo + (antes? + depois?).
  const cols = 1 + (showBefore ? 1 : 0) + (showAfter ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Cabeçalho */}
      <div
        className="grid border-b border-border bg-muted/40 text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase"
        style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${cols - 1}, 2fr)` }}
      >
        <div className="px-4 py-2.5">Campo</div>
        {showBefore && <div className="px-4 py-2.5">Antes</div>}
        {showAfter && <div className="px-4 py-2.5">Depois</div>}
      </div>

      {keys.map((key) => {
        const status = fieldStatus(key, before, after)
        const beforeHas = !!before && key in before
        const afterHas = !!after && key in after
        return (
          <div
            key={key}
            className="grid border-b border-border last:border-0"
            style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${cols - 1}, 2fr)` }}
          >
            <div className="px-4 py-2.5 font-mono text-[12px] font-medium text-foreground-2 break-all">
              {key}
            </div>
            {showBefore && (
              <div
                className={cn(
                  'px-4 py-2.5',
                  // No modo lado a lado, destaca a célula "antes" só para removido/alterado.
                  showAfter && (status === 'removed' || status === 'changed')
                    ? CELL_BG[status]
                    : '',
                )}
              >
                {beforeHas ? (
                  <JsonValue value={before?.[key]} />
                ) : (
                  <span className="text-[12px] text-muted-foreground italic">—</span>
                )}
              </div>
            )}
            {showAfter && (
              <div
                className={cn(
                  'px-4 py-2.5',
                  // Destaca a célula "depois" para adicionado/alterado.
                  showBefore && (status === 'added' || status === 'changed') ? CELL_BG[status] : '',
                )}
              >
                {afterHas ? (
                  <JsonValue value={after?.[key]} />
                ) : (
                  <span className="text-[12px] text-muted-foreground italic">—</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
