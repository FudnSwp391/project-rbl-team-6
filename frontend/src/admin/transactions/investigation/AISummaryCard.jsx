import { SectionCard } from '../components'
import SeverityBadge from './SeverityBadge'

export default function AISummaryCard({ analysis }) {
  if (!analysis) return null
  return (
    <SectionCard title="Tóm Tắt AI" icon="auto_awesome">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={analysis.risk_level} />
          <span className="text-xs text-gray-400">
            Nguồn: {analysis.ai_model_used === 'LLM_GEMINI' ? 'AI (Gemini)' : 'Quy tắc hệ thống'}
          </span>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{analysis.ai_summary}</p>
      </div>
    </SectionCard>
  )
}
