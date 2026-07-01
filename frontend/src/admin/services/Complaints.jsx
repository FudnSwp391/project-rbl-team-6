import { useState, useEffect } from 'react'
import { PageHeader, StatusBadge, SearchFilterBar, EmptyState, ModalOverlay } from '../transactions/components'
import { AI_CONFIG } from '../ai/config'
import { getAuditLogs } from './auditMockData'
import { buildCaseContext } from '../ai/aggregator/buildCaseContext'
import { evaluateCase } from '../ai/engine/index'
import { executeAction, setAuditLogCallback } from '../ai/engine/actionEngine'

const AIOperationsDashboard = ({ complaints }) => {
  const total = complaints.length
  const autoResolved = complaints.filter(c => c.status === AI_CONFIG.CASE_STATUS.CLOSED_BY_AI).length
  const needsReview = complaints.filter(c => c.status === AI_CONFIG.CASE_STATUS.AWAITING_ADMIN).length
  const critical = complaints.filter(c => c.severity === 'CRITICAL').length
  const autoRate = total > 0 ? Math.round((autoResolved / total) * 100) : 0

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <p className="text-xs text-gray-500 font-bold uppercase">Total Cases Today</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-b-4 border-b-emerald-500">
        <p className="text-xs text-gray-500 font-bold uppercase">AI Auto Resolved</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">{autoResolved}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-b-4 border-b-blue-500">
        <p className="text-xs text-gray-500 font-bold uppercase">Automation Rate</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{autoRate}%</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-b-4 border-b-amber-500">
        <p className="text-xs text-gray-500 font-bold uppercase">Needs Review</p>
        <p className="text-2xl font-bold text-amber-600 mt-1">{needsReview}</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-b-4 border-b-red-500">
        <p className="text-xs text-gray-500 font-bold uppercase">Critical Alerts</p>
        <p className="text-2xl font-bold text-red-600 mt-1">{critical}</p>
      </div>
    </div>
  )
}

const getSLABadge = (createdAt, severity) => {
  const targetHours = AI_CONFIG.sla[severity || 'LOW'] || 72
  const deadline = new Date(new Date(createdAt).getTime() + targetHours * 60 * 60 * 1000)
  const now = new Date()
  
  if (now > deadline) {
    return <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">OVERDUE</span>
  }
  const hoursLeft = (deadline - now) / (1000 * 60 * 60)
  if (hoursLeft < 2) {
    return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">DUE SOON</span>
  }
  return <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">ON TRACK</span>
}

