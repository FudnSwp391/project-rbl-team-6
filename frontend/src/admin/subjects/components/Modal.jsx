import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Shared shell for the subject dialogs. The blurred scrim is the one place a
// glass effect is appropriate here — it sits over content, not over data.
export default function Modal({ title, subtitle, icon, onClose, children, footer, width = 'max-w-md' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Move focus into the dialog so keyboard users are not left behind it.
    const first = panelRef.current?.querySelector('input, textarea, button')
    first?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/40 backdrop-blur-sm subj-scrim-in"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} bg-white rounded-2xl shadow-2xl subj-modal-in
                    max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start gap-3 p-5 pb-4">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-surface-container-low grid place-items-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{icon}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-on-surface">{title}</h2>
            {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 grid place-items-center rounded-lg text-on-surface-variant
                       hover:bg-surface-variant transition shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-5 pb-4 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-outline-variant/70">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
