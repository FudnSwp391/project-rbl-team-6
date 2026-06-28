import React from 'react';

// ─── Cấp học ─────────────────────────────────────────────────────────────────
const educationLevels = [
  { value: "Tiểu học", label: "Tiểu học" },
  { value: "THCS",     label: "THCS" },
  { value: "THPT",     label: "THPT" },
];

// ─── Lớp theo cấp học ────────────────────────────────────────────────────────
const GRADES_BY_LEVEL = {
  "Tiểu học": ["1", "2", "3", "4", "5"],
  "THCS":     ["6", "7", "8", "9"],
  "THPT":     ["10", "11", "12"],
};

// ─── Môn học theo cấp học ────────────────────────────────────────────────────
const SUBJECTS_BY_LEVEL = {
  "Tiểu học": ["Toán", "Tiếng Anh", "Ngữ văn", "Tin học", "Tự nhiên và Xã hội"],
  "THCS":     ["Toán", "Tiếng Anh", "Ngữ văn", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý", "Tin học"],
  "THPT":     ["Toán", "Tiếng Anh", "Ngữ văn", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý", "Tin học"],
};

// ─── Chuyên đề theo môn + cấp học ────────────────────────────────────────────
const TOPICS_BY_SUBJECT_AND_LEVEL = {
  "Toán": {
    "Tiểu học": [
      "Cộng trừ nhân chia", "Bảng cửu chương", "Phân số", "Số thập phân",
      "Toán có lời văn", "Hình học cơ bản",
      "Đo độ dài / diện tích / thể tích", "Ôn kiểm tra",
    ],
    "THCS": [
      "Số nguyên", "Phân số", "Lũy thừa", "Tỉ lệ thức",
      "Biểu thức đại số", "Phương trình cơ bản", "Bất phương trình cơ bản",
      "Hình học phẳng", "Tam giác", "Tứ giác",
      "Hàm số bậc nhất", "Căn bậc hai", "Ôn thi vào lớp 10",
    ],
    "THPT": [
      "Hàm số", "Phương trình", "Bất phương trình", "Lượng giác",
      "Vectơ", "Hình học không gian", "Tổ hợp xác suất",
      "Đạo hàm", "Tích phân", "Số phức", "Ôn thi THPT Quốc gia",
    ],
  },
  "Tiếng Anh": {
    "Tiểu học": [
      "Từ vựng cơ bản", "Ngữ pháp cơ bản", "Phát âm",
      "Nghe đơn giản", "Nói theo chủ đề", "Đọc hiểu cơ bản", "Ôn kiểm tra",
    ],
    "THCS": [
      "Từ vựng", "Ngữ pháp", "Các thì tiếng Anh",
      "Câu điều kiện cơ bản", "Câu bị động cơ bản",
      "Đọc hiểu", "Viết đoạn văn", "Nghe",
      "Giao tiếp cơ bản", "Ôn thi vào lớp 10",
    ],
    "THPT": [
      "Từ vựng nâng cao", "Ngữ pháp nâng cao", "Đọc hiểu",
      "Viết lại câu", "Viết đoạn văn", "Listening", "Speaking",
      "IELTS / TOEIC", "Ôn thi THPT Quốc gia",
    ],
  },
  "Ngữ văn": {
    "Tiểu học": [
      "Tập đọc", "Chính tả", "Luyện viết",
      "Tập làm văn", "Kể chuyện", "Đọc hiểu cơ bản",
    ],
    "THCS": [
      "Đọc hiểu", "Tiếng Việt", "Tập làm văn",
      "Nghị luận xã hội cơ bản", "Phân tích thơ",
      "Phân tích truyện", "Viết đoạn văn", "Ôn thi vào lớp 10",
    ],
    "THPT": [
      "Đọc hiểu", "Nghị luận xã hội", "Nghị luận văn học",
      "Phân tích thơ", "Phân tích truyện",
      "So sánh tác phẩm", "Ôn thi THPT Quốc gia",
    ],
  },
  "Vật lý": {
    "THCS": [
      "Cơ học cơ bản", "Nhiệt học", "Điện học cơ bản",
      "Quang học", "Âm học", "Lực và chuyển động",
      "Bài tập vận dụng", "Ôn kiểm tra",
    ],
    "THPT": [
      "Cơ học", "Dao động cơ", "Sóng cơ", "Điện xoay chiều",
      "Dao động điện từ", "Quang học", "Lượng tử ánh sáng",
      "Hạt nhân nguyên tử", "Ôn thi THPT Quốc gia",
    ],
  },
  "Hóa học": {
    "THCS": [
      "Chất và nguyên tử", "Công thức hóa học", "Hóa trị",
      "Phản ứng hóa học", "Oxi và không khí", "Hidro và nước",
      "Dung dịch", "Axit - Bazơ - Muối cơ bản",
      "Kim loại cơ bản", "Ôn kiểm tra",
    ],
    "THPT": [
      "Cấu tạo nguyên tử", "Bảng tuần hoàn", "Liên kết hóa học",
      "Phản ứng oxi hóa khử", "Axit - Bazơ - Muối",
      "Hóa hữu cơ", "Este - Lipit", "Kim loại", "Ôn thi THPT Quốc gia",
    ],
  },
  "Sinh học": {
    "Tiểu học": [
      "Cơ thể người cơ bản", "Thực vật", "Động vật",
      "Môi trường sống", "Sức khỏe học đường",
    ],
    "THCS": [
      "Tế bào", "Cơ thể người", "Thực vật", "Động vật",
      "Di truyền cơ bản", "Sinh thái học cơ bản", "Ôn kiểm tra",
    ],
    "THPT": [
      "Tế bào học", "Di truyền học", "Tiến hóa", "Sinh thái học",
      "Cơ thể người", "Thực vật", "Động vật", "Ôn thi THPT Quốc gia",
    ],
  },
  "Lịch sử": {
    "Tiểu học": [
      "Lịch sử Việt Nam cơ bản", "Nhân vật lịch sử",
      "Sự kiện lịch sử tiêu biểu", "Kể chuyện lịch sử",
    ],
    "THCS": [
      "Lịch sử Việt Nam", "Lịch sử thế giới",
      "Cách mạng Việt Nam", "Chiến tranh thế giới",
      "Phân tích sự kiện", "Ôn kiểm tra",
    ],
    "THPT": [
      "Lịch sử Việt Nam", "Lịch sử thế giới",
      "Cách mạng Việt Nam", "Chiến tranh thế giới",
      "Phân tích sự kiện", "Ôn thi THPT Quốc gia",
    ],
  },
  "Địa lý": {
    "Tiểu học": [
      "Bản đồ đơn giản", "Địa lý Việt Nam cơ bản",
      "Tự nhiên và xã hội", "Khu vực địa phương",
    ],
    "THCS": [
      "Địa lý tự nhiên", "Địa lý dân cư", "Địa lý kinh tế",
      "Địa lý Việt Nam", "Atlat Địa lý",
      "Kỹ năng biểu đồ", "Ôn kiểm tra",
    ],
    "THPT": [
      "Địa lý tự nhiên", "Địa lý dân cư", "Địa lý kinh tế",
      "Địa lý Việt Nam", "Atlat Địa lý",
      "Kỹ năng biểu đồ", "Ôn thi THPT Quốc gia",
    ],
  },
  "Tin học": {
    "Tiểu học": [
      "Làm quen máy tính", "Gõ phím",
      "Word cơ bản", "PowerPoint cơ bản", "Tư duy logic đơn giản",
    ],
    "THCS": [
      "Tin học cơ bản", "Word / Excel / PowerPoint", "Internet an toàn",
      "Scratch", "Python cơ bản", "HTML/CSS cơ bản",
      "Tư duy thuật toán cơ bản",
    ],
    "THPT": [
      "Tin học văn phòng", "Python cơ bản", "HTML/CSS",
      "Cơ sở dữ liệu cơ bản", "Thuật toán cơ bản", "Lập trình cơ bản",
    ],
  },
  "Tự nhiên và Xã hội": {
    "Tiểu học": [
      "Tự nhiên", "Xã hội", "Sức khỏe", "Khoa học",
      "Môi trường", "Cộng đồng",
    ],
  },
};

const DEFAULT_TOPICS = [
  "Kiến thức cơ bản", "Bài tập trên lớp",
  "Ôn kiểm tra", "Luyện đề", "Củng cố kiến thức",
];

const curriculums = [
  { value: "gdpt2018", label: "GDPT 2018" },
  { value: "cu",       label: "Chương trình cũ" },
  { value: "quocte",   label: "Chương trình quốc tế" },
];

const textbooks = [
  { value: "kntt", label: "Kết nối tri thức" },
  { value: "cd",   label: "Cánh diều" },
  { value: "ctst", label: "Chân trời sáng tạo" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function StepLearningNeeds({ formData, setFormData, errors = {} }) {
  const level   = formData.educationLevel || "";
  const subject = formData.subject || "";

  const availableSubjects = level ? (SUBJECTS_BY_LEVEL[level] || []) : [];
  const gradeOptions      = level ? (GRADES_BY_LEVEL[level] || []) : [];
  const currentTopics     =
    (TOPICS_BY_SUBJECT_AND_LEVEL[subject]?.[level]) || DEFAULT_TOPICS;

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Đổi cấp học → reset lớp + môn (nếu không còn hợp lệ) + topics
  const handleLevelChange = (e) => {
    const newLevel    = e.target.value;
    const newGrades   = GRADES_BY_LEVEL[newLevel] || [];
    const newSubjects = SUBJECTS_BY_LEVEL[newLevel] || [];
    const firstGrade  = newGrades[0] || "";
    const newSubject  = newSubjects.includes(subject) ? subject : (newSubjects[0] || "");

    setFormData(prev => ({
      ...prev,
      educationLevel: newLevel,
      grade:          firstGrade,
      subject:        newSubject,
      topics:         [],
    }));
  };

  // Đổi môn học → reset topics
  const handleSubjectChange = (e) => {
    setFormData(prev => ({ ...prev, subject: e.target.value, topics: [] }));
  };

  // Đổi lớp → reset topics
  const handleGradeChange = (e) => {
    setFormData(prev => ({ ...prev, grade: e.target.value, topics: [] }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const toggleTopic = (topic) => {
    setFormData(prev => {
      const current    = prev.topics || [];
      const isSelected = current.includes(topic);
      return {
        ...prev,
        topics: isSelected ? current.filter(t => t !== topic) : [...current, topic],
      };
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mb-xl md:mb-2xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-sm">
          Bạn đang muốn học gì?
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Hãy cung cấp thông tin về môn học và nội dung bạn muốn cải thiện.
        </p>
      </div>

      <div className="bg-surface rounded-xl shadow-[0_4px_20px_rgba(30,64,175,0.05)] p-lg md:p-xl border border-surface-variant">
        <form className="flex flex-col gap-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">

            {/* ── Cột trái ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-lg">

              {/* Cấp học */}
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="educationLevel">
                  Cấp học <span className="text-error">*</span>
                </label>
                <select
                  id="educationLevel"
                  value={level}
                  onChange={handleLevelChange}
                  className={`form-select w-full bg-surface border text-on-surface font-body-md text-body-md rounded-lg focus:ring-1 focus:outline-none py-sm px-md h-12 transition-colors ${errors.educationLevel ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'}`}
                >
                  <option value="" disabled>-- Chọn cấp học --</option>
                  {educationLevels.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                {errors.educationLevel && <span className="text-error text-sm mt-1 animate-fade-in">{errors.educationLevel}</span>}
              </div>

              {/* Lớp – chỉ hiện sau khi chọn cấp học */}
              {level && gradeOptions.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="grade">
                    Lớp <span className="text-error">*</span>
                  </label>
                  <select
                    id="grade"
                    value={formData.grade || ""}
                    onChange={handleGradeChange}
                    className={`form-select w-full bg-surface border text-on-surface font-body-md text-body-md rounded-lg focus:ring-1 focus:outline-none py-sm px-md h-12 transition-colors ${errors.grade ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'}`}
                  >
                    <option value="" disabled>-- Chọn lớp --</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                  {errors.grade && <span className="text-error text-sm mt-1 animate-fade-in">{errors.grade}</span>}
                </div>
              )}

              {/* Môn học – chỉ hiện sau khi chọn cấp học */}
              {level && availableSubjects.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="subject">
                    Môn học <span className="text-error">*</span>
                  </label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={handleSubjectChange}
                    className={`form-select w-full bg-surface border text-on-surface font-body-md text-body-md rounded-lg focus:ring-1 focus:outline-none py-sm px-md h-12 transition-colors ${errors.subject ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-primary focus:ring-primary'}`}
                  >
                    <option value="" disabled>-- Chọn môn học --</option>
                    {availableSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.subject && <span className="text-error text-sm mt-1 animate-fade-in">{errors.subject}</span>}
                </div>
              )}
            </div>

            {/* ── Cột phải ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-lg">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="curriculum">
                  Chương trình đang học
                </label>
                <select
                  id="curriculum"
                  value={formData.curriculum || "gdpt2018"}
                  onChange={handleChange}
                  className="form-select w-full bg-surface border border-outline-variant text-on-surface font-body-md text-body-md rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none py-sm px-md h-12 transition-colors"
                >
                  {curriculums.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="textbook">
                  Bộ sách đang sử dụng
                </label>
                <select
                  id="textbook"
                  value={formData.textbook || "kntt"}
                  onChange={handleChange}
                  className="form-select w-full bg-surface border border-outline-variant text-on-surface font-body-md text-body-md rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none py-sm px-md h-12 transition-colors"
                >
                  {textbooks.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Chuyên đề cần học ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-sm pt-md border-t border-surface-variant">
            <label className="font-label-md text-label-md text-on-surface">
              Chuyên đề cần học{' '}
              <span className="text-on-surface-variant font-normal">(Có thể chọn nhiều)</span>
            </label>

            {!level || !subject ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant italic">
                Vui lòng chọn cấp học và môn học để xem chuyên đề phù hợp.
              </p>
            ) : (
              <div className="flex flex-wrap gap-sm">
                {currentTopics.map(topic => {
                  const isSelected = (formData.topics || []).includes(topic);
                  return (
                    <label key={topic} className="cursor-pointer">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={isSelected}
                        onChange={() => toggleTopic(topic)}
                      />
                      <div className={`px-md py-sm rounded-full font-label-sm text-label-sm transition-colors flex items-center gap-xs ${
                        isSelected
                          ? 'bg-primary-container text-on-primary-container border border-primary-container'
                          : 'bg-surface text-on-surface-variant border border-outline-variant hover:bg-surface-variant'
                      }`}>
                        {topic}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Mô tả thêm ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-xs pt-md border-t border-surface-variant">
            <label className="font-label-md text-label-md text-on-surface" htmlFor="subjectDescription">
              Mô tả thêm{' '}
              <span className="text-on-surface-variant font-normal">(Không bắt buộc)</span>
            </label>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">
              Nêu rõ phần kiến thức bạn đang gặp khó khăn hoặc mục tiêu cụ thể bạn muốn đạt được.
            </p>
            <textarea
              id="subjectDescription"
              value={formData.subjectDescription || ''}
              onChange={handleChange}
              className="w-full bg-surface border border-outline-variant text-on-surface font-body-md text-body-md rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none py-sm px-md transition-colors resize-none"
              placeholder="Ví dụ: Mình học yếu phần hình học, cần gia sư kiên nhẫn giảng lại từ đầu..."
              rows="4"
            />
          </div>
        </form>
      </div>
    </>
  );
}
