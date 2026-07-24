// ── Export (Step 11) ─────────────────────────────────────────────────────
// Mirrors the pattern already established in
// frontend/src/admin/transactions/exportUtils.js: client-side only (result
// sets here are already small and loaded), exceljs over xlsx (see that file
// for the CVE rationale), jspdf/jspdf-autotable/html2canvas dynamically
// imported so they don't bloat this page's lazy chunk for the common case
// where nobody exports anything.

const fmtDate = iso => (iso ? new Date(iso).toLocaleString('vi-VN') : '')

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

export function exportAnalyticsCSV({ question, columns, rows }) {
  const csv = [columns, ...rows.map(r => columns.map(c => r[c]))].map(r => r.map(csvEscape).join(',')).join('\n')
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `ai-analytics-${Date.now()}.csv`)
}

export async function exportAnalyticsExcel({ question, summary, columns, rows }) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const s1 = wb.addWorksheet('Kết quả')
  s1.columns = columns.map(c => ({ header: c, key: c, width: 22 }))
  rows.forEach(r => s1.addRow(r))
  const s2 = wb.addWorksheet('Tóm tắt')
  s2.columns = [{ header: 'Câu hỏi', key: 'q', width: 50 }, { header: 'Tóm tắt', key: 's', width: 80 }]
  s2.addRow({ q: question, s: summary })
  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `ai-analytics-${Date.now()}.xlsx`)
}

export async function exportAnalyticsPDF({ question, summary, insights, columns, rows }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF()
  doc.setFontSize(13)
  doc.text('Báo Cáo AI Phân Tích Dữ Liệu', 14, 16)
  doc.setFontSize(9)
  doc.text(doc.splitTextToSize(`Câu hỏi: ${question}`, 180), 14, 24)
  const summaryLines = doc.splitTextToSize(summary || '', 180)
  doc.text(summaryLines, 14, 32)
  let y = 32 + summaryLines.length * 5 + 4
  if (insights?.length) {
    for (const ins of insights) {
      const lines = doc.splitTextToSize(`• ${ins}`, 175)
      doc.text(lines, 14, y)
      y += lines.length * 5
    }
    y += 4
  }
  if (rows?.length) {
    autoTable(doc, { startY: y, head: [columns], body: rows.map(r => columns.map(c => r[c] ?? '')), styles: { fontSize: 7 } })
  }
  doc.text(`Xuất lúc: ${fmtDate(new Date().toISOString())}`, 14, doc.internal.pageSize.getHeight() - 8)
  doc.save(`ai-analytics-${Date.now()}.pdf`)
}

export async function copySummaryToClipboard(summary, insights) {
  const text = [summary, ...(insights || []).map(i => `- ${i}`)].join('\n')
  await navigator.clipboard.writeText(text)
}

export async function copyTableToClipboard({ columns, rows }) {
  const tsv = [columns, ...rows.map(r => columns.map(c => r[c] ?? ''))].map(r => r.join('\t')).join('\n')
  await navigator.clipboard.writeText(tsv)
}

export async function copyChartAsImage(chartEl) {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(chartEl, { backgroundColor: '#ffffff', scale: 2 })
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Không thể tạo ảnh biểu đồ.')
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
