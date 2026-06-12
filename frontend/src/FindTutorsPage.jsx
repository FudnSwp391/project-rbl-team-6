import React from 'react';

const mockTutors = [
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    role: 'PhD in Applied Mathematics',
    rating: 4.9,
    subjects: ['Calculus', 'Linear Algebra'],
    price: 65,
    featured: true,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp3x_VIeJloqdZlAnstQ2GLxMA8-0glYNJ5zVnQtCcqUeJ3Hr0IenHpDRQo6JOKIw9PxQWmbwOorbIlUnalTc9FPezJ6IteM_wutLhomHTTUI6y4R9WqFGg0QAEkbQiwhYXHlXEVo4cygGYqCx93DF-_MWEUrqkta7ULRML04On0HfHH9726fK1_RiSxz_FxmsiuPvVAqiUlM5pgP5lDV14GHsYHLSYqegxs0_Bf_-megtR0xOkv_grLDs2YfkE9why2KHe5Ppwyw'
  },
  {
    id: 2,
    name: 'Mark Thompson',
    role: 'Master of Physics, MIT',
    rating: 4.8,
    subjects: ['Quantum Physics', 'SAT Math'],
    price: 55,
    featured: false,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlmuVB8nJzFkbr1ZMsSy2gAXdaz55PyMoNSbgEAImuRLsq_wj71B0YKaHHopezS7no3S9X9blul0hS31uWXvQB5FEap2F4of7hmsRCJ51kdRji_yW7R-7epoSuvVMFRyQ0IKN0mHfqXSSgBlBNo8emjeQKtfrNgcW4pKQ-wN7YLD16duYGrmpRhjUMJfUb59WDI51cCv05b8huLdXShrLoorXEBULcXQoTTa6ZETTOFR4ooOlDoZdEFk0laUiFgbHY1XqwTZeromE'
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    role: 'Statistics & Data Analysis Expert',
    rating: 5.0,
    subjects: ['Statistics', 'R / Python'],
    price: 70,
    featured: false,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDipdd276WduXsIdzZiWZfbwSjRHk1wTofzKVHb1ZaLuhpzlI9EiLdg9Ds4HyV5KLtI2kvUMuq6BPxzyk2KWKUmitqmJKtcCb6je7vNvuAPj8gesUrdiGkxOLkTqXaGfzzt8smXBcxLzrK-1h-ag3BN1IB8MJTf_QYwMJOBg-19Y3CUiWMvFyXw73WCv7Yej6AKsq-XWrYTsQMBApJTjqg4KA_O09dg7Mrt1a_XCBYvh3o-CT5bMBVvUx0eO7cWUMGmvb3LMUPCpu4'
  },
  {
    id: 4,
    name: 'James Wilson',
    role: 'Geometry & Trigonometry Specialist',
    rating: 4.7,
    subjects: ['Geometry', 'ACT Prep'],
    price: 45,
    featured: false,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpbDFeHbsgtNeW0T8xNSWqhFr7vURnd8NN2e_RC9mCaVAvFqo30P4T02p_HGi82zSzDCbFfFYFIHA0oXUymo8KvGq38tf21pTvybG1L-0rU-twW0EOsBH1zd7LPFm_NIOoWwkYJ_fwDJyQ8dph_KqOAaxRo_xmG8Q2BdRGxw2O1O9WS3JwB5i3HLQbITu3KJ_Q56qFe2t-t0WuUaJ416VX6drpCnQfxpNmPPxa1J0puBymfQvF1gU3udhNfajRBS9HfJ1bqTYVg2Y'
  },
  {
    id: 5,
    name: 'Prof. Linda Chen',
    role: 'Differential Equations Expert',
    rating: 4.9,
    subjects: ['Engineering Math', 'Calculus III'],
    price: 85,
    featured: false,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0lXMe0deCxovSOqvaoVVqg9Fgz-ih3S4R1bJdTs_T7D1V0SfDoDF8s1g9Cf2AsC2jHI4cw21GkNvDxulQCuwlr9583sKZDxqnVvKGah3tZjEhvvBREJCVmcESAiOJvGR982gN_ICZW3cQ4XShXYe4RZh1X7r_SVNWlS-FBT1hQDp32_gr2jbyNQ5rGh8ifmpQYqYAF-BvcvRBrqW-15YPKUZ2-0P_0gH9GUnJphznJMnkEjxfZ3QVxBF2Ss1fTUDkPwE8-DKp-nk'
  },
  {
    id: 6,
    name: 'David Miller',
    role: 'Discrete Mathematics Specialist',
    rating: 4.6,
    subjects: ['Discrete Math', 'Algorithms'],
    price: 50,
    featured: false,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt4KMMNAeK6f5SW12Wkwp8L4aFj9BFU6Qmb00RzMD4wFS9Awozy1-7jg4RomgonmoqerDsB0cv3v8QVLrLU1-yXRYS9gEFwIXJRYXzPdrLXN-LJGPdyjSh-G_7--t4Z8wV8-vhq_8Rk2d7UWJA1EJ6dAdv_KCEX4s-g4q1vdMiWS2LqWMv2RBnzbiUx7AcQYFKjAOtOntMm38MhpEB7og0njCRwjKBm8XiitgZwmpuoxiBWeJhEeRIdUA03FeJ1t-op9bWiJ4mDrk'
  }
];

