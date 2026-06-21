'use client'

import { useCallback, useState } from 'react'
import type { Quote, QuoteLineItem } from '@/lib/types'

interface Props {
  quote: Quote
  lineItems: QuoteLineItem[]
}

function qNum(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

function fmtDate(str: string | null | undefined) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtAmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

// Colour helpers
const DARK: [number, number, number]  = [17, 17, 17]
const GOLD: [number, number, number]  = [184, 146, 42]
const GRAY: [number, number, number]  = [107, 114, 128]
const LGRAY: [number, number, number] = [243, 244, 246]
const WHITE: [number, number, number] = [255, 255, 255]
const MUTED: [number, number, number] = [200, 200, 200]

export default function QuotePDFButton({ quote, lineItems }: Props) {
  const [busy, setBusy] = useState(false)

  const handleDownload = useCallback(async () => {
    setBusy(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210
      const H = 297
      const M = 20          // margin
      const CW = W - M * 2  // content width

      // ── Header bar ────────────────────────────────────────────────
      doc.setFillColor(...DARK)
      doc.rect(0, 0, W, 40, 'F')
      doc.setFillColor(...GOLD)
      doc.rect(0, 40, W, 1.5, 'F')

      // Brand name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(...WHITE)
      doc.text('SIMOFY', M, 17)

      // Tagline
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GOLD)
      doc.text('WAKATIPU LANDSCAPING', M, 23.5)

      // Address
      doc.setTextColor(...MUTED)
      doc.setFontSize(7.5)
      doc.text('Queenstown, New Zealand', M, 29)
      doc.text('info@simofy.co.nz  ·  +64 21 000 0000', M, 34.5)

      // QUOTE label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(...GOLD)
      doc.text('QUOTE', W - M, 19, { align: 'right' })

      // Quote number
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      doc.text(qNum(quote.id), W - M, 27, { align: 'right' })

      // ── Bill To + Dates ───────────────────────────────────────────
      let y = 52

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...GOLD)
      doc.text('BILL TO', M, y)

      y += 5.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...DARK)
      doc.text(quote.clients?.name ?? 'Unknown Client', M, y)

      if (quote.clients?.email) {
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...GRAY)
        doc.text(quote.clients.email, M, y)
      }
      if (quote.clients?.phone) {
        y += 4.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...GRAY)
        doc.text(quote.clients.phone, M, y)
      }

      // Dates (right side)
      const labelX = W - M - 55
      const valX = W - M
      let dy = 52

      const dateRow = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...GRAY)
        doc.text(label, labelX, dy)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...DARK)
        doc.text(value, valX, dy, { align: 'right' })
        dy += 6
      }

      dateRow('DATE', fmtDate(quote.created_at))
      if (quote.valid_until) dateRow('VALID UNTIL', fmtDate(quote.valid_until))

      // Divider
      y = Math.max(y, dy) + 10
      doc.setDrawColor(...LGRAY)
      doc.setLineWidth(0.4)
      doc.line(M, y, W - M, y)
      y += 8

      // ── Line Items table ──────────────────────────────────────────
      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [['Description', 'Qty', 'Unit Price', 'Amount']],
        body: lineItems.length
          ? lineItems.map(item => [
              item.description ?? '',
              String(item.quantity ?? 0),
              fmtAmt(item.unit_price),
              fmtAmt(item.amount),
            ])
          : [['No line items', '', '', '']],
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
          lineColor: LGRAY,
          lineWidth: 0.3,
          textColor: DARK,
        },
        headStyles: {
          fillColor: DARK,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: { top: 4.5, right: 4, bottom: 4.5, left: 4 },
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 22, halign: 'right' },
          2: { cellWidth: 36, halign: 'right' },
          3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      })

      // ── Totals ────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ty: number = (doc as any).lastAutoTable.finalY + 8
      const totLabelX = W - M - 65
      const totValX = W - M

      const totRow = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(bold ? 10.5 : 9)
        doc.setTextColor(...(bold ? DARK : GRAY))
        doc.text(label, totLabelX, ty)
        doc.text(value, totValX, ty, { align: 'right' })
        ty += 6.5
      }

      totRow('Subtotal', fmtAmt(quote.subtotal))
      totRow('GST (15%)', fmtAmt(quote.gst))

      ty += 1
      doc.setDrawColor(...GOLD)
      doc.setLineWidth(0.6)
      doc.line(totLabelX, ty - 2.5, W - M, ty - 2.5)
      ty += 2

      totRow('Total (NZD)', fmtAmt(quote.total), true)

      // ── Notes ─────────────────────────────────────────────────────
      if (quote.notes) {
        ty += 8
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...GOLD)
        doc.text('NOTES', M, ty)
        ty += 5.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...GRAY)
        const wrapped = doc.splitTextToSize(quote.notes, CW)
        doc.text(wrapped, M, ty)
      }

      // ── Footer ────────────────────────────────────────────────────
      doc.setFillColor(...DARK)
      doc.rect(0, H - 24, W, 24, 'F')
      doc.setFillColor(...GOLD)
      doc.rect(0, H - 24, W, 1.2, 'F')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...MUTED)
      doc.text('Payment due within 14 days of invoice date. Prices include GST.', M, H - 15)
      doc.text('Thank you for choosing Simofy — Wakatipu Landscaping.', M, H - 9.5)
      doc.setTextColor(...GOLD)
      doc.text('info@simofy.co.nz  ·  simofy.co.nz', W - M, H - 15, { align: 'right' })
      doc.text('+64 21 000 0000', W - M, H - 9.5, { align: 'right' })

      doc.save(`${qNum(quote.id)}.pdf`)
    } finally {
      setBusy(false)
    }
  }, [quote, lineItems])

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="flex items-center gap-1.5 px-4 py-3 sm:py-2 text-sm font-medium rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ background: '#111111', color: '#B8922A', border: '1px solid #B8922A' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {busy ? 'Generating…' : 'Download PDF'}
    </button>
  )
}
