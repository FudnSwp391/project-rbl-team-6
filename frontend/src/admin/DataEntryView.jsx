import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';

// Trang admin quản lý dữ liệu thật: thêm / sửa / xóa gia sư, học sinh, khóa học, môn học.
// Gia sư tạo ở đây là status='approved' → hiện ngay trên trang Tìm Gia Sư.

const TABS = [
  { id: 'tutor',   label: 'Gia sư',    icon: 'school',     accent: '#00288e' },
  { id: 'student', label: 'Học sinh',  icon: 'person_add', accent: '#0d9488' },
  { id: 'course',  label: 'Khóa học',  icon: 'menu_book',  accent: '#d97706' },
  { id: 'subject', label: 'Môn học',   icon: 'subject',    accent: '#7c3aed' },
];

const SUBJECTS = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung', 'Lập trình', 'IELTS', 'TOEIC'];
const SUITABLE = ['Học sinh Tiểu học', 'Học sinh THCS', 'Học sinh THPT', 'Luyện thi vào 10', 'Luyện thi tốt nghiệp THPT', 'Người đi làm', 'Học sinh mất gốc'];
const LEVELS = ['Cơ bản', 'Nâng cao', 'Luyện thi'];

const inputCls = 'w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
const labelCls = 'block text-xs font-semibold text-on-surface-variant mb-1';
const fmtVnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';

function Field({ label, required, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className={labelCls}>{label}{required && <span className="text-error"> *</span>}</label>
      {children}
    </div>
  );
}

// ── Nút submit: đổi nhãn/màu theo chế độ thêm hay sửa ────────────────────────
function SubmitBtn({ loading, label, editing, onCancel }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <button type="submit" disabled={loading}
        className={`inline-flex items-center gap-2 text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all ${editing ? 'bg-[#d97706]' : 'bg-primary'}`}>
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <span className="material-symbols-outlined text-[18px]">{editing ? 'save' : 'add'}</span>}
        {editing ? 'Lưu thay đổi' : label}
      </button>
      {editing && (
        <button type="button" onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant px-4 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container transition-all">
          <span className="material-symbols-outlined text-[18px]">close</span>Hủy
        </button>
      )}
    </div>
  );
}

// ── Banner báo đang sửa bản ghi nào ─────────────────────────────────────────
function EditBanner({ editing, name, onCancel }) {
  if (!editing) return null;
  return (
    <div className="col-span-2 flex items-center gap-2 bg-[#fffbeb] border border-[#fbbf24]/50 rounded-xl px-4 py-2.5 mb-1">
      <span className="material-symbols-outlined text-[#d97706] text-[19px]">edit</span>
      <span className="text-sm text-[#92400e]">Đang sửa: <strong>{name}</strong></span>
      <button type="button" onClick={onCancel} className="ml-auto text-xs font-semibold text-[#92400e] hover:underline">Thêm mới thay thế</button>
    </div>
  );
}

