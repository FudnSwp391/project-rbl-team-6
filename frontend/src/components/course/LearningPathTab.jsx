import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const customShadow = {
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
};

export default function LearningPathTab({ classId }) {
  const { user } = useAuth();
  const activeClassId = classId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const studentId = user?.id || '00000000-0000-0000-0000-000000000001';

  // State definitions
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Configuration Form States
  const [currentLevel, setCurrentLevel] = useState('beginner');
  const [targetLevel, setTargetLevel] = useState('intermediate');
  const [goal, setGoal] = useState('Improve UI UX design skills and complete all course lessons in 8 weeks');
  const [durationWeeks, setDurationWeeks] = useState(8);

  // Fetch current learning path
  const fetchLearningPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/learning-path/${studentId}`);
      const data = await res.json();
      if (data.success) {
        setPathData(data.data || null);
      } else {
        setError(data.message || 'Failed to fetch learning path.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Could not load learning path.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningPath();
  }, [activeClassId, studentId]);

  // Handle Generate Path API call
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/learning-path/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          current_level: currentLevel,
          target_level: targetLevel,
          goal: goal,
          duration_weeks: durationWeeks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPathData(data.data);
        setIsFormOpen(false);
      } else {
        setError(data.message || 'Failed to generate learning path.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Could not generate learning path.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed':
        return {
          badge: 'bg-primary text-on-primary',
          badgeText: 'Completed',
          dot: 'bg-primary',
          border: 'border-primary/30',
          bg: 'bg-primary-container/5',
        };
      case 'in_progress':
        return {
          badge: 'bg-tertiary-container text-on-tertiary',
          badgeText: 'In Progress',
          dot: 'bg-tertiary-container',
          border: 'border-tertiary-container/40',
          bg: 'bg-tertiary-fixed/5',
        };
      default:
        return {
          badge: 'bg-surface-container-highest text-on-surface-variant',
          badgeText: 'Pending',
          dot: 'bg-outline-variant',
          border: 'border-outline-variant/30',
          bg: '',
        };
    }
  };

  // ─── Render Loading State ──────────────────────────────────────────────────
  if (loading || isGenerating) {
    return (
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-12 text-center" style={customShadow}>
        <div className="flex flex-col items-center justify-center space-y-4">
          <span className="material-symbols-outlined animate-spin text-[48px] text-primary">autorenew</span>
          <p className="text-body-md text-on-surface-variant font-semibold">
            {isGenerating ? 'Generating personalized path with AI...' : 'Loading learning path...'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Render Error State ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-8 text-center" style={customShadow}>
        <span className="material-symbols-outlined text-[48px] text-error mb-2">error</span>
        <p className="text-body-md text-on-surface-variant font-semibold">{error}</p>
        <button
          onClick={fetchLearningPath}
          className="mt-4 bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-all active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ─── Render Empty State / Input Form ───────────────────────────────────────
  if (!pathData || isFormOpen) {
    return (
      <div className="space-y-6">
        {/* Form Container */}
        <form
          onSubmit={handleGenerate}
          className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 space-y-6 animate-fade-in"
          style={customShadow}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </div>
            <div>
              <h3 className="text-headline-md font-bold text-on-surface">AI Learning Path Generator</h3>
              <p className="text-label-sm text-on-surface-variant">
                Configure your personalized learning roadmap
              </p>
            </div>
          </div>

          {!pathData && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-primary">No learning path generated yet.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Level */}
            <div>
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Current Level
              </label>
              <select
                className="w-full border border-outline-variant rounded-lg text-label-md py-2.5 px-4 bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Target Level */}
            <div>
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Target Level
              </label>
              <select
                className="w-full border border-outline-variant rounded-lg text-label-md py-2.5 px-4 bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
              >
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Duration Weeks */}
            <div>
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Duration (Weeks)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                className="w-full border border-outline-variant rounded-lg text-label-md py-2.5 px-4 bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(parseInt(e.target.value, 10) || 8)}
              />
            </div>

            {/* Goal */}
            <div className="md:col-span-2">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Your Learning Goal
              </label>
              <textarea
                rows={3}
                className="w-full border border-outline-variant rounded-lg text-label-md py-2.5 px-4 bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none resize-none"
                value={goal}
                placeholder="Describe what you want to achieve..."
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {isFormOpen && (
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-3 border border-outline-variant rounded-lg font-bold hover:bg-surface-container transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              Generate Learning Path
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Render Learning Path Roadmap ──────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30" style={customShadow}>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Current Level</p>
          <p className="text-headline-md font-bold text-primary capitalize">{pathData.current_level || 'beginner'}</p>
          <p className="text-[10px] text-on-surface-variant mt-1">Starting point</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30" style={customShadow}>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Target Level</p>
          <p className="text-headline-md font-bold text-on-surface capitalize">{pathData.target_level || 'intermediate'}</p>
          <p className="text-[10px] text-on-surface-variant mt-1">Goal level</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30" style={customShadow}>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Duration</p>
          <p className="text-headline-md font-bold text-on-surface">{pathData.duration_weeks || 8} Weeks</p>
          <p className="text-[10px] text-on-surface-variant mt-1">Estimated duration</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30" style={customShadow}>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Goal Status</p>
          <p className="text-headline-md font-bold text-tertiary-container">Active</p>
          <p className="text-[10px] text-on-surface-variant mt-1">Status of roadmap</p>
        </div>
      </div>

      {/* Goal details */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 space-y-2" style={customShadow}>
        <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Your Goal</h4>
        <p className="text-body-md text-on-surface leading-relaxed">{pathData.goal}</p>
      </div>

      {/* Timeline steps */}
      <div>
        <h4 className="text-label-md font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">timeline</span>
          Your Personalized Roadmap
        </h4>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-outline-variant/40"></div>

          <div className="space-y-6">
            {(pathData.steps || []).map((step) => {
              const styles = getStatusStyles(step.status);
              return (
                <div key={step.id || step.step_order} className="relative flex gap-6">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-full ${styles.dot} flex items-center justify-center flex-shrink-0`}
                  >
                    {step.status === 'completed' ? (
                      <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    ) : (
                      <span className="text-white text-label-sm font-bold">{step.estimated_week}</span>
                    )}
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 bg-surface-container-lowest p-5 rounded-xl border ${styles.border} ${styles.bg} hover:shadow-md transition-all`}
                    style={customShadow}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          {step.lesson_id ? 'play_circle' : 'menu_book'}
                        </span>
                        <h5 className="text-label-md font-bold text-on-surface">
                          Week {step.estimated_week}: {step.title}
                        </h5>
                      </div>
                      <span className={`px-3 py-1 ${styles.badge} text-[10px] font-bold rounded-full uppercase tracking-tighter`}>
                        {styles.badgeText}
                      </span>
                    </div>
                    {step.description && (
                      <p className="text-label-sm text-on-surface-variant">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Regeneration Option */}
      <div className="pt-4 flex justify-center">
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-surface-container text-on-surface-variant hover:text-primary border border-outline-variant px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-surface-container-low transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">autorenew</span>
          Regenerate Roadmap
        </button>
      </div>
    </div>
  );
}
