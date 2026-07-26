import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Task 5.2 — AI Copilot Tab
 * Provides manual trigger for AI risk analysis.
 */
export default function AITab({ violation, onAnalysisComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/violations/${violation.id}/copilot-analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        // Handle explicit fallback or API error
        if (data.fallback && data.data) {
          setResult(data.data);
          onAnalysisComplete(data.data);
        } else {
          throw new Error(data.message || 'Lỗi khi gọi AI Copilot');
        }
      } else {
        setResult(data.data);
        onAnalysisComplete(data.data);
      }
    } catch (err) {
      console.error('AI Proxy Error:', err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        background: 'linear-gradient(to right bottom, #f0f9ff, #e0f2fe)',
        borderRadius: 12, padding: 24, border: '1px solid #bae6fd',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: 24, background: '#38bdf8', color: '#fff',
          marginBottom: 16
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>smart_toy</span>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0369a1' }}>AI Copilot Phân Tích</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#0ea5e9', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
          Yêu cầu AI phân tích dữ liệu liên quan đến vụ việc này (bao gồm lịch sử đặt lịch, phản hồi) và đề xuất điểm rủi ro để hỗ trợ ra quyết định.
        </p>

        {!isAnalyzing && !result && !error && (
          <button
            onClick={handleAnalyze}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', background: '#0284c7',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)', transition: 'all 0.2s',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>auto_awesome</span>
            Bắt đầu phân tích
          </button>
        )}

        {isAnalyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 24, height: 24, border: '3px solid #7dd3fc', borderTopColor: '#0284c7',
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: 14, color: '#0284c7', fontWeight: 500 }}>AI đang đọc dữ liệu...</span>
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, marginTop: 16, textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 4px', color: '#b91c1c', fontSize: 14 }}>Lỗi hệ thống</h4>
            <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div style={{ marginTop: 24, animation: 'fadeIn 0.4s ease' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ color: '#0ea5e9' }}>analytics</span>
            Kết Quả Đánh Giá
          </h4>

          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
                  Mức độ rủi ro
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 20,
                  fontSize: 14, fontWeight: 600,
                  background: result.risk_level === 'HIGH' ? '#fef2f2' : result.risk_level === 'MEDIUM' ? '#fffbeb' : '#f0fdf4',
                  color: result.risk_level === 'HIGH' ? '#ef4444' : result.risk_level === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                  border: `1px solid ${result.risk_level === 'HIGH' ? '#fca5a5' : result.risk_level === 'MEDIUM' ? '#fcd34d' : '#86efac'}`
                }}>
                  {result.risk_level || 'UNKNOWN'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
                  Điểm rủi ro
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                  {result.risk_score} <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
                Giải thích từ AI
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                {result.analysis}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
