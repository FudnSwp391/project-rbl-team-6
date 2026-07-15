import React, { useState, useEffect, useRef } from 'react';
import {
  getTutorExams,
  createTutorExam,
  updateTutorExamStatus,
  duplicateTutorExam,
  deleteTutorExam,
  getTutorHomework,
  createTutorHomework,
  updateTutorHomeworkStatus,
  deleteTutorHomework,
} from '../services/api';
import { uploadHomeworkFile } from '../services/upload';

export default function TutorAssessmentManager({ token, user }) {
  const [activeTab, setActiveTab] = useState('exams');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Modals state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);

  // Data states
  const [exams, setExams] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
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
      const [examsData, homeworkData] = await Promise.all([
        getTutorExams(),
        getTutorHomework()
      ]);
      setExams(examsData || []);
      setHomeworks(homeworkData || []);
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
      alert('Failed to update status');
    }
  };

  const handleDuplicateExam = async (id) => {
    try {
      await duplicateTutorExam(id);
      fetchData();
    } catch (err) {
      alert('Failed to duplicate exam');
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await deleteTutorExam(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete exam');
    }
  };

  // Homework Actions
  const handlePublishHomework = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    try {
      await updateTutorHomeworkStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteHomework = async (id) => {
    if (!window.confirm('Are you sure you want to delete this homework?')) return;
    try {
      await deleteTutorHomework(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete homework');
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
      <div className="flex items-end justify-between mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="material-symbols-outlined text-primary text-[32px]">assignment</span>
            <h2 className="text-headline-lg font-headline-lg text-on-surface">My Assessments</h2>
          </div>
          <p className="text-body-lg text-secondary">Manage your exam papers and homework uploads for active courses.</p>
        </div>

        <div className="relative group" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-primary text-on-primary px-xl py-sm rounded-lg flex items-center gap-xs font-label-md hover:bg-on-tertiary-fixed transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Create New
            <span className="material-symbols-outlined">keyboard_arrow_down</span>
          </button>
          
          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden">
              <button 
                onClick={() => { setIsExamModalOpen(true); setIsDropdownOpen(false); }}
                className="w-full text-left px-md py-sm hover:bg-surface-container-low flex items-center gap-md font-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-primary">edit_document</span> New Exam Paper
              </button>
              <button 
                onClick={() => { setIsHomeworkModalOpen(true); setIsDropdownOpen(false); }}
                className="w-full text-left px-md py-sm hover:bg-surface-container-low flex items-center gap-md font-label-md border-t border-outline-variant transition-colors"
              >
                <span className="material-symbols-outlined text-primary">cloud_upload</span> Upload Homework
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xl">
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all flex flex-col gap-sm">
          <div className="flex justify-between items-start">
            <span className="p-xs bg-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-on-primary-fixed-variant">list_alt</span>
            </span>
          </div>
          <div>
            <p className="text-label-md text-secondary">Total Assessments</p>
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
            <p className="text-label-md text-secondary">Published / Open</p>
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
            <p className="text-label-md text-secondary">Drafts</p>
            <h3 className="text-headline-lg font-headline-lg text-on-surface">{pendingCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Navigation & Filter Area */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        {/* Tabs */}
        <div className="flex px-lg border-b border-outline-variant bg-white">
          <button 
            className={`px-xl py-md font-label-md transition-all border-b-2 ${activeTab === 'exams' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            onClick={() => setActiveTab('exams')}
          >
            Exam Papers
          </button>
          <button 
            className={`px-xl py-md font-label-md transition-all border-b-2 ${activeTab === 'homework' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            onClick={() => setActiveTab('homework')}
          >
            Homework Uploads
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-lg flex flex-wrap items-center justify-between gap-md bg-surface-container-low/50">
          <div className="flex-1 relative min-w-[200px]">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search assessments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-outline-variant rounded-lg py-xs pl-xl pr-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-md">
            <select 
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="bg-white border border-outline-variant rounded-lg py-xs px-md text-label-md focus:ring-1 focus:ring-primary focus:border-primary outline-none min-w-[140px]"
            >
              <option value="All">All Courses</option>
              {Array.from(new Set([...exams.map(e => e.course), ...homeworks.map(h => h.course)])).filter(Boolean).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-outline-variant rounded-lg py-xs px-md text-label-md focus:ring-1 focus:ring-primary focus:border-primary outline-none min-w-[120px]"
            >
              <option value="All">Status</option>
              <option value="Published">Published / Open</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
            <button className="bg-white border border-outline-variant p-xs rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-xl text-center text-secondary">Loading...</div>
        ) : error ? (
          <div className="p-xl text-center text-error">{error}</div>
        ) : activeTab === 'exams' ? (
          <div className="overflow-x-auto bg-white min-h-[300px]">
            {filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl text-secondary">
                <span className="material-symbols-outlined text-[48px] mb-sm">note_stack</span>
                <p>No exam papers found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-label-sm uppercase tracking-wider text-secondary">
                    <th className="px-lg py-md">Assessment Title</th>
                    <th className="px-lg py-md">Course</th>
                    <th className="px-lg py-md">Config</th>
                    <th className="px-lg py-md">Deadline</th>
                    <th className="px-lg py-md">Status</th>
                    <th className="px-lg py-md text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredExams.map(exam => (
                    <tr key={exam.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-lg py-md">
                        <div className="font-label-md text-on-surface">{exam.title}</div>
                        <div className="text-label-sm text-secondary">{exam.question_count || 0} Questions</div>
                      </td>
                      <td className="px-lg py-md text-body-md text-secondary">{exam.course || '--'}</td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-xs text-label-sm text-secondary">
                          <span className="material-symbols-outlined text-[16px]">schedule</span> {exam.duration_minutes} mins
                        </div>
                      </td>
                      <td className="px-lg py-md text-body-md text-secondary">
                        {exam.deadline ? new Date(exam.deadline).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-lg py-md">
                        {exam.status === 'Published' ? (
                           <span className="px-sm py-1 rounded-full bg-green-100 text-green-700 text-label-sm font-bold">Published</span>
                        ) : exam.status === 'Draft' ? (
                          <span className="px-sm py-1 rounded-full bg-surface-variant text-secondary text-label-sm font-bold">Draft</span>
                        ) : (
                          <span className="px-sm py-1 rounded-full bg-red-100 text-red-700 text-label-sm font-bold">Closed</span>
                        )}
                      </td>
                      <td className="px-lg py-md text-right">
                        <div className="flex items-center justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handlePublishExam(exam.id, exam.status)} title="Toggle Publish" className="text-secondary hover:text-primary">
                             <span className="material-symbols-outlined">{exam.status === 'Published' ? 'visibility_off' : 'visibility'}</span>
                           </button>
                           <button onClick={() => handleDuplicateExam(exam.id)} title="Duplicate" className="text-secondary hover:text-primary">
                             <span className="material-symbols-outlined">content_copy</span>
                           </button>
                           <button onClick={() => handleDeleteExam(exam.id)} title="Delete" className="text-secondary hover:text-error">
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
                <p>No homework uploads found.</p>
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
                        <p className="text-label-sm text-secondary">{hw.course || '--'} • Max {hw.max_score} pts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-xl text-right">
                      <div className="hidden md:block">
                        <p className="text-label-sm text-secondary">Deadline</p>
                        <p className="text-label-md font-bold text-on-surface">{hw.deadline ? new Date(hw.deadline).toLocaleDateString() : '--'}</p>
                      </div>
                      <div className="min-w-[100px] hidden sm:block text-left">
                        <p className="text-label-sm text-secondary">Submissions</p>
                        <p className="text-label-sm font-bold mt-1 text-on-surface">{hw.submission_count || 0}</p>
                      </div>
                      <div className="flex items-center gap-sm">
                        <span className={`px-sm py-1 rounded-full text-label-sm font-bold ${hw.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {hw.status}
                        </span>
                        <div className="flex items-center gap-xs ml-2">
                           <button onClick={() => handlePublishHomework(hw.id, hw.status)} title="Toggle Status" className="p-xs text-secondary hover:text-primary rounded-full hover:bg-surface-container">
                             <span className="material-symbols-outlined">{hw.status === 'Open' ? 'lock' : 'lock_open'}</span>
                           </button>
                           <button onClick={() => handleDeleteHomework(hw.id)} title="Delete" className="p-xs text-secondary hover:text-error rounded-full hover:bg-surface-container">
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
        />
      )}
      
      {isHomeworkModalOpen && (
        <UploadHomeworkModal 
          onClose={() => setIsHomeworkModalOpen(false)} 
          onSuccess={() => { setIsHomeworkModalOpen(false); fetchData(); }} 
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub Components (Modals)
// ----------------------------------------------------------------------

function CreateExamModal({ onClose, onSuccess }) {
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
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/tutor/students`, {
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
      await createTutorExam(payload);
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
        
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-white">
          <div>
            <h3 className="text-headline-md font-headline-md text-primary">Create New Exam Paper</h3>
            <p className="text-body-md text-secondary">Follow the steps to build your assessment.</p>
          </div>
          <button className="text-secondary hover:text-error transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-xl overflow-y-auto space-y-lg bg-surface flex-1">
          <div className="grid grid-cols-2 gap-lg">
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Assessment Title</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
                placeholder="e.g. Chemistry Lab Quiz" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Course / Class</label>
              <input 
                type="text" 
                value={formData.course}
                onChange={e => setFormData({...formData, course: e.target.value})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
                placeholder="e.g. Organic Chemistry" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Duration (Minutes)</label>
              <input 
                type="number" 
                value={formData.duration_minutes}
                onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Total Passing Score</label>
              <input 
                type="number" 
                value={formData.total_score}
                onChange={e => setFormData({...formData, total_score: parseInt(e.target.value) || 0})}
                className="w-full rounded-lg border-outline-variant focus:ring-primary focus:border-primary outline-none py-2 px-3" 
              />
            </div>
          </div>
          
          <div className="space-y-sm">
            <label className="text-label-md font-bold">Assign to Students (Optional)</label>
            <div className="p-3 border border-outline-variant rounded-lg bg-white max-h-40 overflow-y-auto space-y-2">
              {myStudents.length === 0 ? (
                <p className="text-sm text-secondary italic">No students available.</p>
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
            <p className="text-xs text-secondary mt-1">If no student is selected, this exam will be visible to all of your students.</p>
          </div>

          <div className="space-y-md mt-xl">
            <div className="flex items-center justify-between">
              <label className="text-label-md font-bold text-lg">Question Builder</label>
              <div className="flex gap-sm">
                <button type="button" onClick={handleAddMCQ} className="px-sm py-1 border border-primary text-primary rounded-lg text-sm hover:bg-primary/5">
                  + Add MCQ
                </button>
                <button type="button" onClick={handleAddEssay} className="px-sm py-1 border border-primary text-primary rounded-lg text-sm hover:bg-primary/5">
                  + Add Essay
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

function UploadHomeworkModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    course: '',
    deadline: '',
    max_score: 100,
    instructions: '',
    allow_late: false,
    status: 'Open'
  });
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (status) => {
    setFormError('');
    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    setLoading(true);
    try {
      let fileUrl = null;
      let fileType = null;
      if (file) {
        fileUrl = await uploadHomeworkFile(file, 'me'); // In a real app, pass actual user id
        fileType = file.type;
      }

      await createTutorHomework({ ...formData, status, file_url: fileUrl, file_type: fileType });
      onSuccess();
    } catch (err) {
      setFormError("Error uploading homework: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-white">
          <h3 className="text-headline-md font-headline-md text-primary">Upload Homework</h3>
          <button className="text-secondary hover:text-error transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-xl space-y-md">
          <div className="space-y-sm">
            <label className="text-label-md font-bold">Assignment Name</label>
            <input 
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary focus:border-primary outline-none" 
              placeholder="e.g. Lab Report 04" 
            />
          </div>
          
          <div className="space-y-sm">
            <label className="text-label-md font-bold">Course / Class</label>
            <input 
              type="text"
              value={formData.course}
              onChange={e => setFormData({...formData, course: e.target.value})} 
              className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary focus:border-primary outline-none" 
              placeholder="e.g. Advanced Physics" 
            />
          </div>

          <label className="border-2 border-dashed border-outline-variant rounded-xl py-xl bg-surface-container-low flex flex-col items-center gap-sm group cursor-pointer hover:bg-white hover:border-primary transition-all">
            <span className="material-symbols-outlined text-secondary group-hover:text-primary text-[40px]">upload_file</span>
            <p className="font-label-md text-on-surface">{file ? file.name : 'Click to browse from computer'}</p>
            <p className="text-label-sm text-secondary">Max 50MB (PDF, DOCX, etc.)</p>
            <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </label>

          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Deadline Date</label>
              <input 
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})} 
                className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary outline-none" 
              />
            </div>
            <div className="space-y-sm">
              <label className="text-label-md font-bold">Point Scale</label>
              <input 
                type="number" 
                value={formData.max_score}
                onChange={e => setFormData({...formData, max_score: parseInt(e.target.value) || 0})}
                className="w-full rounded-lg border-outline-variant py-2 px-3 focus:ring-primary outline-none" 
                placeholder="100" 
              />
            </div>
          </div>


          <div className="flex items-center justify-between mt-xl mb-sm">
            <input 
              type="checkbox" 
              id="allowLate" 
              checked={formData.allow_late}
              onChange={e => setFormData({...formData, allow_late: e.target.checked})}
              className="rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="allowLate" className="text-sm font-medium">Allow late submissions</label>
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
              Discard
            </button>
            <button onClick={() => handleSave('Draft')} className="px-xl py-sm border border-primary text-primary font-label-md rounded-lg hover:bg-primary/5 transition-colors" disabled={loading}>
              Save Draft
            </button>
            <button onClick={() => handleSave('Open')} className="px-xl py-sm bg-primary text-on-primary font-label-md rounded-lg shadow-lg hover:bg-on-tertiary-fixed transition-colors" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload & Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
