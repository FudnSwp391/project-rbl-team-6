import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const customShadow = {
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
};

export default function LessonsTab({ classId }) {
  const activeClassId = classId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  // State definitions
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Fetch all lessons for class
  const fetchLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/lessons`);
      const data = await res.json();
      if (data.success) {
        setLessons(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch lessons.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Could not load lessons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [activeClassId]);

  // Fetch detailed lesson view
  const handleSelectLesson = async (lessonId) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`${API}/api/lessons/${lessonId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedLesson(data.data);
      } else {
        setDetailError(data.message || 'Failed to load lesson details.');
      }
    } catch (err) {
      console.error(err);
      setDetailError('Connection error. Could not load lesson details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Render Detail View ──────────────────────────────────────────────────
  if (selectedLesson) {
    return (
      <div className="space-y-4">
        {/* Back Button */}
        <button
          onClick={() => setSelectedLesson(null)}
          className="flex items-center gap-1.5 text-primary font-semibold hover:underline active:scale-95 transition-all mb-2"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Lessons
        </button>

        {detailLoading ? (
          <div className="text-center py-12 text-on-surface-variant bg-surface-container-lowest border border-surface-container rounded-xl">
            Loading lesson details...
          </div>
        ) : detailError ? (
          <div className="text-center py-12 text-error font-semibold bg-surface-container-lowest border border-surface-container rounded-xl">
            {detailError}
          </div>
        ) : (
          <div
            className="bg-surface-container-lowest border border-surface-container rounded-xl p-6 space-y-6 animate-fade-in"
            style={customShadow}
          >
            {/* Header info */}
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded">
                  Lesson {selectedLesson.lesson_order || 'N/A'}
                </span>
                <h2 className="text-headline-md font-bold text-on-surface mt-2">{selectedLesson.title}</h2>
              </div>
              <span className="bg-primary-container text-on-primary-container text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                {selectedLesson.status || 'published'}
              </span>
            </div>

            {/* Description */}
            {selectedLesson.description && (
              <div className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm uppercase tracking-wider">Description</h4>
                <p className="text-body-md text-on-surface-variant font-normal leading-relaxed">{selectedLesson.description}</p>
              </div>
            )}

            {/* Meta values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-surface-container py-4 my-4">
              {selectedLesson.duration_minutes && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                  </div>
                  <div>
                    <span className="block text-xs text-on-surface-variant">Duration</span>
                    <span className="font-bold text-sm text-on-surface">{selectedLesson.duration_minutes} minutes</span>
                  </div>
                </div>
              )}
              {selectedLesson.video_url && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">video_library</span>
                  </div>
                  <div>
                    <span className="block text-xs text-on-surface-variant">Video Link</span>
                    <a
                      href={selectedLesson.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline break-all"
                    >
                      {selectedLesson.video_url}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Video embed / placeholder */}
            {selectedLesson.video_url && (
              <div className="space-y-2">
                <h4 className="font-semibold text-on-surface text-sm uppercase tracking-wider">Video Presentation</h4>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-surface-container bg-black shadow-inner">
                  {selectedLesson.video_url.includes('youtube.com') || selectedLesson.video_url.includes('youtu.be') ? (
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={selectedLesson.video_url.replace('watch?v=', 'embed/')}
                      title={selectedLesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white space-y-3 p-4 text-center">
                      <span className="material-symbols-outlined text-[48px] text-primary">play_circle</span>
                      <p className="font-semibold text-sm max-w-md">{selectedLesson.title}</p>
                      <a
                        href={selectedLesson.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-primary/95 active:scale-95 transition-all inline-block mt-2"
                      >
                        Open External Video Link
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Render List View ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-12 text-on-surface-variant bg-surface-container-lowest border border-surface-container rounded-xl">
          Loading lessons...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-error font-semibold bg-surface-container-lowest border border-surface-container rounded-xl">
          {error}
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-8 text-center" style={customShadow}>
          <span className="material-symbols-outlined text-outline text-[48px] mb-2">search_off</span>
          <p className="text-body-md text-on-surface-variant font-semibold">No lessons available for this class yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => handleSelectLesson(lesson.id)}
              className="bg-surface-container-lowest border border-surface-container rounded-xl p-4 flex items-center justify-between gap-4 group hover:border-primary/40 transition-all cursor-pointer animate-fade-in"
              style={customShadow}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Lesson Icon */}
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {lesson.video_url ? 'play_circle' : 'menu_book'}
                  </span>
                </div>
                {/* Text Description */}
                <div className="min-w-0">
                  <h4 className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
                    {lesson.lesson_order !== null && lesson.lesson_order !== undefined && (
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">
                        Lesson {lesson.lesson_order}
                      </span>
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </h4>
                  {lesson.description && (
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-1 italic">
                      {lesson.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Status and Duration */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {lesson.duration_minutes && (
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">schedule</span>
                    {lesson.duration_minutes} min
                  </span>
                )}
                <span className="bg-primary-container text-on-primary-container text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded hidden sm:inline-block">
                  {lesson.status || 'published'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectLesson(lesson.id);
                  }}
                  className="text-xs font-bold text-white bg-primary px-4 py-2 rounded-full hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-1"
                >
                  Continue
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
