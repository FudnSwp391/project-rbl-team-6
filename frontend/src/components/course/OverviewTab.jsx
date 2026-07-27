import React from 'react';

export default function OverviewTab({ course }) {
  return (
    <div className="space-y-6">
      {/* Course Description */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 shadow-sm"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
      >
        <h3 className="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          Course Description
        </h3>
        <p className="text-body-md text-on-surface-variant leading-relaxed">
          {course.description || 'Chưa có mô tả cho khóa học này.'}
        </p>
      </div>

      {/* Instructor */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 shadow-sm"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
      >
        <h3 className="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">person</span>
          Instructor
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden">
            {course.tutor_picture ? (
              <img src={course.tutor_picture} alt={course.instructor} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-primary text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
            )}
          </div>
          <div>
            <p className="text-body-md font-semibold text-on-surface">{course.instructor}</p>
            <p className="text-label-sm text-on-surface-variant">
              {course.dateRange ? `Khoá học: ${course.dateRange}` : 'Giảng viên'}
            </p>
          </div>
        </div>
      </div>

      {/* Course Progress Summary */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 shadow-sm"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
      >
        <h3 className="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
          Course Progress Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-surface p-4 rounded-lg border border-surface-container text-center">
            <p className="text-headline-md font-bold text-primary">{course.progress}%</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mt-1">Overall</p>
          </div>
          <div className="bg-surface p-4 rounded-lg border border-surface-container text-center">
            <p className="text-headline-md font-bold text-on-surface">{course.lessonsCompleted}/{course.totalLessons}</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mt-1">Lessons</p>
          </div>
          <div className="bg-surface p-4 rounded-lg border border-surface-container text-center">
            <p className="text-headline-md font-bold text-on-surface">{course.totalLessons}</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mt-1">Total Lessons</p>
          </div>
        </div>
        <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-700"
            style={{ width: `${course.progress}%` }}
          ></div>
        </div>
        <p className="text-label-sm text-on-surface-variant mt-2">
          {course.lessonsCompleted > 0
            ? `Bạn đã hoàn thành ${course.lessonsCompleted} trên ${course.totalLessons} bài học. Hãy tiếp tục!`
            : course.totalLessons > 0
              ? `Khóa học có ${course.totalLessons} bài học. Hãy bắt đầu học ngay!`
              : 'Chưa có bài học nào trong khóa học này.'
          }
        </p>
      </div>

      {/* Course Info */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 shadow-sm"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
      >
        <h3 className="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
          Course Info
        </h3>
        <div className="space-y-3">
          {course.start_date && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">event</span>
              <span className="text-body-md text-on-surface-variant">
                Ngày bắt đầu: {new Date(course.start_date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
          {course.end_date && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">event_available</span>
              <span className="text-body-md text-on-surface-variant">
                Ngày kết thúc: {new Date(course.end_date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
          {course.meet_link && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">video_call</span>
              <a href={course.meet_link} target="_blank" rel="noopener noreferrer" className="text-body-md text-primary hover:underline">
                Link Google Meet
              </a>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">
              {course.status === 'active' ? 'check_circle' : course.status === 'archived' ? 'archive' : 'edit'}
            </span>
            <span className="text-body-md text-on-surface-variant">
              Trạng thái: {course.status === 'active' ? 'Đang hoạt động' : course.status === 'archived' ? 'Đã lưu trữ' : course.status === 'draft' ? 'Bản nháp' : course.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