// ── Danh sách bản ghi có tìm kiếm + nút Sửa / Xóa ───────────────────────────
function ManageList({ title, count, search, setSearch, placeholder, loading, items, renderItem, onEdit, onDelete, emptyText }) {
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function doDelete(id) {
    setBusyId(id);
    await onDelete(id);
    setBusyId(null);
    setConfirmId(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-outline-variant shadow-sm mt-6 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant bg-surface-container-lowest">
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{count}</span>
        <div className="ml-auto relative w-64 max-w-[45%]">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder}
            className={`${inputCls} pl-9 py-1.5`} />
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-on-surface-variant">
          <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin align-middle mr-2" />
          Đang tải…
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-on-surface-variant">{emptyText}</div>
      ) : (
        <ul className="divide-y divide-outline-variant max-h-[420px] overflow-y-auto">
          {items.map(it => {
            const r = renderItem(it);
            const confirming = confirmId === it.id;
            return (
              <li key={it.id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${confirming ? 'bg-[#fef2f2]' : 'hover:bg-surface-container-lowest'}`}>
                {r.avatar}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{r.title}</p>
                  <p className="text-xs text-on-surface-variant truncate">{r.subtitle}</p>
                </div>
                {r.badges && <div className="hidden sm:flex items-center gap-1.5 shrink-0">{r.badges}</div>}

                {confirming ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-error hidden md:inline">Xóa vĩnh viễn?</span>
                    <button onClick={() => doDelete(it.id)} disabled={busyId === it.id}
                      className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-bold hover:brightness-110 disabled:opacity-50">
                      {busyId === it.id ? '…' : 'Xóa'}
                    </button>
                    <button onClick={() => setConfirmId(null)}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-white">Hủy</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onEdit(it)} title="Sửa"
                      className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all">
                      <span className="material-symbols-outlined text-[19px]">edit</span>
                    </button>
                    <button onClick={() => setConfirmId(it.id)} title="Xóa"
                      className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error flex items-center justify-center transition-all">
                      <span className="material-symbols-outlined text-[19px]">delete</span>
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const Avatar = ({ src, fallback, icon }) => src
  ? <img src={src} alt="" className="w-9 h-9 rounded-full object-cover border border-outline-variant/40 shrink-0"
      onError={e => { e.currentTarget.style.display = 'none'; }} />
  : <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
      {icon ? <span className="material-symbols-outlined text-[18px]">{icon}</span> : fallback}
    </div>;

const Badge = ({ children, tone = 'gray' }) => {
  const tones = {
    gray:   'bg-surface-container text-on-surface-variant',
    green:  'bg-[#dcfce7] text-[#15803d]',
    amber:  'bg-[#fef3c7] text-[#92400e]',
    blue:   'bg-[#dbeafe] text-[#1e40af]',
    purple: 'bg-[#f3e8ff] text-[#6b21a8]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
};

// ── Hook dùng chung: tải danh sách + tìm kiếm (debounce) ────────────────────
function useList(api, path, key) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const d = await api.get(`${path}?search=${encodeURIComponent(q)}`);
      setItems(d[key] || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [api, path, key, search]);

  useEffect(() => {
    const t = setTimeout(() => reload(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return { items, search, setSearch, loading, reload };
}

export default function DataEntryView() {
  const { token } = useAuth();
  const [tab, setTab] = useState('tutor');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const api = {
    async req(method, path, body) {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi máy chủ');
      return data;
    },
    get(p) { return this.req('GET', p); },
    post(p, b) { return this.req('POST', p, b); },
    patch(p, b) { return this.req('PATCH', p, b); },
    del(p) { return this.req('DELETE', p); },
  };

  const notify = (msg, type = 'success') => setToast({ msg, type });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Quản lý dữ liệu</h1>
        <p className="text-sm text-on-surface-variant mt-1">Thêm, sửa, xóa dữ liệu thật của hệ thống. Gia sư tạo ở đây được duyệt sẵn — hiển thị ngay trên trang Tìm Gia Sư.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${active ? 'text-white border-transparent shadow-md' : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary/40'}`}
              style={active ? { background: t.accent } : {}}>
              <span className="material-symbols-outlined text-[19px]">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'tutor'   && <TutorTab   api={api} notify={notify} />}
      {tab === 'student' && <StudentTab api={api} notify={notify} />}
      {tab === 'course'  && <CourseTab  api={api} notify={notify} />}
      {tab === 'subject' && <SubjectTab api={api} notify={notify} />}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-[#16a34a]' : 'bg-error'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══ TAB GIA SƯ ═════════════════════════════════════════════════════════════
function TutorTab({ api, notify }) {
  const { items, search, setSearch, loading, reload } = useList(api, '/api/admin/manage/tutors', 'tutors');
  const [editing, setEditing] = useState(null);

  async function handleDelete(id) {
    try {
      await api.del(`/api/admin/tutors/${id}`);
      notify('Đã xóa gia sư.');
      if (editing?.id === id) setEditing(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
        <TutorForm api={api} notify={notify} editing={editing}
          onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      </div>
      <ManageList
        title="Gia sư trong hệ thống" count={items.length}
        search={search} setSearch={setSearch} placeholder="Tìm tên, email, môn…"
        loading={loading} items={items} onEdit={setEditing} onDelete={handleDelete}
        emptyText={search ? 'Không tìm thấy gia sư phù hợp.' : 'Chưa có gia sư nào.'}
        renderItem={t => ({
          avatar: <Avatar src={t.photo} fallback={(t.full_name || '?')[0]} />,
          title: t.full_name,
          subtitle: `${t.subjects || 'chưa rõ môn'} · ${t.email}`,
          badges: <>
            {t.hourly_rate > 0 && <Badge tone="blue">{fmtVnd(t.hourly_rate)}/h</Badge>}
            <Badge tone={t.status === 'approved' ? 'green' : t.status === 'pending' ? 'amber' : 'gray'}>
              {t.status === 'approved' ? 'Đã duyệt' : t.status === 'pending' ? 'Chờ duyệt' : t.status}
            </Badge>
          </>,
        })}
      />
    </>
  );
}

function TutorForm({ api, notify, editing, onDone, onCancel }) {
  const empty = { full_name: '', email: '', password: '', photo: '', subjects: '', hourly_rate: '', experience_years: '', city: '', headline: '', bio: '', education: '', qualifications: '', gender: 'male', teaching_methods: ['Online'], suitable_students: [], status: 'approved' };
  const [f, setF] = useState(empty);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = (k, v) => setF(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  useEffect(() => {
    if (editing) {
      setF({
        ...empty, ...editing,
        hourly_rate: editing.hourly_rate ?? '',
        experience_years: editing.experience_years ?? '',
        teaching_methods: Array.isArray(editing.teaching_methods) && editing.teaching_methods.length ? editing.teaching_methods : ['Online'],
        suitable_students: [],
        password: '',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else setF(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function submit(e) {
    e.preventDefault();
    if (!f.full_name.trim()) return notify('Nhập họ tên.', 'error');
    if (!editing && !f.email.trim()) return notify('Nhập email.', 'error');
    setLoading(true);
    try {
      const body = { ...f, hourly_rate: Number(f.hourly_rate) || 0, experience_years: Number(f.experience_years) || 0 };
      if (editing) {
        await api.patch(`/api/admin/tutors/${editing.id}`, body);
        notify(`Đã cập nhật gia sư "${f.full_name}".`);
      } else {
        await api.post('/api/admin/tutors', body);
        notify(`Đã tạo gia sư "${f.full_name}" (đã duyệt, hiện ngay trên trang tìm).`);
      }
      setF(empty);
      onDone();
    } catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <EditBanner editing={editing} name={editing?.full_name} onCancel={onCancel} />
      <Field label="Họ và tên" required><input className={inputCls} value={f.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nguyễn Văn A" /></Field>
      <Field label="Email" required>
        <input type="email" className={`${inputCls} ${editing ? 'bg-surface-container text-on-surface-variant' : ''}`} value={f.email}
          onChange={e => set('email', e.target.value)} placeholder="email@example.com" disabled={!!editing} />
      </Field>
      {!editing && <Field label="Mật khẩu (để trống = edux12345)"><input className={inputCls} value={f.password} onChange={e => set('password', e.target.value)} placeholder="Tối thiểu 6 ký tự" /></Field>}
      <Field label="Ảnh đại diện (URL)"><input className={inputCls} value={f.photo || ''} onChange={e => set('photo', e.target.value)} placeholder="https://..." /></Field>
      <Field label="Môn dạy" required><input className={inputCls} value={f.subjects || ''} onChange={e => set('subjects', e.target.value)} placeholder="Toán học, Vật lý" list="subj-list" /><datalist id="subj-list">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist></Field>
      <Field label="Giá / giờ (VNĐ)"><input type="number" className={inputCls} value={f.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="180000" /></Field>
      <Field label="Số năm kinh nghiệm"><input type="number" className={inputCls} value={f.experience_years} onChange={e => set('experience_years', e.target.value)} placeholder="5" /></Field>
      <Field label="Thành phố"><input className={inputCls} value={f.city || ''} onChange={e => set('city', e.target.value)} placeholder="Hà Nội" /></Field>
      <Field label="Giới tính">
        <select className={inputCls} value={f.gender || 'male'} onChange={e => set('gender', e.target.value)}>
          <option value="male">Nam</option><option value="female">Nữ</option>
        </select>
      </Field>
      {editing && (
        <Field label="Trạng thái hồ sơ">
          <select className={inputCls} value={f.status || 'approved'} onChange={e => set('status', e.target.value)}>
            <option value="approved">Đã duyệt (hiện trên web)</option>
            <option value="pending">Chờ duyệt (ẩn)</option>
            <option value="rejected">Từ chối (ẩn)</option>
          </select>
        </Field>
      )}
      <Field label="Hình thức dạy">
        <div className="flex gap-2">
          {['Online', 'Offline'].map(m => (
            <button type="button" key={m} onClick={() => toggle('teaching_methods', m)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${f.teaching_methods.includes(m) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
              {m}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tiêu đề nổi bật (headline)" full><input className={inputCls} value={f.headline || ''} onChange={e => set('headline', e.target.value)} placeholder="Cử nhân Sư phạm Toán — 5 năm luyện thi vào 10" /></Field>
      <Field label="Giới thiệu (bio)" full><textarea rows={3} className={inputCls} value={f.bio || ''} onChange={e => set('bio', e.target.value)} placeholder="Kinh nghiệm, phương pháp, thành tích..." /></Field>
      <Field label="Học vấn"><input className={inputCls} value={f.education || ''} onChange={e => set('education', e.target.value)} placeholder="ĐHSP Hà Nội — Cử nhân..." /></Field>
      <Field label="Chứng chỉ / thành tích"><input className={inputCls} value={f.qualifications || ''} onChange={e => set('qualifications', e.target.value)} placeholder="IELTS 8.0; NVSP..." /></Field>
      <Field label="Đối tượng phù hợp" full>
        <div className="flex flex-wrap gap-1.5">
          {SUITABLE.map(s => (
            <button type="button" key={s} onClick={() => toggle('suitable_students', s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${f.suitable_students.includes(s) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
              {s}
            </button>
          ))}
        </div>
      </Field>
      <div className="col-span-2"><SubmitBtn loading={loading} label="Tạo gia sư" editing={editing} onCancel={onCancel} /></div>
    </form>
  );
}

// ═══ TAB HỌC SINH ═══════════════════════════════════════════════════════════
function StudentTab({ api, notify }) {
  const { items, search, setSearch, loading, reload } = useList(api, '/api/admin/manage/students', 'students');
  const [editing, setEditing] = useState(null);

  async function handleDelete(id) {
    try {
      await api.del(`/api/admin/students/${id}`);
      notify('Đã xóa người dùng.');
      if (editing?.id === id) setEditing(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
        <StudentForm api={api} notify={notify} editing={editing}
          onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      </div>
      <ManageList
        title="Học sinh & phụ huynh" count={items.length}
        search={search} setSearch={setSearch} placeholder="Tìm tên, email…"
        loading={loading} items={items} onEdit={setEditing} onDelete={handleDelete}
        emptyText={search ? 'Không tìm thấy người dùng phù hợp.' : 'Chưa có học sinh nào.'}
        renderItem={s => ({
          avatar: <Avatar src={s.photo} fallback={(s.full_name || '?')[0]} />,
          title: s.full_name,
          subtitle: `${s.email}${s.city ? ' · ' + s.city : ''}`,
          badges: <Badge tone={s.role === 'parent' ? 'purple' : 'green'}>{s.role === 'parent' ? 'Phụ huynh' : 'Học sinh'}</Badge>,
        })}
      />
    </>
  );
}

function StudentForm({ api, notify, editing, onDone, onCancel }) {
  const empty = { full_name: '', email: '', password: '', role: 'student', city: '', phone: '', photo: '' };
  const [f, setF] = useState(empty);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (editing) {
      setF({ ...empty, ...editing, password: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else setF(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function submit(e) {
    e.preventDefault();
    if (!f.full_name.trim()) return notify('Nhập họ tên.', 'error');
    if (!editing && !f.email.trim()) return notify('Nhập email.', 'error');
    setLoading(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/students/${editing.id}`, f);
        notify(`Đã cập nhật "${f.full_name}".`);
      } else {
        await api.post('/api/admin/students', f);
        notify(`Đã tạo ${f.role === 'parent' ? 'phụ huynh' : 'học sinh'} "${f.full_name}".`);
      }
      setF(empty);
      onDone();
    } catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <EditBanner editing={editing} name={editing?.full_name} onCancel={onCancel} />
      <Field label="Họ và tên" required><input className={inputCls} value={f.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Trần Thị B" /></Field>
      <Field label="Email" required>
        <input type="email" className={`${inputCls} ${editing ? 'bg-surface-container text-on-surface-variant' : ''}`} value={f.email}
          onChange={e => set('email', e.target.value)} placeholder="email@example.com" disabled={!!editing} />
      </Field>
      {!editing && <Field label="Mật khẩu (để trống = edux12345)"><input className={inputCls} value={f.password} onChange={e => set('password', e.target.value)} placeholder="Tối thiểu 6 ký tự" /></Field>}
      <Field label="Vai trò">
        <select className={inputCls} value={f.role} onChange={e => set('role', e.target.value)}>
          <option value="student">Học sinh</option><option value="parent">Phụ huynh</option>
        </select>
      </Field>
      <Field label="Thành phố"><input className={inputCls} value={f.city || ''} onChange={e => set('city', e.target.value)} placeholder="TP. Hồ Chí Minh" /></Field>
      <Field label="Số điện thoại"><input className={inputCls} value={f.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="09..." /></Field>
      <Field label="Ảnh đại diện (URL)" full><input className={inputCls} value={f.photo || ''} onChange={e => set('photo', e.target.value)} placeholder="https://..." /></Field>
      <div className="col-span-2"><SubmitBtn loading={loading} label="Tạo người dùng" editing={editing} onCancel={onCancel} /></div>
    </form>
  );
}

// ═══ TAB KHÓA HỌC ═══════════════════════════════════════════════════════════
function CourseTab({ api, notify }) {
  const { items, search, setSearch, loading, reload } = useList(api, '/api/admin/manage/courses', 'courses');
  const [editing, setEditing] = useState(null);

  async function handleDelete(id) {
    try {
      await api.del(`/api/admin/courses/${id}`);
      notify('Đã xóa khóa học.');
      if (editing?.id === id) setEditing(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
        <CourseForm api={api} notify={notify} editing={editing}
          onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      </div>
      <ManageList
        title="Khóa học" count={items.length}
        search={search} setSearch={setSearch} placeholder="Tìm tên khóa, môn, gia sư…"
        loading={loading} items={items} onEdit={setEditing} onDelete={handleDelete}
        emptyText={search ? 'Không tìm thấy khóa học phù hợp.' : 'Chưa có khóa học nào.'}
        renderItem={c => ({
          avatar: c.thumbnail_url
            ? <img src={c.thumbnail_url} alt="" className="w-12 h-9 rounded-lg object-cover border border-outline-variant/40 shrink-0" />
            : <Avatar icon="menu_book" />,
          title: c.title,
          subtitle: `${c.subject || 'chưa rõ môn'} · ${c.tutor_name || 'chưa gán gia sư'}`,
          badges: <>
            <Badge tone="amber">{fmtVnd(c.price)}</Badge>
            {c.level && <Badge>{c.level}</Badge>}
          </>,
        })}
      />
    </>
  );
}

function CourseForm({ api, notify, editing, onDone, onCancel }) {
  const empty = { tutor_id: '', title: '', subject: '', level: 'Cơ bản', price: '', original_price: '', short_description: '', description: '', thumbnail_url: '', class_type: '1-on-1', total_lessons: '', session_duration: '90 phút' };
  const [f, setF] = useState(empty);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get('/api/admin/manage/tutors?search=')
      .then(d => setTutors((d.tutors || []).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editing) {
      setF({
        ...empty, ...editing,
        price: editing.price ?? '', original_price: editing.original_price ?? '',
        total_lessons: editing.total_lessons ?? '',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else setF(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function submit(e) {
    e.preventDefault();
    if (!editing && !f.tutor_id) return notify('Chọn gia sư sở hữu khóa học.', 'error');
    if (!f.title.trim()) return notify('Nhập tên khóa học.', 'error');
    setLoading(true);
    try {
      const body = {
        ...f, price: Number(f.price) || 0,
        original_price: f.original_price ? Number(f.original_price) : null,
        total_lessons: Number(f.total_lessons) || 0,
      };
      if (editing) {
        await api.patch(`/api/admin/courses/${editing.id}`, body);
        notify(`Đã cập nhật khóa học "${f.title}".`);
      } else {
        await api.post('/api/admin/courses', body);
        notify(`Đã tạo khóa học "${f.title}".`);
      }
      setF(empty);
      onDone();
    } catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <EditBanner editing={editing} name={editing?.title} onCancel={onCancel} />
      <Field label="Gia sư sở hữu" required full>
        <select className={inputCls} value={f.tutor_id || ''} onChange={e => set('tutor_id', e.target.value)}>
          <option value="">— Chọn gia sư —</option>
          {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name} — {t.subjects || 'chưa rõ môn'}</option>)}
        </select>
      </Field>
      <Field label="Tên khóa học" required full><input className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} placeholder="Toán 9 — Luyện thi vào 10" /></Field>
      <Field label="Môn học"><input className={inputCls} value={f.subject || ''} onChange={e => set('subject', e.target.value)} list="subj-list2" placeholder="Toán học" /><datalist id="subj-list2">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist></Field>
      <Field label="Trình độ">
        <select className={inputCls} value={f.level || 'Cơ bản'} onChange={e => set('level', e.target.value)}>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Giá (VNĐ)"><input type="number" className={inputCls} value={f.price} onChange={e => set('price', e.target.value)} placeholder="200000" /></Field>
      <Field label="Giá gốc (gạch ngang, tùy chọn)"><input type="number" className={inputCls} value={f.original_price || ''} onChange={e => set('original_price', e.target.value)} placeholder="260000" /></Field>
      <Field label="Hình thức lớp">
        <select className={inputCls} value={f.class_type || '1-on-1'} onChange={e => set('class_type', e.target.value)}>
          <option value="1-on-1">Kèm 1-1</option><option value="small_group">Nhóm nhỏ</option><option value="both">Cả hai</option>
        </select>
      </Field>
      <Field label="Số buổi"><input type="number" className={inputCls} value={f.total_lessons} onChange={e => set('total_lessons', e.target.value)} placeholder="16" /></Field>
      <Field label="Ảnh bìa (URL)" full><input className={inputCls} value={f.thumbnail_url || ''} onChange={e => set('thumbnail_url', e.target.value)} placeholder="https://images.unsplash.com/..." /></Field>
      <Field label="Mô tả ngắn" full><input className={inputCls} value={f.short_description || ''} onChange={e => set('short_description', e.target.value)} placeholder="Một câu tóm tắt khóa học" /></Field>
      <Field label="Mô tả chi tiết" full><textarea rows={3} className={inputCls} value={f.description || ''} onChange={e => set('description', e.target.value)} placeholder="Nội dung, lộ trình, phương pháp..." /></Field>
      <div className="col-span-2"><SubmitBtn loading={loading} label="Tạo khóa học" editing={editing} onCancel={onCancel} /></div>
    </form>
  );
}

// ═══ TAB MÔN HỌC ════════════════════════════════════════════════════════════
function SubjectTab({ api, notify }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { const d = await api.get('/api/admin/manage/subjects'); setItems(d.subjects || []); }
    catch { setItems([]); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = items.filter(s =>
    !search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.category || '').toLowerCase().includes(search.toLowerCase()));

  async function handleDelete(id) {
    try {
      await api.del(`/api/admin/subjects/${id}`);
      notify('Đã xóa môn học.');
      if (editing?.id === id) setEditing(null);
      reload();
    } catch (e) { notify(e.message, 'error'); }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
        <SubjectForm api={api} notify={notify} editing={editing}
          onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      </div>
      <ManageList
        title="Môn học" count={filtered.length}
        search={search} setSearch={setSearch} placeholder="Tìm môn, nhóm…"
        loading={loading} items={filtered} onEdit={setEditing} onDelete={handleDelete}
        emptyText={search ? 'Không tìm thấy môn học phù hợp.' : 'Chưa có môn học nào.'}
        renderItem={s => ({
          avatar: <Avatar icon="subject" />,
          title: s.name,
          subtitle: s.category || 'Chưa phân nhóm',
          badges: <Badge tone={s.is_active === false ? 'gray' : 'green'}>{s.is_active === false ? 'Tắt' : 'Đang bật'}</Badge>,
        })}
      />
    </>
  );
}

function SubjectForm({ api, notify, editing, onDone, onCancel }) {
  const empty = { name: '', category: '', is_active: true };
  const [f, setF] = useState(empty);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (editing) {
      setF({ name: editing.name || '', category: editing.category || '', is_active: editing.is_active !== false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else setF(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return notify('Nhập tên môn học.', 'error');
    setLoading(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/subjects/${editing.id}`, f);
        notify(`Đã cập nhật môn "${f.name}".`);
      } else {
        await api.post('/api/admin/subjects', f);
        notify(`Đã thêm môn học "${f.name}".`);
      }
      setF(empty);
      onDone();
    } catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <EditBanner editing={editing} name={editing?.name} onCancel={onCancel} />
      <Field label="Tên môn học" required><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} placeholder="Tiếng Pháp" /></Field>
      <Field label="Nhóm (tùy chọn)"><input className={inputCls} value={f.category} onChange={e => set('category', e.target.value)} placeholder="Ngoại ngữ" /></Field>
      {editing && (
        <Field label="Trạng thái">
          <select className={inputCls} value={f.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
            <option value="1">Đang bật</option><option value="0">Tắt</option>
          </select>
        </Field>
      )}
      <div className="col-span-2"><SubmitBtn loading={loading} label="Thêm môn học" editing={editing} onCancel={onCancel} /></div>
    </form>
  );
}
