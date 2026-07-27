import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;
const RATING_LABEL = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

function Stars({ value, onChange, readonly = false, size = 22 }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={`${s} sao`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: size, color: active >= s ? '#FFB800' : '#d1d5db', fontVariationSettings: active >= s ? "'FILL' 1" : "'FILL' 0" }}>
            star
          </span>
        </button>
      ))}
    </div>
  );
}

export default function EntityReviews({ targetType, targetId, title = 'Đánh giá' }) {
  const { user } = useAuth();
  const [data, setData]       = useState({ reviews: [], avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [editingId, setEditingId] = useState(null); // 'new' | <reviewId>
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;

  const load = useCallback(() => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_BASE}/api/entity-reviews?target_type=${targetType}&target_id=${encodeURIComponent(targetId)}`)
      .then(r => (r.ok ? r.json() : { reviews: [], avg: 0, count: 0 }))
      .then(d => setData(d && Array.isArray(d.reviews) ? d : { reviews: [], avg: 0, count: 0 }))
      .catch(() => setData({ reviews: [], avg: 0, count: 0 }))
      .finally(() => setLoading(false));
  }, [targetType, targetId]);
  useEffect(() => { load(); }, [load]);

  const myReview = user ? data.reviews.find(r => r.user_id === user.id) : null;
  const dist = [0, 0, 0, 0, 0];
  data.reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
  const count = data.count || data.reviews.length;

  const openCreate = () => { setEditingId('new'); setRating(0); setComment(''); setError(''); };
  const openEdit   = () => { setEditingId(myReview.id); setRating(myReview.rating); setComment(myReview.comment || ''); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setError('Vui lòng chọn số sao.'); return; }
    setBusy(true); setError('');
    try {
      const isNew = editingId === 'new';
      const res = await fetch(
        isNew ? `${API_BASE}/api/entity-reviews` : `${API_BASE}/api/entity-reviews/${editingId}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(isNew
            ? { target_type: targetType, target_id: targetId, rating, comment: comment.trim() }
            : { rating, comment: comment.trim() }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Không gửi được đánh giá.');
      setEditingId(null); setRating(0); setComment('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Xóa đánh giá của bạn?')) return;
    try {
      await fetch(`${API_BASE}/api/entity-reviews/${myReview.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } catch { /* ignore */ }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
      <h3 className="text-xl font-semibold text-[#191c1e] flex items-center gap-2 mb-5">
        <span className="material-symbols-outlined text-[#00288e]" style={{ fontVariationSettings: "'FILL' 1" }}>reviews</span>
        {title} ({count})
      </h3>

      {/* Tổng quan + phân bố sao */}
      {count > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 pb-6 border-b border-[#edeef0]">
          <div className="text-center shrink-0">
            <div className="text-4xl font-bold text-[#191c1e]">{Number(data.avg).toFixed(1)}</div>
            <Stars value={Math.round(data.avg)} readonly size={16} />
            <div className="text-xs text-[#757684] mt-1">{count} đánh giá</div>
          </div>
          <div className="flex-grow w-full space-y-1">
            {[5, 4, 3, 2, 1].map(s => (
              <div key={s} className="flex items-center gap-2">
                <span className="text-xs text-[#757684] w-3">{s}</span>
                <div className="flex-grow h-2 bg-[#edeef0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFB800]" style={{ width: `${count > 0 ? (dist[s - 1] / count) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-[#757684] w-6 text-right">{dist[s - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form viết / sửa */}
      {editingId ? (
        <form onSubmit={submit} className="mb-6 bg-[#f8f9fb] rounded-lg p-4">
          <p className="text-sm font-semibold text-[#5d5f5f] mb-2">Chọn số sao</p>
          <Stars value={rating} onChange={setRating} />
          {rating > 0 && <p className="text-sm text-[#00288e] font-medium mt-1">{RATING_LABEL[rating]}</p>}
          <textarea
            className="w-full mt-3 rounded-lg border border-[#c4c5d5] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e]"
            rows={3}
            placeholder={targetType === 'course' ? 'Chia sẻ trải nghiệm khóa học...' : 'Chia sẻ trải nghiệm học với gia sư...'}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          {error && <p className="text-sm text-[#ba1a1a] mt-1">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={busy}
              className="bg-[#00288e] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all disabled:opacity-50">
              {busy ? 'Đang gửi...' : (editingId === 'new' ? 'Gửi đánh giá' : 'Lưu thay đổi')}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setError(''); }}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-[#444653] hover:bg-[#edeef0] transition-all">
              Hủy
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6">
          {!user ? (
            <p className="text-sm text-[#5d5f5f]">
              <a href="#/signin" className="text-[#00288e] font-semibold hover:underline">Đăng nhập</a> để viết đánh giá.
            </p>
          ) : myReview ? null : (
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 border border-[#00288e] text-[#00288e] hover:bg-[#00288e] hover:text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all">
              <span className="material-symbols-outlined text-[18px]">rate_review</span>
              Viết đánh giá
            </button>
          )}
        </div>
      )}

      {/* Danh sách */}
      {loading ? (
        <p className="text-sm text-[#757684]">Đang tải đánh giá...</p>
      ) : count === 0 ? (
        <p className="text-sm text-[#757684]">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-4">
          {data.reviews.map(r => {
            const isMine = user && r.user_id === user.id;
            const name = r.reviewer_name || 'Người dùng';
            return (
              <div key={r.id} className="border-b border-[#edeef0] pb-4 last:border-0">
                <div className="flex items-center gap-3">
                  {r.reviewer_picture ? (
                    <img src={r.reviewer_picture} alt={name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center font-semibold text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="text-sm font-semibold text-[#191c1e]">
                      {name}{isMine && <span className="text-[#00288e] font-medium"> (Bạn)</span>}
                    </div>
                    <Stars value={r.rating} readonly size={14} />
                  </div>
                  <div className="text-xs text-[#757684] flex items-center gap-2">
                    {(r.created_at || '').slice(0, 10)}
                    {isMine && (
                      <span className="flex gap-1">
                        <button onClick={openEdit} title="Sửa" className="text-[#757684] hover:text-[#00288e]">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={remove} title="Xóa" className="text-[#757684] hover:text-[#ba1a1a]">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </span>
                    )}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-[#444653] mt-2 ml-12">{r.comment}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
