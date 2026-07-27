import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { API_BASE_URL } from '../../config';

const API = API_BASE_URL;

const customShadow = {
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
};

// Helper to format due date nicely
function formatDueDate(dateString) {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format numbers to 2-digits for stats (e.g. 05)
function padZero(num) {
  return num < 10 ? `0${num}` : num.toString();
}

export default function AssignmentsTab({ classId }) {
  const { user } = useAuth();
  const activeClassId = classId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  // States
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Due Date');

  // Detail State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch assignments list
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/assignments`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch assignments');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Could not load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [activeClassId]);

  // Handle Select Assignment (Detail View)
  const handleSelectAssignment = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/api/assignments/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedAssignment(data.data);
      } else {
        alert(data.message || 'Failed to load assignment details');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Could not load assignment.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter and sort assignments list
  const filteredAssignments = assignments
    .filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'Title') {
        return a.title.localeCompare(b.title);
      }
      // Default: sort by Due Date
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });

  // Calculate dynamic stats
  const totalCount = padZero(assignments.length);
  const pendingCount = padZero(assignments.length); // All assignments are pending initially

  const stats = [
    { label: 'Total Assignments', value: totalCount, color: 'text-primary' },
    { label: 'Pending', value: pendingCount, color: 'text-error' },
    { label: 'Submitted', value: '00', color: 'text-on-surface' },
    { label: 'Graded', value: '00', color: 'text-tertiary-container' },
  ];

  // RENDER: Detailed Assignment View
  if (selectedAssignment) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedAssignment(null)}
          className="flex items-center gap-2 text-label-md font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Assignments
        </button>

        {/* Assignment Detail Card */}
        <div
          className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 space-y-6"
          style={customShadow}
        >
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-outline-variant/20 pb-4">
            <div className="w-12 h-12 rounded-lg bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">assignment</span>
            </div>
            <div>
              <h3 className="text-headline-md font-bold text-on-surface">
                {selectedAssignment.title}
              </h3>
              <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5 mt-1">
                <span className="material-symbols-outlined text-sm">event</span>
                Due Date: {formatDueDate(selectedAssignment.due_date)}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-label-md font-bold text-on-surface">Instructions</h4>
            <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">
              {selectedAssignment.description || 'No instructions provided.'}
            </p>
          </div>

          {/* Info Status Banner */}
          <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-[20px]">info</span>
            <p className="text-label-sm text-on-surface-variant">
              This assignment is currently <span className="font-bold text-error">PENDING</span>. Online submissions are not supported in this phase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Assignments List View
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30"
            style={customShadow}
          >
            <p className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-headline-md font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between bg-surface-container p-4 rounded-xl">
        <div className="relative w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-label-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
            placeholder="Search assignments..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-label-md text-on-surface-variant">Sort by:</span>
          <select
            className="bg-surface-container-lowest border border-outline-variant rounded-lg text-label-md py-2 px-4 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Due Date">Due Date</option>
            <option value="Title">Title</option>
          </select>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Loading assignments...</div>
        ) : error ? (
          <div className="text-center py-12 text-error font-semibold">{error}</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-outline text-[48px] mb-4">
              search_off
            </span>
            <h3 className="font-label-md text-label-md text-on-surface mb-2">
              No assignments found
            </h3>
            <p className="text-body-md text-on-surface-variant">
              There are no assignments matching your search criteria.
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              onClick={() => handleSelectAssignment(assignment.id)}
              className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 flex items-center justify-between group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              style={customShadow}
            >
              <div className="flex items-center gap-5 overflow-hidden">
                <div className="w-12 h-12 rounded-lg bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-label-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                    {assignment.title}
                  </h4>
                  <div className="flex items-center gap-3 text-label-sm text-on-surface-variant mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">event</span>
                      Due: {formatDueDate(assignment.due_date)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 flex-shrink-0">
                <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded-full uppercase tracking-tighter">
                  Pending
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAssignment(assignment.id);
                  }}
                  className="bg-primary text-on-primary px-6 py-2 rounded-lg text-label-md font-bold hover:bg-primary/90 transition-transform active:scale-95"
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
