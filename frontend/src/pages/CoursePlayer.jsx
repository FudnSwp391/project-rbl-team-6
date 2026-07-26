import { useEffect, useMemo, useState, useRef } from 'react'
import { useAuth } from '../AuthContext'
import { enrollCourse, getCourseDetail, updateCourseProgress, askCourseAI, getParentChildren } from '../services/api'

function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function CoursePlayer({ courseId, onGoHome }) {
  const { user, token } = useAuth()
  const [course, setCourse] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)

  // Parent Delegation states
  const [parentChildren, setParentChildren] = useState([])
  const [showChildSelect, setShowChildSelect] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState('')

  // Advanced feature states
  const [activeTab, setActiveTab] = useState('overview')
  const [cinematic, setCinematic] = useState(false)
  const [notes, setNotes] = useState({})
  const [newNote, setNewNote] = useState('')
  const videoRef = useRef(null)

  // AI Chat states
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const chatScrollRef = useRef(null)

  // Playback state
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [aiMessages, isAiLoading])

  // ── State Nạp Tiền Bù cho CoursePlayer ──
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupInfo, setTopupInfo] = useState({ needed: 0, balance: 0, missing: 0, targetStudentId: null });
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // ── Đóng modal khi bấm nút Back của trình duyệt ──
  useEffect(() => {
    const handlePopState = () => {
      setShowChildSelect(false);
      setShowTopupModal(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Auto-Resume đăng ký sau khi nạp VNPAY thành công quay lại ──
  useEffect(() => {
    if (!course || !user || !token) return;
    try {
      const pendingEnroll = JSON.parse(sessionStorage.getItem('edux_pending_enroll') || 'null');
      const isReturned = sessionStorage.getItem('edux_payment_returned') === 'true';

      if (pendingEnroll && String(pendingEnroll.courseId) === String(course.id)) {
        const isExpired = pendingEnroll.createdAt && (Date.now() - pendingEnroll.createdAt > 15 * 60 * 1000);
        sessionStorage.removeItem('edux_pending_enroll');
        sessionStorage.removeItem('edux_payment_returned');

        if (!isExpired && isReturned) {
          handleEnroll(pendingEnroll.targetStudentId);
        }
      }
    } catch { /* ignore */ }
  }, [course, user, token]);

  // Fetch parent children for delegation
  useEffect(() => {
    if (user?.role === 'parent') {
      getParentChildren().then(data => {
        if (data && data.children) {
          setParentChildren(data.children)
          if (data.children.length > 0) setSelectedChildId(data.children[0].student_id)
        }
      }).catch(err => console.error("Could not load children:", err))
    }
  }, [user])

  // Smart Notes & Auto Resume Load
  useEffect(() => {
    if (courseId && user) {
      const savedNotes = localStorage.getItem(`course_notes_${user.id}_${courseId}`);
      if (savedNotes) {
        try { setNotes(JSON.parse(savedNotes)) } catch(e) {}
      }
    }
  }, [courseId, user])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  }

  const saveNote = () => {
    if (!newNote.trim() || !selectedLesson) return;
    const time = videoRef.current ? videoRef.current.currentTime : -1;
    const updatedNotes = { ...notes };
    if (!updatedNotes[selectedLesson.id]) updatedNotes[selectedLesson.id] = [];
    updatedNotes[selectedLesson.id].push({ text: newNote, time, id: Date.now() });
    
    setNotes(updatedNotes);
    setNewNote('');
    if (user) localStorage.setItem(`course_notes_${user.id}_${courseId}`, JSON.stringify(updatedNotes));
  }

  const jumpToTime = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play().catch(e=>console.log(e));
    }
  }

  // Auto-Resume handler
  const handleTimeUpdate = () => {
    if (videoRef.current && selectedLesson && user) {
      const time = videoRef.current.currentTime;
      if (Math.floor(time) % 5 === 0) {
         localStorage.setItem(`video_progress_${user.id}_${selectedLesson.id}`, time);
      }
    }
  }

  useEffect(() => {
    if (selectedId && videoRef.current && user) {
      const savedTime = localStorage.getItem(`video_progress_${user.id}_${selectedId}`);
      if (savedTime && Number(savedTime) > 2) {
         videoRef.current.currentTime = Number(savedTime);
      }
      videoRef.current.playbackRate = playbackRate;
    }
  }, [selectedId, user, playbackRate])

  const handleVideoEnded = async () => {
    // Tự động hoàn thành bài học hiện tại nếu chưa hoàn thành
    if (selectedLesson && !selectedLesson.isCompleted) {
      await handleComplete();
    }
    // Tự động nhảy sang bài tiếp theo
    if (course && course.lessons) {
      const currentIndex = course.lessons.findIndex(l => l.id === selectedId);
      if (currentIndex !== -1 && currentIndex < course.lessons.length - 1) {
        const nextLesson = course.lessons[currentIndex + 1];
        if (!nextLesson.isLocked) {
          setSelectedId(nextLesson.id);
        }
      }
    }
  }

  const loadCourse = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getCourseDetail(courseId)
      setCourse(data)
      const firstPlayable = data.lessons?.find((lesson) => !lesson.isCompleted && !lesson.isLocked && lesson.videoUrl) || data.lessons?.find((lesson) => !lesson.isLocked && lesson.videoUrl) || data.lessons?.[0]
      setSelectedId((current) => current || firstPlayable?.id || '')
    } catch (err) {
      setError(err.message || 'Could not load course.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (courseId) loadCourse()
  }, [courseId])

  const selectedLesson = useMemo(
    () => course?.lessons?.find((lesson) => lesson.id === selectedId) || course?.lessons?.[0],
    [course, selectedId]
  )
  const completed = course?.lessons?.filter((lesson) => lesson.isCompleted).length || 0
  const totalLessons = course?.lessons?.length || 0
  const progress = totalLessons ? Math.round((completed / totalLessons) * 100) : 0
  const canBuyCourse = !user || ['student', 'parent'].includes(user.role)
  const isStaffView = user?.role === 'tutor' || user?.role === 'admin'

  // Sentinel: undefined means "not yet chosen a child"
  // null/string means a child was explicitly selected (or non-parent flow)
  const handleEnroll = async (targetStudentId = undefined) => {
    if (!user) {
      // Lưu đúng trang khóa học này để đăng nhập xong quay lại, không đá về trang chủ.
      try { sessionStorage.setItem('redirectAfterLogin', window.location.hash) } catch { /* noop */ }
      window.location.hash = '/signin'
      return
    }
    if (!canBuyCourse) {
      setError('Tài khoản gia sư/quản trị không cần mua khóa học. Vui lòng quay lại trang quản lý khóa học.')
      return
    }

    // Nếu là phụ huynh và chưa chọn con (targetStudentId === undefined) => hiện modal chọn con
    if (user.role === 'parent' && targetStudentId === undefined) {
      if (parentChildren.length === 0) {
        setError('Bạn chưa liên kết với tài khoản học sinh nào. Vui lòng vào trang Tổng quan để liên kết trước.');
        return;
      }
      setShowChildSelect(true);
      return;
    }

    setBuying(true)
    setError('')
    try {
      const payload = {
        studentName: user.name || user.email?.split('@')[0] || 'Student',
      }
      // Chỉ thêm targetStudentId khi là phụ huynh và đã chọn con
      if (user.role === 'parent' && targetStudentId) {
        payload.targetStudentId = targetStudentId
      }
      await enrollCourse(course.id, payload)
      if (user.role === 'parent') {
        alert('Đăng ký khóa học cho bé thành công!');
      }
      await loadCourse()
      setShowChildSelect(false)
    } catch (err) {
      if ((err.message && err.message.includes('INSUFFICIENT_FUNDS')) || err.code === 'INSUFFICIENT_FUNDS') {
        const needed = Number(err.needed || course?.price || 0);
        const balance = Number(err.balance || 0);
        const missing = Math.max(needed - balance, 10000);
        setTopupInfo({ needed, balance, missing, targetStudentId });
        setTopupAmount(missing);
        setShowChildSelect(false);
        setShowTopupModal(true);
      } else {
        setError(err.message || 'Không thể đăng ký khóa học.');
      }
    } finally {
      setBuying(false)
    }
  }

  const handleTopUpVNPAY = async () => {
    if (!topupAmount || isNaN(topupAmount) || Number(topupAmount) < 10000) {
      return alert('Số tiền nạp tối thiểu là 10.000 VNĐ.');
    }
    setTopupLoading(true);
    try {
      sessionStorage.setItem('edux_payment_source', JSON.stringify({
        returnHash: window.location.hash,
        source: 'course_detail'
      }));
      sessionStorage.setItem('edux_pending_enroll', JSON.stringify({
        courseId: course.id,
        targetStudentId: topupInfo.targetStudentId,
        createdAt: Date.now()
      }));

      const returnUrl = `${window.location.origin}/#/payment/result`;
      const res = await fetch(`${API_BASE_URL}/api/payment/create-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(topupAmount), returnUrl })
      });
      const data = await res.json();
      if (data.success && data.vnpUrl && data.params) {
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = data.vnpUrl;
        for (const [key, value] of Object.entries(data.params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        alert(data.message || 'Không thể tạo liên kết thanh toán VNPAY');
        setTopupLoading(false);
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
      setTopupLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!course?.isEnrolled || !selectedLesson || selectedLesson.isLocked) return
    setSavingProgress(true)
    try {
      await updateCourseProgress(course.id, selectedLesson.id, {
        watchedSeconds: Math.max(Number(selectedLesson.watchedSeconds || 0), 1),
        isCompleted: !selectedLesson.isCompleted,
      })

      // Gamification Confetti
      if (!selectedLesson.isCompleted) {
         const newlyCompletedCount = completed + 1;
         if (newlyCompletedCount === totalLessons) {
            import('canvas-confetti').then((module) => {
               const confetti = module.default;
               confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
            });
         }
      }

      await loadCourse()
    } catch (err) {
      setError(err.message || 'Không thể cập nhật tiến độ.')
    } finally {
      setSavingProgress(false)
    }
  }

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    const msg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsAiLoading(true);

    try {
      const res = await askCourseAI(msg, selectedLesson?.title || '');
      setAiMessages(prev => [...prev, { role: 'ai', text: res.reply || 'Mình chưa tìm được câu trả lời phù hợp.' }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, hiện không kết nối được. Vui lòng thử lại sau.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={S.page}>
        <Header onBack={onGoHome} />
        <main style={S.center}>Loading course...</main>
      </div>
    )
  }

  if (error && !course) {
    return (
      <div style={S.page}>
        <Header onBack={onGoHome} />
        <main style={S.center}>
          <div style={S.errorCard}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#dc2626' }}>error</span>
            <h2>Course not found</h2>
            <p>{error}</p>
            <button style={S.primaryBtn} onClick={loadCourse}>Retry</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{...S.page, ...(cinematic ? S.pageCinematic : {})}}>
      {!cinematic && <Header onBack={onGoHome} />}
      <main style={{...S.main, ...(cinematic ? S.mainCinematic : {})}}>
        {!cinematic && (
          <section style={S.topbar}>
            <div>
              <div style={S.kicker}>
                {course.subject || 'Online course'}
                {course.isNewTutor && <span style={S.newBadge}>NEW Tutor</span>}
              </div>
              <h1 style={S.title}>{course.title}</h1>
              <p style={S.subtitle}>Bởi {course.tutorName || course.tutor?.name || 'Giảng viên'} • {totalLessons} bài học • {course.level || 'Mọi cấp độ'}</p>
            </div>
            <div style={S.progressBox}>
              <span style={S.progressValue}>{progress}%</span>
              <span style={S.progressLabel}>hoàn thành</span>
            </div>
          </section>
        )}

        {error && <div style={S.noticeError}>{error}</div>}

        <div style={S.layout}>
          <section style={S.playerCard}>
            <div style={S.videoWrap}>
              {selectedLesson?.isLocked ? (
                <div style={S.locked}>
                  <span className="material-symbols-outlined" style={{ fontSize: 54 }}>lock</span>
                  <h2>Bài học này đã bị khóa</h2>
                  {canBuyCourse ? (
                    <>
                      <p>Đăng ký khóa học để mở khóa toàn bộ bài học, tài liệu và theo dõi tiến độ.</p>
                      <button style={S.primaryBtn} onClick={() => handleEnroll()} disabled={buying}>
                        {buying ? 'Đang xử lý...' : `Mua khóa học ${money(course.price)}`}
                      </button>
                    </>
                  ) : (
                    <p>{isStaffView ? 'Đây là chế độ xem quản lý. Chức năng mua chỉ dành cho học viên và phụ huynh.' : 'Vui lòng đăng nhập với tư cách học viên hoặc phụ huynh để mua khóa học này.'}</p>
                  )}
                </div>
              ) : selectedLesson?.videoUrl ? (
                (() => {
                  const url = selectedLesson.videoUrl;
                  const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                  const ytId = ytMatch && ytMatch[2].length === 11 ? ytMatch[2] : null;
                  
                  if (ytId) {
                    return (
                      <iframe 
                        key={selectedLesson.id}
                        src={`https://www.youtube.com/embed/${ytId}`}
                        style={{...S.video, border: 'none'}}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  
                  const isValidUrl = url.startsWith('http') || url.startsWith('/');
                  if (!isValidUrl) {
                    return (
                      <div style={S.locked}>
                        <span className="material-symbols-outlined" style={{ fontSize: 54, color: '#e53935' }}>link_off</span>
                        <h2>Đường dẫn video không hợp lệ</h2>
                        <p>Link: "{url}" không phải là link video hợp lệ.</p>
                      </div>
                    );
                  }

                  return <video ref={videoRef} onTimeUpdate={handleTimeUpdate} onEnded={handleVideoEnded} key={selectedLesson.id} src={url} controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} preload="metadata" style={S.video} />;
                })()
              ) : (
                <div style={S.locked}>
                  <span className="material-symbols-outlined" style={{ fontSize: 54 }}>play_disabled</span>
                  <h2>Chưa có video</h2>
                  <p>Giảng viên chưa tải lên video cho bài học này.</p>
                </div>
              )}
            </div>

            <div style={S.lessonContentArea}>
              <div style={S.lessonTabs}>
                <button style={{...S.tabBtn, ...(activeTab==='overview' ? S.tabActive : {})}} onClick={() => setActiveTab('overview')} type="button">Tổng quan</button>
                <button style={{...S.tabBtn, ...(activeTab==='notes' ? S.tabActive : {})}} onClick={() => setActiveTab('notes')} type="button">Ghi chú</button>
                <button style={{...S.tabBtn, ...(activeTab==='ai' ? S.tabActive : {})}} onClick={() => setActiveTab('ai')} type="button">Hỏi AI</button>
              </div>
              
              <div style={S.tabContent}>
                {activeTab === 'overview' && (
                  <div style={S.lessonInfo}>
                    <div style={{ flex: 1 }}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                         <p style={S.lessonIndex}>Bài học {selectedLesson?.position || 1}</p>
                         <button onClick={()=>setCinematic(!cinematic)} style={S.cinematicBtn}>
                           <span className="material-symbols-outlined">{cinematic ? 'light_mode' : 'dark_mode'}</span>
                           {cinematic ? 'Tắt rạp chiếu' : 'Bật rạp chiếu'}
                         </button>
                      </div>
                      <h2 style={S.lessonTitle}>{selectedLesson?.title || 'Chọn một bài học'}</h2>
                      <p style={S.lessonDesc}>{selectedLesson?.description || course.description || 'Chưa có mô tả chi tiết.'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', marginBottom: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>speed</span>
                        <select 
                          value={playbackRate} 
                          onChange={(e) => setPlaybackRate(Number(e.target.value))}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: '500', color: '#334155', cursor: 'pointer' }}
                        >
                          <option value={1}>1.0x (Chuẩn)</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2}>2.0x</option>
                        </select>
                      </div>
                      {course.isEnrolled && !selectedLesson?.isLocked && (
                        <button style={selectedLesson?.isCompleted ? S.doneBtn : S.primaryBtn} onClick={handleComplete} disabled={savingProgress}>
                          <span className="material-symbols-outlined">{selectedLesson?.isCompleted ? 'check_circle' : 'task_alt'}</span>
                          {selectedLesson?.isCompleted ? 'Bỏ đánh dấu xong' : 'Đánh dấu hoàn thành'}
                        </button>
                      )}
                      {selectedLesson?.materialUrl && (
                        <a href={selectedLesson.materialUrl} target="_blank" rel="noreferrer" style={{...S.secondaryBtn, marginTop: 8}}>
                          <span className="material-symbols-outlined">attach_file</span>
                          Tài liệu đính kèm
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div style={{padding: '22px'}}>
                     <h3 style={{fontSize: 18, marginBottom: 12}}>Ghi chú thông minh</h3>
                     <p style={{fontSize: 14, color: '#6b7280', marginBottom: 16}}>Ghi chú sẽ tự động đính kèm thời gian hiện tại của video để bạn dễ dàng tua lại khi ôn tập.</p>
                     <div style={{display: 'flex', gap: 10, marginBottom: 20}}>
                        <input 
                           type="text" 
                           value={newNote} 
                           onChange={(e) => setNewNote(e.target.value)} 
                           placeholder="Ví dụ: Đoạn này thầy giảng rất kỹ về vòng lặp..." 
                           style={S.noteInput}
                           onKeyDown={(e) => e.key === 'Enter' && saveNote()}
                        />
                        <button style={S.primaryBtn} onClick={saveNote}>Lưu ghi chú</button>
                     </div>
                     <div style={{display:'flex', flexDirection:'column', gap: 10}}>
                        {(!notes[selectedLesson?.id] || notes[selectedLesson?.id].length === 0) ? (
                           <p style={{color: '#9ca3af', fontSize: 14, textAlign:'center', padding: '20px 0'}}>Chưa có ghi chú nào cho bài học này.</p>
                        ) : (
                           notes[selectedLesson?.id].map(n => (
                              <div key={n.id} style={S.noteItem}>
                                 {n.time >= 0 ? (
                                    <button onClick={() => jumpToTime(n.time)} style={S.timeBadge}>[{formatTime(n.time)}]</button>
                                 ) : (
                                    <span style={{...S.timeBadge, background: '#e5e7eb', color: '#6b7280', cursor: 'default'}}>[Ghi chú]</span>
                                 )}
                                 <span style={{flex: 1, fontSize: 15}}>{n.text}</span>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div style={{padding: '22px', minHeight: 400, display: 'flex', flexDirection: 'column'}}>
                     <h3 style={{fontSize: 18, marginBottom: 12}}>Trợ lý AI (EduX Tutor)</h3>
                     <div ref={chatScrollRef} style={{flex: 1, background: '#f8fafc', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 300, marginBottom: 16, border: '1px solid #e2e8f0'}}>
                        <div style={{display: 'flex', gap: 10, alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 0', border: '1px solid #e2e8f0', maxWidth: '85%'}}>
                           <span className="material-symbols-outlined" style={{color: '#1d4ed8', fontSize: 20}}>smart_toy</span>
                           <span style={{fontSize: 14}}>Chào bạn, tôi là EduX AI Tutor. Bạn đang học bài "{selectedLesson?.title || ''}". Bạn có câu hỏi nào cần giải đáp không?</span>
                        </div>
                        {aiMessages.map((m, i) => (
                           <div key={i} style={{
                             display: 'flex', gap: 10, 
                             alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                             background: m.role === 'user' ? '#00288e' : '#fff', 
                             color: m.role === 'user' ? '#fff' : '#000',
                             padding: '10px 14px', 
                             borderRadius: m.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0', 
                             border: m.role === 'user' ? 'none' : '1px solid #e2e8f0', 
                             maxWidth: '85%'
                           }}>
                             {m.role === 'ai' && <span className="material-symbols-outlined" style={{color: '#1d4ed8', fontSize: 20}}>smart_toy</span>}
                             <span style={{fontSize: 14, whiteSpace: 'pre-wrap'}}>{m.text}</span>
                           </div>
                        ))}
                        {isAiLoading && (
                           <div style={{display: 'flex', gap: 10, alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 0', border: '1px solid #e2e8f0', maxWidth: '85%'}}>
                              <span className="material-symbols-outlined" style={{color: '#1d4ed8', fontSize: 20}}>smart_toy</span>
                              <span style={{fontSize: 14}} className="typing-indicator">...</span>
                           </div>
                        )}
                     </div>
                     <div style={{display: 'flex', gap: 10}}>
                        <input 
                           type="text" 
                           value={aiInput}
                           onChange={(e) => setAiInput(e.target.value)}
                           placeholder="Nhập câu hỏi của bạn..." 
                           style={S.noteInput}
                           onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                           disabled={isAiLoading}
                        />
                        <button style={{...S.primaryBtn, opacity: isAiLoading ? 0.7 : 1}} onClick={handleAiSubmit} disabled={isAiLoading}>
                           <span className="material-symbols-outlined" style={{fontSize: 20}}>send</span>
                        </button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside style={{...S.sidebar, ...(cinematic ? S.sidebarCinematic : {})}}>
            {!course.isEnrolled && !isStaffView && (
              <div style={S.purchaseCard}>
                <div>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Giá khóa học</p>
                  <strong style={{ fontSize: 28, color: '#00288e' }}>{money(course.price)}</strong>
                </div>
                {canBuyCourse ? (
                  <button style={S.primaryBtn} onClick={() => handleEnroll()} disabled={buying}>
                    <span className="material-symbols-outlined">shopping_cart</span>
                    {buying ? 'Đang xử lý...' : 'Đăng ký và học ngay'}
                  </button>
                ) : (
                  <span style={S.staffBadge}>
                    <span className="material-symbols-outlined">visibility</span>
                    Đăng nhập để mua
                  </span>
                )}
              </div>
            )}

            <div style={S.contentPanel}>
              <div style={S.contentHead}>
                <h2>Nội dung khóa học</h2>
                <span>{completed}/{totalLessons}</span>
              </div>
              <div style={S.progressTrack}>
                <span style={{ ...S.progressFill, width: `${progress}%` }} />
              </div>
              <div style={S.lessonList}>
                {course.lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedId(lesson.id)}
                    style={{
                      ...S.lessonRow,
                      ...(lesson.id === selectedLesson?.id ? S.lessonRowActive : {}),
                      ...(lesson.isLocked ? S.lessonRowLocked : {}),
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {lesson.isLocked ? 'lock' : lesson.isCompleted ? 'check_circle' : 'play_circle'}
                    </span>
                    <span style={{ flex: 1 }}>
                      <strong>{index + 1}. {lesson.title}</strong>
                      <small>{lesson.durationLabel || (lesson.isPreview ? 'Học thử miễn phí' : 'Bài học video')}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* PARENT BUY COURSE MODAL */}
      {showChildSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ zIndex: 9999, display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 16px 0' }}>Bạn muốn mua khóa học cho bé nào?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {parentChildren.map(child => (
                <label key={child.student_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: selectedChildId === child.student_id ? '2px solid #00288e' : '1px solid #e5e7eb', background: selectedChildId === child.student_id ? '#eef4ff' : '#fff', borderRadius: 12, cursor: 'pointer' }}>
                  <input type="radio" name="child" value={child.student_id} checked={selectedChildId === child.student_id} onChange={(e) => setSelectedChildId(e.target.value)} style={{ width: 18, height: 18, accentColor: '#00288e' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {child.student_picture ? (
                       <img src={child.student_picture} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                       <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {child.student_name?.[0]?.toUpperCase()}
                       </div>
                    )}
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>{child.student_name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{child.nickname || 'Chưa có biệt danh'}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowChildSelect(false)} style={{ padding: '10px 16px', borderRadius: 10, border: 0, background: '#f3f4f6', color: '#374151', fontWeight: 'bold', cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => handleEnroll(selectedChildId)} disabled={buying || !selectedChildId} style={{ padding: '10px 16px', borderRadius: 10, border: 0, background: '#00288e', color: '#fff', fontWeight: 'bold', cursor: 'pointer', opacity: buying ? 0.6 : 1 }}>
                {buying ? 'Đang xử lý...' : 'Xác nhận Mua'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nạp tiền bù khi thiếu số dư ví trong CoursePlayer */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowTopupModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-xl font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[26px]">account_balance_wallet</span>
              Số Dư Ví Không Đủ
            </h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Bạn cần nạp thêm tiền vào ví để hoàn tất đăng ký khóa học này. Hệ thống sẽ tự động đăng ký ngay sau khi nạp thành công.
            </p>

            <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-700">
                <span>Giá khóa học:</span>
                <span className="font-bold">{topupInfo.needed?.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Số dư hiện tại:</span>
                <span className="font-semibold text-green-700">{topupInfo.balance?.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="border-t border-amber-200/60 pt-1.5 flex justify-between font-bold text-red-600">
                <span>Số tiền thiếu cần nạp bù:</span>
                <span>{topupInfo.missing?.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-1">Số tiền nạp qua VNPAY (VNĐ)</label>
            <input
              type="number"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              placeholder="Nhập số tiền nạp"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00288e] outline-none text-lg font-bold mb-3"
            />

            {/* Quick selection */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[topupInfo.missing, 100000, 200000, 500000, 1000000].filter(v => v > 0).map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => setTopupAmount(val)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${Number(topupAmount) === val ? 'border-[#00288e] bg-[#eef4ff] text-[#00288e]' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                >
                  {val === topupInfo.missing ? `Nạp bù ${val / 1000}K` : `${val / 1000}K`}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTopupModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleTopUpVNPAY}
                disabled={topupLoading}
                className="flex-1 py-3 rounded-xl font-bold bg-[#00288e] text-white hover:bg-[#001d6e] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {topupLoading ? 'Đang tạo giao dịch...' : 'Nạp tiền VNPAY'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function Header({ onBack }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#/" className="brand">
          <span className="material-symbols-outlined icon-fill">school</span>
          <span className="brand-name">EduX</span>
        </a>
        <button type="button" onClick={onBack} style={S.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Quay lại
        </button>
      </div>
    </header>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#f7f8fb', color: '#1f2430', transition: 'all 0.3s' },
  pageCinematic: { background: '#020617', color: '#f8fafc' },
  main: { width: '100%', maxWidth: 1260, margin: '0 auto', padding: '28px 24px 64px', transition: 'all 0.3s' },
  mainCinematic: { padding: '16px 24px', maxWidth: 1400 },
  center: { minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' },
  topbar: { display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap' },
  kicker: { display: 'flex', alignItems: 'center', gap: 8, color: '#00288e', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' },
  title: { fontSize: 34, lineHeight: 1.18, margin: '8px 0', fontWeight: 900, color: '#111827' },
  subtitle: { margin: 0, color: '#6b7280', fontSize: 15 },
  newBadge: { background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 900 },
  progressBox: { minWidth: 130, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 14, textAlign: 'center', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' },
  progressValue: { display: 'block', fontSize: 28, fontWeight: 900, color: '#00288e' },
  progressLabel: { color: '#6b7280', fontSize: 12, fontWeight: 700 },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 22, alignItems: 'start' },
  playerCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 24, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,42,0.08)' },
  videoWrap: { background: '#020617', minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', maxHeight: 620, background: '#000' },
  locked: { minHeight: 420, padding: 32, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 },
  lessonInfo: { padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' },
  lessonIndex: { margin: 0, color: '#00288e', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' },
  lessonTitle: { margin: '4px 0 8px', fontSize: 22, fontWeight: 900 },
  lessonDesc: { margin: 0, color: '#4b5563', lineHeight: 1.6, maxWidth: 720 },
  lessonContentArea: { background: '#fff', display: 'flex', flexDirection: 'column' },
  lessonTabs: { display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 22px' },
  tabBtn: { background: 'none', border: 'none', padding: '16px 24px', fontSize: 15, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  tabActive: { borderBottom: '2px solid #00288e', color: '#00288e', fontWeight: 'bold' },
  tabContent: { minHeight: 200 },
  cinematicBtn: { background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: 8, color: '#334155', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  noteInput: { flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', outline: 'none', fontSize: 15, fontFamily: 'inherit' },
  noteItem: { display: 'flex', gap: 12, padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9', alignItems: 'flex-start' },
  timeBadge: { background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '4px 8px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86, transition: 'all 0.3s' },
  sidebarCinematic: { opacity: 0.3, pointerEvents: 'none' },
  purchaseCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 12px 32px rgba(15,23,42,0.07)' },
  contentPanel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 22, overflow: 'hidden', boxShadow: '0 12px 32px rgba(15,23,42,0.07)' },
  contentHead: { padding: '16px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 7, background: '#e5e7eb', margin: '0 18px 12px', borderRadius: 999, overflow: 'hidden' },
  progressFill: { display: 'block', height: '100%', background: '#00288e', borderRadius: 999 },
  lessonList: { maxHeight: 'calc(100vh - 300px)', overflow: 'auto', borderTop: '1px solid #eef2f7' },
  lessonRow: { width: '100%', border: 0, background: '#fff', display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #eef2f7', color: '#1f2937', fontFamily: 'inherit' },
  lessonRowActive: { background: '#eef4ff', color: '#00288e' },
  lessonRowLocked: { opacity: 0.58 },
  primaryBtn: { height: 48, padding: '0 18px', border: 0, borderRadius: 14, background: '#00288e', color: '#fff', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' },
  secondaryBtn: { height: 44, padding: '0 16px', borderRadius: 13, border: '1px solid #cbd5e1', color: '#334155', background: '#fff', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  doneBtn: { height: 48, padding: '0 18px', border: '1px solid #86efac', borderRadius: 14, background: '#dcfce7', color: '#15803d', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' },
  enrolledBadge: { height: 44, borderRadius: 14, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900 },
  staffBadge: { minHeight: 44, borderRadius: 14, background: '#eef3ff', color: '#00288e', border: '1px solid #c8d6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900, padding: '0 14px', textAlign: 'center' },
  noticeError: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontWeight: 800 },
  errorCard: { background: '#fff', borderRadius: 22, border: '1px solid #e5e7eb', padding: 32, textAlign: 'center', maxWidth: 420, boxShadow: '0 16px 40px rgba(15,23,42,0.08)' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', background: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
}
