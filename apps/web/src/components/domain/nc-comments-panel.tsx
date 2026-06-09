'use client'

import { Button } from '@/components/ui/button'
import { addNcComment } from '@/lib/api'
import type { NcCommentResponse } from '@elos/shared'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface NcCommentsPanelProps {
  cnpj: string
  ncId: string
  comments: NcCommentResponse[]
}

export function NcCommentsPanel({ cnpj, ncId, comments }: NcCommentsPanelProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (text.trim().length === 0) return
    setSending(true)
    try {
      await addNcComment(cnpj, ncId, { text: text.trim() })
      setText('')
      router.refresh()
    } catch (error) {
      console.error('[NcCommentsPanel.handleSend]', error)
      toast.error('Erro ao enviar comentário.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Comentários ({comments.length})</h2>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{
                  background: `hsl(${(c.userName.charCodeAt(0) * 37) % 360} 60% 50%)`,
                }}
                aria-hidden="true"
              >
                {c.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      )}

      {/* Campo de novo comentário */}
      <div className="flex gap-2 pt-2 border-t">
        <textarea
          rows={2}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          placeholder="Adicionar comentário…"
          className="flex-1 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSend()
            }
          }}
          aria-label="Novo comentário"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={sending || text.trim().length === 0}
          aria-label="Enviar comentário"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
