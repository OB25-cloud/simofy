'use client'

import { useCallback, useState } from 'react'
import type { Invoice, QuoteLineItem } from '@/lib/types'

interface Props {
  invoice: Invoice
  lineItems: QuoteLineItem[]
}

function invNum(id: string) {
  return `INV-${id.slice(0, 6).toUpperCase()}`
}

function fmtDate(str: string | null | undefined) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtAmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—'
}

// Same document styling as the quote PDF so the two read as one set.
const DARK: [number, number, number]  = [17, 24, 39]
const GREEN: [number, number, number] = [21, 128, 61]
const RED: [number, number, number]   = [220, 38, 38]
const GRAY: [number, number, number]  = [107, 114, 128]
const LGRAY: [number, number, number] = [243, 244, 246]
const WHITE: [number, number, number] = [255, 255, 255]
const MUTED: [number, number, number] = [200, 200, 200]

export default function InvoicePDFButton({ invoice, lineItems }: Props) {
  const [busy, setBusy] = useState(false)

  const handleDownload = useCallback(async () => {
    setBusy(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210
      const M = 20
      const isPaid = invoice.status === 'paid'
      const isOverdue = invoice.status === 'overdue'

      // Header bar
      doc.setFillColor(...DARK)
      doc.rect(0, 0, W, 40, 'F')
      doc.setFillColor(...GREEN)
      doc.rect(0, 40, W, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(...WHITE)
      doc.text('RUNSITE', M, 17)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(74, 222, 128)
      doc.text('GREEN & CO LANDSCAPING', M, 23.5)
      doc.setTextColor(...MUTED)
      doc.setFontSize(7.5)
      doc.text('Queenstown, New Zealand', M, 29)
      doc.text('info@runsite.co.nz  ·  +64 21 000 0000', M, 34.5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(74, 222, 128)
      doc.text('INVOICE', W - M, 19, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      doc.text(invNum(invoice.id), W - M, 27, { align: 'right' })
      if (isPaid || isOverdue) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...(isPaid ? [74, 222, 128] as [number, number, number] : RED))
        doc.text(isPaid ? 'PAID' : 'OVERDUE', W - M, 33, { align: 'right' })
      }

      // Bill to
      let y = 52
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...GREEN)
      doc.text('BILL TO', M, y)
      y += 5.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...DARK)
      doc.text(invoice.clients?.name ?? 'Unknown Client', M, y)
      if (invoice.clients?.email) { y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY); doc.text(invoice.clients.email, M, y) }
      if (invoice.clients?.phone) { y += 4.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY); doc.text(invoice.clients.phone, M, y) }

      // Dates
      const labelX = W - M - 55
      const valX = W - M
      let dy = 52
      const dateRow = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...GRAY); doc.text(label, labelX, dy)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK); doc.text(value, valX, dy, { align: 'right' })
        dy += 6
      }
      dateRow('ISSUED', fmtDate(invoice.created_at))
      if (invoice.due_date) dateRow('DUE', fmtDate(invoice.due_date))
      if (invoice.paid_date) dateRow('PAID', fmtDate(invoice.paid_date))
      if (invoice.jobs?.title) dateRow('JOB', invoice.jobs.title)

      y = Math.max(y, dy) + 10
      doc.setDrawColor(...LGRAY); doc.setLineWidth(0.4); doc.line(M, y, W - M, y)
      y += 8

      const body = lineItems.length
        ? lineItems.map(item => [item.description ?? '', String(item.quantity ?? 0), fmtAmt(item.unit_price), fmtAmt(item.amount)])
        : [[invoice.jobs?.title ?? invoice.jobs?.job_type ?? 'Services rendered', '1', fmtAmt(invoice.amount), fmtAmt(invoice.amount)]]

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [['Description', 'Qty', 'Unit Price', 'Amount']],
        body,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 4, right: 4, bottom: 4, left: 4 }, lineColor: LGRAY, lineWidth: 0.3, textColor: DARK },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: { top: 4.5, right: 4, bottom: 4.5, left: 4 } },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 22, halign: 'right' }, 2: { cellWidth: 36, halign: 'right' }, 3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ty: number = (doc as any).lastAutoTable.finalY + 8
      const totLabelX = W - M - 65
      const totRow = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(bold ? 10.5 : 9)
        doc.setTextColor(...(bold ? DARK : GRAY))
        doc.text(label, totLabelX, ty)
        doc.text(value, W - M, ty, { align: 'right' })
        ty += 6.5
      }
      totRow('Subtotal', fmtAmt(invoice.amount))
      totRow('GST (15%)', fmtAmt(invoice.tax))
      ty += 1
      doc.setDrawColor(...GREEN); doc.setLineWidth(0.6); doc.line(totLabelX, ty - 2.5, W - M, ty - 2.5)
      ty += 2
      totRow(isPaid ? 'Total paid (NZD)' : 'Total due (NZD)', fmtAmt(invoice.total), true)

      if (invoice.notes) {
        ty += 6
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...GREEN); doc.text('NOTES', M, ty)
        ty += 5
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY)
        doc.text(doc.splitTextToSize(invoice.notes, W - M * 2), M, ty)
      }

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED)
      doc.text('Thank you for your business. Please quote the invoice number with your payment.', W / 2, 285, { align: 'center' })

      doc.save(`${invNum(invoice.id)}.pdf`)
    } finally {
      setBusy(false)
    }
  }, [invoice, lineItems])

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-white border border-line text-ink rounded-lg hover:bg-surface-muted hover:border-[#d6d3d1] transition-colors disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      {busy ? 'Preparing…' : 'Download PDF'}
    </button>
  )
}
