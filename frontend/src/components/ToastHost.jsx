/**
 * ToastHost.jsx — Hiển thị các toast nổi góc trên phải. Mount 1 lần ở App.
 */
import { useState, useEffect } from 'react'
import { subscribeToast } from '../services/toast'

const STYLE = {
  success: { bg: '#16a34a', icon: 'check_circle' },
  error:   { bg: '#dc2626', icon: 'error' },
  info:    { bg: '#00288e', icon: 'info' },
}

export default function ToastHost() {
  const [items, setItems] = useState([])

  useEffect(() => {
    return subscribeToast((t) => {
      setItems((prev) => [...prev, t])
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id))
      }, t.duration)
    })
  }, [])

  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id))

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 'min(360px, calc(100vw - 32px))',
      pointerEvents: 'none',
    }}>
      {items.map((t) => {
        const s = STYLE[t.type] || STYLE.info
        return (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', borderLeft: `4px solid ${s.bg}`,
              borderRadius: 12, padding: '12px 14px',
              boxShadow: '0 8px 24px rgb(0 0 0 / 14%)',
              animation: 'toastIn 0.25s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: s.bg, fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
              {s.icon}
            </span>
            <span style={{ fontSize: 14, color: '#1a1c1e', lineHeight: 1.4, flex: 1 }}>{t.message}</span>
            <span className="material-symbols-outlined" style={{ color: '#9aa0a6', fontSize: 18 }}>close</span>
          </div>
        )
      })}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  )
}
