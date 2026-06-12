import React, { useEffect } from 'react';

export default function TutorDetailPage({ onGoSignIn, onGoSignUp, user }) {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#f8f9fb] text-[#191c1e] min-h-screen font-sans">
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
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/find-tutors">Find Tutors</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Become a Tutor</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Subjects</a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4 z-10">
            {user ? (
               <button
                 onClick={() => {
                   if (user.role === 'admin') window.location.hash = '/admin';
                   else if (user.role === 'tutor') window.location.hash = '/tutor';
                   else window.location.hash = '/dashboard';
                 }}
                 className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm"
               >
                 Dashboard
               </button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Sign In</button>
                <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">
                  Join for Free
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
                Back to Search
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
                  <span className="text-sm">(124 reviews)</span>
                </div>
              </div>
              <div className="space-y-3 mb-10">
                <button className="w-full h-[48px] bg-[#00288e] text-white text-sm font-semibold rounded-lg hover:bg-[#1e40af] transition-all flex items-center justify-center gap-2 active-interaction shadow-sm">
                  <span className="material-symbols-outlined">event_available</span> Book a Lesson
                </button>
                <button className="w-full h-[48px] border border-[#c4c5d5] text-[#00288e] text-sm font-semibold rounded-lg hover:border-[#00288e] transition-all flex items-center justify-center gap-2 active-interaction bg-white">
                  <span className="material-symbols-outlined">chat_bubble</span> Message
                </button>
              </div>
              <div className="border-t border-[#e1e2e4] pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">payments</span>
                    <span className="text-base">Hourly rate</span>
                  </div>
                  <span className="text-sm font-semibold text-[#00288e]">$65/hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">schedule</span>
                    <span className="text-base">Response time</span>
                  </div>
                  <span className="text-sm font-semibold text-[#191c1e]">~2 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">groups</span>
                    <span className="text-base">Students taught</span>
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
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-4">About</h2>
              <p className="text-base text-[#444653] leading-relaxed">
                With over 12 years of experience in higher education, my teaching philosophy is rooted in making complex mathematical concepts accessible and intuitive. I believe that every student has the capacity for brilliance in STEM given the right framework and encouragement. My background in Applied Mathematics allows me to bring real-world context to theoretical calculus and algebra, helping students see the beauty in the numbers.
              </p>
            </section>

            {/* Demo Lesson Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-2">Demo Lesson</h2>
              <p className="text-base text-[#444653] mb-4">Watch a preview of my teaching style and approach.</p>
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
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-6">Expertise</h2>
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
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-6">Education</h2>
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
                <h2 className="text-2xl font-semibold text-[#191c1e]">Reviews</h2>
                <button className="text-[#00288e] text-sm font-semibold hover:underline">View All</button>
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
                    <span className="text-xs font-medium text-[#757684]">2 days ago</span>
                  </div>
                  <p className="text-base text-[#444653] italic">"Dr. Jenkins helped me ace my Calculus exam! She explained things I've been struggling with for months in just one hour. Highly recommended."</p>
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
                    <span className="text-xs font-medium text-[#757684]">1 week ago</span>
                  </div>
                  <p className="text-base text-[#444653] italic">"Very patient and knowledgeable. She has a way of visualizing math problems that really clicks with me. Will definitely book again."</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">© 2024 EduX. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Privacy Policy</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Terms of Service</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Help Center</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
