/**
 * EvidenceGallery.jsx — Task 2A.3
 * Standalone evidence image gallery with lightbox for the Violation Detail Drawer.
 *
 * Features:
 *   - Grid of thumbnail cards (images + generic-file fallback for non-image URLs)
 *   - Click-to-expand lightbox with prev/next navigation and Escape/backdrop-close
 *   - Broken-image error state per card
 *   - Empty state when evidence_urls is absent, null, or []
 *   - Keyboard: Escape = close, ArrowLeft/Right = navigate
 *
 * Props:
 *   urls — string[] | null  (evidence_urls from the API)
 */
import React, { useState, useEffect, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?.*)?$/i;

function isImageUrl(url) {
  try {
    const path = new URL(url).pathname;
    return IMAGE_EXTS.test(path);
  } catch {
    return IMAGE_EXTS.test(url);
  }
}

function shortLabel(url, index) {
  try {
    const parts = new URL(url).pathname.split('/');
    const name = parts[parts.length - 1];
    return name.length > 0 ? decodeURIComponent(name) : `Tệp ${index + 1}`;
  } catch {
    return `Tệp ${index + 1}`;
  }
}

// ── Broken image placeholder ──────────────────────────────────────────────────
function BrokenImage({ index }) {
  return (
    <div style={{
      width: '100%', aspectRatio: '4/3',
      background: '#f1f5f9', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      borderRadius: 8,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#cbd5e1' }}>
        broken_image
      </span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>Bằng chứng {index + 1}</span>
    </div>
  );
}

// ── Generic file card (non-image) ─────────────────────────────────────────────
function FileCard({ url, index, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`Mở bằng chứng ${index + 1}`}
      style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '16px 12px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8, cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#64748b' }}>
        attach_file
      </span>
      <span style={{
        fontSize: 11, color: '#475569', wordBreak: 'break-all',
        textAlign: 'center', maxWidth: '100%',
      }}>
        {shortLabel(url, index)}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', marginTop: 2 }}
      >
        Mở tệp ↗
      </a>
    </div>
  );
}

// ── Image thumbnail card ──────────────────────────────────────────────────────
function ImageCard({ url, index, onClick }) {
  const [broken, setBroken] = useState(false);

  return (
    <div
      onClick={!broken ? onClick : undefined}
      role="button"
      tabIndex={broken ? -1 : 0}
      onKeyDown={e => !broken && e.key === 'Enter' && onClick()}
      aria-label={`Xem ảnh bằng chứng ${index + 1}`}
      style={{
        borderRadius: 10, overflow: 'hidden',
        border: '1px solid #e2e8f0',
        cursor: broken ? 'default' : 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { if (!broken) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {broken ? (
        <BrokenImage index={index} />
      ) : (
        <img
          src={url}
          alt={`Bằng chứng ${index + 1}`}
          onError={() => setBroken(true)}
          loading="lazy"
          style={{
            width: '100%', aspectRatio: '4/3',
            objectFit: 'cover', display: 'block',
          }}
        />
      )}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const [imgBroken, setImgBroken] = useState(false);
  const total = urls.length;

  const prev = useCallback(() => { setImgBroken(false); setCurrent(c => (c - 1 + total) % total); }, [total]);
  const next = useCallback(() => { setImgBroken(false); setCurrent(c => (c + 1) % total); }, [total]);

  useEffect(() => {
    setImgBroken(false);
  }, [current]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next]);

  const url = urls[current];
  const isImg = isImageUrl(url);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.88)',
          zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.18s ease',
        }}
      >
        {/* Counter */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 14px',
          fontSize: 13, color: '#fff', fontWeight: 600, backdropFilter: 'blur(4px)',
        }}>
          {current + 1} / {total}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          id="lightbox-close"
          aria-label="Đóng lightbox"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
            padding: 8, cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
        </button>

        {/* Prev button */}
        {total > 1 && (
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            aria-label="Ảnh trước"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              padding: '10px 8px', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>chevron_left</span>
          </button>
        )}

        {/* Next button */}
        {total > 1 && (
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            aria-label="Ảnh tiếp theo"
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              padding: '10px 8px', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>chevron_right</span>
          </button>
        )}

        {/* Image or file viewer */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: 'min(90vw, 960px)', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}
        >
          {isImg ? (
            imgBroken ? (
              <div style={{
                background: '#1e293b', borderRadius: 12, padding: 40,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#475569' }}>broken_image</span>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>Không thể tải ảnh</p>
              </div>
            ) : (
              <img
                key={url}
                src={url}
                alt={`Bằng chứng ${current + 1}`}
                onError={() => setImgBroken(true)}
                style={{
                  maxWidth: '100%', maxHeight: '78vh',
                  borderRadius: 10, objectFit: 'contain',
                  boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
                }}
              />
            )
          ) : (
            <div style={{
              background: '#1e293b', borderRadius: 12, padding: '40px 60px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#64748b' }}>description</span>
              <p style={{ color: '#cbd5e1', margin: 0, fontSize: 15, textAlign: 'center', wordBreak: 'break-all' }}>
                {shortLabel(url, current)}
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#3b82f6', color: '#fff', padding: '10px 24px',
                  borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}
              >
                Mở tệp ↗
              </a>
            </div>
          )}

          {/* Thumbnail strip for multi-evidence */}
          {total > 1 && (
            <div style={{ display: 'flex', gap: 8, maxWidth: '100%', overflowX: 'auto', padding: '4px 0' }}>
              {urls.map((u, i) => (
                <div
                  key={i}
                  onClick={e => { e.stopPropagation(); setImgBroken(false); setCurrent(i); }}
                  style={{
                    width: 52, height: 40, flexShrink: 0, borderRadius: 6,
                    overflow: 'hidden', cursor: 'pointer',
                    border: i === current ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)',
                    transition: 'border-color 0.15s',
                    background: '#1e293b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isImageUrl(u) ? (
                    <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>attach_file</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main EvidenceGallery ──────────────────────────────────────────────────────
export default function EvidenceGallery({ urls }) {
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = closed

  const safeUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];

  if (safeUrls.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 56, opacity: 0.4, marginBottom: 12 }}>
          perm_media
        </span>
        <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: 16 }}>Không có bằng chứng</h3>
        <p style={{ margin: 0, fontSize: 14 }}>Vụ việc này không có tệp bằng chứng đính kèm.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
          Bằng chứng đính kèm
        </h3>
        <span style={{
          background: '#f1f5f9', color: '#475569', borderRadius: 12,
          padding: '2px 10px', fontSize: 12, fontWeight: 700,
        }}>
          {safeUrls.length} tệp
        </span>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: safeUrls.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12,
      }}>
        {safeUrls.map((url, i) =>
          isImageUrl(url) ? (
            <ImageCard key={i} url={url} index={i} onClick={() => setLightboxIndex(i)} />
          ) : (
            <FileCard key={i} url={url} index={i} onClick={() => setLightboxIndex(i)} />
          )
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          urls={safeUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
