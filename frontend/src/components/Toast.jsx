import { useEffect } from 'react';

const STYLES = {
  success: { icon: 'check_circle', color: '#16a34a', ring: '#22c55e', soft: '#f0fdf4' },
  error:   { icon: 'error',        color: '#dc2626', ring: '#ef4444', soft: '#fef2f2' },
  info:    { icon: 'info',         color: '#1e40af', ring: '#3b82f6', soft: '#eff6ff' },
};

/** Banner thông báo nổi (viền gradient xoay), tự ẩn sau `duration` ms */
export default function Toast({ toast, onClose, duration = 3600 }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [toast, duration, onClose]);

  if (!toast) return null;
  const s = STYLES[toast.type] || STYLES.info;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[120] w-[min(92vw,460px)]" role="status" aria-live="polite">
      <style>{`
        @keyframes toastIn { from { opacity:0; transform: translateY(-18px) scale(.95); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes toastSpin { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes toastBar { from { width:100%; } to { width:0%; } }
        @keyframes toastPop { 0%{ transform:scale(.4); opacity:0 } 60%{ transform:scale(1.15) } 100%{ transform:scale(1); opacity:1 } }
        .toastx { animation: toastIn .4s cubic-bezier(.2,.9,.3,1.4) both; }
        .toastx-border { position:relative; padding:2.5px; border-radius:18px; overflow:hidden;
          box-shadow:0 22px 50px -14px rgba(0,0,0,.35); }
        .toastx-border::before { content:''; position:absolute; top:50%; left:50%; width:760px; height:760px;
          transform:translate(-50%,-50%);
          background: conic-gradient(var(--ring) 0deg, rgba(255,255,255,.9) 40deg, transparent 120deg, transparent 300deg, var(--ring) 360deg);
          animation: toastSpin 3.4s linear infinite; }
        .toastx-inner { position:relative; z-index:1; background:#fff; border-radius:15.5px; overflow:hidden; }
        .toastx-ico { animation: toastPop .5s ease both; }
        @media (prefers-reduced-motion: reduce){ .toastx, .toastx-border::before, .toastx-ico { animation:none !important; } }
      `}</style>

      <div className="toastx">
        <div className="toastx-border" style={{ ['--ring']: s.ring }}>
          <div className="toastx-inner">
            <div className="flex items-start gap-3 p-4 pr-3">
              <span className="toastx-ico w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: s.soft }}>
                <span className="material-symbols-outlined" style={{ color: s.color, fontVariationSettings: "'FILL' 1", fontSize: 24 }}>{s.icon}</span>
              </span>
              <div className="flex-grow min-w-0 pt-0.5">
                {toast.title && <div className="font-bold text-[#191c1e] text-sm mb-0.5">{toast.title}</div>}
                <div className="text-[13.5px] text-[#444653] leading-relaxed">{toast.msg}</div>
              </div>
              <button onClick={onClose} aria-label="Đóng" className="text-[#9aa3b8] hover:text-[#191c1e] transition-colors shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="h-1 bg-[#eef0f4]">
              <div style={{ height: '100%', background: s.ring, animation: `toastBar ${duration}ms linear forwards` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
