/**
 * ReviewsSection.jsx — Khu vực đánh giá dùng chung cho cả khóa học & gia sư.
 * Props:
 *   type: 'course' | 'tutor'
 *   targetId: UUID của khóa học hoặc tutor_profile
 * Hành vi:
 *   - Hiển thị điểm trung bình + phân bố sao + danh sách review.
 *   - Người đăng nhập: viết / sửa / xóa đánh giá của chính mình.
 *   - Backend gate: chỉ ai đã đăng ký khóa (hoặc đã đặt lịch gia sư) mới gửi được.
 */
import { useState, useEffect } from 'react'
import { api } from '../services/eduxApi'
import { useAuth } from '../context/AuthContext'
import { toastSuccess, toastError } from '../services/toast'

const RATING_LABEL = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc']

function StarRating({ value, onChange, readonly = false, size = 24 }) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-btn ${active >= star ? 'active' : ''}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer' }}
          aria-label={`${star} sao`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: active >= star ? "'FILL' 1" : "'FILL' 0", fontSize: 'inherit' }}>
            star
          </span>
        </button>
      ))}
    </div>
  )
}

function RatingSummary({ rating, count, dist }) {
  return (
    <div className="rating-summary">
      <div style={{ textAlign: 'center', minWidth: 90 }}>
        <div className="rating-big">{rating.toFixed(1)}</div>
        <StarRating value={Math.round(rating)} readonly size={18} />
        <div style={{ fontSize: 13, color: 'var(--outline)', marginTop: 6 }}>{count} đánh giá</div>
      </div>
      <div className="rating-summary-bars">
        {[5, 4, 3, 2, 1].map(star => (
          <div key={star} className="rating-bar-wrap">
            <span className="rating-bar-label">{star}</span>
            <div className="rating-bar-track">
              <div className="rating-bar-fill" style={{ width: `${count > 0 ? (dist[star - 1] / count) * 100 : 0}%` }} />
            </div>
            <span className="rating-bar-count">{dist[star - 1]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewItem({ review, isMine, onEdit, onDelete }) {
  const name = review.reviewer_name || 'Người dùng'
  return (
    <div className="review-item">
      <div className="review-header">
        {review.reviewer_picture ? (
          <img className="review-avatar" src={review.reviewer_picture} alt={name} style={{ objectFit: 'cover' }} />
        ) : (
          <div className="review-avatar">{name.charAt(0).toUpperCase()}</div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>
            {name}{isMine && <span style={{ color: 'var(--primary)', fontWeight: 600 }}> (Bạn)</span>}
          </div>
          <div className="review-stars-row">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className="material-symbols-outlined review-star"
                style={{ fontVariationSettings: s <= review.rating ? "'FILL' 1" : "'FILL' 0", color: s <= review.rating ? '#f59e0b' : '#d1d5db' }}>star</span>
            ))}
          </div>
        </div>
        <div className="review-date" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(review.created_at || '').slice(0, 10)}
          {isMine && (
            <span style={{ display: 'flex', gap: 4 }}>
              <button onClick={onEdit} title="Sửa" style={iconBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
              </button>
              <button onClick={onDelete} title="Xóa" style={{ ...iconBtn, color: '#dc2626' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
              </button>
            </span>
          )}
        </div>
      </div>
      <p className="review-comment">{review.comment}</p>
    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
  color: 'var(--on-surface-variant)', display: 'inline-flex', alignItems: 'center',
}

export default function ReviewsSection({ type, targetId }) {
  const { user } = useAuth()
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)

  const [rating, setRating]     = useState(0)
  const [comment, setComment]   = useState('')
  const [submitting, setSubmit] = useState(false)
  const [error, setError]       = useState('')
  const [editingId, setEditing] = useState(null)  // id review đang sửa, hoặc 'new'

  const load = () => {
    setLoading(true)
    const params = type === 'course' ? { course_id: targetId } : { tutor_id: targetId }
    api.getReviews(params)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [type, targetId])

  const myReview = user ? reviews.find(r => r.user_id === user.id) : null

  // Thống kê
  const dist = [0, 0, 0, 0, 0]
  reviews.forEach(r => { dist[r.rating - 1] = (dist[r.rating - 1] || 0) + 1 })
  const total = reviews.length
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0

  const openCreate = () => { setEditing('new'); setRating(0); setComment(''); setError('') }
  const openEdit = () => { setEditing(myReview.id); setRating(myReview.rating); setComment(myReview.comment || ''); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    if (rating < 1) { setError('Vui lòng chọn số sao.'); return }
    setSubmit(true); setError('')
    try {
      const isNew = editingId === 'new'
      if (isNew) {
        const payload = { rating, comment: comment.trim(), review_type: type }
        if (type === 'course') payload.course_id = targetId; else payload.tutor_id = targetId
        await api.createReview(payload)
      } else {
        await api.updateReview(editingId, { rating, comment: comment.trim() })
      }
      setEditing(null); setRating(0); setComment('')
      load()
      toastSuccess(isNew ? 'Đã gửi đánh giá. Cảm ơn bạn!' : 'Đã cập nhật đánh giá.')
    } catch (err) {
      setError(err.message || 'Không gửi được đánh giá.')
    } finally {
      setSubmit(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Xóa đánh giá của bạn?')) return
    try { await api.deleteReview(myReview.id); load(); toastSuccess('Đã xóa đánh giá.') }
    catch (err) { toastError(err.message) }
  }

  return (
    <div className="detail-section">
      <h3>
        <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>reviews</span>
        Đánh giá ({total})
      </h3>

      {total > 0 && <RatingSummary rating={avg} count={total} dist={dist} />}

      {/* Vùng viết / sửa đánh giá */}
      {editingId ? (
        <form className="review-form" onSubmit={submit} style={{ marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', margin: '0 0 8px' }}>Chọn số sao</p>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 6, fontWeight: 600 }}>{RATING_LABEL[rating]}</p>}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', margin: '0 0 8px' }}>Nhận xét</p>
            <textarea className="review-textarea" rows={4} value={comment} onChange={e => setComment(e.target.value)}
              placeholder={type === 'course' ? 'Chia sẻ trải nghiệm học khóa này...' : 'Chia sẻ trải nghiệm học với gia sư...'} />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="review-submit-btn btn-ripple" disabled={submitting}>
              {submitting ? (<><span className="ai-spinner" />Đang gửi...</>) : (<><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>{editingId === 'new' ? 'Gửi đánh giá' : 'Lưu thay đổi'}</>)}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => { setEditing(null); setError('') }}>Hủy</button>
          </div>
        </form>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {!user ? (
            <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>
              <a href="#/signin" style={{ color: 'var(--primary)', fontWeight: 600 }}>Đăng nhập</a> để viết đánh giá.
            </p>
          ) : myReview ? null : (
            <button className="review-submit-btn btn-ripple" onClick={openCreate} style={{ width: 'auto' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rate_review</span>
              Viết đánh giá
            </button>
          )}
        </div>
      )}

      {/* Danh sách */}
      {loading ? (
        <p style={{ color: 'var(--outline)', fontSize: 14 }}>Đang tải đánh giá...</p>
      ) : total === 0 ? (
        <p style={{ color: 'var(--outline)', fontSize: 14 }}>Chưa có đánh giá nào.</p>
      ) : (
        reviews.map(r => (
          <ReviewItem
            key={r.id}
            review={r}
            isMine={user && r.user_id === user.id}
            onEdit={openEdit}
            onDelete={remove}
          />
        ))
      )}
    </div>
  )
}
