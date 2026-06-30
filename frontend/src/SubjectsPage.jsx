import React, { useState } from 'react';

export default function SubjectsPage({ onGoSignIn, onGoSignUp, user }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans flex flex-col">
      <style>{`
        .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.3); }
        .card-hover:hover { transform: translateY(-4px); transition: all 0.2s ease-in-out; }
      `}</style>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          
          {/* Logo */}
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>

          {/* Nav Links (Centered) */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">TÃ¬m Gia SÆ°</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/become-tutor">Trá»Ÿ ThÃ nh Gia SÆ°</a>
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/subjects">MÃ´n Há»c</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/courses">KhÃ³a Há»c</a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <a href="#/cart" className="text-[#00288e] flex items-center" title="Giá» hÃ ng">
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
                 className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80"
               >
                 Báº£ng Äiá»u Khiá»ƒn
               </button>
             ) : (
               <>
                 <button onClick={onGoSignIn} className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">ÄÄƒng Nháº­p</button>
                 <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">Tham Gia Miá»…n PhÃ­</button>
               </>
             )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-24 pb-10 px-6 max-w-[1280px] mx-auto w-full mt-16">
        <div className="relative overflow-hidden rounded-xl bg-[#00288e] px-6 py-16 md:px-16 md:py-24 mb-10 flex flex-col items-center text-center shadow-lg">
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 md:max-w-3xl tracking-tight leading-tight">TÃ¬m MÃ´n Há»c PhÃ¹ Há»£p Cho HÃ nh TrÃ¬nh Há»c Táº­p Cá»§a Báº¡n</h1>
            <p className="text-lg text-[#b8c4ff] max-w-2xl mx-auto mb-10">KhÃ¡m phÃ¡ hÃ ng nghÃ¬n mÃ´n há»c do cÃ¡c chuyÃªn gia hÆ°á»›ng dáº«n, Ä‘Æ°á»£c thiáº¿t káº¿ phÃ¹ há»£p vá»›i nhu cáº§u há»c táº­p cá»§a báº¡n, tá»« khoa há»c cÆ¡ báº£n Ä‘áº¿n ngoáº¡i ngá»¯ nÃ¢ng cao.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5d5f5f]">search</span>
                <input 
                  className="w-full pl-12 pr-6 py-3 rounded-lg border-none focus:ring-2 focus:ring-[#001453] bg-[#f8f9fb] text-[#191c1e] text-base" 
                  placeholder="TÃ¬m kiáº¿m mÃ´n há»c (vd: Giáº£i TÃ­ch, Tiáº¿ng Trung)" 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Subject Categories Grid */}
      <main className="flex-grow max-w-[1280px] mx-auto px-6 w-full mb-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-[#191c1e]">Duyá»‡t Theo Danh Má»¥c</h2>
          <div className="flex gap-3">
            <button className="p-2 rounded-full border border-[#c4c5d5] hover:bg-[#edeef0] transition-colors">
              <span className="material-symbols-outlined text-[#191c1e]">tune</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Mathematics */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#00288e]/10 flex items-center justify-center mb-6 group-hover:bg-[#00288e] transition-colors">
              <span className="material-symbols-outlined text-[#00288e] group-hover:text-white">calculate</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">ToÃ¡n Há»c</h3>
            <p className="text-base text-[#444653] mb-6">Logic, cáº¥u trÃºc vÃ  cÃ¡c má»‘i quan há»‡ trá»«u tÆ°á»£ng.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">1.240 Gia SÆ°</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#004c8b]/10 flex items-center justify-center mb-6 group-hover:bg-[#004c8b] transition-colors">
              <span className="material-symbols-outlined text-[#004c8b] group-hover:text-white">translate</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">Ngoáº¡i Ngá»¯</h3>
            <p className="text-base text-[#444653] mb-6">Ká»¹ nÄƒng giao tiáº¿p ngÃ´n ngá»¯ hiá»‡n Ä‘áº¡i vÃ  cá»• Ä‘iá»ƒn.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">2.150 Gia SÆ°</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>

          {/* Sciences */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center mb-6 group-hover:bg-[#ba1a1a] transition-colors">
              <span className="material-symbols-outlined text-[#ba1a1a] group-hover:text-white">biotech</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">Khoa Há»c</h3>
            <p className="text-base text-[#444653] mb-6">KhÃ¡m phÃ¡ tháº¿ giá»›i tá»± nhiÃªn vÃ  váº­t lÃ½.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">890 Gia SÆ°</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>

          {/* Humanities */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#dde1ff]/60 flex items-center justify-center mb-6 group-hover:bg-[#1e40af] transition-colors">
              <span className="material-symbols-outlined text-[#001453] group-hover:text-white">history_edu</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">NhÃ¢n VÄƒn</h3>
            <p className="text-base text-[#444653] mb-6">NghiÃªn cá»©u phÃª bÃ¬nh vá» vÄƒn hÃ³a vÃ  lá»‹ch sá»­ nhÃ¢n loáº¡i.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">645 Gia SÆ°</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Detailed Lists (Bento Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Popular Subjects List */}
          <section className="lg:col-span-8 bg-white rounded-xl p-10 border border-[#e1e2e4] shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-semibold text-[#191c1e]">MÃ´n Há»c Phá»• Biáº¿n</h2>
              <a className="text-[#00288e] text-sm font-semibold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Xem Táº¥t Cáº£</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Äáº¡i Sá»‘ II', cat: 'ToÃ¡n Há»c', color: 'bg-[#00288e]', tcount: '342 Gia SÆ°' },
                { name: 'HÃ³a Há»¯u CÆ¡', cat: 'Khoa Há»c', color: 'bg-[#ba1a1a]', tcount: '128 Gia SÆ°' },
                { name: 'Há»™i Thoáº¡i Tiáº¿ng TÃ¢y Ban Nha', cat: 'Ngoáº¡i Ngá»¯', color: 'bg-[#1e40af]', tcount: '876 Gia SÆ°' },
                { name: 'VÄƒn Há»c Tháº¿ Giá»›i', cat: 'NhÃ¢n VÄƒn', color: 'bg-[#004883]', tcount: '215 Gia SÆ°' },
                { name: 'Cáº¥u TrÃºc Dá»¯ Liá»‡u', cat: 'Khoa Há»c MÃ¡y TÃ­nh', color: 'bg-[#003564]', tcount: '405 Gia SÆ°' },
                { name: 'Kinh Táº¿ VÄ© MÃ´', cat: 'Kinh Doanh', color: 'bg-[#191c1e]', tcount: '190 Gia SÆ°' }
              ]
              .filter(sub => !searchTerm.trim() || `${sub.name} ${sub.cat}`.toLowerCase().includes(searchTerm.toLowerCase().trim()))
              .map(sub => (
                <div key={sub.name} className="flex items-center justify-between p-6 bg-[#f8f9fb] rounded-lg hover:bg-[#e7e8ea] transition-colors cursor-pointer border border-transparent hover:border-[#c4c5d5]">
                  <div className="flex items-center gap-6">
                    <div className={`w-2 h-2 rounded-full ${sub.color}`}></div>
                    <div>
                      <span className="block text-sm font-semibold text-[#191c1e]">{sub.name}</span>
                      <span className="text-xs font-medium text-[#444653]">{sub.cat}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-[#d4e3ff] rounded-full text-[#001c39]">{sub.tcount}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Cards Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-[#1e40af] text-white p-8 rounded-xl relative overflow-hidden shadow-md">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <span className="material-symbols-outlined text-4xl mb-4 text-[#b8c4ff]">school</span>
              <h3 className="text-xl font-bold mb-2">Ã”n Thi AP</h3>
              <p className="text-sm text-[#dde1ff] mb-6">TÃ¬m gia sÆ° chuyÃªn biá»‡t giÃºp báº¡n Ä‘áº¡t Ä‘iá»ƒm 5 trong ká»³ thi Advanced Placement sáº¯p tá»›i.</p>
              <button className="bg-white text-[#00288e] w-full py-3 rounded-lg text-sm font-semibold hover:bg-[#f0f1f3] transition-colors shadow-sm">
                TÃ¬m Gia SÆ° AP
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#e1e2e4] shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#edeef0] rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#444653]">help</span>
              </div>
              <h3 className="text-lg font-bold text-[#191c1e] mb-2">KhÃ´ng tÃ¬m tháº¥y mÃ´n há»c?</h3>
              <p className="text-sm text-[#444653] mb-6">HÃ£y cho chÃºng tÃ´i biáº¿t báº¡n Ä‘ang tÃ¬m kiáº¿m gÃ¬ vÃ  chÃºng tÃ´i sáº½ cá»‘ gáº¯ng bá»• sung vÃ o ná»n táº£ng.</p>
              <button className="text-[#00288e] border border-[#00288e] w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-[#f3f4f6] transition-colors">
                YÃªu Cáº§u MÃ´n Há»c
              </button>
            </div>
          </aside>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">Â© 2024 EduX. ÄÃ£ Ä‘Äƒng kÃ½ báº£n quyá»n.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>ChÃ­nh SÃ¡ch Báº£o Máº­t</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Äiá»u Khoáº£n Dá»‹ch Vá»¥</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Trung TÃ¢m Há»— Trá»£</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>LiÃªn Há»‡</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Tuyá»ƒn Dá»¥ng</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

