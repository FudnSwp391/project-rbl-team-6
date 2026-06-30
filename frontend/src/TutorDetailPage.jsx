import React, { useEffect } from 'react';
import EntityReviews from './components/EntityReviews';

export default function TutorDetailPage({ onGoSignIn, onGoSignUp, user }) {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  // Gia sÆ° Ä‘ang xem (Ä‘Æ°á»£c FindTutorsPage / AI Gá»£i Ã½ / Trang chá»§ lÆ°u khi Ä‘iá»u hÆ°á»›ng)
  let viewingTutor = null;
  try { viewingTutor = JSON.parse(sessionStorage.getItem('viewingTutor') || 'null'); } catch { viewingTutor = null; }

  return (
    <div className="aqua-bg text-[#191c1e] min-h-screen font-sans">
      <style>{`
        .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        .active-interaction:active { transform: scale(0.98); transition: transform 0.1s; }
      `}</style>
      
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          {/* Logo */}
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>

          {/* Nav Links (Centered) */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/find-tutors">TÃ¬m Gia SÆ°</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trá»Ÿ ThÃ nh Gia SÆ°</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">MÃ´n Há»c</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/courses">KhÃ³a Há»c</a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <a href="#/cart" className="text-[#444653] hover:text-[#00288e] flex items-center transition-colors" title="Giá» hÃ ng">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_cart</span>
              </a>
            )}
            {user ? (
               <button
                 onClick={() => {
                   if (user.role === 'admin') window.location.hash = '/admin';
                   else if (user.role === 'tutor') window.location.hash = '/tutor';
                   else window.location.hash = '/dashboard';
                 }}
                 className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm"
               >
                 Báº£ng Äiá»u Khiá»ƒn
               </button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">ÄÄƒng Nháº­p</button>
                <button onClick={onGoSignUp} className="btn-shine bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miá»…n PhÃ­
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl p-6 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <button 
                onClick={() => window.location.hash = '/find-tutors'} 
                className="mb-4 text-[#444653] hover:text-[#00288e] text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Quay láº¡i tÃ¬m kiáº¿m
              </button>
              
              <div className="relative w-48 h-48 mx-auto mb-6">
                <img alt="Dr. Sarah Jenkins" className="w-full h-full object-cover rounded-xl shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqobpT8uCk4-FjJKB4jqLVq8F2qxrVvmOqZBNdRJXm_0DKvgTh89-yovdChNtF7ErnG-H51-3L0E3XD4XTIXDw-Aaf0ajDF3xdg4GIxuUP9snDfjjXBr6gznlzwPkbYnow1Nzte-0PS8ahDQ3vR0PFQmZ9wg3d37i5VlS3PeUAYnQ2cdOpw-96a4DLSmOcwAFsDiO3uOM9xiqj6HIxpy3p94fap8Ts9wM9zRa1S7WZuSKfejzQs_Z3rYaaEaartCUuMln45G2uNTE"/>
                <div className="absolute bottom-[-8px] right-[-8px] bg-[#00288e] text-white p-1 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                </div>
              </div>
              <div className="text-center mb-10">
                <h1 className="text-2xl font-semibold text-[#191c1e] mb-1">Dr. Sarah Jenkins</h1>
                <div className="flex items-center justify-center gap-1 text-[#444653]">
                  <span className="material-symbols-outlined text-[#FFB800]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                  <span className="text-sm font-bold text-[#191c1e]">4.9</span>
                  <span className="text-sm">(124 nháº­n xÃ©t)</span>
                </div>
              </div>
              <div className="space-y-3 mb-10">
                <button onClick={() => window.location.hash = '/booking/' + (viewingTutor?.id || '')} className="w-full h-[48px] bg-[#00288e] text-white text-sm font-semibold rounded-lg hover:bg-[#1e40af] transition-all flex items-center justify-center gap-2 active-interaction shadow-sm">
                  <span className="material-symbols-outlined">event_available</span> Äáº·t Lá»‹ch Há»c
                </button>
                <button className="btn-shine w-full h-[48px] border border-[#c4c5d5] text-[#00288e] text-sm font-semibold rounded-lg hover:text-white hover:border-transparent hover:bg-gradient-to-r hover:from-[#00288e] hover:to-[#3a6fe0] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 active-interaction bg-white">
                  <span className="material-symbols-outlined">chat_bubble</span> Nháº¯n Tin
                </button>
              </div>
              <div className="border-t border-[#e1e2e4] pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">payments</span>
                    <span className="text-base">GiÃ¡ theo giá»</span>
                  </div>
                  <span className="text-sm font-semibold text-[#00288e]">$65/giá»</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">schedule</span>
                    <span className="text-base">Thá»i gian pháº£n há»“i</span>
                  </div>
                  <span className="text-sm font-semibold text-[#191c1e]">~2 giá»</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">groups</span>
                    <span className="text-base">Há»c sinh Ä‘Ã£ dáº¡y</span>
                  </div>
                  <span className="text-sm font-semibold text-[#191c1e]">450+</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* About Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-4">Giá»›i thiá»‡u</h2>
              <p className="text-base text-[#444653] leading-relaxed">
                Vá»›i hÆ¡n 12 nÄƒm kinh nghiá»‡m trong giÃ¡o dá»¥c Ä‘áº¡i há»c, triáº¿t lÃ½ giáº£ng dáº¡y cá»§a tÃ´i báº¯t nguá»“n tá»« viá»‡c lÃ m cho cÃ¡c khÃ¡i niá»‡m toÃ¡n há»c phá»©c táº¡p trá»Ÿ nÃªn dá»… tiáº¿p cáº­n vÃ  trá»±c quan. TÃ´i tin ráº±ng má»—i há»c sinh Ä‘á»u cÃ³ kháº£ nÄƒng tá»a sÃ¡ng trong lÄ©nh vá»±c STEM náº¿u Ä‘Æ°á»£c trang bá»‹ phÆ°Æ¡ng phÃ¡p vÃ  sá»± khÃ­ch lá»‡ Ä‘Ãºng Ä‘áº¯n. Ná»n táº£ng ToÃ¡n há»c á»¨ng dá»¥ng cá»§a tÃ´i giÃºp tÃ´i Ä‘Æ°a bá»‘i cáº£nh thá»±c táº¿ vÃ o cÃ¡c bÃ i giáº£ng lÃ½ thuyáº¿t vá» giáº£i tÃ­ch vÃ  Ä‘áº¡i sá»‘, giÃºp há»c sinh nháº­n ra váº» Ä‘áº¹p trong nhá»¯ng con sá»‘.
              </p>
            </section>

            {/* Demo Lesson Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-2">BÃ i Há»c Máº«u</h2>
              <p className="text-base text-[#444653] mb-4">Xem trÆ°á»›c phong cÃ¡ch vÃ  phÆ°Æ¡ng phÃ¡p giáº£ng dáº¡y cá»§a tÃ´i.</p>
              <div className="relative rounded-lg overflow-hidden cursor-pointer group bg-[#edeef0] aspect-video flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Demo preview" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[#00288e] text-[40px]" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Expertise Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-6">ChuyÃªn MÃ´n</h2>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Advanced Mathematics</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Calculus I, II &amp; III</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Linear Algebra</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Differential Equations</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Statistics</span>
              </div>
            </section>

            {/* Education Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-6">Há»c Váº¥n</h2>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00288e] text-3xl">school</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#191c1e]">Stanford University</h3>
                    <p className="text-base text-[#444653]">Ph.D. in Applied Mathematics</p>
                    <p className="text-xs font-medium text-[#757684] mt-1">2015</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00288e] text-3xl">history_edu</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#191c1e]">Oxford University</h3>
                    <p className="text-base text-[#444653]">M.Sc. in Mathematics</p>
                    <p className="text-xs font-medium text-[#757684] mt-1">2011</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-[#191c1e]">Nháº­n XÃ©t</h2>
                <button className="text-[#00288e] text-sm font-semibold hover:underline">Xem Táº¥t Cáº£</button>
              </div>
              <div className="space-y-8 divide-y divide-[#e1e2e4]">
                <div className="pt-6 first:pt-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e7e8ea] flex items-center justify-center font-bold text-[#00288e]">JD</div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#191c1e]">James D.</h4>
                        <div className="flex text-[#FFB800]">
                          {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#757684]">2 ngÃ y trÆ°á»›c</span>
                  </div>
                  <p className="text-base text-[#444653] italic">"CÃ´ Jenkins Ä‘Ã£ giÃºp tÃ´i vÆ°á»£t qua ká»³ thi Giáº£i TÃ­ch xuáº¥t sáº¯c! CÃ´ áº¥y giáº£i thÃ­ch nhá»¯ng thá»© tÃ´i Ä‘Ã£ váº­t lá»™n nhiá»u thÃ¡ng chá»‰ trong má»™t giá». Ráº¥t Ä‘Ã¡ng Ä‘á»ƒ thá»­."</p>
                </div>
                
                <div className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e7e8ea] flex items-center justify-center font-bold text-[#00288e]">LM</div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#191c1e]">Lisa M.</h4>
                        <div className="flex text-[#FFB800]">
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]">star</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#757684]">1 tuáº§n trÆ°á»›c</span>
                  </div>
                  <p className="text-base text-[#444653] italic">"Ráº¥t kiÃªn nháº«n vÃ  am hiá»ƒu. CÃ´ áº¥y cÃ³ cÃ¡ch hÃ¬nh dung cÃ¡c bÃ i toÃ¡n khiáº¿n tÃ´i hiá»ƒu ngay láº­p tá»©c. Cháº¯c cháº¯n sáº½ Ä‘áº·t lá»‹ch láº¡i."</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* TV3: Khu Ä‘Ã¡nh giÃ¡ gia sÆ° (hiá»‡n khi tá»›i tá»« danh sÃ¡ch/AI/trang chá»§) */}
        {viewingTutor?.id && (
          <EntityReviews targetType="tutor" targetId={viewingTutor.id} title="ÄÃ¡nh giÃ¡ gia sÆ°" />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">Â© 2024 EduX. ÄÃ£ Ä‘Äƒng kÃ½ báº£n quyá»n.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>ChÃ­nh SÃ¡ch Báº£o Máº­t</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Äiá»u Khoáº£n Dá»‹ch Vá»¥</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Trung TÃ¢m Trá»£ GiÃºp</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>LiÃªn Há»‡</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

