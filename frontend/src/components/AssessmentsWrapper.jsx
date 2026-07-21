import React, { useState } from 'react'
import QuizList from '../QuizList'
import ExamPapers from '../ExamPapers'

export default function AssessmentsWrapper({ token }) {
  const [activeTab, setActiveTab] = useState('quiz')

  return (
    <div className="flex flex-col gap-lg max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xs">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment
            </span>
            Kiểm tra & Đánh giá
          </h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            Làm bài tập trắc nghiệm và luyện đề thi thực tế.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-high/60 rounded-xl p-1 gap-1 max-w-xl w-full">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 h-10 rounded-lg font-label-md transition-all flex items-center justify-center gap-2 ${
            activeTab === 'quiz'
              ? 'bg-surface shadow-sm text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">assignment</span>
          Được giao (Bài tập & Đề thi)
        </button>
        <button
          onClick={() => setActiveTab('exam')}
          className={`flex-1 h-10 rounded-lg font-label-md transition-all flex items-center justify-center gap-2 ${
            activeTab === 'exam'
              ? 'bg-surface shadow-sm text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">library_books</span>
          Kho đề thi (Tự luyện)
        </button>
      </div>

      {/* Content */}
      <div className="mt-xs">
        {activeTab === 'quiz' && <QuizList token={token} />}
        {activeTab === 'exam' && <ExamPapers token={token} />}
      </div>
    </div>
  )
}
