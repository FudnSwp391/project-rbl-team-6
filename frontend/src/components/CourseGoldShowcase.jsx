import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const RATING_LABEL = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

// ─── Hall of Achievement – Mock Data ─────────────────────────────────────────
const HOF_STUDENTS = [
  {
    id: 1, name: 'Nguyễn Minh Tuấn', initials: 'MT',
    avgScore: 96.5, progress: 100, quizCompletion: 100,
    badge: 'Champion', completedDays: 18,
    avatarGrad: 'linear-gradient(135deg,#f59e0b,#d97706)',
  },
  {
    id: 2, name: 'Trần Thị Hoa', initials: 'TH',
    avgScore: 91.2, progress: 98, quizCompletion: 95,
    badge: 'Elite', completedDays: 24,
    avatarGrad: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  },
  {
    id: 3, name: 'Lê Đức Anh', initials: 'ĐA',
    avgScore: 87.8, progress: 95, quizCompletion: 92,
    badge: 'Master', completedDays: 30,
    avatarGrad: 'linear-gradient(135deg,#0ea5e9,#3b82f6)',
  },
  {
    id: 4, name: 'Phạm Thanh Huyền', initials: 'TH',
    avgScore: 84.3, progress: 90, quizCompletion: 88,
    badge: 'Expert', completedDays: 35,
    avatarGrad: 'linear-gradient(135deg,#10b981,#059669)',
  },
  {
    id: 5, name: 'Võ Thị Thu Thảo', initials: 'TT',
    avgScore: 81.0, progress: 85, quizCompletion: 80,
    badge: 'Expert', completedDays: 42,
    avatarGrad: 'linear-gradient(135deg,#f43f5e,#e11d48)',
  },
];

const HOF_RECORDS = [
  {
    key: 'highestScore',
    icon: 'military_tech',
    title: 'Điểm Cao Nhất',
    desc: 'Đạt điểm tuyệt đối trong bài quiz',
    value: '100',
    unit: 'điểm',
    student: 'Nguyễn Minh Tuấn',
    grad: 'linear-gradient(135deg,#f59e0b,#d97706)',
    lightBg: '#fffbeb',
    border: '#fde68a',
  },
  {
    key: 'fastestCompletion',
    icon: 'bolt',
    title: 'Hoàn Thành Nhanh Nhất',
    desc: 'Hoàn thành toàn bộ khóa học trong thời gian ngắn nhất',
    value: '12',
    unit: 'ngày',
    student: 'Lê Đức Anh',
    grad: 'linear-gradient(135deg,#3b82f6,#6366f1)',
    lightBg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    key: 'longestStreak',
    icon: 'local_fire_department',
    title: 'Chuỗi Học Dài Nhất',
    desc: 'Học liên tục không bỏ ngày nào',
    value: '28',
    unit: 'ngày',
    student: 'Trần Thị Hoa',
    grad: 'linear-gradient(135deg,#f97316,#ef4444)',
    lightBg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    key: 'mostPerfect',
    icon: 'stars',
    title: 'Quiz Hoàn Hảo Nhất',
    desc: 'Đạt điểm tuyệt đối nhiều bài quiz nhất',
    value: '7',
    unit: 'bài hoàn hảo',
    student: 'Nguyễn Minh Tuấn',
    grad: 'linear-gradient(135deg,#a855f7,#ec4899)',
    lightBg: '#fdf4ff',
    border: '#e9d5ff',
  },
];

const HOF_SPOTLIGHT = {
  initials: 'MT',
  name: 'Nguyễn Minh Tuấn',
  badge: 'Champion',
  avatarGrad: 'linear-gradient(135deg,#f59e0b,#d97706)',
  achievement: 'Điểm tuyệt đối · Hoàn thành 100% · 18 ngày',
  quote: 'Khóa học này đã giúp tôi xây dựng nền tảng vững chắc và tự tin chinh phục kỳ thi quan trọng nhất của mình.',
};

