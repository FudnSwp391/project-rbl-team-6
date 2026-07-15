import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { uploadEvidenceFile } from '../services/upload';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MAX_FILES = 5;

export default function ReportSessionModal({ booking, onSuccess, onClose }) {
  const { token } = useAuth();
  const [reportReason, setReportReason] = useState('');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [requestedResolution, setRequestedResolution] = useState('');
  const [customResolution, setCustomResolution] = useState('');
  // Mỗi item: { file, previewUrl } — previewUrl chỉ có với file ảnh
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [evidenceError, setEvidenceError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const evidenceItemsRef = useRef(evidenceItems);
  evidenceItemsRef.current = evidenceItems;

  // Revoke toàn bộ object URL khi unmount — tránh memory leak
  useEffect(() => {
    return () => {
      evidenceItemsRef.current.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    setEvidenceError('');

    let toAdd = picked;
    if (toAdd.length > MAX_FILES) {
      toAdd = toAdd.slice(0, MAX_FILES);
      setEvidenceError(`Chỉ nhận tối đa ${MAX_FILES} ảnh, đã bỏ qua các file còn lại.`);
    }

    const newItems = toAdd.map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    setEvidenceItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleRemoveItem = (index) => {
    setEvidenceItems(prev => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!reportReason.trim()) return alert('Vui lòng nhập lý do báo cáo.');
    if (evidenceItems.length === 0) { setEvidenceError('Vui lòng đính kèm ít nhất 1 ảnh làm bằng chứng.'); return; }
    setSubmitting(true);
    try {
      const evidenceUrls = [];
      for (const item of evidenceItems) {
        const uploaded = await uploadEvidenceFile(item.file, 'student');
        evidenceUrls.push(uploaded.previewUrl || uploaded.url);
      }

      const finalRequestedResolution = requestedResolution === 'other' ? customResolution.trim() : requestedResolution;

      const res = await fetch(`${API_BASE}/api/bookings/${booking.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reportReason, severity: reportSeverity, evidenceUrls, requestedResolution: finalRequestedResolution })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ Đã gửi khiếu nại. Admin sẽ xem xét. Tiền tạm thời bị giữ lại.');
        onSuccess();
      } else {
        alert(data.message || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi tải ảnh bằng chứng lên. Vui lòng thử lại.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-sm rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/20">
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">report</span>
            Báo cáo vi phạm
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
            <p className="font-medium text-red-800">{booking.subject} — {booking.tutor_full_name || booking.tutor_name}</p>
            <p className="text-red-600 text-xs mt-1">Tiền sẽ bị tạm giữ cho đến khi Admin giải quyết (24–48h).</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Mức độ nghiêm trọng</label>
            <select className="w-full p-3 border border-outline-variant rounded-xl mb-1 focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={reportSeverity} onChange={e => setReportSeverity(e.target.value)}>
              <option value="low">Thấp (Góp ý nhẹ)</option>
              <option value="medium">Trung bình (Vắng không phép, trễ giờ)</option>
              <option value="high">Cao (Hành vi sai trái, lừa đảo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Lý do báo cáo <span className="text-error">*</span></label>
            <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={4}
              placeholder="Mô tả vấn đề bạn gặp phải (gia sư không đến, dạy sai nội dung, hành vi không phù hợp...)"
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary resize-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Bạn mong muốn hướng giải quyết nào? (không bắt buộc, chỉ mang tính tham khảo — quyết định cuối cùng thuộc về Admin)
            </label>
            <select
              className="w-full p-3 border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              value={requestedResolution}
              onChange={e => setRequestedResolution(e.target.value)}
            >
              <option value="">-- Không có yêu cầu cụ thể --</option>
              <option value="Hoàn tiền buổi học">Hoàn tiền buổi học</option>
              <option value="Chỉ cần nhắc nhở gia sư, không cần hoàn tiền">Chỉ cần nhắc nhở gia sư, không cần hoàn tiền</option>
              <option value="other">Khác (ghi rõ bên dưới)</option>
            </select>
            {requestedResolution === 'other' && (
              <input
                type="text"
                value={customResolution}
                onChange={e => setCustomResolution(e.target.value)}
                placeholder="Nhập mong muốn của bạn..."
                className="w-full mt-2 p-3 border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Bằng chứng (Hình ảnh/Video) <span className="text-error">*</span></label>
            <p className="text-xs text-on-surface-variant/70 mb-1">Đính kèm ít nhất 1 ảnh làm bằng chứng (tối đa {MAX_FILES} file, JPG/PNG/WebP/PDF, 10MB/file).</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="w-full text-body-sm text-on-surface-variant file:mr-sm file:py-xs file:px-md file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-primary hover:file:bg-primary/20"
              onChange={handleFileChange}
            />
            {evidenceItems.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {evidenceItems.map((item, i) => (
                  <div key={i} className="relative">
                    {item.previewUrl ? (
                      <a href={item.previewUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={item.previewUrl} alt="Xem trước bằng chứng" className="w-full h-24 object-cover rounded-xl border border-outline-variant/30" />
                      </a>
                    ) : (
                      <div className="h-24 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl border border-outline-variant/30 bg-surface-container text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[22px] shrink-0">picture_as_pdf</span>
                        <span className="truncate w-full text-center">{item.file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {evidenceError && <p className="text-xs text-error mt-1">{evidenceError}</p>}
          </div>

          <button onClick={handleSubmit} disabled={!reportReason.trim() || evidenceItems.length === 0 || submitting}
            className="h-11 w-full rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Gửi báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}
