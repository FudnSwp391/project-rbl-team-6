import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { API_BASE_URL } from '../../config';

const POST_TYPES = ['Question', 'Announcement', 'Discussion'];

const API = API_BASE_URL;

const customShadow = {
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
};

// Helper to format timestamp into human readable relative time
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function DiscussionsTab({ classId }) {
  const { user } = useAuth();
  const activeClassId = classId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  // State
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Composer State
  const [activePostType, setActivePostType] = useState('Question');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Detail & Replies State
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Fetch discussions list
  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/discussions`);
      const data = await res.json();
      if (data.success) {
        setDiscussions(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch discussions');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Could not load discussions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, [activeClassId]);

  // Handle Post Creation
  const handlePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) return;
    setIsPosting(true);

    const payload = {
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      title: postTitle.trim(),
      content: postContent.trim(),
      discussion_type: activePostType.toLowerCase(),
    };

    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setPostTitle('');
        setPostContent('');
        // Refresh discussions
        await fetchDiscussions();
      } else {
        alert(data.message || 'Failed to create discussion');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating discussion. Please check backend connection.');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle Discussion Selection (Detail View)
  const handleSelectDiscussion = async (id) => {
    setRepliesLoading(true);
    try {
      // 1. Fetch details
      const detailRes = await fetch(`${API}/api/discussions/${id}`);
      const detailData = await detailRes.json();
      if (detailData.success) {
        setSelectedDiscussion(detailData.data);
      }

      // 2. Fetch replies
      const repliesRes = await fetch(`${API}/api/discussions/${id}/replies`);
      const repliesData = await repliesRes.json();
      if (repliesData.success) {
        setReplies(repliesData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRepliesLoading(false);
    }
  };

  // Handle Reply Submission
  const handlePostReply = async () => {
    if (!replyContent.trim() || !selectedDiscussion) return;
    setIsReplying(true);

    const payload = {
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      content: replyContent.trim(),
    };

    try {
      const res = await fetch(`${API}/api/discussions/${selectedDiscussion.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setReplyContent('');
        // Refresh replies list
        const repliesRes = await fetch(`${API}/api/discussions/${selectedDiscussion.id}/replies`);
        const repliesData = await repliesRes.json();
        if (repliesData.success) {
          setReplies(repliesData.data || []);
        }
      } else {
        alert(data.message || 'Failed to create reply');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending reply.');
    } finally {
      setIsReplying(false);
    }
  };

  // Go back to discussions list
  const handleBackToList = () => {
    setSelectedDiscussion(null);
    setReplies([]);
    fetchDiscussions();
  };

  // RENDER: Detailed Discussion View
  if (selectedDiscussion) {
    return (
      <div className="space-y-6">
        {/* Back navigation */}
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-label-md font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Discussions
        </button>

        {/* Selected Discussion Card */}
        <div
          className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30"
          style={customShadow}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Author avatar */}
              {selectedDiscussion.user_avatar ? (
                <img
                  src={selectedDiscussion.user_avatar}
                  alt={selectedDiscussion.user_name}
                  className="w-10 h-10 rounded-full object-cover border border-outline-variant"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-on-primary-container text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-label-md font-bold text-on-surface">
                    {selectedDiscussion.user_name || 'Anonymous'}
                  </span>
                  {selectedDiscussion.user_role === 'tutor' && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                      Instructor
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedDiscussion.discussion_type === 'question'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : selectedDiscussion.discussion_type === 'announcement'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {selectedDiscussion.discussion_type}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  {formatRelativeTime(selectedDiscussion.created_at)}
                </p>
              </div>
            </div>
          </div>

          <h4 className="text-headline-md font-bold text-on-surface mb-3">
            {selectedDiscussion.title}
          </h4>
          <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">
            {selectedDiscussion.content}
          </p>
        </div>

        {/* Replies List Section */}
        <div className="space-y-4">
          <h4 className="text-label-md font-bold text-on-surface">
            Replies ({replies.length})
          </h4>

          {repliesLoading ? (
            <div className="text-center py-6 text-on-surface-variant">Loading replies...</div>
          ) : replies.length === 0 ? (
            <div className="text-center py-6 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-on-surface-variant">
              No replies yet. Be the first to respond!
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 ml-6"
                  style={customShadow}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {reply.user_avatar ? (
                      <img
                        src={reply.user_avatar}
                        alt={reply.user_name}
                        className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                        <span
                          className="material-symbols-outlined text-on-primary-container text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          person
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-label-sm font-bold text-on-surface">
                          {reply.user_name || 'Anonymous'}
                        </span>
                        {reply.user_role === 'tutor' && (
                          <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded text-[9px] font-bold">
                            Instructor
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-on-surface-variant">
                        {formatRelativeTime(reply.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-body-md text-on-surface leading-relaxed ml-11">
                    {reply.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Composer Card */}
        <div
          className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30"
          style={customShadow}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
              <span
                className="material-symbols-outlined text-on-primary-container text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <textarea
                className="w-full border border-outline-variant rounded-xl p-4 text-body-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none resize-none"
                rows={3}
                placeholder="Type your reply here..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />

              <div className="flex items-center justify-end">
                <button
                  onClick={handlePostReply}
                  disabled={isReplying || !replyContent.trim()}
                  className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-55 disabled:scale-100"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  {isReplying ? 'Sending...' : 'Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Discussions List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-headline-md font-bold text-on-surface">Course Discussions</h3>
        <p className="text-label-sm text-on-surface-variant mt-1">
          Ask questions, share insights, and collaborate with your classmates
        </p>
      </div>

      {/* Composer Card */}
      <div
        className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30"
        style={customShadow}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-on-primary-container text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>

          <div className="flex-1 space-y-3">
            {/* Post Type Chips */}
            <div className="flex items-center gap-2">
              {POST_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setActivePostType(type)}
                  className={`px-4 py-1.5 rounded-full text-label-sm font-bold transition-all ${
                    activePostType === type
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Title Input */}
            <input
              type="text"
              className="w-full border border-outline-variant rounded-xl p-3 text-body-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
              placeholder="Enter discussion title..."
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
            />

            {/* Textarea */}
            <textarea
              className="w-full border border-outline-variant rounded-xl p-4 text-body-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none resize-none"
              rows={3}
              placeholder={`Write your ${activePostType.toLowerCase()} here...`}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-surface-container rounded-lg transition-colors" title="Attach file">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    attach_file
                  </span>
                </button>
                <button className="p-2 hover:bg-surface-container rounded-lg transition-colors" title="Add image">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    image
                  </span>
                </button>
                <button className="p-2 hover:bg-surface-container rounded-lg transition-colors" title="Mention someone">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    alternate_email
                  </span>
                </button>
              </div>
              <button
                onClick={handlePost}
                disabled={isPosting || !postTitle.trim() || !postContent.trim()}
                className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-55 disabled:scale-100"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Discussion List */}
      <div>
        <h4 className="text-label-md font-bold text-on-surface mb-3">Recent Discussions</h4>
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Loading discussions...</div>
        ) : error ? (
          <div className="text-center py-12 text-error font-semibold">{error}</div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-on-surface-variant">
            No discussions yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {discussions.map((disc) => (
              <div
                key={disc.id}
                onClick={() => handleSelectDiscussion(disc.id)}
                className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
                style={customShadow}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {disc.user_avatar ? (
                      <img
                        src={disc.user_avatar}
                        alt={disc.user_name}
                        className="w-10 h-10 rounded-full object-cover border border-outline-variant"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                        <span
                          className="material-symbols-outlined text-on-primary-container text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          person
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-label-md font-bold text-on-surface">
                          {disc.user_name || 'Anonymous'}
                        </span>
                        {disc.user_role === 'tutor' && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                            Instructor
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            disc.discussion_type === 'question'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : disc.discussion_type === 'announcement'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {disc.discussion_type}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        {formatRelativeTime(disc.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title & Content */}
                <h5 className="text-label-md font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {disc.title}
                </h5>
                <p className="text-label-sm text-on-surface-variant mb-4 leading-relaxed line-clamp-2">
                  {disc.content}
                </p>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                  <div className="flex items-center gap-4 text-[10px] text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                      View thread
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
