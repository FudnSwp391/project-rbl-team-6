import React, { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, AvatarCell } from '../transactions/components';

const MOCK_REVIEWS = [
  {
    id: 'REV-001',
    reviewer: { name: 'Nguyễn Văn A', avatar: '' },
    reviewee: { name: 'Trần Thị B', avatar: '' },
    rating: 1,
    reason: 'Sử dụng ngôn từ xúc phạm',
    status: 'PENDING'
  },
  {
    id: 'REV-002',
    reviewer: { name: 'Lê Văn C', avatar: '' },
    reviewee: { name: 'Phạm Thị D', avatar: '' },
    rating: 2,
    reason: 'Quảng cáo rác, spam',
    status: 'Đã ẩn'
  },
  {
    id: 'REV-003',
    reviewer: { name: 'Hoàng Quốc E', avatar: '' },
    reviewee: { name: 'Vũ Thị F', avatar: '' },
    rating: 5,
    reason: 'Đánh giá không đúng sự thật',
    status: 'Đã xóa'
  }
];

export default function Reviews({ reviews = MOCK_REVIEWS }) {
  const [data, setData] = useState(reviews);

  const handleAction = (id, actionType) => {
    let newStatus = 'PENDING';
    if (actionType === 'keep') newStatus = 'Giữ nguyên';
    if (actionType === 'hide') newStatus = 'Đã ẩn';
    if (actionType === 'delete') newStatus = 'Đã xóa';
    
    setData(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center text-amber-400 text-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="material-symbols-outlined text-[16px]">
            {i < rating ? 'star' : 'star_border'}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader 
        title="Kiểm duyệt Đánh giá" 
        subtitle="Quản lý và kiểm duyệt các đánh giá bị báo cáo" 
      />

      <DataTable
        headers={['Review ID', 'Reviewer', 'Reviewee', 'Rating', 'Report Reason', 'Status', 'Actions']}
        loading={false}
      >
        {data.map(review => (
          <tr key={review.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
            <td className="py-3.5 px-5">
              <span className="text-xs font-mono font-bold text-blue-600">{review.id}</span>
            </td>
            <td className="py-3.5 px-5">
              <AvatarCell name={review.reviewer.name} avatar={review.reviewer.avatar} sub="Học viên" />
            </td>
            <td className="py-3.5 px-5">
              <AvatarCell name={review.reviewee.name} avatar={review.reviewee.avatar} sub="Gia sư" />
            </td>
            <td className="py-3.5 px-5">
              {renderStars(review.rating)}
            </td>
            <td className="py-3.5 px-5">
              <p className="text-sm text-gray-700 max-w-[200px] truncate" title={review.reason}>
                {review.reason}
              </p>
            </td>
            <td className="py-3.5 px-5">
              <StatusBadge status={review.status} />
            </td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(review.id, 'keep')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-semibold transition-colors"
                >
                  Giữ nguyên
                </button>
                <button
                  onClick={() => handleAction(review.id, 'hide')}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-xs font-semibold transition-colors"
                >
                  Ẩn đánh giá
                </button>
                <button
                  onClick={() => handleAction(review.id, 'delete')}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-semibold transition-colors"
                >
                  Xóa đánh giá
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
