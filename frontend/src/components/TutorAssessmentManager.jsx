import React, { useState, useEffect, useRef } from 'react';
import {
  getTutorExams,
  createTutorExam,
  updateTutorExamStatus,
  updateTutorExam,
  duplicateTutorExam,
  deleteTutorExam,
  getTutorExamDetail,
  getTutorHomework,
  createTutorHomework,
  updateTutorHomeworkStatus,
  updateTutorHomework,
  deleteTutorHomework,
  getTutorCourses,
} from '../services/api';
import { uploadHomeworkFile } from '../services/upload';
import { API_BASE_URL } from '../config';

export default function TutorAssessmentManager({ token, user }) {
  const [activeTab, setActiveTab] = useState('exams');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Modals state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);

  // Data states
  const [exams, setExams] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const dropdownRef = useRef(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsData, homeworkData, coursesData] = await Promise.all([
        getTutorExams(),
        getTutorHomework(),
        getTutorCourses().catch(() => [])
      ]);
      setExams(examsData || []);
      setHomeworks(homeworkData || []);
      setCourses(coursesData || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Exam Actions
  const handlePublishExam = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    try {
      await updateTutorExamStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert('Cập nhật trạng thái thất bại');
    }
  };

  const handleDuplicateExam = async (id) => {
    try {
      await duplicateTutorExam(id);
      fetchData();
    } catch (err) {
      alert('Nhân bản đề thi thất bại');
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này không?')) return;
    try {
      await deleteTutorExam(id);
      fetchData();
    } catch (err) {
      alert('Xóa đề thi thất bại');
    }
  };

  // Homework Actions
  const handlePublishHomework = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    try {
      await updateTutorHomeworkStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert('Cập nhật trạng thái thất bại');
    }
  };

  const handleDeleteHomework = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài tập này không?')) return;
    try {
      await deleteTutorHomework(id);
      fetchData();
    } catch (err) {
      alert('Xóa bài tập thất bại');
    }
  };

  // Filter Logic
  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === 'All' || e.course === filterCourse;
    const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const filteredHomeworks = homeworks.filter(h => {
    const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === 'All' || h.course === filterCourse;
    const matchesStatus = filterStatus === 'All' || h.status === filterStatus;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Calculate Stats
  const totalAssessments = exams.length + homeworks.length;
  const publishedCount = exams.filter(e => e.status === 'Published').length + homeworks.filter(h => h.status === 'Open').length;
  const pendingCount = exams.filter(e => e.status === 'Draft').length + homeworks.filter(h => h.status === 'Draft').length;

  return (
    <div className="pt-8 pb-xl px-margin-main bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-1">
            <span className="material-symbols-outlined text-primary text-[28px] md:text-[32px]">assignment</span>
            <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Quản lý Bài tập & Đề thi</h2>
          </div>
          <p className="text-sm md:text-base text-secondary">Quản lý đề thi trắc nghiệm và bài tập tự luận cho học viên.</p>
        </div>

        <div className="relative group w-full md:w-auto" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full md:w-auto bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold hover:bg-on-tertiary-fixed transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Tạo mới
            <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
          </button>
          
          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden">
              <button 
                onClick={() => { setEditingExam(null); setIsExamModalOpen(true); setIsDropdownOpen(false); }}
                className="w-full text-left px-md py-sm hover:bg-surface-container-low flex items-center gap-md font-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-primary">edit_document</span> Tạo Đề thi mới
              </button>
              <button 
                onClick={() => { setEditingHomework(null); setIsHomeworkModalOpen(true); setIsDropdownOpen(false); }}
                className="w-full text-left px-md py-sm hover:bg-surface-container-low flex items-center gap-md font-label-md border-t border-outline-variant transition-colors"
              >
                <span className="material-symbols-outlined text-primary">cloud_upload</span> Giao Bài tập về nhà
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all flex flex-col gap-sm">
          <div className="flex justify-between items-start">
            <span className="p-xs bg-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-on-primary-fixed-variant">list_alt</span>
            </span>
          </div>
          <div>
            <p className="text-label-md text-secondary">Tổng số bài</p>
            <h3 className="text-headline-lg font-headline-lg text-on-surface">{totalAssessments}</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all flex flex-col gap-sm">
          <div className="flex justify-between items-start">
            <span className="p-xs bg-tertiary-fixed rounded-lg">
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant">visibility</span>
            </span>
          </div>
          <div>
            <p className="text-label-md text-secondary">Đã giao / Mở</p>
            <h3 className="text-headline-lg font-headline-lg text-on-surface">{publishedCount}</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all flex flex-col gap-sm">
          <div className="flex justify-between items-start">
            <span className="p-xs bg-orange-100 rounded-lg">
              <span className="material-symbols-outlined text-orange-700">pending_actions</span>
            </span>
          </div>
          <div>
            <p className="text-label-md text-secondary">Bản nháp</p>
            <h3 className="text-headline-lg font-headline-lg text-on-surface">{pendingCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Navigation & Filter Area */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        {/* Tabs */}
        <div className="flex px-2 md:px-6 border-b border-outline-variant bg-white overflow-x-auto hide-scrollbar">
          <button 
            className={`px-4 md:px-8 py-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'exams' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            onClick={() => setActiveTab('exams')}
          >
            Đề thi trắc nghiệm / tự luận
          </button>
          <button 
            className={`px-4 md:px-8 py-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'homework' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            onClick={() => setActiveTab('homework')}
          >
            Bài tập về nhà
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fcfcfc] border-b border-outline-variant">
          <div className="flex-1 relative w-full md:max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Tìm kiếm bài tập/đề thi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-outline-variant rounded-lg py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select 
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="flex-1 md:flex-none bg-white border border-outline-variant rounded-lg py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm cursor-pointer"
            >
              <option value="All">Tất cả Khóa học</option>
              {Array.from(new Set([...exams.map(e => e.course), ...homeworks.map(h => h.course)])).filter(Boolean).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 md:flex-none bg-white border border-outline-variant rounded-lg py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm cursor-pointer"
            >
              <option value="All">Trạng thái</option>
              <option value="Published">Đã giao / Mở</option>
              <option value="Draft">Bản nháp</option>
              <option value="Closed">Đã đóng</option>
            </select>
            <button className="bg-white border border-outline-variant p-2 rounded-lg hover:bg-gray-50 hover:text-primary transition-colors flex items-center justify-center shadow-sm text-secondary" title="Bộ lọc">
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-xl text-center text-secondary">Đang tải...</div>
        ) : error ? (
          <div className="p-xl text-center text-error">{error}</div>
        ) : activeTab === 'exams' ? (
          <div className="overflow-x-auto bg-white min-h-[300px]">
            {filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl text-secondary">
                <span className="material-symbols-outlined text-[48px] mb-sm">note_stack</span>
                <p>Không tìm thấy đề thi nào.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fb] text-xs uppercase tracking-wider text-[#5d5f5f] font-bold border-b border-outline-variant">
                    <th className="px-6 py-4">Tên Bài</th>
                    <th className="px-6 py-4">Khóa học</th>
                    <th className="px-6 py-4">Cấu hình</th>
                    <th className="px-6 py-4">Hạn nộp</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredExams.map(exam => (
                    <tr key={exam.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-[#00288e]">{exam.title}</div>
                        <div className="text-xs text-[#757684] mt-0.5">{exam.question_count || 0} Câu hỏi</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface font-medium">{exam.course || '--'}</td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-xs text-label-sm text-secondary">
                          <span className="material-symbols-outlined text-[16px]">schedule</span> {exam.duration_minutes} phút
                        </div>
                      </td>
                      <td className="px-lg py-md text-body-md text-secondary">
                        {exam.deadline ? new Date(exam.deadline).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-lg py-md">
                        {exam.status === 'Published' ? (
                           <span className="px-sm py-1 rounded-full bg-green-100 text-green-700 text-label-sm font-bold">Đã giao</span>
                        ) : exam.status === 'Draft' ? (
                          <span className="px-sm py-1 rounded-full bg-surface-variant text-secondary text-label-sm font-bold">Bản nháp</span>
                        ) : (
                          <span className="px-sm py-1 rounded-full bg-red-100 text-red-700 text-label-sm font-bold">Đã đóng</span>
                        )}
                      </td>
                      <td className="px-lg py-md text-right">
                        <div className="flex items-center justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setEditingExam(exam); setIsExamModalOpen(true); }} title="Chỉnh sửa" className="text-secondary hover:text-primary">
                             <span className="material-symbols-outlined">edit</span>
                           </button>
                           <button onClick={() => handlePublishExam(exam.id, exam.status)} title="Đổi trạng thái" className="text-secondary hover:text-primary">
                             <span className="material-symbols-outlined">{exam.status === 'Published' ? 'visibility_off' : 'visibility'}</span>
                           </button>
                           <button onClick={() => handleDuplicateExam(exam.id)} title="Nhân bản" className="text-secondary hover:text-primary">
                             <span className="material-symbols-outlined">content_copy</span>
                           </button>
                           <button onClick={() => handleDeleteExam(exam.id)} title="Xóa" className="text-secondary hover:text-error">
                             <span className="material-symbols-outlined">delete</span>
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="bg-white min-h-[300px]">
            {filteredHomeworks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl text-secondary">
                <span className="material-symbols-outlined text-[48px] mb-sm">cloud_upload</span>
                <p>Không tìm thấy bài tập nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-base p-lg">
                {filteredHomeworks.map(hw => (
                  <div key={hw.id} className="group border border-outline-variant rounded-xl p-md hover:bg-primary-fixed/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-md">
                    <div className="flex items-center gap-lg">
                      <div className="w-12 h-12 bg-white rounded-lg border border-outline-variant flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary">picture_as_pdf</span>
                      </div>
                      <div>
                        <h4 className="font-label-md text-on-surface">{hw.title}</h4>
                        <p className="text-label-sm text-secondary">{hw.course || '--'} • Tối đa {hw.max_score} đ</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-xl text-right">
                      <div className="hidden md:block">
                        <p className="text-label-sm text-secondary">Hạn nộp</p>
                        <p className="text-label-md font-bold text-on-surface">{hw.deadline ? new Date(hw.deadline).toLocaleDateString() : '--'}</p>
                      </div>
                      <div className="min-w-[100px] hidden sm:block text-left">
                        <p className="text-label-sm text-secondary">Lượt nộp</p>
                        <p className="text-label-sm font-bold mt-1 text-on-surface">{hw.submission_count || 0}</p>
                      </div>
                      <div className="flex items-center gap-sm">
                        <span className={`px-sm py-1 rounded-full text-label-sm font-bold ${hw.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {hw.status === 'Open' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                        <div className="flex items-center gap-xs ml-2">
                           <button onClick={() => { setEditingHomework(hw); setIsHomeworkModalOpen(true); }} title="Chỉnh sửa" className="p-xs text-secondary hover:text-primary rounded-full hover:bg-surface-container">
                             <span className="material-symbols-outlined">edit</span>
                           </button>
                           <button onClick={() => handlePublishHomework(hw.id, hw.status)} title="Đổi trạng thái" className="p-xs text-secondary hover:text-primary rounded-full hover:bg-surface-container">
                             <span className="material-symbols-outlined">{hw.status === 'Open' ? 'lock' : 'lock_open'}</span>
                           </button>
                           <button onClick={() => handleDeleteHomework(hw.id)} title="Xóa" className="p-xs text-secondary hover:text-error rounded-full hover:bg-surface-container">
                             <span className="material-symbols-outlined">delete</span>
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {isExamModalOpen && (
        <CreateExamModal 
          onClose={() => setIsExamModalOpen(false)} 
          onSuccess={() => { setIsExamModalOpen(false); fetchData(); }} 
          courses={courses}
          editingData={editingExam}
        />
      )}
      
      {isHomeworkModalOpen && (
        <UploadHomeworkModal 
          onClose={() => setIsHomeworkModalOpen(false)} 
          onSuccess={() => { setIsHomeworkModalOpen(false); fetchData(); }} 
          courses={courses}
          editingData={editingHomework}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub Components (Modals)
// ----------------------------------------------------------------------

function CreateExamModal({ onClose, onSuccess, courses, editingData }) {
  const [formData, setFormData] = useState({
    title: '',
    course: '',
    duration_minutes: 60,
    total_score: 100,
    status: 'Draft',
    questions: [],
    assigned_students: []
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [myStudents, setMyStudents] = useState([]);
  
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/tutor/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMyStudents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Fetch students error", err);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (editingData) {
      setLoading(true);
      getTutorExamDetail(editingData.id).then(data => {
        if (data) {
          setFormData({
            title: data.title || '',
            course: data.subject || '',
            duration_minutes: data.duration_minutes || 60,
            total_score: 100,
            status: data.is_published ? 'Published' : 'Draft',
            assigned_students: data.assigned_students || [],
            questions: (data.questions || []).map(q => ({
              id: q.id,
              question_type: q.question_type === 'essay' ? 'Essay' : 'MCQ',
              question_text: q.question_text || '',
              options: [
                { text: q.option_a || '', isCorrect: q.correct_answer === 'A' },
                { text: q.option_b || '', isCorrect: q.correct_answer === 'B' },
                { text: q.option_c || '', isCorrect: q.correct_answer === 'C' },
                { text: q.option_d || '', isCorrect: q.correct_answer === 'D' }
              ],
              correct_answer: q.correct_answer || 'A',
              grading_note: q.explanation || q.suggested_answer || '',
              max_point: 10
            }))
          });
        }
        setLoading(false);
      });
    }
  }, [editingData]);

  const handleAddMCQ = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        id: Date.now(),
        question_type: 'MCQ',
        question_text: '',
        options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
        correct_answer: 'A',
        max_point: 10
      }]
    }));
  };

  const handleAddEssay = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        id: Date.now(),
        question_type: 'Essay',
        question_text: '',
        max_point: 20,
        grading_note: ''
      }]
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...formData.questions];
    updated[index][field] = value;
    setFormData({ ...formData, questions: updated });
  };

  const handleRemoveQuestion = (index) => {
    const updated = [...formData.questions];
    updated.splice(index, 1);
    setFormData({ ...formData, questions: updated });
  };

  const handleSave = async (status) => {
    setFormError('');
    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.course || 'General',
        grade: 12,
        duration_minutes: formData.duration_minutes,
        description: formData.course,
        assigned_students: formData.assigned_students,
        status: status,
        questions: formData.questions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type === 'MCQ' ? 'multiple_choice' : 'essay',
          option_a: q.options && q.options[0] ? q.options[0].text : '',
          option_b: q.options && q.options[1] ? q.options[1].text : '',
          option_c: q.options && q.options[2] ? q.options[2].text : '',
          option_d: q.options && q.options[3] ? q.options[3].text : '',
          correct_answer: q.correct_answer || 'A',
          explanation: q.grading_note || '',
          suggested_answer: q.grading_note || ''
        }))
      };
      if (editingData) {
        await updateTutorExam(editingData.id, payload);
      } else {
        await createTutorExam(payload);
      }
      onSuccess();
    } catch (err) {
      setFormError("Error saving exam: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-headline-md font-headline-md text-primary">{editingData ? 'Chỉnh sửa Đề thi' : 'Tạo Đề thi mới'}</h3>
            <p className="text-body-md text-secondary">Thiết lập cấu hình và câu hỏi cho đề thi trắc nghiệm / tự luận.</p>
          </div>
          <button className="text-secondary hover:text-error transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-xl overflow-y-auto space-y-lg bg-surface flex-1">
          <div className="grid grid-cols-2 gap-lg">
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Tên bài kiểm tra</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
                placeholder="VD: Kiểm tra Toán 15 phút" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Khóa học / Lớp</label>
              <select 
                value={formData.course}
                onChange={e => setFormData({...formData, course: e.target.value})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3 bg-white" 
              >
                <option value="">-- Chọn Khóa học --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Thời gian làm bài (Phút)</label>
              <input 
                type="number" 
                value={formData.duration_minutes}
                onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Điểm đạt (tối thiểu)</label>
              <input 
                type="number" 
                value={formData.total_score}
                onChange={e => setFormData({...formData, total_score: parseInt(e.target.value) || 0})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
              />
            </div>
          </div>
          
          <div className="space-y-sm">
            <label className="text-label-md font-bold">Giao bài cho học sinh (Tùy chọn)</label>
            <div className="p-3 border border-outline-variant rounded-lg bg-white max-h-40 overflow-y-auto space-y-2">
              {myStudents.length === 0 ? (
                <p className="text-sm text-secondary italic">Bạn chưa có học sinh nào.</p>
              ) : (
                myStudents.map(student => {
                  const isChecked = formData.assigned_students.includes(student.studentId);
                  return (
                    <label key={student.studentId} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface p-1 rounded transition-colors">
                      <input 
                        type="checkbox"
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({...prev, assigned_students: [...prev.assigned_students, student.studentId]}));
                          } else {
                            setFormData(prev => ({...prev, assigned_students: prev.assigned_students.filter(id => id !== student.studentId)}));
                          }
                        }}
                      />
                      <span>{student.studentName}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-xs text-secondary mt-1">Nếu không chọn học sinh nào, bài thi này sẽ hiển thị cho tất cả học viên của bạn.</p>
          </div>

          <div className="space-y-md mt-xl">
            <div className="flex items-center justify-between">
              <label className="text-label-md font-bold text-lg">Soạn câu hỏi</label>
              <div className="flex gap-sm">
                <button type="button" onClick={handleAddMCQ} className="px-sm py-1 border border-primary text-primary rounded-lg text-sm hover:bg-primary/5">
                  + Trắc nghiệm (MCQ)
                </button>
                <button type="button" onClick={handleAddEssay} className="px-sm py-1 border border-primary text-primary rounded-lg text-sm hover:bg-primary/5">
                  + Tự luận
                </button>
              </div>
            </div>

            <div className="space-y-md">
              {formData.questions.length === 0 ? (
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center gap-md hover:border-primary transition-colors cursor-pointer group" onClick={handleAddMCQ}>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary text-[48px]">add_circle_outline</span>
                  <div className="text-center">
                    <p className="text-body-lg font-bold text-on-surface">Click to add a question</p>
                    <p className="text-label-sm text-secondary">Support for Multiple Choice and Essay types.</p>
                  </div>
                </div>
              ) : (
                formData.questions.map((q, index) => (
                  <div key={q.id} className="bg-white border border-outline-variant p-md rounded-xl shadow-sm relative">
                    <button onClick={() => handleRemoveQuestion(index)} className="absolute top-2 right-2 text-secondary hover:text-error">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                    <p className="text-sm font-bold text-primary mb-2">Question {index + 1} ({q.question_type})</p>
                    
                    <input 
                      type="text" 
                      value={q.question_text}
                      onChange={e => handleQuestionChange(index, 'question_text', e.target.value)}
                      placeholder="Enter question text..."
                      className="w-full mb-3 rounded-md border-outline-variant text-sm py-2 px-3 focus:ring-primary focus:border-primary outline-none"
                    />

                    {q.question_type === 'MCQ' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['A', 'B', 'C', 'D'].map((label, i) => (
                           <div key={label} className="flex items-center gap-2">
                             <input 
                               type="radio" 
                               name={`correct_${q.id}`} 
                               checked={q.correct_answer === label}
                               onChange={() => handleQuestionChange(index, 'correct_answer', label)}
                             />
                             <span className="text-sm font-bold">{label}.</span>
                             <input 
                               type="text" 
                               placeholder={`Option ${label}`}
                               value={q.options[i]?.text || ''}
                               onChange={e => {
                                 const newOpts = [...q.options];
                                 newOpts[i] = { text: e.target.value, isCorrect: q.correct_answer === label };
                                 handleQuestionChange(index, 'options', newOpts);
                               }}
                               className="flex-1 rounded border-outline-variant text-sm py-1 px-2 focus:ring-primary outline-none"
                             />
                           </div>
                        ))}
                      </div>
                    )}

                    {q.question_type === 'Essay' && (
                      <textarea 
                        value={q.grading_note}
                        onChange={e => handleQuestionChange(index, 'grading_note', e.target.value)}
                        placeholder="Grading notes / Expected answer..."
                        className="w-full mt-2 rounded-md border-outline-variant text-sm py-2 px-3 focus:ring-primary focus:border-primary outline-none"
                        rows="2"
                      />
                    )}
                    
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm">Points:</label>
                      <input 
                        type="number" 
                        value={q.max_point}
                        onChange={e => handleQuestionChange(index, 'max_point', parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border-outline-variant py-1 px-2 text-sm focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-xl py-lg border-t border-outline-variant bg-white flex flex-col items-end gap-md">
          {formError && (
            <div className="text-error text-sm font-medium w-full text-right mb-2">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-md w-full">
            <button onClick={onClose} className="px-xl py-sm text-secondary font-label-md hover:bg-surface-container rounded-lg transition-colors" disabled={loading}>
              Cancel
            </button>
            <button onClick={() => handleSave('Draft')} className="px-xl py-sm border border-primary text-primary font-label-md rounded-lg hover:bg-primary/5 transition-colors" disabled={loading}>
              Save Draft
            </button>
            <button onClick={() => handleSave('Published')} className="px-xl py-sm bg-primary text-on-primary font-label-md rounded-lg shadow-lg hover:bg-on-tertiary-fixed transition-colors" disabled={loading}>
              Publish Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadHomeworkModal({ onClose, onSuccess, courses, editingData }) {
  const [formData, setFormData] = useState({
    title: '',
    course: '',
    deadline: '',
    max_score: 100,
    instructions: '',
    allow_late: false,
    status: 'Open',
    assigned_students: []
  });
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [myStudents, setMyStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/tutor/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMyStudents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Fetch students error", err);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (editingData) {
      setFormData({
        title: editingData.title || '',
        course: editingData.course || '',
        deadline: editingData.deadline ? new Date(editingData.deadline).toISOString().split('T')[0] : '',
        max_score: editingData.max_score || 100,
        instructions: '',
        allow_late: editingData.allow_late || false,
        status: editingData.status || 'Open',
        assigned_students: editingData.assigned_students || []
      });
    }
  }, [editingData]);

  const handleSave = async (status) => {
    setFormError('');
    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    setLoading(true);
    try {
      let fileUrl = editingData ? editingData.file_url : null;
      let fileType = editingData ? editingData.file_type : null;
      if (file) {
        fileUrl = await uploadHomeworkFile(file, 'me'); // In a real app, pass actual user id
        fileType = file.type;
      }

      if (editingData) {
        await updateTutorHomework(editingData.id, { ...formData, status, file_url: fileUrl, file_type: fileType });
      } else {
        await createTutorHomework({ ...formData, status, file_url: fileUrl, file_type: fileType });
      }
      onSuccess();
    } catch (err) {
      setFormError("Error uploading homework: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-white shrink-0">
          <h3 className="text-xl font-bold text-primary">{editingData ? 'Chỉnh sửa Bài tập' : 'Giao Bài tập về nhà'}</h3>
          <button className="text-secondary hover:text-error transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-sm">
            <label className="text-label-md font-bold">Tên bài tập</label>
            <input 
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary focus:border-primary outline-none" 
              placeholder="VD: Bài tập tự luyện số 1" 
            />
          </div>
          
          <div className="space-y-sm">
            <label className="text-label-md font-bold">Khóa học / Lớp</label>
            <select 
              value={formData.course}
              onChange={e => setFormData({...formData, course: e.target.value})} 
              className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary focus:border-primary outline-none bg-white" 
            >
              <option value="">-- Chọn Khóa học --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-sm">
            <label className="text-label-md font-bold">Giao bài cho học sinh (Tùy chọn)</label>
            <div className="p-3 border border-outline-variant rounded-lg bg-white max-h-32 overflow-y-auto space-y-2">
              {myStudents.length === 0 ? (
                <p className="text-sm text-secondary italic">Bạn chưa có học sinh nào.</p>
              ) : (
                myStudents.map(student => {
                  const isChecked = formData.assigned_students.includes(student.studentId);
                  return (
                    <label key={student.studentId} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface p-1 rounded transition-colors">
                      <input 
                        type="checkbox"
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({...prev, assigned_students: [...prev.assigned_students, student.studentId]}));
                          } else {
                            setFormData(prev => ({...prev, assigned_students: prev.assigned_students.filter(id => id !== student.studentId)}));
                          }
                        }}
                      />
                      <span>{student.studentName}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-xs text-secondary mt-1">Nếu không chọn học sinh nào, bài tập sẽ hiển thị cho tất cả học viên của bạn.</p>
          </div>

          <label className="border-2 border-dashed border-outline-variant rounded-xl py-xl bg-surface-container-low flex flex-col items-center gap-sm group cursor-pointer hover:bg-white hover:border-primary transition-all mt-4">
            <span className="material-symbols-outlined text-secondary group-hover:text-primary text-[40px]">upload_file</span>
            <p className="font-label-md text-on-surface text-center px-4">{file ? file.name : 'Nhấp để chọn file từ máy tính'}</p>
            <p className="text-label-sm text-secondary">Tối đa 50MB (PDF, DOCX, ZIP...)</p>
            <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </label>

          <div className="grid grid-cols-2 gap-md mt-4">
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Hạn nộp bài</label>
              <input 
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})} 
                className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary outline-none" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Thang điểm tối đa</label>
              <input 
                type="number" 
                value={formData.max_score}
                onChange={e => setFormData({...formData, max_score: parseInt(e.target.value) || 0})}
                className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary outline-none" 
                placeholder="10" 
              />
            </div>
          </div>


          <div className="flex items-center justify-start gap-3 mt-4 mb-2">
            <input 
              type="checkbox" 
              id="allowLate" 
              checked={formData.allow_late}
              onChange={e => setFormData({...formData, allow_late: e.target.checked})}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="allowLate" className="text-sm font-medium cursor-pointer">Cho phép nộp muộn (Allow late submissions)</label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant bg-white flex flex-col items-end gap-3 shrink-0 rounded-b-2xl">
          {formError && (
            <div className="text-error text-sm font-medium w-full text-right mb-2">
              {formError}
            </div>
          )}
          <div className="flex gap-3 w-full justify-end">
            <button className="px-5 py-2 rounded-lg font-bold text-secondary hover:bg-surface-variant transition-colors" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button className="px-5 py-2 rounded-lg font-bold text-primary border border-primary hover:bg-primary-fixed transition-colors flex items-center gap-2" onClick={() => handleSave('Draft')} disabled={loading}>
              <span className="material-symbols-outlined text-[18px]">save</span> Lưa Nháp
            </button>
            <button className="px-5 py-2 rounded-lg font-bold bg-primary text-on-primary shadow-sm hover:bg-on-tertiary-fixed transition-colors flex items-center gap-2" onClick={() => handleSave('Open')} disabled={loading}>
              {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : <span className="material-symbols-outlined text-[18px]">cloud_upload</span>} 
              {loading ? 'Đang xử lý...' : 'Giao bài ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
