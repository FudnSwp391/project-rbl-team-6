import { useEffect, useState } from 'react'
import './App.css'
import SignIn from './SignIn'
import SignUp from './SignUp'

const subjects = [
  { name: 'Mathematics', icon: 'calculate' },
  { name: 'Science', icon: 'science' },
  { name: 'Languages', icon: 'translate' },
  { name: 'Music', icon: 'music_note' },
  { name: 'Art', icon: 'palette' },
  { name: 'Coding', icon: 'code' },
]

const tutors = [
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    subjects: ['Advanced Mathematics', 'Physics'],
    rating: 4.9,
    reviews: 120,
    rate: 45,
    description:
      'Experienced university professor specializing in making complex mathematical concepts accessible to all levels.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAei6flyccoubtUkB2-JJhNfR9B-0SJqPfzmsGbxbjo0bwiIVbwttMeDMBINgJ5UBkNdaUIYVbXBh1wlNtftafnZqAUsknNmqfA8lgHYXmRibrLQLDDswAcDKaWexFiCJ0F5lYIqta06gn9UkHf9Yo6UEX6YY0zrRfLCox5fQYJGFjFtxYkapQrfLw5EWLC5MzcrAxy7Y4f4YlIDMNhd-wcULt1NSUWpDYZIjFGp0eSYw54W6Gk7zh3ebHETXHFVRvZ1FMlOY8uTcI',
  },
  {
    id: 2,
    name: 'David Chen',
    subjects: ['Computer Science', 'Python'],
    rating: 5.0,
    reviews: 89,
    rate: 50,
    description:
      'Former software engineer turned passionate educator, helping students build real-world coding skills.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqjwfwD85os_xcrUS6mBaT3L9cLxt_GyvK4DrMZMLL_ViTjYA5rM6aoXYoL153K1rXR10VvfnP00wQJRxBpqD8TtAgijnGQGepu7QT71lFgb-v8Mk9s7Zt0KvvSFlhluT9IML0DnyfosJYvm7BtNA6LhucaITW7Bsfpe13JhVa-0jbAy7f8B8UF7nNc8Vl8EyLjDJLmgkalntGMfzg8RN8YIzbxdlzDAHRB0kaNsi9K8_KvcbpfhL2gU_yw96vMEOsLznkPRny_Dk',
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    subjects: ['Spanish', 'Literature'],
    rating: 4.8,
    reviews: 203,
    rate: 35,
    description:
      'Native speaker offering immersive language lessons tailored to your individual learning pace and goals.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCRPJ_nedKK76hx96Ioc925HajYJQrzRqKLk3-69yfy23Xp44nYiq2sidEe7r8Nc_XQitfR1vzCrnh9xpx05P_1zY2dgchQEncPRuiqThxZaV_qsRdGyL3NHOoTOBgsQM2wIO7EUWFuPmIQRIixXTJOXDPWyAbH50Hq9ljZxjUJLibVBmmhwTX4eSFXNwOjgXWJiK2DHUtYd0noMdDuglxTsYdwBnOKZUw2ti3RjsJTGH21zphbEicxrYLvzmsZETqsJYJs8BEDMgk',
  },
  {
    id: 4,
    name: 'James Wilson',
    subjects: ['Chemistry', 'Biology'],
    rating: 4.7,
    reviews: 92,
    rate: 40,
    description:
      'Dedicated science tutor focused on developing strong foundational understanding and critical thinking.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbKTdRT8Kzgeb-fbmF1apykCqp-cDYVBmdeGP1NTKEm3OxFcXsoOeajBIr3osh_BwXPaW5vJSWueBaT866ZFbIJlaZy2-n3PE5ESBtwnzJu1cU-svmk7wSLbE8T1LVaX8q-DR0_VdCm1Y7lDn8hYECkyZ37CuP3RDScRP1JCiSLirfyS4LF-8i5zFX2-tE5kb0K7Z6zPzjzw88GBnmrEPUNAwZA75pgLwpqNxVFTbe6vCee5dkoPSyM4EY0wYMdZS9y_ELU2gV24',
  },
]

