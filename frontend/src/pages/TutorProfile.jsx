import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import {
  getTutorDetail,
  getTutorAvailability,
  getOrCreateConversation,
  createTrialBooking,
  getReviewEligibility,
  submitTutorReview,
} from '../services/api';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const JS_DAY_TO_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDateKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function getTrialRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + 20);
  return { from: toDateKey(today), to: toDateKey(end) };
}

function buildTrialOptions(availability = {}, bookedSlots = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options = [];
  for (let offset = 0; offset < 21; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dayName = JS_DAY_TO_NAME[date.getDay()];
    const dateKey = toDateKey(date);
    const slots = availability[dayName] || [];
    const bookedForDay = bookedSlots[dateKey] || [];
    for (const slot of slots) {
      if (bookedForDay.some((booked) => booked.timeSlot === slot)) continue;
      options.push({
        date: dateKey,
        timeSlot: slot,
        label: `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} - ${slot}`,
      });
    }
  }
  return options.slice(0, 16);
}

/**
 * TutorProfile Page Component
 * Displays tutor bio, subjects, schedule, education, experience, reviews.
 * Uses only vanilla CSS / inline styles — no Tailwind.
 */
export default function TutorProfile({ tutorId, onGoHome }) {
  const { user } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [trialSlot, setTrialSlot] = useState('');
  const [trialNotes, setTrialNotes] = useState('');
  const [trialChildName, setTrialChildName] = useState('');
  const [trialBookedSlots, setTrialBookedSlots] = useState({});
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialMessage, setTrialMessage] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState({ canReview: false, booking: null });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const handleMessageTutor = async () => {
    if (!user) { window.location.hash = '/signin'; return; }
    if (!tutor) return;
    setMsgLoading(true);
    try {
      const tutorUserId = tutor.user_id || tutor.tutor_id || tutor.id;
      const conv = await getOrCreateConversation(tutorUserId);
      window.location.hash = `/messages/${conv.id}`;
    } catch {
      // Fallback: vào trang messages chung
      alert('Không thể mở chat. Vui lòng kiểm tra gia sư này đã có tài khoản tutor thật trong Supabase chưa.');
    } finally {
      setMsgLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      if (!tutorId) { setError('No Tutor ID provided.'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const data = await getTutorDetail(tutorId);
        let hydratedTutor = data;
        let bookedSlots = {};
        try {
          const availabilityData = await getTutorAvailability(data.user_id || data.id || tutorId, getTrialRange());
          if (availabilityData?.availability) {
            hydratedTutor = { ...data, availability: availabilityData.availability };
            bookedSlots = availabilityData.bookedSlots || {};
          }
        } catch (availabilityError) {
          console.warn('[TutorProfile] Trial availability check failed; using profile availability.', availabilityError);
        }
        if (active) {
          setTutor(hydratedTutor);
          setTrialBookedSlots(bookedSlots);
          const firstTrialOption = buildTrialOptions(hydratedTutor.availability || {}, bookedSlots)[0];
          setTrialSlot(firstTrialOption ? `${firstTrialOption.date}|${firstTrialOption.timeSlot}` : '');
          if (user?.role === 'parent') setTrialChildName('');
          setLoading(false);
        }
      } catch (err) {
        if (active) { setError(err.message || 'Failed to load tutor profile.'); setLoading(false); }
      }
    }
    load();
    return () => { active = false; };
  }, [tutorId, user?.role]);

  useEffect(() => {
    let active = true;
    async function loadReviewEligibility() {
      if (!user || !tutor?.id) return;
      try {
        const data = await getReviewEligibility(tutor.id);
        if (active) setReviewEligibility(data);
      } catch {
        if (active) setReviewEligibility({ canReview: false, booking: null });
      }
    }
    loadReviewEligibility();
    return () => { active = false; };
  }, [user, tutor?.id]);

  useEffect(() => {
    if (!tutor?.isNewTutor) return;
    const focusId = sessionStorage.getItem('edux_focus_trial_class');
    const tutorIds = [
      tutor.id,
      tutor.profile_id,
      tutor.profileId,
      tutor.user_id,
      tutor.userId,
      tutor.tutor_id,
      tutor.tutorId,
    ].filter(Boolean).map(String);
    const shouldFocusTrial = focusId && tutorIds.includes(String(focusId));
    if (!shouldFocusTrial) return;
    sessionStorage.removeItem('edux_focus_trial_class');
    window.setTimeout(() => {
      document.getElementById('trial-class-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  }, [tutor?.id, tutor?.isNewTutor]);

  const handleBookSession = () => {
    if (tutor) window.location.hash = `/booking-calendar/${tutor.id}`;
  };

  const handleWatchDemo = () => {
    document.getElementById('demo-teaching-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleTrialBooking = async () => {
    if (!user) { window.location.hash = '/signin'; return; }
    if (!tutor || !trialSlot) return;
    if (user.role === 'parent' && !trialChildName.trim()) {
      setTrialMessage({ type: 'error', text: 'Please enter the student name for this trial class.' });
      return;
    }
    const [date, timeSlot] = trialSlot.split('|');
    setTrialLoading(true);
    setTrialMessage(null);
    try {
      await createTrialBooking({
        tutorId: tutor.user_id || tutor.id,
        date,
        timeSlot,
        subject: tutor.subjects?.[0] || 'Trial class',
        notes: trialNotes || 'Trial class request from EduX NEW tutor campaign.',
        childName: user.role === 'parent' ? trialChildName.trim() : null,
        studentName: user.name || user.email?.split('@')[0] || 'Student',
      });
      const nextBookedSlots = {
        ...trialBookedSlots,
        [date]: [...(trialBookedSlots[date] || []), { timeSlot, status: 'Pending' }],
      };
      setTrialBookedSlots(nextBookedSlots);
      const nextTrialOption = buildTrialOptions(tutor.availability || {}, nextBookedSlots)[0];
      setTrialSlot(nextTrialOption ? `${nextTrialOption.date}|${nextTrialOption.timeSlot}` : '');
      setTrialMessage({ type: 'success', text: 'Trial class request sent. The tutor will review it in Pending Requests.' });
    } catch (err) {
      setTrialMessage({ type: 'error', text: err.message || 'Could not send trial class request.' });
    } finally {
      setTrialLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewEligibility.canReview || !reviewEligibility.booking) return;
    setReviewSaving(true);
    setReviewError('');
    try {
      const created = await submitTutorReview(tutor.id, {
        bookingId: reviewEligibility.booking.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });
      setTutor(prev => {
        const nextReviews = [created, ...(prev.reviews || [])];
        const nextRating = Number((nextReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / nextReviews.length).toFixed(1));
        return { ...prev, reviews: nextReviews, reviewsCount: nextReviews.length, rating: nextRating };
      });
      setReviewForm({ rating: 5, comment: '' });
      setReviewEligibility({ canReview: false, booking: null });
    } catch (err) {
      setReviewError(err.message || 'Could not submit review.');
    } finally {
      setReviewSaving(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={S.page}>
      <Header onBack={onGoHome} backLabel="Back to Tutors" />
      <div style={S.center}>
        <div style={S.spinner} />
        <p style={{ color: 'var(--on-surface-variant)', marginTop: 16 }}>Loading tutor profile…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={S.page}>
      <Header onBack={onGoHome} backLabel="Back to Tutors" />
      <div style={S.center}>
        <div style={S.errorCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#dc2626' }}>error_outline</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--on-surface)' }}>Failed to Load Profile</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>{error}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} style={S.btnPrimary}>Retry</button>
            <button onClick={onGoHome} style={S.btnOutline}>Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!tutor) return null;

  const trialOptions = buildTrialOptions(tutor.availability || {}, trialBookedSlots);

  return (
    <div style={S.page}>
      <Header onBack={onGoHome} backLabel="Back to Tutors" />

      <main style={S.main}>

        {/* ── Hero Banner ── */}
        <div style={S.heroBanner}>
          <img src={tutor.avatar} alt={tutor.name} style={S.heroAvatar} />

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={S.featuredBadge}>Featured Tutor</span>
              {tutor.verified && (
                <span style={S.verifiedBadge}>
                  <span className="material-symbols-outlined icon-fill" style={{ fontSize: 15 }}>verified</span>
                  Verified by EduX
                </span>
              )}
            </div>
            <h1 style={S.heroName}>
              {tutor.name}
              {tutor.isNewTutor && (
                <span style={S.newBadge} title="New tutor on EduX">
                  NEW
                </span>
              )}
              {tutor.verified && (
                <span
                  className="material-symbols-outlined icon-fill"
                  style={{ fontSize: 28, color: '#16a34a', marginLeft: 10, verticalAlign: 'middle' }}
                  title="Verified Tutor — Approved by EduX Admin"
                >
                  verified
                </span>
              )}
            </h1>
            {tutor.headline && (
              <p style={{ fontSize: 15, color: 'var(--on-surface-variant)', fontWeight: 600, margin: '0 0 10px' }}>
                {tutor.headline}
              </p>
            )}

            <div style={S.tagRow}>
              {tutor.subjects.map(s => (
                <span key={s} style={S.subjectTag}>{s}</span>
              ))}
            </div>

            <div style={S.metaRow}>
              <span style={S.metaItem}>
                <span className="material-symbols-outlined icon-fill" style={{ fontSize: 18, color: '#f59e0b' }}>star</span>
                <strong style={{ color: 'var(--on-surface)' }}>{tutor.rating}</strong>
                <span>({tutor.reviewsCount} reviews)</span>
              </span>
              <span style={S.metaItem}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>school</span>
                <span>Level: <strong>{tutor.level}</strong></span>
              </span>
              {tutor.location && (
                <span style={S.metaItem}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>location_on</span>
                  <span>{tutor.location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Rate + CTA box */}
          <div style={S.ctaBox}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Hourly Rate</span>
              <p style={S.rateText}><strong>${tutor.rate}</strong><span style={{ fontSize: 14, fontWeight: 400 }}>/hr</span></p>
            </div>
            <button onClick={handleBookSession} style={S.btnPrimary}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_today</span>
              Book Session
            </button>
            {tutor.isNewTutor && (
              <button
                onClick={() => document.getElementById('trial-class-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                style={S.btnTrial}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>workspace_premium</span>
                Book Free Trial
              </button>
            )}
            {tutor.demo_video_url && (
              <button onClick={handleWatchDemo} style={S.btnDemo}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
                Watch Demo Video
              </button>
            )}
            <button onClick={handleMessageTutor} disabled={msgLoading} style={S.btnOutline}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
              {msgLoading ? 'Opening...' : 'Nhắn tin với Gia sư'}
            </button>
          </div>
        </div>

        {/* ── 2-column grid ── */}
        <div style={S.grid}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Bio */}
            <section style={S.card}>
              <h2 style={S.cardTitle}>
                <span className="material-symbols-outlined" style={S.cardIcon}>person</span>
                About Me
              </h2>
              <p style={S.bodyText}>{tutor.bio}</p>
            </section>

            {tutor.isNewTutor && (
              <section id="trial-class-card" style={S.trialCard}>
                <div style={S.trialRibbon}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>campaign</span>
                  Học thử miễn phí cho gia sư mới được EduX duyệt
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <span style={S.trialKicker}>NEW tutor campaign</span>
                    <h2 style={{ ...S.cardTitle, marginBottom: 8 }}>
                      <span className="material-symbols-outlined" style={S.cardIcon}>workspace_premium</span>
                      Free Trial Class / Lớp học thử
                    </h2>
                    <p style={{ ...S.bodyText, marginBottom: 0 }}>
                      Học sinh hoặc phụ huynh có thể đăng ký 1 buổi học thử với gia sư New trước khi đặt lịch dài hạn.
                      Sau khi gia sư accept và điểm danh có mặt, học sinh mới được đánh giá gia sư này.
                    </p>
                  </div>
                  <span style={S.newBadge}>NEW</span>
                </div>

                <div style={S.trialSteps}>
                  {[
                    ['event_available', 'Chọn slot còn trống'],
                    ['task_alt', 'Gia sư accept request'],
                    ['rate_review', 'Học thử xong mới review'],
                  ].map(([icon, text]) => (
                    <div key={text} style={S.trialStep}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                      {text}
                    </div>
                  ))}
                </div>

                <div style={S.trialGrid}>
                  <div style={S.formGroupInline}>
                    <label style={S.fieldLabel}>Trial slot / Lịch học thử</label>
                    {trialOptions.length > 0 ? (
                      <select
                        value={trialSlot}
                        onChange={(e) => setTrialSlot(e.target.value)}
                        style={S.fieldInput}
                      >
                        {trialOptions.map((option) => (
                          <option key={`${option.date}-${option.timeSlot}`} value={`${option.date}|${option.timeSlot}`}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p style={S.emptyTrial}>This tutor has not opened available slots yet.</p>
                    )}
                  </div>
                  {user?.role === 'parent' && (
                    <div style={S.formGroupInline}>
                      <label style={S.fieldLabel}>Student name</label>
                      <input
                        value={trialChildName}
                        onChange={(e) => setTrialChildName(e.target.value)}
                        placeholder="Enter your child's name"
                        style={S.fieldInput}
                      />
                    </div>
                  )}
                  <div style={S.formGroupInline}>
                    <label style={S.fieldLabel}>Notes / Nội dung muốn học thử</label>
                    <input
                      value={trialNotes}
                      onChange={(e) => setTrialNotes(e.target.value)}
                      placeholder="What do you want to try learning?"
                      style={S.fieldInput}
                    />
                  </div>
                </div>

                {trialMessage && (
                  <div style={trialMessage.type === 'success' ? S.successNotice : S.errorNotice}>
                    {trialMessage.text}
                  </div>
                )}

                <button
                  type="button"
                  disabled={trialLoading || trialOptions.length === 0 || !trialSlot}
                  onClick={handleTrialBooking}
                  style={(trialLoading || trialOptions.length === 0 || !trialSlot) ? S.btnDisabled : S.btnTrialWide}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  {trialLoading ? 'Sending...' : 'Request Free Trial Class'}
                </button>
              </section>
            )}

            {tutor.demo_video_url && (
              <section id="demo-teaching-video" style={S.videoCard}>
                <h2 style={S.cardTitle}>
                  <span className="material-symbols-outlined" style={S.cardIcon}>play_circle</span>
                  Demo Teaching Video
                </h2>
                <p style={{ ...S.bodyText, marginBottom: 14 }}>
                  Watch this short demo before booking to understand the tutor's voice, teaching pace, and explanation style.
                </p>
                <video src={tutor.demo_video_url} controls preload="metadata" style={S.demoVideo} />
              </section>
            )}

            {tutor.courses?.length > 0 && (
              <section style={S.card}>
                <h2 style={S.cardTitle}>
                  <span className="material-symbols-outlined" style={S.cardIcon}>video_library</span>
                  Self-paced Courses
                </h2>
                <p style={{ ...S.bodyText, marginBottom: 16 }}>
                  Buy a recorded course from this tutor and learn anytime with lesson progress tracking.
                </p>
                <div style={S.courseGrid}>
                  {tutor.courses.map((course) => (
                    <article key={course.id} style={S.courseCard}>
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} style={S.courseThumb} />
                      ) : (
                        <div style={S.courseThumbFallback}>
                          <span className="material-symbols-outlined" style={{ fontSize: 36 }}>play_lesson</span>
                        </div>
                      )}
                      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {course.subject && <span style={S.courseChip}>{course.subject}</span>}
                          {course.level && <span style={S.courseChipMuted}>{course.level}</span>}
                        </div>
                        <h3 style={S.courseTitle}>{course.title}</h3>
                        <p style={S.courseDesc}>{course.description || 'Recorded lessons prepared by this tutor.'}</p>
                        <div style={S.courseFooter}>
                          <span style={S.coursePrice}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(course.price || 0))}</span>
                          <span style={S.courseLessons}>{course.lessonCount || 0} lessons</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { window.location.hash = `/course/${course.id}` }}
                          style={S.courseButton}
                        >
                          View Course
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {tutor.teaching_style && (
              <section style={S.card}>
                <h2 style={S.cardTitle}>
                  <span className="material-symbols-outlined" style={S.cardIcon}>psychology</span>
                  Teaching Style
                </h2>
                <p style={S.bodyText}>{tutor.teaching_style}</p>
              </section>
            )}

            {/* Education & Certs */}
            {((tutor.education?.length > 0) || (tutor.certificates?.length > 0)) && (
              <section style={S.card}>
                <h2 style={S.cardTitle}>
                  <span className="material-symbols-outlined" style={S.cardIcon}>menu_book</span>
                  Education &amp; Qualifications
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  {tutor.education?.length > 0 && (
                    <div>
                      <h3 style={S.subTitle}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>school</span>
                        Degrees
                      </h3>
                      <ul style={S.list}>
                        {tutor.education.map((e, i) => (
                          <li key={i} style={S.listItem}><span style={{ color: 'var(--primary)' }}>•</span> {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tutor.certificates?.length > 0 && (
                    <div>
                      <h3 style={S.subTitle}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>verified</span>
                        Certificates
                      </h3>
                      <ul style={S.list}>
                        {tutor.certificates.map((c, i) => (
                          <li key={i} style={S.listItem}><span style={{ color: '#16a34a' }}>✓</span> {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Experience */}
            {tutor.experience?.length > 0 && (
              <section style={S.card}>
                <h2 style={S.cardTitle}>
                  <span className="material-symbols-outlined" style={S.cardIcon}>work</span>
                  Teaching Experience
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tutor.experience.map((exp, i) => (
                    <div key={i} style={S.expItem}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)', flexShrink: 0 }}>history_edu</span>
                      <span style={S.bodyText}>{exp}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section style={S.card}>
              <h2 style={S.cardTitle}>
                <span className="material-symbols-outlined" style={S.cardIcon}>forum</span>
                Student Reviews ({tutor.reviewsCount})
              </h2>
              {reviewEligibility.canReview && (
                <form onSubmit={handleSubmitReview} style={S.reviewForm}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>
                        Review your trial class
                      </h3>
                      <p style={{ ...S.bodyText, margin: '4px 0 0' }}>
                        Eligible from {reviewEligibility.booking?.date} at {reviewEligibility.booking?.timeSlot}.
                      </p>
                    </div>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                      style={{ ...S.fieldInput, width: 130 }}
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value} stars</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share how the trial class went..."
                    rows={3}
                    style={S.reviewTextarea}
                  />
                  {reviewError && <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 700 }}>{reviewError}</p>}
                  <button
                    type="submit"
                    disabled={reviewSaving || !reviewForm.comment.trim()}
                    style={(reviewSaving || !reviewForm.comment.trim()) ? S.btnDisabled : S.btnPrimary}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rate_review</span>
                    {reviewSaving ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}
              {tutor.reviews?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {tutor.reviews.map((rev) => (
                    <div key={rev.id} style={S.reviewItem}>
                      <div style={S.reviewHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={S.avatar}>{rev.studentName.charAt(0)}</div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{rev.studentName}</p>
                            <p style={{ fontSize: 11, color: 'var(--outline)' }}>{rev.date}</p>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} />
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', fontStyle: 'italic', lineHeight: 1.6 }}>
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No reviews yet.</p>
              )}
            </section>
          </div>

          {/* RIGHT: Schedule sticky */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Weekly Schedule */}
            <section style={S.card}>
              <h2 style={S.cardTitle}>
                <span className="material-symbols-outlined" style={S.cardIcon}>calendar_month</span>
                Weekly Availability
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DAY_ORDER.map(day => {
                  const slots = tutor.availability?.[day] || [];
                  return (
                    <div key={day} style={S.dayRow}>
                      <span style={{ ...S.dayLabel, color: slots.length > 0 ? 'var(--on-surface)' : 'var(--outline)' }}>{day}</span>
                      {slots.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {slots.map(slot => (
                            <span key={slot} style={S.slotChip}>{slot}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--outline)' }}>Unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* CTA Card */}
            <div style={S.ctaCard}>
              <span className="material-symbols-outlined" style={{ fontSize: 44 }}>event_upcoming</span>
              <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>Ready to start learning?</h3>
              <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
                Choose a time that fits your schedule. You only pay once the tutor approves.
              </p>
              <button onClick={handleBookSession} style={S.ctaCardBtn}>Schedule Now</button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */
function Header({ onBack, backLabel }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#/" className="brand">
          <span className="material-symbols-outlined icon-fill">school</span>
          <span className="brand-name">EduX</span>
        </a>
        <button type="button" onClick={onBack} style={S.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          {backLabel}
        </button>
      </div>
    </header>
  );
}

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`material-symbols-outlined ${i <= Math.floor(rating) ? 'icon-fill' : ''}`}
          style={{ fontSize: 15, color: i <= Math.floor(rating) ? '#f59e0b' : '#d1d5db' }}>star</span>
      ))}
    </div>
  );
}

/* ── Styles ── */
const S = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' },
  main: { flex: 1, padding: '32px 24px 60px', maxWidth: 1180, margin: '0 auto', width: '100%' },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 },
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: '4px solid #e5e7eb', borderTopColor: 'var(--primary)',
    animation: 'spin 0.8s linear infinite'
  },
  errorCard: {
    background: '#fff', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%',
    textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  },
  /* Hero */
  heroBanner: {
    background: 'linear-gradient(135deg, #eef1ff 0%, #f5f5ff 50%, #eaf3ff 100%)',
    borderRadius: 24, padding: '32px 36px', border: '1px solid rgba(0,40,142,0.08)',
    display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
    marginBottom: 32, boxShadow: '0 2px 12px rgba(0,40,142,0.06)',
    animation: 'fadeIn 0.4s ease'
  },
  heroAvatar: { width: 130, height: 130, borderRadius: 18, objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', flexShrink: 0 },
  featuredBadge: { display: 'inline-block', background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 999, padding: '3px 12px', marginBottom: 6 },
  verifiedBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', border: '1px solid #bbf7d0' },
  newBadge: { display: 'inline-flex', alignItems: 'center', marginLeft: 10, verticalAlign: 'middle', background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1 },
  heroName: { fontSize: 30, fontWeight: 800, color: 'var(--on-surface)', margin: '6px 0 10px', letterSpacing: '-0.01em' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  subjectTag: { background: '#fff', color: 'var(--primary)', fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '4px 14px', border: '1px solid rgba(0,40,142,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '8px 24px', alignItems: 'center' },
  metaItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'var(--on-surface-variant)', fontWeight: 500 },
  ctaBox: { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderRadius: 18, padding: '20px 24px', border: '1px solid rgba(196,197,213,0.3)', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 200, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
  rateText: { fontSize: 28, fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0', display: 'flex', alignItems: 'baseline', gap: 4 },
  /* Grid */
  grid: { display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: 28, alignItems: 'start' },
  /* Card */
  card: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '24px 28px', border: '1px solid rgba(196,197,213,0.25)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', animation: 'fadeIn 0.4s ease' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 16 },
  cardIcon: { color: 'var(--primary)', fontSize: 22 },
  bodyText: { fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.7 },
  subTitle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { display: 'flex', gap: 8, fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.5 },
  expItem: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(248,249,251,0.5)', borderRadius: 12, border: '1px solid rgba(196,197,213,0.15)' },
  /* Reviews */
  reviewItem: { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderTop: '1px solid rgba(196,197,213,0.2)' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,40,142,0.08)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  /* Schedule */
  dayRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(196,197,213,0.15)' },
  dayLabel: { fontSize: 13, fontWeight: 600, minWidth: 90, paddingTop: 2 },
  slotChip: { fontSize: 11, fontWeight: 600, background: 'rgba(0,40,142,0.07)', color: 'var(--primary)', borderRadius: 8, padding: '3px 10px' },
  /* CTA Card */
  ctaCard: { background: 'linear-gradient(135deg, var(--primary) 0%, #1a46c4 100%)', color: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', boxShadow: '0 6px 24px rgba(0,40,142,0.3)' },
  ctaCardBtn: { width: '100%', height: 44, background: '#fff', color: 'var(--primary)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  /* Buttons */
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 22px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' },
  btnDemo: { display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', background: '#eef4ff', color: 'var(--primary)', border: '1px solid rgba(0,40,142,0.18)', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' },
  btnTrial: { display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', background: '#f59e0b', color: '#fff', border: '1px solid #d97706', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' },
  btnTrialWide: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, width: '100%', background: '#f59e0b', color: '#fff', border: '1px solid #d97706', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginTop: 14 },
  btnDisabled: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, width: '100%', background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit', marginTop: 10 },
  btnOutline: { height: 44, padding: '0 18px', background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid rgba(196,197,213,0.6)', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  trialCard: { background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 58%, #eff6ff 100%)', borderRadius: 20, padding: '24px 28px', border: '1px solid #fed7aa', boxShadow: '0 8px 24px rgba(245,158,11,0.12)', animation: 'fadeIn 0.4s ease', scrollMarginTop: 96 },
  trialRibbon: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 900, marginBottom: 14 },
  trialKicker: { display: 'inline-flex', background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 10 },
  trialSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 18 },
  trialStep: { minHeight: 42, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.78)', color: '#92400e', border: '1px solid #fde68a', borderRadius: 12, padding: '8px 10px', fontSize: 12, fontWeight: 800 },
  trialGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 18 },
  formGroupInline: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 800, color: 'var(--on-surface)' },
  fieldInput: { height: 42, width: '100%', border: '1px solid rgba(196,197,213,0.6)', borderRadius: 12, padding: '0 12px', background: '#fff', color: 'var(--on-surface)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  emptyTrial: { minHeight: 42, display: 'flex', alignItems: 'center', margin: 0, color: '#92400e', fontSize: 13, fontWeight: 700 },
  successNotice: { marginTop: 14, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700 },
  errorNotice: { marginTop: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700 },
  reviewForm: { border: '1px solid rgba(0,40,142,0.14)', background: 'rgba(0,40,142,0.035)', borderRadius: 16, padding: 16, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  reviewTextarea: { width: '100%', minHeight: 92, border: '1px solid rgba(196,197,213,0.6)', borderRadius: 12, padding: 12, background: '#fff', color: 'var(--on-surface)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 },
  videoCard: { background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '24px 28px', border: '1px solid rgba(0,40,142,0.14)', boxShadow: '0 8px 24px rgba(0,40,142,0.08)', animation: 'fadeIn 0.4s ease', scrollMarginTop: 96 },
  demoVideo: { width: '100%', maxHeight: 460, borderRadius: 16, background: '#000', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' },
  courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 },
  courseCard: { display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', border: '1px solid rgba(196,197,213,0.35)', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,40,142,0.06)' },
  courseThumb: { width: '100%', height: 140, objectFit: 'cover', background: '#0f172a' },
  courseThumbFallback: { height: 140, background: 'linear-gradient(135deg, #eef4ff, #f8fafc)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  courseChip: { fontSize: 11, fontWeight: 800, color: 'var(--primary)', background: 'rgba(0,40,142,0.07)', borderRadius: 999, padding: '3px 8px' },
  courseChipMuted: { fontSize: 11, fontWeight: 800, color: '#64748b', background: '#f1f5f9', borderRadius: 999, padding: '3px 8px' },
  courseTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--on-surface)', lineHeight: 1.35 },
  courseDesc: { margin: 0, color: 'var(--on-surface-variant)', fontSize: 13, lineHeight: 1.5, minHeight: 40 },
  courseFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto' },
  coursePrice: { color: 'var(--primary)', fontSize: 16, fontWeight: 900 },
  courseLessons: { color: '#64748b', fontSize: 12, fontWeight: 700 },
  courseButton: { height: 40, border: 0, borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid rgba(196,197,213,0.5)', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
};