export default function FindTutorsPage({ onGoSignIn, onGoSignUp, user }) {
  return (
    <div className="bg-[#f8f9fb] min-h-screen text-[#191c1e] font-sans">
      <style>{`
        .filter-sidebar { scrollbar-width: none; }
        .filter-sidebar::-webkit-scrollbar { display: none; }
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
                 className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80"
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

      <main className="pt-24 pb-16 max-w-[1280px] mx-auto px-6">
        {/* Search Section */}
        <section className="mb-10">
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#757684]">search</span>
              <input className="w-full pl-12 pr-4 py-3 rounded-lg border border-[#c4c5d5] focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all text-base" placeholder="What subject do you need help with?" type="text" defaultValue="Mathematics" />
            </div>
            <button className="w-full md:w-auto bg-[#00288e] text-white px-8 py-3 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-all whitespace-nowrap">
              Search Tutors
            </button>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24 filter-sidebar max-h-[calc(100vh-120px)] overflow-y-auto">
              <h2 className="text-xl font-semibold text-[#191c1e] mb-6">Filters</h2>
              
              {/* Subject Filter */}
              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Subject</label>
                <div className="space-y-2">
                  {['Mathematics', 'Physics', 'Computer Science', 'English Literature'].map((sub, idx) => (
                    <label key={sub} className="flex items-center gap-3 cursor-pointer group">
                      <input defaultChecked={idx === 0} className="rounded border-[#c4c5d5] text-[#00288e] focus:ring-[#00288e]" type="checkbox"/>
                      <span className="text-base text-[#444653] group-hover:text-[#00288e] transition-colors">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Hourly Rate (USD)</label>
                <input className="w-full h-2 bg-[#edeef0] rounded-lg appearance-none cursor-pointer accent-[#00288e]" max="200" min="20" step="10" type="range" defaultValue="80" />
                <div className="flex justify-between mt-2">
                  <span className="text-xs font-medium text-[#757684]">$20</span>
                  <span className="text-xs font-medium text-[#757684]">$200+</span>
                </div>
              </div>

              {/* Ratings */}
              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Minimum Rating</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input className="text-[#00288e] focus:ring-[#00288e]" name="rating" type="radio" defaultChecked />
                    <div className="flex items-center gap-1 text-[#FFB800]">
                      <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="text-base text-[#444653] ml-1">&amp; Up</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Availability */}
              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Availability</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Weekdays', 'Weekends', 'Mornings', 'Evenings'].map(time => (
                     <button key={time} className="px-3 py-2 border border-[#c4c5d5] rounded-lg text-xs font-medium hover:border-[#00288e] hover:text-[#00288e] transition-all">{time}</button>
                  ))}
                </div>
              </div>

              <button className="w-full py-2 text-[#00288e] text-sm font-semibold hover:underline decoration-2 underline-offset-4">
                Reset All Filters
              </button>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-6">
              <p className="text-base text-[#444653]">Showing <span className="font-bold text-[#191c1e]">124</span> top-rated tutors</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#5d5f5f]">Sort by:</span>
                <select className="bg-transparent border-none text-sm font-semibold text-[#00288e] focus:ring-0 cursor-pointer">
                  <option>Highest Rating</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Most Experience</option>
                </select>
              </div>
            </div>

            {/* Bento-inspired Tutor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {mockTutors.map(tutor => (
                <div key={tutor.id} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-transparent hover:border-[#00288e]/10">
                  <div className="relative h-48 overflow-hidden">
                    <img alt={tutor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={tutor.image} />
                    {tutor.featured && (
                      <div className="absolute top-4 left-4 bg-[#1e40af] text-white px-3 py-1 rounded-full text-xs font-medium">
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-[#191c1e]">{tutor.name}</h3>
                      <div className="flex items-center gap-1 text-[#FFB800]">
                        <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                        <span className="text-sm font-semibold text-[#191c1e]">{tutor.rating}</span>
                      </div>
                    </div>
                    <p className="text-base text-[#5d5f5f] mb-4">{tutor.role}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {tutor.subjects.map(subj => (
                        <span key={subj} className="bg-[#00288e]/10 text-[#00288e] px-3 py-1 rounded-full text-xs font-medium">{subj}</span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xl font-semibold text-[#00288e]">${tutor.price}<span className="text-xs font-normal text-[#5d5f5f]">/hr</span></span>
                      </div>
                      <button onClick={() => window.location.hash = '/tutor-detail'} className="px-6 py-2.5 border border-[#00288e] text-[#00288e] hover:bg-[#00288e] hover:text-white rounded-lg text-sm font-semibold transition-all">
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-16 flex justify-center items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#757684] hover:border-[#00288e] hover:text-[#00288e] transition-all">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#00288e] text-white text-sm font-semibold">1</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#444653] hover:border-[#00288e] hover:text-[#00288e] transition-all text-sm font-semibold">2</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#444653] hover:border-[#00288e] hover:text-[#00288e] transition-all text-sm font-semibold">3</button>
              <span className="px-2 text-[#757684]">...</span>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#444653] hover:border-[#00288e] hover:text-[#00288e] transition-all text-sm font-semibold">12</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#757684] hover:border-[#00288e] hover:text-[#00288e] transition-all">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
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