const HOF_RECENT = [
  { icon: '🏆', text: 'Nguyễn Minh Tuấn đạt huy hiệu Champion',          time: '5 phút trước',  color: '#b45309' },
  { icon: '🎯', text: 'Trần Thị Hoa đạt điểm tuyệt đối Quiz #8',          time: '1 giờ trước',   color: '#4338ca' },
  { icon: '⚡', text: 'Lê Đức Anh hoàn thành khóa học trong 12 ngày',      time: '3 giờ trước',   color: '#1d4ed8' },
  { icon: '📜', text: 'Phạm Thanh Huyền nhận chứng chỉ hoàn thành',        time: '1 ngày trước',  color: '#047857' },
  { icon: '🔥', text: 'Trần Thị Hoa duy trì chuỗi học 28 ngày liên tiếp',  time: '2 ngày trước',  color: '#b91c1c' },
];

const HOF_BADGES = [
  { id: 'champion',     icon: 'emoji_events',          label: 'Champion',          desc: 'Hoàn thành 100% khóa học và đạt điểm quiz trên 95%',      grad: 'linear-gradient(135deg,#f59e0b,#d97706)', condition: '100% & Quiz ≥95%' },
  { id: 'elite',        icon: 'military_tech',          label: 'Elite',             desc: 'Hoàn thành 95%+ và duy trì điểm quiz xuất sắc',            grad: 'linear-gradient(135deg,#6366f1,#4f46e5)', condition: '≥95% & Quiz ≥90%' },
  { id: 'master',       icon: 'grade',                  label: 'Master',            desc: 'Hoàn thành 90%+ với điểm quiz tốt',                       grad: 'linear-gradient(135deg,#3b82f6,#0ea5e9)', condition: '≥90% & Quiz ≥85%' },
  { id: 'expert',       icon: 'verified',               label: 'Expert',            desc: 'Hoàn thành 80%+ và đủ điều kiện Hall of Fame',             grad: 'linear-gradient(135deg,#10b981,#059669)', condition: '≥80% & Quiz ≥80%' },
  { id: 'perfect',      icon: 'workspace_premium',      label: 'Perfect Score',     desc: 'Đạt điểm tuyệt đối ít nhất một bài quiz',                  grad: 'linear-gradient(135deg,#eab308,#ca8a04)', condition: 'Điểm 100 bất kỳ quiz' },
  { id: 'fast',         icon: 'bolt',                   label: 'Fast Learner',      desc: 'Hoàn thành khóa học trong vòng 14 ngày',                   grad: 'linear-gradient(135deg,#f97316,#ea580c)', condition: 'Hoàn thành ≤14 ngày' },
  { id: 'consistent',   icon: 'local_fire_department',  label: 'Consistency Master', desc: 'Học liên tục ít nhất 21 ngày không gián đoạn',            grad: 'linear-gradient(135deg,#ef4444,#dc2626)', condition: 'Streak ≥21 ngày' },
  { id: 'seeker',       icon: 'search',                 label: 'Knowledge Seeker',  desc: 'Hoàn thành tất cả bài học và bài tập bổ sung',             grad: 'linear-gradient(135deg,#8b5cf6,#a855f7)', condition: 'Hoàn thành 100% bài học' },
];

const BADGE_STYLE = {
  Champion:   { grad: 'linear-gradient(135deg,#f59e0b,#d97706)', text: '#fff', icon: 'emoji_events'   },
  Elite:      { grad: 'linear-gradient(135deg,#6366f1,#4f46e5)', text: '#fff', icon: 'military_tech'  },
  Master:     { grad: 'linear-gradient(135deg,#3b82f6,#0ea5e9)', text: '#fff', icon: 'grade'          },
  Expert:     { grad: 'linear-gradient(135deg,#10b981,#059669)', text: '#fff', icon: 'verified'       },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [
  { bg: '#fffbeb', border: '#fde68a' },
  { bg: '#f8fafc', border: '#e2e8f0' },
  { bg: '#fff7ed', border: '#fed7aa' },
  { bg: '#eff6ff', border: '#bfdbfe' },
  { bg: '#eff6ff', border: '#bfdbfe' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoldStars({ value, onChange, readonly = false, size = 22 }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" disabled={readonly}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default leading-none' : 'cursor-pointer leading-none'}
          aria-label={`${s} sao`}>
          <span className="material-symbols-outlined gold-star-glow"
            style={{ fontSize: size, color: active >= s ? '#FFB800' : '#e1e2e4', fontVariationSettings: active >= s ? "'FILL' 1" : "'FILL' 0" }}>
            star
          </span>
        </button>
      ))}
    </span>
  );
}