export default function Complaints({ complaints, onUpdateComplaint, onAddDispute, onNavigate }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('INFO') // INFO, AI, TIMELINE
  
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [localLogs, setLocalLogs] = useState([])
  const [overrideModal, setOverrideModal] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  useEffect(() => {
    setAuditLogCallback((newLog) => {
      setLocalLogs(prev => [...prev, newLog])
    })
  }, [])

  const handleSelectCase = async (c) => {
    setSelected(c)
    setActiveTab('INFO')
    setAiResult(null)
    setLocalLogs(getAuditLogs(c.id))
    
    // Auto trigger AI evaluation
    setAiLoading(true)
    const ctx = buildCaseContext(c)
    const result = await evaluateCase(ctx)
    setAiResult(result)
    setAiLoading(false)

    // Update case if AI escalated it
    if (result.severity === 'CRITICAL' || result.actionCode === AI_CONFIG.ACTION_CODES.MANUAL_REVIEW) {
      if (c.status === 'OPEN') {
        const updateStatus = (id, st) => onUpdateComplaint(id, { status: st, severity: result.severity })
        executeAction(result.actionCode, c.id, 'SYSTEM', 'AI_ENGINE', updateStatus, { msg: 'AI Assessed and requested manual review' })
      }
    }
  }

  const filtered = complaints.filter(c => 
    c.id.toLowerCase().includes(search.toLowerCase()) || 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.caseId.toLowerCase().includes(search.toLowerCase())
  )

  const handleAction = (actionType) => {
    const updateStatus = (id, st) => onUpdateComplaint(id, { status: st })
    
    if (actionType === 'ACCEPT') {
      executeAction(aiResult.actionCode, selected.id, 'ADMIN', 'Admin-01', updateStatus, { reason: 'Accepted AI Recommendation' })
    } 
    else if (actionType === 'REQUEST_EVIDENCE') {
      executeAction(AI_CONFIG.ACTION_CODES.REQUEST_EVIDENCE, selected.id, 'ADMIN', 'Admin-01', updateStatus, { reason: 'Admin requested more evidence' })
    }
    else if (actionType === 'MANUAL') {
      executeAction(AI_CONFIG.ACTION_CODES.MANUAL_REVIEW, selected.id, 'ADMIN', 'Admin-01', updateStatus, { reason: 'Admin override (Manual Review)' })
    }
  }

  const submitOverride = () => {
    const updateStatus = (id, st) => onUpdateComplaint(id, { status: st })
    executeAction(AI_CONFIG.ACTION_CODES.MANUAL_REVIEW, selected.id, 'ADMIN', 'Admin-01', updateStatus, { reason: `ADMIN_OVERRIDE: ${overrideReason}` })
    setOverrideModal(false)
    setOverrideReason('')
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="AI Case Assistant" subtitle="Hệ thống hỗ trợ ra quyết định thông minh" />
      
      <AIOperationsDashboard complaints={complaints} />

      <div className="grid grid-cols-3 gap-6 min-h-[600px]">
        {/* Left List */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <SearchFilterBar search={search} onSearch={setSearch} placeholder="Tìm ID, Case, Tiêu đề..." />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filtered.length === 0 ? (
              <EmptyState icon="report_problem" title="Không có khiếu nại" />
            ) : (
              filtered.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => handleSelectCase(c)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-100'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500">{c.id}</span>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{c.caseId}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-2">{c.title}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={c.status} />
                    {c.severity && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{c.severity}</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                    {getSLABadge(c.createdAt, c.severity)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Header & Tabs */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selected.title}</h2>
                    <p className="text-sm font-semibold text-gray-500">Case ID: <span className="text-blue-600">{selected.caseId}</span> | {selected.id}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab('INFO')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'INFO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Thông tin</button>
                  <button onClick={() => setActiveTab('AI')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'AI' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    AI Assessment {aiResult && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded-full">Ready</span>}
                  </button>
                  <button onClick={() => setActiveTab('TIMELINE')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'TIMELINE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Timeline</button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                
                {/* INFO TAB */}
                {activeTab === 'INFO' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Người gửi</p>
                        <div className="flex items-center gap-3">
                          <img src={selected.sender.avatar || `https://ui-avatars.com/api/?name=${selected.sender.name}`} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{selected.sender.name}</p>
                            <p className="text-xs text-gray-500">{selected.sender.role}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Người bị khiếu nại</p>
                        <div className="flex items-center gap-3">
                          <img src={selected.target.avatar || `https://ui-avatars.com/api/?name=${selected.target.name}`} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{selected.target.name}</p>
                            <p className="text-xs text-gray-500">{selected.target.role}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-900 mb-2">Nội dung phản ánh</p>
                      <div className="p-4 bg-white rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100 shadow-sm">
                        {selected.content}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI TAB */}
                {activeTab === 'AI' && (
                  <div className="animate-fadeIn">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                        <span className="material-symbols-outlined text-4xl animate-spin mb-4">sync</span>
                        <p className="text-sm font-bold">AI đang phân tích ngữ cảnh...</p>
                      </div>
                    ) : aiResult ? (
                      <div className="space-y-4">
                        {aiResult.confidence < 70 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-center gap-2">
                            <span className="material-symbols-outlined">warning</span>
                            <span>AI có độ tin cậy thấp ({aiResult.confidence}%). Khuyến nghị Admin kiểm tra kỹ trước khi quyết định.</span>
                          </div>
                        )}
                        
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-300">psychology</span>
                              <h3 className="font-bold">AI Case Assistant</h3>
                            </div>
                            <div className="flex gap-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded bg-white/20`}>{aiResult.severity}</span>
                              <span className={`text-xs font-bold px-2 py-1 rounded bg-white/20`}>{aiResult.sentiment}</span>
                            </div>
                          </div>
                          <div className="p-6 space-y-6">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Đề xuất xử lý (Action Code: {aiResult.actionCode})</p>
                              <p className="text-base font-bold text-gray-900">{aiResult.recommendation}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Lập luận (Reasoning)</p>
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{aiResult.reasoning}</p>
                            </div>
                            
                            {['OPEN', 'AWAITING_ADMIN', 'AI_ASSESSED'].includes(selected.status) ? (
                              <div className="pt-4 border-t border-gray-100 flex gap-3">
                                {aiResult.severity !== 'CRITICAL' && (
                                  <button onClick={() => handleAction('ACCEPT')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors">
                                    Chấp nhận đề xuất
                                  </button>
                                )}
                                <button onClick={() => handleAction('REQUEST_EVIDENCE')} className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold rounded-lg transition-colors">
                                  Request More Evidence
                                </button>
                                <button 
                                  onClick={() => {
                                    if (['CRITICAL', 'HIGH'].includes(aiResult.severity)) {
                                      setOverrideModal(true)
                                    } else {
                                      handleAction('MANUAL')
                                    }
                                  }} 
                                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-lg transition-colors"
                                >
                                  {aiResult.severity === 'CRITICAL' ? 'Manual Review (Admin)' : 'Override'}
                                </button>
                              </div>
                            ) : selected.status === 'PENDING_EVIDENCE' ? (
                              <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <div className="flex-1 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                                  Đang chờ người dùng bổ sung bằng chứng
                                </div>
                                <button 
                                  onClick={() => {
                                    const updateStatus = (id, st) => onUpdateComplaint(id, { status: st })
                                    executeAction(AI_CONFIG.ACTION_CODES.MANUAL_REVIEW, selected.id, 'USER', selected.sender.name, updateStatus, { msg: 'User submitted evidence via Portal' })
                                  }} 
                                  className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                                  title="Giả lập người dùng nộp bằng chứng từ Frontend của họ"
                                >
                                  [Demo] Khách đã nộp
                                </button>
                              </div>
                            ) : (
                              <div className="pt-4 border-t border-gray-100">
                                <div className="p-3 bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-gray-100">
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                  Vụ việc đã đóng (Trạng thái: {selected.status})
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon="error" title="Lỗi phân tích" />
                    )}
                  </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'TIMELINE' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Lịch sử truy vết (Audit Trail)</h3>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                      {localLogs.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center">Chưa có bản ghi nào.</p>
                      ) : (
                        localLogs.map((log, i) => (
                          <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-600 text-slate-50 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                              <span className="material-symbols-outlined text-[16px]">
                                {log.actorType === 'USER' ? 'person' : log.actorType === 'AI' || log.actorType === 'SYSTEM' ? 'smart_toy' : 'admin_panel_settings'}
                              </span>
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                                <time className="text-xs font-medium text-slate-500">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</time>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Actor: <span className="font-semibold text-blue-600">{log.actorId}</span> ({log.actorType})</p>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                                  {JSON.stringify(log.metadata)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon="touch_app" title="Chọn một khiếu nại" description="Click vào danh sách bên trái để bắt đầu." />
            </div>
          )}
        </div>
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <ModalOverlay onClose={() => setOverrideModal(false)}>
          <div className="w-[480px]">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Lý do Override</h3>
            <p className="text-sm text-gray-600 mb-4">Vui lòng cung cấp lý do bạn từ chối đề xuất của AI để phục vụ việc Fine-tune sau này.</p>
            <div className="space-y-2 mb-6">
              {['Có bằng chứng mới', 'AI đánh giá sai mức độ nghiêm trọng', 'Ngoại lệ giữ chân khách hàng VIP', 'Khác'].map(reason => (
                <label key={reason} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="radio" name="reason" value={reason} checked={overrideReason === reason} onChange={(e) => setOverrideReason(e.target.value)} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOverrideModal(false)} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
              <button disabled={!overrideReason} onClick={submitOverride} className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">Xác nhận Override</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
