import { useState } from 'react'
import Modal from '../subjects/components/Modal'

const SUBJECTS = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung', 'Lập trình', 'IELTS', 'TOEIC']
const SUITABLE = ['Học sinh Tiểu học', 'Học sinh THCS', 'Học sinh THPT', 'Luyện thi vào 10', 'Luyện thi tốt nghiệp THPT', 'Người đi làm', 'Học sinh mất gốc']

const inputCls = 'w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20'

// Sửa thông tin user từ panel Quản lý người dùng. Field cơ bản áp dụng cho mọi
// vai trò; field hồ sơ gia sư chỉ hiện khi role==='tutor'. Modal không tự gọi
// API — parent (UserManagementView) quyết định PATCH endpoint nào tuỳ vai trò.
export default function UserEditModal({ user, detail, onClose, onSubmit }) {
  const isTutor = user.role === 'tutor'
  const tp = detail?.tutor_profile || {}
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    picture:   detail?.picture || user.picture || '',
    // Gia sư: city/phone lưu ở tutor_profiles (sửa qua PATCH /api/admin/tutors/:id).
    // Vai trò khác: lưu thẳng trên users (sửa qua PATCH /api/admin/users/:id).
    city:      isTutor ? (tp.city || '')  : (detail?.city  || ''),
    phone:     isTutor ? (tp.phone || '') : (detail?.phone || ''),
    bio:               tp.bio || '',
    headline:          tp.headline || '',
    subjects:          tp.subjects || '',
    hourly_rate:       tp.hourly_rate ?? '',
    experience_years:  tp.experience_years ?? '',
    education:         tp.education || '',
    qualifications:    tp.qualifications || '',
    gender:            tp.gender || 'male',
    teaching_methods:  Array.isArray(tp.teaching_methods) && tp.teaching_methods.length ? tp.teaching_methods : ['Online'],
    suitable_students: [],
    status:            tp.status || 'approved',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const toggle = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }))

  const submit = async e => {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Họ tên là bắt buộc.'); return }
    setSaving(true); setError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Chỉnh sửa ${user.full_name || user.email}`}
      subtitle={isTutor ? 'Sửa thông tin tài khoản và hồ sơ gia sư.' : 'Sửa thông tin cơ bản của tài khoản.'}
      icon="edit"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-variant transition">
            Hủy
          </button>
          <button type="submit" form="user-edit-form" disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            Lưu thay đổi
          </button>
        </>
      }
    >
      <form id="user-edit-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Họ và tên" required full>
            <input className={inputCls} value={form.full_name} onChange={e => set({ full_name: e.target.value })} />
          </Field>
          <Field label="Ảnh đại diện (URL)" full>
            <input className={inputCls} value={form.picture} onChange={e => set({ picture: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Thành phố">
            <input className={inputCls} value={form.city} onChange={e => set({ city: e.target.value })} placeholder="Hà Nội" />
          </Field>
          <Field label="Điện thoại">
            <input className={inputCls} value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="09xxxxxxxx" />
          </Field>
        </div>

        {isTutor && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-outline-variant">
            <p className="col-span-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Hồ sơ gia sư</p>
            <Field label="Môn dạy" full>
              <input className={inputCls} value={form.subjects} onChange={e => set({ subjects: e.target.value })} list="uem-subj-list" />
              <datalist id="uem-subj-list">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Giá / giờ (VNĐ)">
              <input type="number" className={inputCls} value={form.hourly_rate} onChange={e => set({ hourly_rate: e.target.value })} />
            </Field>
            <Field label="Số năm kinh nghiệm">
              <input type="number" className={inputCls} value={form.experience_years} onChange={e => set({ experience_years: e.target.value })} />
            </Field>
            <Field label="Giới tính">
              <select className={inputCls} value={form.gender} onChange={e => set({ gender: e.target.value })}>
                <option value="male">Nam</option><option value="female">Nữ</option>
              </select>
            </Field>
            <Field label="Trạng thái hồ sơ">
              <select className={inputCls} value={form.status} onChange={e => set({ status: e.target.value })}>
                <option value="approved">Đã duyệt (hiện trên web)</option>
                <option value="pending">Chờ duyệt (ẩn)</option>
                <option value="rejected">Từ chối (ẩn)</option>
              </select>
            </Field>
            <Field label="Hình thức dạy" full>
              <div className="flex gap-2">
                {['Online', 'Offline'].map(m => (
                  <button type="button" key={m} onClick={() => toggle('teaching_methods', m)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${form.teaching_methods.includes(m) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tiêu đề nổi bật (headline)" full>
              <input className={inputCls} value={form.headline} onChange={e => set({ headline: e.target.value })} />
            </Field>
            <Field label="Giới thiệu (bio)" full>
              <textarea rows={3} className={inputCls} value={form.bio} onChange={e => set({ bio: e.target.value })} />
            </Field>
            <Field label="Học vấn">
              <input className={inputCls} value={form.education} onChange={e => set({ education: e.target.value })} />
            </Field>
            <Field label="Chứng chỉ / thành tích">
              <input className={inputCls} value={form.qualifications} onChange={e => set({ qualifications: e.target.value })} />
            </Field>
            <Field label="Đối tượng phù hợp" full>
              <div className="flex flex-wrap gap-1.5">
                {SUITABLE.map(s => (
                  <button type="button" key={s} onClick={() => toggle('suitable_students', s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${form.suitable_students.includes(s) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}

const Field = ({ label, hint, required, full, children }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="block text-xs font-semibold text-on-surface mb-1.5">
      {label}
      {required && <span className="text-red-600 ml-0.5">*</span>}
      {hint && <span className="font-normal text-on-surface-variant ml-1.5">— {hint}</span>}
    </label>
    {children}
  </div>
)
