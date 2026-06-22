import { useState, useRef } from 'react'
import { uploadProofFile, validateProofFile } from '../services/upload'

/**
 * ProofUploader — component upload ảnh/file minh chứng
 * Hỗ trợ 2 mode:
 *   1. Nhập URL trực tiếp
 *   2. Upload file từ máy (lên Supabase Storage)
 *
 * Props:
 *   value        {string}   — URL hiện tại
 *   onChange     {fn}       — callback(url: string) khi có URL mới
 *   folder       {string}   — sub-folder trong Supabase bucket
 *   disabled     {boolean}
 */
export default function ProofUploader({ value, onChange, folder = 'general', disabled = false }) {
  const [mode, setMode]         = useState('url')   // 'url' | 'file'
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    const err = validateProofFile(file)
    if (err) { setUploadErr(err); return }

    setUploadErr('')
    setUploading(true)
    try {
      const url = await uploadProofFile(file, folder)
      onChange(url)
    } catch (e) {
      setUploadErr(e.message || 'Upload thất bại.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex bg-surface-container-low rounded-lg p-0.5 w-fit">
        <button type="button"
          onClick={() => setMode('url')}
          className={`h-7 px-3 rounded-md text-[12px] font-semibold transition-all ${mode === 'url' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
          🔗 URL
        </button>
        <button type="button"
          onClick={() => setMode('file')}
          className={`h-7 px-3 rounded-md text-[12px] font-semibold transition-all ${mode === 'file' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
          📁 Từ máy
        </button>
      </div>

      {/* URL mode */}
      {mode === 'url' && (
        <input
          type="url"
          disabled={disabled}
          className="w-full h-10 px-3 border border-outline-variant rounded-xl text-[13px] text-on-surface outline-none focus:border-primary disabled:opacity-50"
          placeholder="https://drive.google.com/… hoặc https://imgur.com/…"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {/* File upload mode */}
      {mode === 'file' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !disabled && !uploading && fileRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
            ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-low/50'}
            ${disabled || uploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={disabled || uploading}
            onChange={e => handleFile(e.target.files?.[0])}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              <p className="text-[12px] text-primary font-semibold">Đang upload…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">upload_file</span>
              <p className="text-[12px] font-semibold text-on-surface">
                Kéo thả hoặc <span className="text-primary underline">chọn file</span>
              </p>
              <p className="text-[11px] text-outline">JPG, PNG, WebP — tối đa 2MB</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {uploadErr && (
        <p className="text-[12px] text-red-600 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>{uploadErr}
        </p>
      )}

      {/* Preview */}
      {value && !uploading && (
        <div className="relative group">
          {value.endsWith('.pdf') || value.includes('/pdf') ? (
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              Xem file PDF
            </a>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low">
              <img
                src={value}
                alt="Proof preview"
                className="w-full max-h-40 object-contain"
                onError={e => { e.target.parentElement.style.display = 'none' }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange('') }}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Xoá ảnh"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
