// ── Export (Batch 41, spec Module 15) ────────────────────────────────────────
// Client-side only — reconciliation datasets are small and already fully
// loaded in the browser, so no backend export service is needed. Wires the
// previously-unimplemented ExportButton.onExport(format) callback.
//
// Uses `exceljs` rather than the more common `xlsx` package: xlsx (SheetJS
// community edition on npm) carries two unpatched high-severity advisories
// (prototype pollution, ReDoS) with no fix published to npm. exceljs's only
// added advisory is a moderate, low-relevance transitive `uuid` buffer-bounds
// issue (irrelevant here — we only ever generate an id internally, never
// parse attacker-controlled buffers).
//
// All three libraries (exceljs, jspdf, jspdf-autotable + jspdf's html2canvas
// dependency) are dynamically imported inside each function rather than at
// module top-level: they add ~1.4MB to this page's lazy chunk otherwise, for
// a feature most admin visits never trigger.

const fmtMoney = n => (n == null ? '' : 'đ' + Number(n).toLocaleString('vi-VN'))
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

async function loadPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable }
}

// ── Main reconciliation page export (checks + items) ─────────────────────────
export async function exportReconciliationExcel({ summary, checks, items }) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()

  const s1 = wb.addWorksheet('Tổng quan')
  s1.columns = [{ header: 'Chỉ số', key: 'k', width: 32 }, { header: 'Giá trị', key: 'v', width: 22 }]
  Object.entries(summary).forEach(([k, v]) => s1.addRow({ k, v }))

  const s2 = wb.addWorksheet('Kiểm tra đối soát')
  s2.columns = [
    { header: 'ID', key: 'id', width: 24 },
    { header: 'Tên', key: 'name', width: 40 },
    { header: 'Dự kiến', key: 'expected_amount', width: 16 },
    { header: 'Thực tế', key: 'actual_amount', width: 16 },
    { header: 'Chênh lệch', key: 'difference', width: 16 },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Mô tả', key: 'description', width: 60 },
  ]
  checks.forEach(c => s2.addRow(c))

  const s3 = wb.addWorksheet('Mục cần xem xét')
  s3.columns = [
    { header: 'Tiêu đề', key: 'title', width: 30 },
    { header: 'Loại', key: 'type', width: 14 },
    { header: 'Mô tả', key: 'description', width: 40 },
    { header: 'Số tiền', key: 'amount', width: 16 },
    { header: 'Mức độ', key: 'severity', width: 12 },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Ngày', key: 'created_at', width: 20 },
  ]
  items.forEach(it => s3.addRow(it))

  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `doi-soat-${Date.now()}.xlsx`
  )
}

export function exportReconciliationCSV({ items }) {
  const headers = ['Tiêu đề', 'Loại', 'Mô tả', 'Số tiền', 'Mức độ', 'Trạng thái', 'Ngày']
  const rows = items.map(it => [it.title, it.type, it.description, it.amount, it.severity, it.status, it.created_at])
  const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `doi-soat-muc-can-xem-xet-${Date.now()}.csv`)
}

export async function exportReconciliationPDF({ checks, items }) {
  const { jsPDF, autoTable } = await loadPdf()
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Báo Cáo Đối Soát Tài Chính', 14, 16)
  doc.setFontSize(9)
  doc.text(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [['Kiểm tra', 'Dự kiến', 'Thực tế', 'Chênh lệch', 'Trạng thái']],
    body: checks.map(c => [c.name, fmtMoney(c.expected_amount), fmtMoney(c.actual_amount), fmtMoney(c.difference), c.status]),
    styles: { fontSize: 8 },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Tiêu đề', 'Loại', 'Số tiền', 'Mức độ', 'Ngày']],
    body: items.map(it => [it.title, it.type, fmtMoney(it.amount), it.severity, fmtDate(it.created_at)]),
    styles: { fontSize: 8 },
  })

  doc.save(`doi-soat-${Date.now()}.pdf`)
}

// ── Investigation report export (one finding's full drawer content) ──────────
export async function exportInvestigationReportPDF({ findingData, analysis, timeline }) {
  const { jsPDF, autoTable } = await loadPdf()
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Báo Cáo Điều Tra Đối Soát', 14, 16)
  doc.setFontSize(11)
  doc.text(findingData.finding.name || findingData.finding.title || '', 14, 24)
  doc.setFontSize(9)
  doc.text(`Chênh lệch: ${fmtMoney(findingData.difference)} · Mức độ: ${findingData.severity}`, 14, 30)

  let y = 38
  const a = analysis?.analysis
  if (analysis?.ai_summary) {
    const lines = doc.splitTextToSize(`Tóm tắt AI: ${analysis.ai_summary}`, 180)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 4
  }
  if (a) {
    doc.text(`Nguyên nhân khả năng cao nhất: ${a.root_cause} (độ tin cậy ${a.confidence}%)`, 14, y)
    y += 6
    const impactLines = doc.splitTextToSize(`Tác động: ${a.impact}`, 180)
    doc.text(impactLines, 14, y)
    y += impactLines.length * 5 + 4
    if (a.supporting_evidence?.length) {
      doc.text('Bằng chứng hỗ trợ:', 14, y)
      y += 5
      for (const ev of a.supporting_evidence) {
        const lines = doc.splitTextToSize(`• ${ev}`, 175)
        doc.text(lines, 18, y)
        y += lines.length * 5
      }
      y += 4
    }
  }

  if (timeline?.length) {
    autoTable(doc, {
      startY: y,
      head: [['Dòng thời gian']],
      body: timeline.map(e => [`${e.label} — ${fmtDate(e.time)}`]),
      styles: { fontSize: 8 },
    })
  }

  doc.save(`dieu-tra-${(findingData.finding_key || 'bao-cao').replace(/[:\s]/g, '-')}-${Date.now()}.pdf`)
}
