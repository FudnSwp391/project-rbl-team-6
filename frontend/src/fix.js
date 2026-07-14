import fs from 'fs';
let c = fs.readFileSync('App.jsx', 'utf8');

const replacement = `  // ── Route: Practice Quiz Taking ──
  if (routeName === 'practice-quiz') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking
      isPractice={true}
      practiceSessionId={route.id}
      token={token}
    />
  }

  // ── Route: Quiz Result (formal) ──
  if (routeName === 'quiz-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult attemptId={route.id} token={token} isPractice={false} />
  }

  // ── Route: Practice Result ──
  if (routeName === 'practice-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult isPractice={true} sessionId={route.id} token={token} />
  }

  // ── Route: Exam Paper Taking ──
  if (routeName === 'exam-quiz') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking
      isExamPaper={true}
      examPaperId={route.id}
      token={token}
    />
  }

  // ── Route: Tutor Exam Taking ──
  if (routeName === 'tutor-exam') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizTaking
      isTutorExam={true}
      tutorExamId={route.id}
      token={token}
    />
  }

  // ── Route: Exam Paper Result ──
  if (routeName === 'exam-result') {
    if (!user) return <AccessDenied isLoggedIn={false} onGoSignIn={() => navigateTo('signin')} />
    return <QuizResult isExamPaper={true} attemptId={route.id} token={token} />
  }

  // ── Route: Tutor Profile (protected) ──
  if (routeName === 'tutor-profile') {
    const hasPendingReg = !!sessionStorage.getItem('pendingTutorReg')
    // Cho phép truy cập nếu: đã đăng nhập (tutor cũ) HOẶC đang trong luồng đăng ký mới
    if (!user && !hasPendingReg) {
      return (
        <AccessDenied
          isLoggedIn={false}
          onGoSignIn={() => navigateTo('signin')}
        />
      )
    }
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <header className="bg-surface-container-lowest shadow-sm sticky top-0 z-50">
          <div className="flex justify-between items-center w-full px-6 md:px-10 max-w-[1280px] mx-auto h-16">
            <div className="font-bold text-2xl text-primary tracking-tight">EduX</div>
            {user && !hasPendingReg && (
              <button
                onClick={() => window.location.hash = '/tutor'}
                className="text-on-surface-variant font-semibold text-sm hover:bg-surface-container px-3 py-2 rounded-lg transition-all duration-200"
              >
                ← Quay Lại Bảng Điều Khiển
              </button>
            )}
          </div>
        </header>
        <TutorProfileForm />`;

c = c.replace(/\/\/ ── Route: Practice Quiz Taking ──[\s\S]*?<TutorProfileForm \/>/, replacement);
fs.writeFileSync('App.jsx', c);
