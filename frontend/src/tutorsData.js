/**
 * tutorsData.js
 * Centralized mock database for tutor details, reviews, and availability schedule.
 */

export const tutors = [
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    subjects: ['Toán học nâng cao', 'Vật lý'],
    level: 'Trung học phổ thông, Cao đẳng & Đại học',
    rating: 4.9,
    reviewsCount: 120,
    rate: 45,
    verified: true,
    description: 'Giáo sư đại học giàu kinh nghiệm, chuyên giúp sinh viên ở mọi trình độ tiếp cận các khái niệm toán học phức tạp một cách dễ hiểu.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAei6flyccoubtUkB2-JJhNfR9B-0SJqPfzmsGbxbjo0bwiIVbwttMeDMBINgJ5UBkNdaUIYVbXBh1wlNtftafnZqAUsknNmqfA8lgHYXmRibrLQLDDswAcDKaWexFiCJ0F5lYIqta06gn9UkHf9Yo6UEX6YY0zrRfLCox5fQYJGFjFtxYkapQrfLw5EWLC5MzcrAxy7Y4f4YlIDMNhd-wcULt1NSUWpDYZIjFGp0eSYw54W6Gk7zh3ebHETXHFVRvZ1FMlOY8uTcI',
    bio: 'Xin chào! Tôi là Tiến sĩ Sarah Jenkins, phó giáo sư ngành Toán ứng dụng với hơn 12 năm kinh nghiệm giảng dạy. Tôi nhận bằng Tiến sĩ tại Đại học Stanford và đã dành cả sự nghiệp để giúp sinh viên thu hẹp khoảng cách giữa các lý thuyết toán học trừu tượng và ứng dụng thực tế. Các buổi học của tôi mang tính tương tác, cá nhân hóa và được thiết kế để xây dựng các kỹ năng phân tích cốt lõi.',
    education: [
      'Tiến sĩ Toán ứng dụng - Đại học Stanford (2014)',
      'Thạc sĩ Vật lý lý thuyết - MIT (2010)',
      'Cử nhân Toán học & Vật lý - UC Berkeley (2008)'
    ],
    experience: [
      'Phó Giáo sư tại Đại học Bang (2018 - Nay)',
      'Giáo viên Vật lý & Giải tích trường Trung học phổ thông chuyên (2014 - 2018)',
      'Gia sư Học thuật Cá nhân (hơn 10 năm)'
    ],
    certificates: [
      'Giáo viên Toán được Hội đồng Quốc gia Chứng nhận',
      'Gia sư Thạc sĩ Hiệp hội Đọc & Học tập Cao đẳng Nâng cao (CRLA)'
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
        comment: 'Tiến sĩ Jenkins giải thích Giải tích theo một cách rất dễ hiểu! Tôi đã vươn lên từ điểm C lên điểm A trong khóa học đại học của mình. Rất khuyến khích.'
      },
      {
        id: 2,
        studentName: 'Ryan Reynolds',
        rating: 4.8,
        date: '2026-05-02',
        comment: 'Rất kiên nhẫn và hiểu biết. Cô ấy chia nhỏ các chứng minh vật lý khó thành các thành phần đơn giản. Ghi chú được cung cấp rất xuất sắc.'
      },
      {
        id: 3,
        studentName: 'Emma Watson',
        rating: 5,
        date: '2026-04-12',
        comment: 'Gia sư xuất sắc. Tràn đầy năng lượng, có cấu trúc và cực kỳ có tổ chức. Đáng từng xu!'
      }
    ]
  },
  {
    id: 2,
    name: 'David Chen',
    subjects: ['Khoa học Máy tính', 'Python', 'Phát triển Web'],
    level: 'Trung học cơ sở, Trung học phổ thông & Cao đẳng',
    rating: 5.0,
    reviewsCount: 89,
    rate: 50,
    verified: true,
    description: 'Cựu kỹ sư phần mềm trở thành nhà giáo dục đầy nhiệt huyết, giúp học sinh xây dựng kỹ năng lập trình thực tế.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqjwfwD85os_xcrUS6mBaT3L9cLxt_GyvK4DrMZMLL_ViTjYA5rM6aoXYoL153K1rXR10VvfnP00wQJRxBpqD8TtAgijnGQGepu7QT71lFgb-v8Mk9s7Zt0KvvSFlhluT9IML0DnyfosJYvm7BtNA6LhucaITW7Bsfpe13JhVa-0jbAy7f8B8UF7nNc8Vl8EyLjDJLmgkalntGMfzg8RN8YIzbxdlzDAHRB0kaNsi9K8_KvcbpfhL2gU_yw96vMEOsLznkPRny_Dk',
    bio: 'Chào bạn! Tôi là David, một kỹ sư phần mềm với 6 năm kinh nghiệm trong ngành tại các công ty công nghệ hàng đầu, hiện đang theo đuổi niềm đam mê thực sự của mình: giảng dạy. Tôi tin rằng lập trình học tốt nhất bằng cách xây dựng các dự án thực tế. Cho dù bạn đang học kiến thức cơ bản về Python, chuẩn bị cho kỳ thi AP Khoa học Máy tính hay xây dựng ứng dụng web đầu tiên, các bài học của tôi đều được điều chỉnh để giúp bạn viết code sạch một cách nhanh chóng và tự tin.',
    education: [
      'Cử nhân Khoa học Máy tính - Georgia Tech (2018)'
    ],
    experience: [
      'Kỹ sư Phần mềm Cao cấp tại Công ty Khởi nghiệp Công nghệ (2021 - 2024)',
      'Kỹ sư Phần mềm tại Công ty FAANG (2018 - 2021)',
      'Giảng viên & Người hướng dẫn Coding Bootcamp (2020 - Nay)'
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
        comment: 'David thật tuyệt vời! Chúng tôi đã cùng nhau xây dựng một trò chơi python hoàn chỉnh. Anh ấy làm cho việc lập trình trở nên rất thú vị và dễ hiểu.'
      },
      {
        id: 2,
        studentName: 'Jason M.',
        rating: 5,
        date: '2026-05-10',
        comment: 'Giúp tôi chuẩn bị cho cuộc phỏng vấn thực tập kỹ sư phần mềm. Những lời khuyên tuyệt vời về cấu trúc dữ liệu và thuật toán.'
      }
    ]
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    subjects: ['Tiếng Tây Ban Nha', 'Văn học', 'Viết sáng tạo'],
    level: 'Mọi lứa tuổi (Từ cơ bản đến nâng cao)',
    rating: 4.8,
    reviewsCount: 203,
    rate: 35,
    verified: false,
    description: 'Người bản xứ cung cấp các bài học ngôn ngữ sống động phù hợp với tốc độ và mục tiêu học tập cá nhân của bạn.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRPJ_nedKK76hx96Ioc925HajYJQrzRqKLk3-69yfy23Xp44nYiq2sidEe7r8Nc_XQitfR1vzCrnh9xpx05P_1zY2dgchQEncPRuiqThxZaV_qsRdGyL3NHOoTOBgsQM2wIO7EUWFuPmIQRIixXTJOXDPWyAbH50Hq9ljZxjUJLibVBmmhwTX4eSFXNwOjgXWJiK2DHUtYd0noMdDuglxTsYdwBnOKZUw2ti3RjsJTGH21zphbEicxrYLvzmsZETqsJYJs8BEDMgk',
    bio: '¡Hola! Tên tôi là Elena. Tôi là người nói tiếng Tây Ban Nha bản xứ đến từ Madrid với bằng Văn học Tây Ban Nha. Việc học ngôn ngữ là một hành trình sống động, và trong các lớp học của tôi, chúng ta sẽ nói tiếng Tây Ban Nha ngay từ ngày đầu tiên! Tôi kết hợp thực hành đàm thoại với các nền tảng ngữ pháp và hiểu biết văn hóa, giúp bạn phát triển các kỹ năng nói, đọc và viết trôi chảy để đi du lịch, đi học hoặc thăng tiến nghề nghiệp.',
    education: [
      'Thạc sĩ Văn học & Ngôn ngữ học Tây Ban Nha - Universidad Complutense de Madrid (2016)',
      'Cử nhân Ngữ văn Anh & Tây Ban Nha - Universidad de Salamanca (2013)'
    ],
    experience: [
      'Giảng viên Học viện Ngôn ngữ (2017 - Nay)',
      'Biên dịch viên & Biên tập viên Tự do (2014 - Nay)',
      'Gia sư Tiếng Tây Ban Nha Trực tuyến (hơn 8 năm)'
    ],
    certificates: [
      'Chứng chỉ Giám khảo DELE (Chứng chỉ Tiếng Tây Ban Nha như một Ngoại ngữ)',
      'Chứng chỉ Giảng dạy Tiếng Tây Ban Nha như một Ngoại ngữ (ELE)'
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
        comment: 'Elena rất nồng nhiệt và khích lệ! Lúc đầu tôi rất sợ nói tiếng Tây Ban Nha, nhưng cô ấy làm tôi cảm thấy hoàn toàn thoải mái. ¡Gracias!'
      },
      {
        id: 2,
        studentName: 'Markus K.',
        rating: 5,
        date: '2026-04-28',
        comment: 'Hoàn hảo để chuẩn bị tiếng Tây Ban Nha trong kinh doanh. Cô ấy đã tùy chỉnh các phiên học cho lĩnh vực thương mại quốc tế của tôi.'
      }
    ]
  },
  {
    id: 4,
    name: 'James Wilson',
    subjects: ['Hóa học', 'Sinh học', 'Hóa sinh'],
    level: 'Trung học phổ thông & Cao đẳng',
    rating: 4.7,
    reviewsCount: 92,
    rate: 40,
    verified: true,
    description: 'Gia sư khoa học tận tâm tập trung vào việc phát triển nền tảng hiểu biết vững chắc và tư duy phản biện.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbKTdRT8Kzgeb-fbmF1apykCqp-cDYVBmdeGP1NTKEm3OxFcXsoOeajBIr3osh_BwXPaW5vJSWueBaT866ZFbIJlaZy2-n3PE5ESBtwnzJu1cU-svmk7wSLbE8T1LVaX8q-DR0_VdCm1Y7lDn8hYECkyZ37CuP3RDScRP1JCiSLirfyS4LF-8i5zFX2-tE5kb0K7Z6zPzjzw88GBnmrEPUNAwZA75pgLwpqNxVFTbe6vCee5dkoPSyM4EY0wYMdZS9y_ELU2gV24',
    bio: 'Chào mừng! Tôi là James, một nhà hóa sinh và nhà giáo dục. Khoa học không chỉ là ghi nhớ các sự kiện; mà là hiểu cách thế giới tự nhiên hoạt động. Trong các buổi học của tôi, chúng tôi tập trung vào các nguyên tắc đầu tiên và tư duy phản biện. Tôi giúp học sinh nắm vững Hóa học, Hóa hữu cơ và Sinh học bằng cách chia nhỏ các con đường sinh hóa, phương trình và báo cáo phòng thí nghiệm thành các khái niệm rõ ràng, logic.',
    education: [
      'Thạc sĩ Hóa sinh - University of Michigan (2020)',
      'Cử nhân Sinh học & Hóa học - University of Wisconsin (2018)'
    ],
    experience: [
      'Trợ giảng Phòng thí nghiệm - University of Michigan (2018 - 2020)',
      'Người cố vấn Olympic Khoa học Trung học (2021 - Nay)',
      'Gia sư Khoa học Chuyên nghiệp (6 năm)'
    ],
    certificates: [
      'Gia sư Sinh học được Chứng nhận - Hiệp hội Gia sư Quốc gia (NTA)'
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
        comment: 'Hóa học Hữu cơ từng là một cơn ác mộng cho đến khi tôi bắt đầu học cùng James. Sơ đồ và lời giải thích tuyệt vời.'
      },
      {
        id: 2,
        studentName: 'Chloe B.',
        rating: 5,
        date: '2026-05-01',
        comment: 'James là chìa khóa cho quá trình chuẩn bị AP Biology của tôi. Rất kiên nhẫn và giải thích các phương pháp khoa học rõ ràng.'
      }
    ]
  }
];
