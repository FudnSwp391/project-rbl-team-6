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

export default function QuizList({ token }) {
  const { user } = useAuth();
  const apiBaseUrl = API_BASE_URL
  
  const [error, setError] = useState('')

  // Tutor Assessments State
  const [tutorHomeworks, setTutorHomeworks] = useState([]);
  const [loadingTutor, setLoadingTutor] = useState(false);

  // Homework upload state
  const [activeHomework, setActiveHomework] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchHomework()
  }, [])

  async function fetchHomework() {
    try {
      setLoadingTutor(true);
      const data = await getStudentHomework();
      setTutorHomeworks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải bài tập')
    } finally {
      setLoadingTutor(false);
    }
  }

  // ---- Tutor Homework Handlers ----
  const handleOpenHomework = (hw) => {
    if (hw.submission_status === 'Submitted') {
      alert('Bạn đã nộp bài tập này rồi.');
      return;
    }
    setActiveHomework(hw);
    setUploadFile(null);
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!uploadFile) return alert('Vui lòng chọn file');
    try {
      setUploading(true);
      const fileUrl = await uploadHomeworkFile(uploadFile, user?.id);
      await submitStudentHomework(activeHomework.id, fileUrl);
      alert('Nộp bài tập thành công!');
      setActiveHomework(null);
      fetchHomework();
    } catch (err) {
      console.error(err);
      alert('Lỗi tải file');
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
            onClick={fetchHomework}
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

      {/* ── TUTOR HOMEWORK ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {loadingTutor ? (
            [1, 2, 3].map(i => <QuizCardSkeleton key={i} />)
          ) : tutorHomeworks.length === 0 ? (
             <div className="col-span-full flex flex-col items-center justify-center py-xl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[64px] opacity-30">edit_document</span>
              <p className="font-headline-md text-headline-md">Không có bài tập</p>
            </div>
          ) : (
            tutorHomeworks.map(hw => (
              <div key={hw.id} className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="flex gap-md items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    hw.submission_status === 'Submitted'
                      ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
                      : 'bg-primary-container/30 text-on-primary-container group-hover:bg-primary-container/50'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      edit_document
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-sm">
                      <h3 className="font-label-md text-label-md text-on-surface leading-snug line-clamp-2">
                        {hw.title}
                      </h3>
                      {hw.submission_status === 'Submitted' && <ScoreBadge score={hw.attempt_score} />}
                    </div>
                    <p className="font-label-sm text-label-sm text-primary mt-0.5">{hw.course || 'Chung'}</p>
                  </div>
                </div>

                {hw.file_url && (
                  <a href={hw.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1 w-fit">
                    <span className="material-symbols-outlined text-[16px]">download</span> Tải đề bài
                  </a>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <img src={hw.tutor_picture || 'https://via.placeholder.com/20'} className="w-5 h-5 rounded-full" alt="" />
                    Gia sư: {hw.tutor_name}
                  </span>
                  <button
                    onClick={() => handleOpenHomework(hw)}
                    className={`h-8 px-4 font-label-sm text-label-sm rounded-lg flex items-center justify-center gap-sm transition-all ${
                      hw.submission_status === 'Submitted'
                        ? 'border border-outline-variant text-on-surface hover:bg-surface-container'
                        : 'bg-primary text-on-primary hover:opacity-90 shadow-sm'
                    }`}
                  >
                    {hw.submission_status === 'Submitted' ? 'Đã nộp' : 'Nộp bài'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      {/* HOMEWORK UPLOAD MODAL */}
      {activeHomework && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl animate-[zoomIn_0.2s_ease-out] overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-bold text-lg text-on-surface">Nộp bài: {activeHomework.title}</h3>
              <button onClick={() => setActiveHomework(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmitHomework} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-on-surface mb-2">Chọn file bài làm của bạn</label>
                <input
                  type="file"
                  onChange={e => setUploadFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setActiveHomework(null)}
                  className="px-4 py-2 text-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang tải lên...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">upload</span> Nộp bài
                    </>
                  )}
                </button>
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