function toEmbed(url = '') {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
}

// ── 1. Course Highlights ──────────────────────────────────────────────────────
function CourseHighlights({ course, avg, count }) {
  const lessons = course.total_lessons || (course.lessons || []).length || 0;
  const highlights = [
    { icon: 'group',             label: 'Học viên',         value: '142',                    color: '#3b82f6', bg: '#eff6ff' },
    { icon: 'workspace_premium', label: 'Chứng chỉ',        value: '76',                     color: '#f59e0b', bg: '#fffbeb' },
    { icon: 'star',              label: 'Đánh giá',          value: avg > 0 ? `${avg.toFixed(1)}★` : '4.7★', color: '#eab308', bg: '#fefce8' },
    { icon: 'task_alt',          label: 'Hoàn thành',       value: '89',                     color: '#22c55e', bg: '#f0fdf4' },
    { icon: 'schedule',          label: 'Thời lượng',       value: course.duration || '8 tuần', color: '#8b5cf6', bg: '#fdf4ff' },
    { icon: 'play_lesson',       label: 'Bài giảng',         value: `${lessons || 24}`,       color: '#0ea5e9', bg: '#f0f9ff' },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {highlights.map((h, i) => (
        <div key={i}
          className="hof-card flex flex-col items-center gap-2 py-5 px-3 text-center group cursor-default"
          style={{ animationDelay: `${i * 60}ms` }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
            style={{ background: h.bg }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: h.color, fontVariationSettings: "'FILL' 1" }}>{h.icon}</span>
          </div>
          <span className="text-2xl font-black text-gray-900">{h.value}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── 2. Hall of Fame ───────────────────────────────────────────────────────────
function HallOfFame() {
  const eligible = HOF_STUDENTS.filter(s => s.progress >= 80 && s.quizCompletion >= 80);
  const top5 = eligible.slice(0, 5);

  if (top5.length < 5) {
    return (
      <div className="hof-card py-20 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-gray-200" style={{ fontSize: 72 }}>emoji_events</span>
        <h3 className="text-lg font-bold text-gray-400">Chưa có học viên nổi bật</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Hãy là người đầu tiên chiếm một vị trí trong Hall of Achievement!
          <br />Hoàn thành ≥80% tiến độ và ≥80% bài quiz để đủ điều kiện.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {top5.map((s, idx) => {
        const bs = BADGE_STYLE[s.badge] || BADGE_STYLE.Expert;
        const rc = RANK_COLORS[idx] || RANK_COLORS[4];
        return (
          <div key={s.id}
            className="hof-card p-4 flex items-center gap-4 group"
            style={{ animationDelay: `${idx * 80}ms` }}>

            {/* Rank */}
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 border"
              style={{ background: rc.bg, borderColor: rc.border }}>
              {idx < 3 ? RANK_MEDALS[idx] : <span className="text-sm font-bold text-blue-400">{idx + 1}</span>}
            </div>

            {/* Avatar */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md ring-2 ring-white"
              style={{ background: s.avatarGrad }}>
              {s.initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-sm">{s.name}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: bs.grad }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>{bs.icon}</span>
                  {s.badge}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 min-w-[120px]">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.avgScore}%`, background: 'linear-gradient(90deg,#00288e,#3b82f6)' }} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-10 text-right">{s.avgScore}</span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>trending_up</span>
                  {s.progress}% tiến độ
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                  {s.completedDays} ngày
                </span>
              </div>
            </div>

            {/* Quiz completion pill */}
            <div className="flex-shrink-0 hidden sm:flex flex-col items-center gap-0.5">
              <span className="text-lg font-black" style={{ color: '#00288e' }}>{s.quizCompletion}%</span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase">Quiz</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Course Records ─────────────────────────────────────────────────────────
function CourseRecords() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {HOF_RECORDS.map(r => (
        <div key={r.key}
          className="hof-card p-5 relative overflow-hidden group"
          style={{ borderColor: r.border, background: r.lightBg }}>
          {/* Glow blob */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-300"
            style={{ background: r.grad }} />
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md relative"
            style={{ background: r.grad }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
          </div>
          {/* Title */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{r.title}</p>
          {/* Value */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-black text-gray-900">{r.value}</span>
            <span className="text-sm text-gray-400 font-medium">{r.unit}</span>
          </div>
          {/* Student */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 14 }}>person</span>
            <span className="text-xs font-semibold text-gray-600 truncate">{r.student}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{r.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ── 4. Student Spotlight ──────────────────────────────────────────────────────
function StudentSpotlight() {
  const s = HOF_SPOTLIGHT;
  const bs = BADGE_STYLE[s.badge] || BADGE_STYLE.Champion;
  return (
    <div className="hof-card p-8 relative overflow-hidden">
      {/* Background quote mark */}
      <div className="absolute right-8 top-4 text-[120px] leading-none text-gray-100 select-none font-serif pointer-events-none">"</div>
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-black shadow-xl ring-4 ring-white"
            style={{ background: s.avatarGrad }}>
            {s.initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
            style={{ background: bs.grad }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{bs.icon}</span>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-lg font-black text-gray-900">{s.name}</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: bs.grad }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{bs.icon}</span>
              {s.badge}
            </span>
          </div>
          <p className="text-xs font-semibold text-blue-600 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            {s.achievement}
          </p>
          <p className="text-gray-600 text-sm leading-relaxed italic">"{s.quote}"</p>
        </div>
      </div>
    </div>
  );
}

// ── 5. Recent Achievements Timeline ──────────────────────────────────────────
function RecentAchievements() {
  return (
    <div className="hof-card p-6">
      <div className="space-y-0">
        {HOF_RECENT.map((item, idx) => (
          <div key={idx} className="flex items-start gap-4">
            {/* Icon + line */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg bg-gray-50 border border-gray-100 shadow-sm">
                {item.icon}
              </div>
              {idx < HOF_RECENT.length - 1 && (
                <div className="w-px h-5 bg-gray-100 my-1" />
              )}
            </div>
            {/* Text */}
            <div className="pt-1.5 pb-1 flex-1 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm text-gray-700 font-medium">{item.text}</span>
              <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                {item.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 6. Achievement Badges Gallery ────────────────────────────────────────────
function AchievementBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {HOF_BADGES.map(b => (
        <div key={b.id}
          className="hof-card p-4 group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          {/* Badge icon */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform duration-200"
            style={{ background: b.grad }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
          </div>
          <h4 className="text-sm font-bold text-gray-900 mb-1">{b.label}</h4>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{b.desc}</p>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 12 }}>lock</span>
            <span className="text-[10px] font-semibold text-gray-400">{b.condition}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section Wrapper ────────────────────────────────────────────────────────────
function HofSection({ icon, iconColor, title, badge, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: iconColor, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {badge && (
          <span className="ml-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
            style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}>
            {badge.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function CourseGoldShowcase({ course, courseId, onEnroll, enrolled }) {
  const { user } = useAuth();
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;
  const [data, setData] = useState({ reviews: [], avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    if (!courseId) { setLoading(false); return; }
    fetch(`${API_BASE}/api/entity-reviews?target_type=course&target_id=${encodeURIComponent(courseId)}`)
      .then(r => (r.ok ? r.json() : { reviews: [], avg: 0, count: 0 }))
      .then(d => setData(d && Array.isArray(d.reviews) ? d : { reviews: [], avg: 0, count: 0 }))
      .catch(() => setData({ reviews: [], avg: 0, count: 0 }))
      .finally(() => setLoading(false));
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  const reviews = data.reviews || [];
  const count = data.count || reviews.length;
  const avg = Number(data.avg) || Number(course.avg_rating) || 0;
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
  const myReview = user ? reviews.find(r => r.user_id === user.id) : null;

  const ls = course.lessons || [];
  const isVid = (u = '') => /^https?:\/\//i.test(u) || /youtu\.?be/i.test(u);
  const demo = ls.find(l => l.is_preview && isVid(l.video_url)) || ls.find(l => isVid(l.video_url)) || null;
  const demoEmbed = demo ? toEmbed(demo.video_url) : null;

  const openCreate = () => { setEditingId('new'); setRating(0); setComment(''); setErr(''); };
  const openEdit = () => { setEditingId(myReview.id); setRating(myReview.rating); setComment(myReview.comment || ''); setErr(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setErr('Vui lòng chọn số sao.'); return; }
    setBusy(true); setErr('');
    try {
      const isNew = editingId === 'new';
      const res = await fetch(isNew ? `${API_BASE}/api/entity-reviews` : `${API_BASE}/api/entity-reviews/${editingId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(isNew ? { target_type: 'course', target_id: courseId, rating, comment: comment.trim() } : { rating, comment: comment.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Không gửi được đánh giá.');
      setEditingId(null); setRating(0); setComment(''); load();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Xóa đánh giá của bạn?')) return;
    try {
      await fetch(`${API_BASE}/api/entity-reviews/${myReview.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch { /* ignore */ }
  };

  return (
    <div className="cgs space-y-6">
      <style>{`
        /* ── Base tokens ── */
        .cgs { --primary:#00288e; --ink:#191c1e; }

        /* ── Animations ── */
        @keyframes hofFadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes hofGlow     { 0%,100%{box-shadow:0 0 0 0 rgba(0,40,142,0)} 50%{box-shadow:0 0 0 6px rgba(0,40,142,.06)} }
        @keyframes hofSweep    { 0%{transform:translateX(-120%)} 100%{transform:translateX(220%)} }
        @keyframes hofFloat    { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-8px) rotate(3deg)} }
        @keyframes starPulse   { 0%,100%{filter:drop-shadow(0 0 0 rgba(255,184,0,0))} 50%{filter:drop-shadow(0 0 6px rgba(255,184,0,.6))} }

        /* ── Cards ── */
        .hof-card {
          background:#fff; border:1px solid #f0f1f5; border-radius:1.25rem;
          box-shadow:0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
          animation: hofFadeUp .45s ease both;
          transition: box-shadow .2s, transform .2s;
        }
        .hof-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.08); }

        /* ── Hero banner ── */
        .hof-hero {
          position:relative; overflow:hidden; border-radius:1.5rem;
          background: linear-gradient(135deg,#00288e 0%,#1e3a8a 40%,#312e81 70%,#1e1b4b 100%);
        }
        .hof-hero::before {
          content:''; position:absolute; inset:0;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,.08), transparent 70%);
          pointer-events:none;
        }
        .hof-hero-sweep::after {
          content:''; position:absolute; top:0; left:0; width:40%; height:100%;
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.07),transparent);
          transform:translateX(-120%); animation:hofSweep 6s ease-in-out infinite;
          pointer-events:none;
        }
        .hof-trophy { animation:hofFloat 5s ease-in-out infinite; transform-origin:center; }

        /* ── Buttons ── */
        .blue-btn {
          color:#fff; font-weight:700; background:#1e40af; border:none;
          box-shadow:0 4px 14px rgba(30,64,175,.4);
          transition:transform .2s, box-shadow .2s, background .2s;
        }
        .blue-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(30,64,175,.55); background:#1e3a8a; }

        /* ── Stars ── */
        .gold-star-glow { animation:starPulse 3s ease-in-out infinite; }

        /* ── Misc ── */
        .cgs-card { border:1px solid #e1e2e4; border-radius:1rem; background:#fff; box-shadow:0 4px 6px -1px rgba(0,0,0,.05); }
        .cgs-frame { padding:3px; border-radius:1.25rem; background:linear-gradient(135deg,#e1e2e4,#fff); box-shadow:0 0 0 1px #e1e2e4 inset; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          1. VIDEO DEMO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="cgs-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#00288e] mb-4">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>ondemand_video</span>
          Video demo bài giảng
          <span className="text-xs font-normal text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full ml-2">Học thử miễn phí</span>
        </h2>
        <div className="cgs-frame">
          <div className="rounded-xl overflow-hidden bg-black relative aspect-video shadow-inner">
            {demo && demoEmbed ? (
              <iframe className="w-full h-full" src={demoEmbed} title="Video demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : demo && demo.video_url ? (
              <video className="w-full h-full" src={demo.video_url} controls poster={course.thumbnail_url || undefined} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-6"
                style={{ background: 'linear-gradient(135deg,#2a2414,#120f08)' }}>
                <span className="material-symbols-outlined hof-trophy opacity-80"
                  style={{ fontSize: 48, color: '#3a6fe0', fontVariationSettings: "'FILL' 1" }}>movie</span>
                <p className="text-white/90 font-semibold text-sm mt-3 mb-1">
                  Gia sư chưa tải video demo cho khóa <span className="text-white font-bold">{course.subject}</span>
                </p>
                <p className="text-white/60 text-xs">Video demo sẽ tự hiển thị khi gia sư thêm bài giảng "Xem trước".</p>
              </div>
            )}
          </div>
        </div>
        {demo && <p className="mt-3 text-sm text-[#5d5f5f]"><span className="font-semibold text-[#191c1e]">Bài demo:</span> {demo.title}{demo.duration_label ? ` · ${demo.duration_label}` : ''}</p>}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. HALL OF ACHIEVEMENT
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="hof-hero hof-hero-sweep">
          {/* Decorative orbs */}
          <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
          <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle,#f59e0b,transparent 70%)' }} />

          <div className="relative z-10 px-8 py-10 flex flex-col sm:flex-row items-center gap-6">
            {/* Trophy */}
            <div className="flex-shrink-0 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <span className="material-symbols-outlined hof-trophy text-white"
                style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            </div>

            {/* Text */}
            <div className="text-center sm:text-left">
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Hall of Achievement</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight">
                BẢNG VÀNG THÀNH TÍCH
              </h2>
              <p className="text-white/70 text-sm font-medium">{course.title}</p>
              <p className="text-white/50 text-xs mt-2 max-w-md">
                Tôn vinh những học viên xuất sắc và các cột mốc đáng nhớ của khóa học này.
              </p>
            </div>

            {/* CTA */}
            {onEnroll && !enrolled && (
              <div className="sm:ml-auto flex-shrink-0">
                <button onClick={onEnroll}
                  className="blue-btn px-7 py-3 rounded-2xl text-sm flex items-center gap-2 whitespace-nowrap">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>military_tech</span>
                  Đăng ký học ngay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Course Highlights ────────────────────────────────────────────── */}
        <HofSection icon="bar_chart" iconColor="#3b82f6" title="Điểm Nổi Bật Khóa Học">
          <CourseHighlights course={course} avg={avg} count={count} />
        </HofSection>

        {/* ── Hall of Fame ─────────────────────────────────────────────────── */}
        <HofSection
          icon="emoji_events" iconColor="#f59e0b" title="Hall of Fame"
          badge={{ bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'Top 5' }}>
          <p className="text-xs text-gray-400 mb-3">
            Chỉ học viên đạt ≥80% tiến độ và ≥80% hoàn thành quiz mới đủ điều kiện.
          </p>
          <HallOfFame />
        </HofSection>

        {/* ── Course Records ───────────────────────────────────────────────── */}
        <HofSection icon="workspace_premium" iconColor="#a855f7" title="Kỷ Lục Khóa Học">
          <CourseRecords />
        </HofSection>

        {/* ── Student Spotlight ────────────────────────────────────────────── */}
        <HofSection icon="person_celebrate" iconColor="#f59e0b" title="Học Viên Nổi Bật">
          <StudentSpotlight />
        </HofSection>

        {/* ── Recent Achievements ──────────────────────────────────────────── */}
        <HofSection icon="celebration" iconColor="#22c55e" title="Thành Tích Gần Đây"
          badge={{ bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', label: `${HOF_RECENT.length} hoạt động` }}>
          <RecentAchievements />
        </HofSection>

        {/* ── Achievement Badges ───────────────────────────────────────────── */}
        <HofSection icon="new_releases" iconColor="#6366f1" title="Huy Hiệu Thành Tích">
          <p className="text-xs text-gray-400 mb-4">
            Mỗi huy hiệu đại diện cho một cột mốc đặc biệt — hãy chinh phục tất cả!
          </p>
          <AchievementBadges />
        </HofSection>

      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. PHẢN HỒI & ĐÁNH GIÁ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="cgs-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#00288e] mb-5">
          <span className="material-symbols-outlined" style={{ color: '#00288e', fontVariationSettings: "'FILL' 1" }}>rate_review</span>
          Phản hồi học viên ({count})
        </h2>

        {count > 0 && (
          <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 pb-6 border-b border-[#e1e2e4]">
            <div className="text-center shrink-0 px-6 py-4 rounded-2xl bg-[#f8f9fb]">
              <div className="text-5xl font-bold" style={{ color: '#00288e' }}>{avg.toFixed(1)}</div>
              <div className="mt-1"><GoldStars value={Math.round(avg)} readonly size={20} /></div>
              <div className="text-xs text-[#444653] mt-1">{count} đánh giá</div>
            </div>
            <div className="flex-grow w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-[#757684] w-3">{s}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#FFB800', fontVariationSettings: "'FILL' 1" }}>star</span>
                  <div className="flex-grow h-2.5 bg-[#f8f9fb] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#00288e]" style={{ width: `${count ? (dist[s - 1] / count) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-[#757684] w-6 text-right">{dist[s - 1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write/Edit review */}
        {editingId ? (
          <form onSubmit={submit} className="mb-6 rounded-xl p-4 bg-[#f8f9fb] border border-[#e1e2e4]">
            <p className="text-sm font-semibold text-[#5d5f5f] mb-2">Chọn số sao</p>
            <GoldStars value={rating} onChange={setRating} />
            {rating > 0 && <p className="text-sm font-bold mt-1 text-[#00288e]">{RATING_LABEL[rating]}</p>}
            <textarea className="w-full mt-3 rounded-lg border border-[#c4c5d5] p-3 text-sm focus:outline-none focus:border-[#00288e]"
              rows={3} placeholder="Chia sẻ trải nghiệm khóa học..." value={comment} onChange={e => setComment(e.target.value)} />
            {err && <p className="text-sm text-[#ba1a1a] mt-1">{err}</p>}
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={busy} className="blue-btn px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
                {busy ? 'Đang gửi...' : (editingId === 'new' ? 'Gửi đánh giá' : 'Lưu thay đổi')}
              </button>
              <button type="button" onClick={() => { setEditingId(null); setErr(''); }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#444653] bg-white border border-[#c4c5d5] hover:bg-[#f8f9fb]">
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6">
            {!user ? (
              <p className="text-sm text-[#5d5f5f]">
                <a href="#/signin" className="font-semibold text-[#00288e] hover:underline">Đăng nhập</a> để viết đánh giá.
              </p>
            ) : myReview ? null : (
              <button onClick={openCreate} className="blue-btn px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">edit_square</span>Viết đánh giá
              </button>
            )}
          </div>
        )}

        {/* Review list */}
        {loading ? (
          <p className="text-sm text-[#757684]">Đang tải đánh giá...</p>
        ) : count === 0 ? (
          <p className="text-[#444653] text-sm flex items-center gap-2">
            Chưa có đánh giá nào — hãy là người đầu tiên để lại phản hồi vàng!
            <span className="material-symbols-outlined text-[#FFB800] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => {
              const isMine = user && r.user_id === user.id;
              const name = r.reviewer_name || 'Người dùng';
              return (
                <div key={r.id} className="pb-4 border-b border-[#f3eeda] last:border-0">
                  <div className="flex items-center gap-3">
                    {r.reviewer_picture ? (
                      <img src={r.reviewer_picture} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-[#dde1ff] text-[#00288e]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="text-sm font-semibold text-[#191c1e]">
                        {name}{isMine && <span style={{ color: '#b8860b' }} className="font-medium"> (Bạn)</span>}
                      </div>
                      <GoldStars value={r.rating} readonly size={14} />
                    </div>
                    <div className="text-xs text-[#757684] flex items-center gap-2">
                      {(r.created_at || '').slice(0, 10)}
                      {isMine && (
                        <span className="flex gap-1">
                          <button onClick={openEdit} title="Sửa" className="text-[#757684] hover:text-[#b8860b]">
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
      </section>
    </div>
  );
}
