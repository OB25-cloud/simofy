import { createServerSupabase } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const { question } = await request.json()
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 })
  }

  const supabase = await createServerSupabase()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: activeClients },
    { data: jobs },
    { data: outstandingInvoices },
    { count: newLeads },
    { data: allInvoicesWithClient },
    { data: quotesWithJobType },
    { data: completedJobsThisMonth },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('jobs').select('id, status'),
    supabase.from('invoices').select('total, status').in('status', ['sent', 'overdue']),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('invoices').select('total, client_id, clients(name)'),
    supabase.from('quotes').select('total, jobs(job_type)'),
    supabase.from('jobs')
      .select('id, title, job_type, clients(name)')
      .eq('status', 'complete')
      .gte('created_at', startOfMonth),
  ])

  const jobCounts: Record<string, number> = {}
  for (const job of jobs ?? []) {
    jobCounts[job.status] = (jobCounts[job.status] ?? 0) + 1
  }

  const outstandingTotal = (outstandingInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const overdueTotal = (outstandingInvoices ?? []).filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total ?? 0), 0)

  // Top 5 clients by total invoice value
  const clientTotals: Record<string, { name: string; total: number }> = {}
  for (const inv of allInvoicesWithClient ?? []) {
    const clientName = (inv.clients as unknown as { name: string } | null)?.name ?? 'Unknown'
    if (!clientTotals[clientName]) clientTotals[clientName] = { name: clientName, total: 0 }
    clientTotals[clientName].total += inv.total ?? 0
  }
  const topClients = Object.values(clientTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Top 5 job types by total quote revenue
  const jobTypeRevenue: Record<string, number> = {}
  for (const q of quotesWithJobType ?? []) {
    const type = (q.jobs as unknown as { job_type: string | null } | null)?.job_type ?? 'General'
    jobTypeRevenue[type] = (jobTypeRevenue[type] ?? 0) + (q.total ?? 0)
  }
  const topJobTypes = Object.entries(jobTypeRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Quote totals for completed jobs this month
  const completedIds = (completedJobsThisMonth ?? []).map(j => j.id)
  let quoteTotalByJob: Record<string, number> = {}
  if (completedIds.length > 0) {
    const { data: completedQuotes } = await supabase
      .from('quotes')
      .select('job_id, total')
      .in('job_id', completedIds)
      .not('total', 'is', null)
    for (const q of completedQuotes ?? []) {
      if (q.job_id) quoteTotalByJob[q.job_id] = q.total ?? 0
    }
  }

  const completedJobsSummary = (completedJobsThisMonth ?? []).map(j => {
    const clientName = (j.clients as unknown as { name: string } | null)?.name ?? 'Unknown'
    const qt = quoteTotalByJob[j.id]
    return `${j.title ?? j.job_type ?? 'Untitled'} (${clientName})${qt != null ? ` — $${qt.toFixed(2)}` : ''}`
  })

  const summary = `
Business snapshot (currency: NZD, symbol $):
- Active clients: ${activeClients ?? 0}
- Total jobs: ${(jobs ?? []).length}
- Jobs by status: ${Object.entries(jobCounts).map(([s, c]) => `${s}: ${c}`).join(', ') || 'none'}
- Outstanding invoices total: $${outstandingTotal.toFixed(2)}
- Overdue invoices total: $${overdueTotal.toFixed(2)}
- New leads awaiting follow-up: ${newLeads ?? 0}

Top 5 clients by total invoice value:
${topClients.length > 0 ? topClients.map((c, i) => `  ${i + 1}. ${c.name}: $${c.total.toFixed(2)}`).join('\n') : '  No data'}

Top 5 job types by total quote revenue:
${topJobTypes.length > 0 ? topJobTypes.map(([type, rev], i) => `  ${i + 1}. ${type}: $${rev.toFixed(2)}`).join('\n') : '  No data'}

Completed jobs this month (${now.toLocaleString('default', { month: 'long', year: 'numeric' })}):
${completedJobsSummary.length > 0 ? completedJobsSummary.map(j => `  - ${j}`).join('\n') : '  None completed this month'}
`.trim()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a business assistant for a field service company using Simofy. Answer questions about the business concisely and helpfully using the data provided. All monetary values are in New Zealand Dollars (NZD) — always use the $ symbol. Keep answers short and actionable.`,
    messages: [
      {
        role: 'user',
        content: `Here is the current business data:\n\n${summary}\n\nQuestion: ${question}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ answer: text })
}
