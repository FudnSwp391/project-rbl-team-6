import { SectionCard } from '../components'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')

export default function DifferenceAnalysisCard({ analysis }) {
  if (!analysis?.analysis) return null
  const a = analysis.analysis
  return (
    <SectionCard title="Phân Tích Chênh Lệch" icon="analytics">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Chênh lệch</p>
            <p className="font-bold text-gray-900">{fmtMoney(a.difference_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Độ tin cậy</p>
            <p className="font-bold text-gray-900">{a.confidence}%</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Nguyên nhân khả năng cao nhất</p>
            <p className="font-semibold text-gray-900">{a.root_cause}</p>
          </div>
        </div>

        {a.supporting_evidence?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Bằng chứng hỗ trợ</p>
            <ul className="space-y-1.5">
              {a.supporting_evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="material-symbols-outlined text-[14px] text-gray-400 mt-0.5">check</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Tác động</p>
          <p className="text-sm text-gray-700">{a.impact}</p>
        </div>
      </div>
    </SectionCard>
  )
}
