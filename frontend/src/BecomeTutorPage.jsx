import React from 'react';

export default function BecomeTutorPage({ onGoSignIn, onGoSignUp, user }) {

  const handleApplyNow = () => {
    if (!user) {
      window.location.hash = '/signup?role=tutor';
      return;
    }
    
    // Auth logic for Apply Now
    if (user.role === 'student' || user.role === 'parent' || user.role === 'user') {
      window.location.hash = '/tutor-profile';
    } else if (user.role === 'tutor') {
      window.location.hash = '/tutor';
    } else if (user.role === 'admin') {
      window.location.hash = '/admin';
    }
  };

  return (
    <div className="bg-[#f8f9fb] min-h-screen text-[#191c1e] font-sans flex flex-col">
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
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">Find Tutors</a>
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/become-tutor">Become a Tutor</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/subjects">Subjects</a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4 z-10">
             {user ? (
               <button
                 onClick={() => {
                   if (user.role === 'admin') window.location.hash = '/admin';
                   else if (user.role === 'tutor') window.location.hash = '/tutor';
                   else window.location.hash = '/dashboard';
                 }}
                 className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80"
               >
                 Dashboard
               </button>
             ) : (
               <>
                 <button onClick={onGoSignIn} className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">Sign In</button>
                 <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">Join for Free</button>
               </>
             )}
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="max-w-[1280px] mx-auto px-6 py-12 md:py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 flex flex-col items-start text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#191c1e] mb-6 leading-tight tracking-tight">
              Share your expertise. <span className="text-[#00288e]">Shape the future.</span>
            </h1>
            <p className="text-lg text-[#444653] mb-8 max-w-lg leading-relaxed">
              Join our global community of expert educators. Set your own rates, manage your schedule, and help students achieve their academic goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
              <button onClick={handleApplyNow} className="bg-[#00288e] text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#1e40af] transition-all shadow-md">
                Apply Now
              </button>
              <button className="bg-white border border-[#c4c5d5] text-[#191c1e] px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#edeef0] transition-all">
                Learn More
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-8 md:gap-12 pt-8 border-t border-[#e1e2e4] w-full">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#00288e]">500+</span>
                <span className="text-sm font-medium text-[#757684]">Active Tutors</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#00288e]">10k+</span>
                <span className="text-sm font-medium text-[#757684]">Students</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#00288e]">4.9</span>
                <span className="text-sm font-medium text-[#757684]">Average Rating</span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 relative w-full h-[400px] md:h-[500px]">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnf8aQn4Hovs8D784l2_3yM0Q5E_oXwG-1j-Gk2s0x8oJ9l8lH8yT2H1wR2qU-9dG5O-0O-rXzY-x2S4Z_n1t5g8q6W-r0d6P_7I9D9yM8J5xL9D6N9I8e2o8Z_f-V8t3s9U8_m9G9O3_H_P1g5R4D8k_C5S0S1wT9j_W6v-E1F5X6P-oV" 
              alt="Online teaching illustration" 
              className="w-full h-full object-cover rounded-2xl shadow-xl"
            />
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-[#e1e2e4] flex items-center gap-4 animate-bounce">
              <div className="w-12 h-12 bg-[#00288e]/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#00288e]">workspace_premium</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#191c1e]">Top Rated Platform</p>
                <p className="text-xs text-[#757684]">by educators</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why teach with EduX */}
        <section className="bg-white py-20 border-y border-[#e1e2e4]">
          <div className="max-w-[1280px] mx-auto px-6">
            <h2 className="text-3xl font-bold text-[#191c1e] text-center mb-16">Why teach with EduX?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#00288e] mb-6">schedule</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Flexible Schedule</h3>
                <p className="text-base text-[#444653]">You're the boss. Choose exactly when and how much you want to teach.</p>
              </div>
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#1e40af] mb-6">payments</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Earn More</h3>
                <p className="text-base text-[#444653]">Set your own hourly rates and keep a high percentage of your earnings.</p>
              </div>
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#ba1a1a] mb-6">trending_up</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Grow Your Profile</h3>
                <p className="text-base text-[#444653]">Build a strong reputation with verified student reviews and ratings.</p>
              </div>
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#004c8b] mb-6">laptop_mac</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Online or Offline</h3>
                <p className="text-base text-[#444653]">Connect with students globally via video call or locally in your area.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-[1280px] mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-[#191c1e] text-center mb-16">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] w-[70%] h-0.5 bg-[#e1e2e4] z-0"></div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 bg-[#dde1ff] rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <span className="text-3xl font-bold text-[#001453]">1</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-3">Create Your Profile</h3>
              <p className="text-base text-[#444653] max-w-xs">Sign up, build your professional profile, and list your subjects, experience, and hourly rate.</p>
            </div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 bg-[#dde1ff] rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <span className="text-3xl font-bold text-[#001453]">2</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-3">Get Verified</h3>
              <p className="text-base text-[#444653] max-w-xs">Upload your ID and academic certificates for our team to review. Once approved, you go live!</p>
            </div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 bg-[#00288e] rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white shadow-lg">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-3">Start Teaching</h3>
              <p className="text-base text-[#444653] max-w-xs">Accept bookings from eager students and start earning while doing what you love.</p>
            </div>
          </div>
        </section>

        {/* Testimonial & Final CTA */}
        <section className="bg-white py-10 pb-20">
          <div className="max-w-[1000px] mx-auto px-6">
            <div className="bg-[#00288e] rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              <div className="md:w-1/3 flex flex-col items-center z-10">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_U-x_Y9u_1tP_1eP2yG-lO6X_4j-wZ1P9vP5H8wO-1aC4N8hH6vY-eX_M_y-1P_N_6-vW9S_P6A_4G6P9lP_1R_X3o_yC_4K_mZ6E4aP-2O4A8dZ6P_qT1dZ_6Y9C_qW9Q" 
                  alt="Tutor" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#b8c4ff] shadow-md mb-4"
                />
                <div className="flex gap-1 text-[#FFB800] mb-2">
                  {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                </div>
                <p className="font-bold">Jessica W.</p>
                <p className="text-sm text-[#b8c4ff]">English Tutor</p>
              </div>

              <div className="md:w-2/3 flex flex-col z-10">
                <span className="material-symbols-outlined text-6xl text-white/20 mb-4 -ml-2">format_quote</span>
                <p className="text-xl md:text-2xl font-medium italic mb-10 leading-relaxed">
                  "EduX made it incredibly easy to transition into online teaching. The platform handles all the scheduling and payments, letting me focus entirely on my students."
                </p>
                <div className="bg-white/10 p-6 rounded-xl border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Ready to start teaching?</h3>
                    <p className="text-sm text-[#dde1ff]">Join thousands of successful tutors today.</p>
                  </div>
                  <button onClick={handleApplyNow} className="bg-white text-[#00288e] px-8 py-3 rounded-lg text-base font-bold hover:bg-[#f0f1f3] transition-all whitespace-nowrap shadow-sm">
                    Become a Tutor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-auto">
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
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Careers</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
