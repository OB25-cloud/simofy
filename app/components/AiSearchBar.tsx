'use client'

import { useState, useRef } from 'react'

const SUGGESTIONS = [
  'Which invoices are overdue?',
  'Who is working today?',
  'What was revenue last month?',
  'Which quotes need a follow-up?',
]

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.7L19.5 9.5l-5.7 1.8L12 17l-1.8-5.7L4.5 9.5l5.7-1.8z" />
      <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" opacity=".6" />
    </svg>
  )
}

export default function AiSearchBar() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function ask(q: string) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await ask(question.trim())
  }

  function pick(s: string) {
    setQuestion(s)
    inputRef.current?.focus()
    void ask(s)
  }

  const canAsk = question.trim().length > 0 && !loading

  return (
    <section
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f1117 0%, #131b22 55%, #10241a 100%)',
        boxShadow: '0 0 0 1px rgba(74, 222, 128, 0.18), 0 20px 40px -20px rgba(17, 24, 39, 0.5), 0 0 60px -20px rgba(74, 222, 128, 0.35)',
      }}
    >
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(74,222,128,0.22), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/3 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(21,128,61,0.18), transparent)' }}
      />

      <div className="relative px-5 sm:px-6 pt-5 pb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: 'rgba(74,222,128,0.16)', color: 'var(--accent-bright)' }}>
            <SparkIcon size={13} />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-bright)' }}>
            Ask Operify
          </p>
          <span className="ml-auto text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Powered by Claude
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="flex items-center rounded-xl overflow-hidden transition-[box-shadow] duration-150 focus-within:shadow-[0_0_0_2px_rgba(74,222,128,0.45)]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="pl-4 pr-2 shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask anything about your business…"
              className="flex-1 py-3.5 pr-3 text-[15px] bg-transparent outline-none placeholder:text-white/40"
              style={{ color: 'rgba(255,255,255,0.92)' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!canAsk}
              className="m-1.5 px-4 py-2 rounded-lg text-sm font-semibold shrink-0 inline-flex items-center gap-1.5 transition-[filter,opacity] hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Thinking
                </>
              ) : (
                <>
                  Ask
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => pick(s)}
              disabled={loading}
              className="text-[12px] px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
            >
              {s}
            </button>
          ))}
        </div>

        {(answer || error) && (
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(74,222,128,0.16)', color: 'var(--accent-bright)', letterSpacing: '0.1em' }}
              >
                AI
              </span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Answer</span>
            </div>
            {error ? (
              <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {answer}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
