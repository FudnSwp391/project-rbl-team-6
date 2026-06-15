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
          This advanced course covers the essential principles and modern techniques of UI/UX design 
          for mobile applications. You will learn to create intuitive user interfaces, design effective 
          user flows, build interactive prototypes in Figma, and conduct usability testing to validate 
          your designs. By the end of this course, you'll have a polished portfolio piece demonstrating 
          your mastery of mobile app design.
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
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_circle
            </span>
          </div>
          <div>
            <p className="text-body-md font-semibold text-on-surface">{course.instructor}</p>
            <p className="text-label-sm text-on-surface-variant">Design Department • Senior Lecturer</p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              Experienced design educator with 10+ years in mobile UI/UX.
            </p>
          </div>
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 shadow-sm"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
      >
        <h3 className="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">emoji_objects</span>
          Learning Outcomes
        </h3>
        <ul className="space-y-3">
          {[
            'Master visual design foundations including color theory, typography, and grid systems',
            'Design complex, accessible user flows for mobile applications',
            'Build high-fidelity interactive prototypes using Figma',
            'Conduct usability testing and iterate based on user feedback',
            'Create a professional mobile app design portfolio piece',
            'Understand responsive and adaptive design patterns for mobile',
          ].map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-primary text-[18px] mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span className="text-body-md text-on-surface-variant">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Course Requirements */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 shadow-sm"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
      >
        <h3 className="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
          Course Requirements
        </h3>
        <ul className="space-y-3">
          {[
            'Basic understanding of design concepts and visual hierarchy',
            'A computer with Figma installed (free account is sufficient)',
            'Commitment of 6-8 hours per week for coursework and assignments',
            'Access to a mobile device for testing prototype interactions',
          ].map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">
                arrow_right
              </span>
              <span className="text-body-md text-on-surface-variant">{item}</span>
            </li>
          ))}
        </ul>
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
            <p className="text-headline-md font-bold text-on-surface">3</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mt-1">Modules</p>
          </div>
        </div>
        <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-700"
            style={{ width: `${course.progress}%` }}
          ></div>
        </div>
        <p className="text-label-sm text-on-surface-variant mt-2">
          You've completed {course.lessonsCompleted} out of {course.totalLessons} lessons. Keep up the great work!
        </p>
      </div>
    </div>
  );
}
