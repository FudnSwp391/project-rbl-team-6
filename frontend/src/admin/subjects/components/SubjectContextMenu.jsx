import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Actions are declared per status so archived subjects do not offer "Archive"
// and active ones do not offer "Restore". Destructive items are visually last
// and separated.
function actionsFor(subject) {
  const base = [
    { id: 'manage',    label: 'Quản lý',        icon: 'tune' },
    { id: 'analytics', label: 'Xem phân tích',  icon: 'insights' },
    { id: 'edit',      label: 'Chỉnh sửa',      icon: 'edit' },
    { id: 'appearance',label: 'Đổi icon & màu', icon: 'palette' },
  ]
  if (subject.status === 'archived') {
    return [...base, { divider: true },
      { id: 'restore', label: 'Khôi phục', icon: 'unarchive' },
      { id: 'delete',  label: 'Xóa môn học', icon: 'delete', danger: true }]
  }
  return [...base, { divider: true },
    { id: 'disable', label: 'Vô hiệu hóa', icon: 'visibility_off' },
    { id: 'archive', label: 'Lưu trữ',     icon: 'inventory_2' },
    { id: 'delete',  label: 'Xóa môn học', icon: 'delete', danger: true }]
}

export default function SubjectContextMenu({ subject, position, onClose, onAction }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  // Measure after mount, then clamp inside the viewport so a right-click near
  // the bottom/right edge does not open a menu that runs off-screen.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let x = position.x, y = position.y
    if (position.anchor) {
      const r = position.anchor.getBoundingClientRect()
      x = r.right - width
      y = r.bottom + 6
    }
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth  - width  - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    })
  }, [position])

  useEffect(() => {
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const onKey  = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="menu"
      onClick={e => e.stopPropagation()}
      style={{
        left: pos ? pos.x : position.x,
        top:  pos ? pos.y : position.y,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="fixed z-50 min-w-[196px] py-1.5 bg-white rounded-xl shadow-xl
                 ring-1 ring-black/5 origin-top-left subj-ctx-in"
    >
      {actionsFor(subject).map((a, i) =>
        a.divider ? (
          <div key={`d${i}`} className="my-1.5 h-px bg-outline-variant/70" />
        ) : (
          <button
            key={a.id}
            role="menuitem"
            onClick={() => { onClose(); onAction(a.id, subject) }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left
              transition-colors
              ${a.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-on-surface hover:bg-surface-variant'}`}
          >
            <span className="material-symbols-outlined text-[17px]">{a.icon}</span>
            {a.label}
          </button>
        )
      )}
    </div>,
    document.body
  )
}
