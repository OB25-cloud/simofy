'use client'

import { useState, useRef } from 'react'

export default function AiSearchBar() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return

    setLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setAnswer(data.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ background: '#111', border: '1px solid rgba(184,146,42,0.3)' }}
        >
          <div className="pl-4 pr-2 shrink-0" style={{ color: 'rgba(184,146,42,0.7)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything about your business..."
            className="flex-1 py-3 pr-3 text-sm bg-transparent outline-none"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="px-4 py-3 text-xs font-semibold shrink-0 transition-opacity"
            style={{
              background: 'rgba(184,146,42,0.15)',
              color: '#B8922A',
              borderLeft: '1px solid rgba(184,146,42,0.2)',
              opacity: !question.trim() || loading ? 0.4 : 1,
            }}
          >
            {loading ? '...' : 'Ask'}
          </button>
        </div>
      </form>

      {(answer || error) && (
        <div
          className="mt-3 rounded-lg p-4"
          style={{ background: '#111', border: '1px solid rgba(184,146,42,0.25)' }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(184,146,42,0.2)', color: '#B8922A', letterSpacing: '0.1em' }}
            >
              AI
            </span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Powered by Claude
            </span>
          </div>
          {error ? (
            <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {answer}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
