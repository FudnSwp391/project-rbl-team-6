import React, { useState, useEffect } from 'react';
import { Star, BookOpen, Clock, User, MessageSquare, BookX } from 'lucide-react';

const getUnderstandingConfig = (level) => {
  switch (level) {
    case 'Tốt':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    case 'Khá':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'Cần cố gắng':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
      <BookX size={32} className="text-blue-400" />
    </div>
    <h3 className="text-lg font-bold text-gray-800 mb-2">Chưa có đánh giá nào</h3>
    <p className="text-gray-500 max-w-sm">
      Hệ thống sẽ hiển thị đánh giá của gia sư sau khi học sinh hoàn thành các buổi học.
    </p>
  </div>
);

const SkeletonTimeline = () => (
  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
    {[1, 2, 3].map((i) => (
      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-200 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm animate-pulse z-10"></div>
        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-16 bg-gray-50 rounded w-full"></div>
        </div>
      </div>
    ))}
  </div>
);

const TimelineItem = ({ feedback }) => {
  const understandingConfig = getUnderstandingConfig(feedback.understanding_level);

  return (
    <div className="relative flex flex-col md:flex-row items-center md:odd:flex-row-reverse group mt-8 first:mt-0">
      {/* Icon Node */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shrink-0 md:order-1 shadow-sm z-10 hidden md:flex">
        <User size={18} />
      </div>

      {/* Mobile timeline line connector */}
      <div className="absolute left-5 top-10 bottom-[-2rem] w-0.5 bg-gray-200 md:hidden z-0 last:hidden"></div>

      {/* Mobile Icon Node */}
      <div className="absolute left-0 top-0 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shrink-0 shadow-sm z-10 md:hidden">
        <User size={18} />
      </div>

      {/* Card Content */}
      <div className="w-full pl-14 md:pl-0 md:w-[calc(50%-2.5rem)] transition-all duration-300 hover:-translate-y-1">
        <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          
          {/* Header section */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                <Clock size={14} className="mr-1" />
                {formatDate(feedback.created_at)}
              </div>
              <h4 className="text-lg font-bold text-gray-800 flex items-center">
                <BookOpen size={18} className="mr-2 text-blue-500" />
                {feedback.subject_name || 'Môn học'}
              </h4>
            </div>
            
            {/* Status badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${understandingConfig.bg} ${understandingConfig.text} ${understandingConfig.border}`}>
              {feedback.understanding_level}
            </span>
          </div>

          {/* Stats section */}
          <div className="flex items-center gap-4 py-3 border-y border-gray-50 mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Độ tập trung</p>
              <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={16} 
                    fill={i < feedback.focus_rating ? "currentColor" : "none"} 
                    className={i >= feedback.focus_rating ? "text-gray-200" : ""}
                  />
                ))}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-100"></div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Bài tập</p>
              <p className="text-sm font-medium text-gray-700">{feedback.homework_status}</p>
            </div>
          </div>

          {/* Tutor Note */}
          {feedback.tutor_note && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative">
              <MessageSquare size={16} className="absolute top-3 left-3 text-gray-400" />
              <p className="pl-6 text-sm text-gray-600 italic leading-relaxed break-words line-clamp-3 hover:line-clamp-none transition-all">
                "{feedback.tutor_note}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ParentTimeline = ({ studentId }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/feedbacks/student/${studentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch feedbacks');
        }

        const json = await response.json();
        
        // Cập nhật state với dữ liệu từ API
        if (json.data) {
          setFeedbacks(json.data);
        }
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchFeedbacks();
    }
  }, [studentId]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-bold text-gray-800">Lịch sử đánh giá học tập</h2>
        <p className="text-gray-500 mt-2">Theo dõi tiến độ và nhận xét từ gia sư qua từng buổi học</p>
      </div>

      {isLoading ? (
        <SkeletonTimeline />
      ) : feedbacks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative before:hidden md:before:block md:before:absolute md:before:inset-0 md:before:mx-auto md:before:h-full md:before:w-0.5 md:before:bg-gradient-to-b md:before:from-transparent md:before:via-gray-200 md:before:to-transparent pt-4">
          {feedbacks.map((feedback) => (
            <TimelineItem key={feedback.id} feedback={feedback} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentTimeline;
