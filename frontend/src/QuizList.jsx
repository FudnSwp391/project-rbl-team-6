import { useState, useEffect } from 'react'
import {
  getStudentExams,
  getStudentExamDetail,
  submitStudentExam,
  getStudentHomework,
  submitStudentHomework
} from './services/api';
import { uploadHomeworkFile } from './services/upload';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from './config';

const SUBJECT_ICONS = {
  Mathematics: 'calculate',
  Math: 'calculate',
  Science: 'science',
  Biology: 'biotech',
  Chemistry: 'science',
  Physics: 'bolt',
  Languages: 'translate',
  English: 'translate',
  History: 'history_edu',
  Geography: 'public',
  'Computer Science': 'code',
  Coding: 'code',
  Music: 'music_note',
  Art: 'palette',
  default: 'quiz',
}

function getSubjectIcon(subject) {
  if (!subject) return SUBJECT_ICONS.default
  const key = Object.keys(SUBJECT_ICONS).find(k =>
    subject.toLowerCase().includes(k.toLowerCase())
  )
  return key ? SUBJECT_ICONS[key] : SUBJECT_ICONS.default
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null
  const color =
    score >= 70 ? 'text-green-600 bg-green-50 border-green-200' :
    score >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                  'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-label-sm text-label-sm ${color}`}>
      <span className="material-symbols-outlined text-[14px]">star</span>
      {score}%
    </span>
  )
}

function QuizCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 rounded-xl p-md animate-pulse">
      <div className="flex gap-md items-start">
        <div className="w-12 h-12 rounded-xl bg-surface-container-high shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-container-high rounded w-3/4" />
          <div className="h-3 bg-surface-container-high rounded w-1/2" />
          <div className="h-3 bg-surface-container-high rounded w-full" />
        </div>
      </div>
      <div className="mt-md flex gap-sm">
        <div className="h-6 bg-surface-container-high rounded-full w-20" />
        <div className="h-6 bg-surface-container-high rounded-full w-20" />
      </div>
      <div className="mt-md h-10 bg-surface-container-high rounded-lg" />
    </div>
  )
}