const footerLinks = {
  platform: ['Find Tutors', 'Become a Tutor', 'Subjects'],
  company: ['About Us', 'Support', 'Privacy Policy'],
}

const getRouteFromHash = () => {
  const normalized = window.location.hash.replace(/^#/, '') || '/'
  if (normalized === '/signin') return 'signin'
  if (normalized === '/signup') return 'signup'
  return 'home'
}

function HomePage({ onGoSignIn }) {
  const [topic, setTopic] = useState('')
  const [place, setPlace] = useState('')

  return (
    <div className="academia-page">
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="brand">
            <span className="material-symbols-outlined icon-fill">school</span>
            <span className="brand-name">EduX</span>
          </a>

          <nav className="header-nav">
            <a href="#">Find Tutors</a>
            <a href="#">Become a Tutor</a>
            <a href="#">Subjects</a>
          </nav>

          <button type="button" className="btn btn-primary" onClick={onGoSignIn}>
            Login
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="container hero-content">
            <h1>Find the perfect tutor for your learning journey</h1>
            <p>
              Expert educators ready to help you master new subjects and achieve
              your academic goals.
            </p>
            <div className="search-panel">
              <label className="search-field">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="What do you want to learn?"
                />
              </label>
              <label className="search-field">
                <span className="material-symbols-outlined">location_on</span>
                <input
                  type="text"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Online or specific location?"
                />
              </label>
              <button type="button" className="btn btn-primary search-button">
                Search
              </button>
            </div>
          </div>
        </section>

        <section className="section section-subjects">
          <div className="container">
            <h2>Popular Subjects</h2>
            <div className="subject-grid">
              {subjects.map((item) => (
                <a href="#" className="subject-card" key={item.name}>
                  <span className="subject-icon material-symbols-outlined">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-tutors">
          <div className="container">
            <div className="section-head">
              <h2>Featured Tutors</h2>
              <a href="#" className="see-all">
                See all
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>

            <div className="tutor-grid">
              {tutors.map((tutor) => (
                <article className="tutor-card" key={tutor.id}>
                  <div className="tutor-top">
                    <img src={tutor.avatar} alt={tutor.name} loading="lazy" />
                    <div>
                      <h3>{tutor.name}</h3>
                      <p className="rating">
                        <span className="material-symbols-outlined star icon-fill">
                          star
                        </span>
                        <span>{tutor.rating}</span>
                        <small>({tutor.reviews} reviews)</small>
                      </p>
                    </div>
                  </div>

                  <div className="chip-wrap">
                    {tutor.subjects.map((subject) => (
                      <span key={subject} className="chip">
                        {subject}
                      </span>
                    ))}
                  </div>

                  <p className="desc">{tutor.description}</p>
                  <div className="tutor-foot">
                    <p className="price">
                      <strong>${tutor.rate}</strong>
                      <span>/hr</span>
                    </p>
                    <button type="button" className="btn btn-outline">
                      View Profile
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <a href="#" className="brand">
              <span className="material-symbols-outlined icon-fill">school</span>
              <span className="brand-name">EduX</span>
            </a>
            <p className="footer-copy">
              Copyright 2024 EduX. Empowering minds globally.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              {footerLinks.platform.map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              {footerLinks.company.map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState(() => getRouteFromHash())

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (nextRoute) => {
    if (nextRoute === 'signin') {
      window.location.hash = '/signin'
      return
    }
    if (nextRoute === 'signup') {
      window.location.hash = '/signup'
      return
    }
    window.location.hash = '/'
  }

  if (route === 'signin') {
    return (
      <SignIn
        onSwitchToSignUp={() => navigateTo('signup')}
        onGoHome={() => navigateTo('home')}
      />
    )
  }

  if (route === 'signup') {
    return (
      <SignUp
        onSwitchToSignIn={() => navigateTo('signin')}
        onGoHome={() => navigateTo('home')}
      />
    )
  }

  return <HomePage onGoSignIn={() => navigateTo('signin')} />
}

export default App
