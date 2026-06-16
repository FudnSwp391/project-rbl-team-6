/**
 * tutorsData.js
 * Centralized mock database for tutor details, reviews, and availability schedule.
 */

export const tutors = [
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    subjects: ['Advanced Mathematics', 'Physics'],
    level: 'High School, College & University',
    rating: 4.9,
    reviewsCount: 120,
    rate: 45,
    verified: true,
    description: 'Experienced university professor specializing in making complex mathematical concepts accessible to all levels.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAei6flyccoubtUkB2-JJhNfR9B-0SJqPfzmsGbxbjo0bwiIVbwttMeDMBINgJ5UBkNdaUIYVbXBh1wlNtftafnZqAUsknNmqfA8lgHYXmRibrLQLDDswAcDKaWexFiCJ0F5lYIqta06gn9UkHf9Yo6UEX6YY0zrRfLCox5fQYJGFjFtxYkapQrfLw5EWLC5MzcrAxy7Y4f4YlIDMNhd-wcULt1NSUWpDYZIjFGp0eSYw54W6Gk7zh3ebHETXHFVRvZ1FMlOY8uTcI',
    bio: 'Hello! I am Dr. Sarah Jenkins, an associate professor in Applied Mathematics with over 12 years of teaching experience. I received my Ph.D. from Stanford University and have dedicated my career to helping students bridge the gap between abstract mathematical theories and real-world applications. My tutoring sessions are interactive, personalized, and designed to build core analytical skills.',
    education: [
      'Ph.D. in Applied Mathematics - Stanford University (2014)',
      'M.Sc. in Theoretical Physics - MIT (2010)',
      'B.Sc. in Mathematics & Physics - UC Berkeley (2008)'
    ],
    experience: [
      'Associate Professor at state university (2018 - Present)',
      'High School Honors Physics & Calculus Teacher (2014 - 2018)',
      'Private Academic Coach (10+ years)'
    ],
    certificates: [
      'National Board Certified Teacher (Mathematics)',
      'Advanced College Reading & Learning Association (CRLA) Master Tutor'
    ],
    availability: {
      Monday: ['09:00 AM', '10:30 AM', '02:00 PM', '04:00 PM'],
      Tuesday: ['10:00 AM', '01:30 PM', '03:30 PM'],
      Wednesday: ['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'],
      Thursday: ['10:00 AM', '01:30 PM', '04:00 PM'],
      Friday: ['09:00 AM', '02:00 PM', '03:30 PM'],
      Saturday: ['10:00 AM', '02:00 PM'],
      Sunday: []
    },
    reviews: [
      {
        id: 1,
        studentName: 'Alex Davis',
        rating: 5,
        date: '2026-05-18',
        comment: 'Dr. Jenkins explains Calculus in a way that just clicks! I went from a C to an A in my college course. Highly recommend.'
      },
      {
        id: 2,
        studentName: 'Ryan Reynolds',
        rating: 4.8,
        date: '2026-05-02',
        comment: 'Very patient and knowledgeable. She breaks down difficult physics proofs into simple components. Excellent notes provided.'
      },
      {
        id: 3,
        studentName: 'Emma Watson',
        rating: 5,
        date: '2026-04-12',
        comment: 'Outstanding tutor. Energetic, structure-oriented, and extremely organized. Worth every penny!'
      }
    ]
  },
  {
    id: 2,
    name: 'David Chen',
    subjects: ['Computer Science', 'Python', 'Web Development'],
    level: 'Middle School, High School & College',
    rating: 5.0,
    reviewsCount: 89,
    rate: 50,
    verified: true,
    description: 'Former software engineer turned passionate educator, helping students build real-world coding skills.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqjwfwD85os_xcrUS6mBaT3L9cLxt_GyvK4DrMZMLL_ViTjYA5rM6aoXYoL153K1rXR10VvfnP00wQJRxBpqD8TtAgijnGQGepu7QT71lFgb-v8Mk9s7Zt0KvvSFlhluT9IML0DnyfosJYvm7BtNA6LhucaITW7Bsfpe13JhVa-0jbAy7f8B8UF7nNc8Vl8EyLjDJLmgkalntGMfzg8RN8YIzbxdlzDAHRB0kaNsi9K8_KvcbpfhL2gU_yw96vMEOsLznkPRny_Dk',
    bio: 'Hi there! I am David, a software engineer with 6 years of industry experience at top tech firms, now pursuing my true passion: teaching. I believe that programming is best learned by building real projects. Whether you are learning Python basics, preparing for AP Computer Science, or building your first web application, my lessons are tailored to get you writing clean code quickly and confidently.',
    education: [
      'B.S. in Computer Science - Georgia Tech (2018)'
    ],
    experience: [
      'Senior Software Engineer at Tech Startup (2021 - 2024)',
      'Software Engineer at FAANG Company (2018 - 2021)',
      'Coding Bootcamp Instructor & Mentor (2020 - Present)'
    ],
    certificates: [
      'AWS Certified Solutions Architect',
      'Scrum Alliance Certified ScrumMaster (CSM)'
    ],
    availability: {
      Monday: ['01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'],
      Tuesday: ['09:00 AM', '11:00 AM', '04:00 PM', '06:00 PM'],
      Wednesday: ['01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'],
      Thursday: ['09:00 AM', '11:00 AM', '04:00 PM', '06:00 PM'],
      Friday: ['01:00 PM', '03:00 PM', '06:00 PM'],
      Saturday: ['09:00 AM', '11:00 AM', '02:00 PM'],
      Sunday: ['10:00 AM', '02:00 PM']
    },
    reviews: [
      {
        id: 1,
        studentName: 'Mia Davis',
        rating: 5,
        date: '2026-05-20',
        comment: 'David is incredible! We built a full python game together. He makes coding so much fun and easy to understand.'
      },
      {
        id: 2,
        studentName: 'Jason M.',
        rating: 5,
        date: '2026-05-10',
        comment: 'Helped me prepare for my software engineering internship interview. Great tips on data structures and algorithms.'
      }
    ]
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    subjects: ['Spanish', 'Literature', 'Creative Writing'],
    level: 'All Ages (Beginner to Advanced)',
    rating: 4.8,
    reviewsCount: 203,
    rate: 35,
    verified: false,
    description: 'Native speaker offering immersive language lessons tailored to your individual learning pace and goals.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRPJ_nedKK76hx96Ioc925HajYJQrzRqKLk3-69yfy23Xp44nYiq2sidEe7r8Nc_XQitfR1vzCrnh9xpx05P_1zY2dgchQEncPRuiqThxZaV_qsRdGyL3NHOoTOBgsQM2wIO7EUWFuPmIQRIixXTJOXDPWyAbH50Hq9ljZxjUJLibVBmmhwTX4eSFXNwOjgXWJiK2DHUtYd0noMdDuglxTsYdwBnOKZUw2ti3RjsJTGH21zphbEicxrYLvzmsZETqsJYJs8BEDMgk',
    bio: '¡Hola! My name is Elena. I am a native Spanish speaker from Madrid with a degree in Hispanic Literature. Language learning is an immersive journey, and in my classes, we speak Spanish from day one! I combine conversation practice with grammatical foundations and cultural insights, helping you develop fluent speaking, reading, and writing skills for travel, school, or professional advancement.',
    education: [
      'M.A. in Spanish Literature & Linguistics - Universidad Complutense de Madrid (2016)',
      'B.A. in English & Spanish Philology - Universidad de Salamanca (2013)'
    ],
    experience: [
      'Language Academy Instructor (2017 - Present)',
      'Freelance Translator & Editor (2014 - Present)',
      'Online Spanish Tutor (8+ years)'
    ],
    certificates: [
      'DELE (Diploma in Spanish as a Foreign Language) Examiner Certification',
      'Teaching Spanish as a Foreign Language (ELE) Certificate'
    ],
    availability: {
      Monday: ['08:00 AM', '10:00 AM', '12:00 PM', '03:00 PM'],
      Tuesday: ['08:00 AM', '10:00 AM', '02:00 PM', '04:00 PM'],
      Wednesday: ['08:00 AM', '10:00 AM', '12:00 PM', '03:00 PM'],
      Thursday: ['08:00 AM', '10:00 AM', '02:00 PM', '04:00 PM'],
      Friday: ['08:00 AM', '10:00 AM', '01:00 PM'],
      Saturday: ['09:00 AM', '11:00 AM'],
      Sunday: []
    },
    reviews: [
      {
        id: 1,
        studentName: 'Sophie L.',
        rating: 4.8,
        date: '2026-05-15',
        comment: 'Elena is so warm and encouraging! I was afraid to speak Spanish at first, but she made me feel totally comfortable. ¡Gracias!'
      },
      {
        id: 2,
        studentName: 'Markus K.',
        rating: 5,
        date: '2026-04-28',
        comment: 'Perfect for business Spanish prep. She customized sessions to my field of international commerce.'
      }
    ]
  },
  {
    id: 4,
    name: 'James Wilson',
    subjects: ['Chemistry', 'Biology', 'Biochemistry'],
    level: 'High School & College',
    rating: 4.7,
    reviewsCount: 92,
    rate: 40,
    verified: true,
    description: 'Dedicated science tutor focused on developing strong foundational understanding and critical thinking.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbKTdRT8Kzgeb-fbmF1apykCqp-cDYVBmdeGP1NTKEm3OxFcXsoOeajBIr3osh_BwXPaW5vJSWueBaT866ZFbIJlaZy2-n3PE5ESBtwnzJu1cU-svmk7wSLbE8T1LVaX8q-DR0_VdCm1Y7lDn8hYECkyZ37CuP3RDScRP1JCiSLirfyS4LF-8i5zFX2-tE5kb0K7Z6zPzjzw88GBnmrEPUNAwZA75pgLwpqNxVFTbe6vCee5dkoPSyM4EY0wYMdZS9y_ELU2gV24',
    bio: 'Welcome! I am James, a biochemist and educator. Science is not just about memorizing facts; it is about understanding how the natural world works. In my sessions, we focus on first principles and critical thinking. I help students master Chemistry, Organic Chemistry, and Biology by breaking down biochemical pathways, equations, and lab reports into clear, logical concepts.',
    education: [
      'M.S. in Biochemistry - University of Michigan (2020)',
      'B.S. in Biology & Chemistry - University of Wisconsin (2018)'
    ],
    experience: [
      'Laboratory Teaching Assistant - University of Michigan (2018 - 2020)',
      'High School Science Olympiad Mentor (2021 - Present)',
      'Professional Science Tutor (6 years)'
    ],
    certificates: [
      'Certified Biology Tutor - National Tutoring Association (NTA)'
    ],
    availability: {
      Monday: ['02:00 PM', '04:00 PM', '06:00 PM'],
      Tuesday: ['01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'],
      Wednesday: ['02:00 PM', '04:00 PM', '06:00 PM'],
      Thursday: ['01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'],
      Friday: ['02:00 PM', '04:00 PM'],
      Saturday: ['10:00 AM', '01:00 PM', '03:00 PM'],
      Sunday: []
    },
    reviews: [
      {
        id: 1,
        studentName: 'Lucas G.',
        rating: 4.5,
        date: '2026-05-11',
        comment: 'Organic Chemistry was a nightmare until I started working with James. Great diagrams and explanations.'
      },
      {
        id: 2,
        studentName: 'Chloe B.',
        rating: 5,
        date: '2026-05-01',
        comment: 'James was key to my AP Biology prep. Very patient and explains scientific methods clearly.'
      }
    ]
  }
];