// Format a date as Vietnamese locale string
function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Check if deadline has passed
function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export default function QuizList({ token }) {
  const { user } = useAuth();
  const apiBaseUrl = API_BASE_URL
  
  const [error, setError] = useState('')

  // Tutor Assessments State
  const [tutorHomeworks, setTutorHomeworks] = useState([]);
  const [tutorExams, setTutorExams] = useState([]);
  const [loadingTutor, setLoadingTutor] = useState(false);

  // Homework upload state
  const [activeHomework, setActiveHomework] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      setLoadingTutor(true);
      const [hwData, examData] = await Promise.all([
        getStudentHomework(),
        getStudentExams()
      ]);
      setTutorHomeworks(Array.isArray(hwData) ? hwData : []);
      setTutorExams(Array.isArray(examData) ? examData : []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải bài tập')
    } finally {
      setLoadingTutor(false);
    }
  }

  // ---- Tutor Homework Handlers ----
  const handleOpenHomework = (hw) => {
    setActiveHomework(hw);
    setUploadFile(null);
    setSubmitSuccess(false);
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!uploadFile) return alert('Vui lòng chọn file');
    try {
      setUploading(true);
      const fileUrl = await uploadHomeworkFile(uploadFile, user?.id);

      // Submit to server — will throw if server returns an error (no silent catch)
      const result = await submitStudentHomework(activeHomework.id, fileUrl);

      // Safety net: if result is falsy, treat as failure
      if (!result) {
        throw new Error('Server không phản hồi thành công.');
      }

      // ✅ Server confirmed success — now update local state immediately
      const submittedAt = new Date().toISOString();
      setTutorHomeworks(prev => prev.map(hw =>
        hw.id === activeHomework.id
          ? {
              ...hw,
              submission_status: 'Submitted',
              submission_file_url: fileUrl,
              submission_submitted_at: submittedAt,
            }
          : hw
      ));

      // Update activeHomework so modal shows success state
      setActiveHomework(prev => ({
        ...prev,
        submission_status: 'Submitted',
        submission_file_url: fileUrl,
        submission_submitted_at: submittedAt,
      }));

      setSubmitSuccess(true);
      setUploadFile(null);

      // Close modal after short delay — NO fetchAll() here because it would overwrite
      // the local state we just set above with potentially stale server data.
      // The local state IS correct since the server confirmed success.
      setTimeout(() => {
        setActiveHomework(null);
        setSubmitSuccess(false);
        // ⚠️ DO NOT call fetchAll() here — it would reset submission_status to null
        // if the server GET query returns before the DB fully commits.
      }, 1800);
    } catch (err) {
      console.error(err);
      alert('Nộp bài thất bại: ' + (err.message || 'Lỗi không xác định. Vui lòng thử lại.'));
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="flex flex-col gap-xl pb-xl">
      {/* Header & Main Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-end items-end flex-wrap gap-md">
          <button
            onClick={fetchAll}
            className="h-10 px-md bg-surface-container border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-sm hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/30 border border-error/20 rounded-xl p-md flex items-center gap-sm text-on-error-container">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-body-md">{error}</p>
        </div>
      )}

      {/* ── TUTOR EXAMS ── */}
      {(loadingTutor || tutorExams.length > 0) && (
        <div>
          <h3 className="font-label-md text-label-md text-on-surface-variant mb-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">quiz</span>
            Đề thi được giao
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {loadingTutor ? (
              [1, 2].map(i => <QuizCardSkeleton key={`exam-skel-${i}`} />)
            ) : (
              tutorExams.map(exam => (
                <div key={exam.id} className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
                  <div className="flex gap-md items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      exam.attempt_status === 'submitted'
                        ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
                        : 'bg-primary-container/30 text-on-primary-container group-hover:bg-primary-container/50'
                    }`}>
                      <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-sm">
                        <h3 className="font-label-md text-label-md text-on-surface leading-snug line-clamp-2">{exam.title}</h3>
                        {exam.attempt_status === 'submitted' && <ScoreBadge score={exam.attempt_score} />}
                      </div>
                      <p className="font-label-sm text-label-sm text-primary mt-0.5">{exam.subject || 'Chung'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">help</span>
                      {exam.total_questions || 0} câu hỏi
                    </span>
                    <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      {exam.duration_minutes} phút
                    </span>
                  </div>
                  <div className="mt-auto">
                    {exam.attempt_status === 'submitted' ? (
                      <button
                        onClick={() => { window.location.hash = `/quiz-result/${exam.attempt_id}` }}
                        className="w-full h-10 border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container hover:text-primary transition-colors flex items-center justify-center gap-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                        Xem Kết Quả
                      </button>
                    ) : (
                      <button
                        onClick={() => { window.location.hash = `/quiz/${exam.id}` }}
                        className="w-full h-10 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 hover:shadow-md transition-all flex items-center justify-center gap-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                        Bắt Đầu Kiểm Tra
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TUTOR HOMEWORK ── */}
      <div>
        <h3 className="font-label-md text-label-md text-on-surface-variant mb-md flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">edit_document</span>
          Bài tập về nhà
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {loadingTutor ? (
            [1, 2, 3].map(i => <QuizCardSkeleton key={i} />)
          ) : tutorHomeworks.length === 0 ? (
             <div className="col-span-full flex flex-col items-center justify-center py-xl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[64px] opacity-30">edit_document</span>
              <p className="font-headline-md text-headline-md">Không có bài tập</p>
            </div>
          ) : (
            tutorHomeworks.map(hw => {
              const isSubmitted = hw.submission_status === 'Submitted';
              const overdue = isOverdue(hw.deadline) && !isSubmitted;
              return (
                <div key={hw.id} className={`bg-surface-container-lowest/70 backdrop-blur-md border shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group ${
                  isSubmitted ? 'border-green-200/60' : overdue ? 'border-red-200/60' : 'border-surface-container-lowest/30'
                }`}>
                  {/* Card Header */}
                  <div className="flex gap-md items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      isSubmitted
                        ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
                        : overdue
                        ? 'bg-red-50 text-red-500'
                        : 'bg-primary-container/30 text-on-primary-container group-hover:bg-primary-container/50'
                    }`}>
                      <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isSubmitted ? 'task_alt' : 'edit_document'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-sm">
                        <h3 className="font-label-md text-label-md text-on-surface leading-snug line-clamp-2">
                          {hw.title}
                        </h3>
                        {isSubmitted && hw.submission_score != null && <ScoreBadge score={hw.submission_score} />}
                      </div>
                      <p className="font-label-sm text-label-sm text-primary mt-0.5">{hw.course || 'Chung'}</p>
                    </div>
                  </div>

                  {/* Submitted status badge */}
                  {isSubmitted && (
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200/60">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      Đã nộp
                      {hw.submission_submitted_at && (
                        <span className="font-normal text-green-600 ml-0.5">
                          — {formatDate(hw.submission_submitted_at)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Submitted file link */}
                  {isSubmitted && hw.submission_file_url && (
                    <a
                      href={hw.submission_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 w-fit bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/50 transition-colors hover:bg-blue-100"
                    >
                      <span className="material-symbols-outlined text-[15px]">description</span>
                      Xem bài đã nộp
                    </a>
                  )}

                  {/* Download assignment file — only show if not yet submitted */}
                  {hw.file_url && !isSubmitted && (
                    <a href={hw.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1.5 w-fit bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 transition-colors hover:bg-primary/10">
                      <span className="material-symbols-outlined text-[18px]">download</span> Tải đề bài
                    </a>
                  )}

                  {/* Deadline */}
                  {hw.deadline && (
                    <div className={`flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md w-fit border ${
                      overdue
                        ? 'text-red-600 bg-red-50 border-red-200/50'
                        : 'text-amber-600 bg-amber-50 border-amber-200/50'
                    }`}>
                      <span className="material-symbols-outlined text-[15px]">{overdue ? 'warning' : 'schedule'}</span>
                      {overdue ? 'Đã hết hạn: ' : 'Hạn nộp: '}
                      {formatDate(hw.deadline)}
                    </div>
                  )}

                  {/* Footer: Tutor info + Action button */}
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/20">
                    {/* Tutor info */}
                    <div className="flex items-center gap-1.5">
                      {hw.tutor_picture ? (
                        <img
                          src={hw.tutor_picture}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-outline-variant/30"
                          alt={hw.tutor_name || 'Gia sư'}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary-container/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] text-on-primary-container">person</span>
                        </div>
                      )}
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] text-on-surface-variant">Gia sư giao</span>
                        <span className="text-[12px] font-semibold text-on-surface truncate max-w-[90px]">
                          {hw.tutor_name || 'Không rõ'}
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => handleOpenHomework(hw)}
                      className={`h-9 px-4 font-label-sm text-label-sm rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        isSubmitted
                          ? 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high hover:text-primary'
                          : 'bg-primary text-on-primary hover:opacity-90'
                      }`}
                    >
                      {isSubmitted ? (
                        <><span className="material-symbols-outlined text-[16px]">edit</span> Chỉnh sửa</>
                      ) : (
                        <><span className="material-symbols-outlined text-[16px]">upload</span> Nộp bài</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* HOMEWORK UPLOAD MODAL */}
      {activeHomework && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl animate-[zoomIn_0.2s_ease-out] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
                    {activeHomework.submission_status === 'Submitted' ? 'Chỉnh sửa bài nộp' : 'Nộp bài tập'}
                  </p>
                  <h3 className="font-bold text-base text-on-surface leading-snug line-clamp-2">
                    {activeHomework.title}
                  </h3>
                </div>
                <button onClick={() => setActiveHomework(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Tutor & Subject info */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/20">
                <div className="flex items-center gap-1.5">
                  {activeHomework.tutor_picture ? (
                    <img src={activeHomework.tutor_picture} className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-container/50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px] text-on-primary-container">person</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-on-surface-variant leading-none">Gia sư giao bài</p>
                    <p className="text-[13px] font-semibold text-on-surface">{activeHomework.tutor_name || 'Không rõ'}</p>
                  </div>
                </div>
                {activeHomework.course && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold ml-auto">
                    <span className="material-symbols-outlined text-[12px]">school</span>
                    {activeHomework.course}
                  </span>
                )}
              </div>

              {/* Deadline in modal */}
              {activeHomework.deadline && (
                <div className={`mt-2 flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md w-fit border ${
                  isOverdue(activeHomework.deadline) && activeHomework.submission_status !== 'Submitted'
                    ? 'text-red-600 bg-red-50 border-red-200/50'
                    : 'text-amber-600 bg-amber-50 border-amber-200/50'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  Hạn nộp: {formatDate(activeHomework.deadline)}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitHomework} className="p-6">
              {/* Success Banner */}
              {submitSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Nộp bài thành công!</p>
                    <p className="text-xs text-green-600">Bài làm của bạn đã được ghi nhận.</p>
                  </div>
                </div>
              )}

              {/* Previously submitted file */}
              {activeHomework.submission_status === 'Submitted' && activeHomework.submission_file_url && !submitSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm font-semibold text-green-800 mb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Đã nộp bài
                    {activeHomework.submission_submitted_at && (
                      <span className="font-normal text-green-600 text-xs ml-1">
                        lúc {formatDate(activeHomework.submission_submitted_at)}
                      </span>
                    )}
                  </p>
                  <a href={activeHomework.submission_file_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:underline flex items-center gap-1.5 font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    Xem file đã nộp
                  </a>
                  {activeHomework.submission_feedback && (
                    <div className="mt-2 pt-2 border-t border-green-200/60">
                      <p className="text-xs font-semibold text-green-800">Nhận xét của gia sư:</p>
                      <p className="text-xs text-green-700 mt-0.5">{activeHomework.submission_feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {!submitSuccess && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-on-surface mb-2">
                    {activeHomework.submission_status === 'Submitted'
                      ? 'Chọn file mới để nộp lại (ghi đè bài cũ)'
                      : 'Chọn file bài làm của bạn'}
                  </label>
                  <input
                    type="file"
                    onChange={e => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                  />
                  {uploadFile && (
                    <p className="mt-1.5 text-xs text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">attach_file</span>
                      {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setActiveHomework(null)}
                  className="px-4 py-2 text-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface transition-colors"
                >
                  {submitSuccess ? 'Đóng' : 'Hủy'}
                </button>
                {!submitSuccess && (
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeHomework.submission_status === 'Submitted'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang tải lên...
                      </>
                    ) : activeHomework.submission_status === 'Submitted' ? (
                      <>
                        <span className="material-symbols-outlined text-[16px]">upload</span> Nộp lại
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">upload</span> Nộp bài
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

function QuizCard({ quiz }) {
  const isFailed = quiz.attempt_status === 'submitted' && (quiz.attempt_score ?? 0) < 50
  const isCompleted = quiz.attempt_status === 'submitted' && !isFailed
  const isInProgress = quiz.attempt_status === 'in_progress'
  const icon = getSubjectIcon(quiz.subject)

  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Header */}
      <div className="flex gap-md items-start">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
          isCompleted
            ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
            : isFailed
            ? 'bg-red-50 text-red-600 group-hover:bg-red-100'
            : 'bg-primary-container/30 text-on-primary-container group-hover:bg-primary-container/50'
        }`}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-sm">
            <h3 className="font-label-md text-label-md text-on-surface leading-snug line-clamp-2">
              {quiz.title}
            </h3>
            {(isCompleted || isFailed) && <ScoreBadge score={quiz.attempt_score} />}
          </div>
          <p className="font-label-sm text-label-sm text-primary mt-0.5">{quiz.subject}</p>
        </div>
      </div>

      {/* Description */}
      {quiz.description && (
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 text-[13px]">
          {quiz.description}
        </p>
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap gap-xs">
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[14px]">help</span>
          {quiz.total_questions} câu hỏi
        </span>
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[14px]">timer</span>
          {quiz.duration_minutes} phút
        </span>
        {isInProgress && (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">pending</span>
            Đang làm
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Không đạt (Cần làm lại)
          </span>
        )}
      </div>

      {/* Action button */}
      {isCompleted ? (
        <button
          onClick={() => { window.location.hash = `/quiz-result/${quiz.attempt_id}` }}
          className="w-full h-10 border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container hover:text-primary transition-colors flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
          Xem Kết Quả
        </button>
      ) : (
        <button
          onClick={() => { window.location.hash = `/quiz/${quiz.id}` }}
          className="w-full h-10 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 hover:shadow-md transition-all flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isInProgress ? 'play_circle' : isFailed ? 'replay' : 'play_arrow'}
          </span>
          {isInProgress ? 'Tiếp tục kiểm tra' : isFailed ? 'Làm lại' : 'Bắt Đầu Kiểm Tra'}
        </button>
      )}
    </div>
  )
}
