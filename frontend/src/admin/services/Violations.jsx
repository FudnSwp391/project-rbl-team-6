import React from 'react';
import { PageHeader, DataTable, StatusBadge, EmptyState } from '../transactions/components';

const MOCK_VIOLATIONS = [
  {
    id: 'VIO-001',
    reporter: 'Nguyen Van A',
    reportedUser: 'Tran Thị B',
    reason: 'Ngôn từ đả kích',
    date: '2026-06-25T10:30:00',
    status: 'PENDING',
  },
  {
    id: 'VIO-002',
    reporter: 'Le Van C',
    reportedUser: 'Pham Dinh D',
    reason: 'Spam tin nhắn',
    date: '2026-06-24T14:15:00',
    status: 'RESOLVED',
  },
  {
    id: 'VIO-003',
    reporter: 'Hoang Thi E',
    reportedUser: 'Vo Van F',
    reason: 'Hành vi gian lận',
    date: '2026-06-23T09:00:00',
    status: 'INVESTIGATING',
  }
];

export default function Violations({ violations = MOCK_VIOLATIONS }) {
  const headers = ['ID', 'Người báo cáo', 'Người bị báo cáo', 'Lý do', 'Ngày', 'Trạng thái', 'Hành động'];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6">
      <PageHeader title="Báo cáo vi phạm" subtitle="Quản lý và xử lý các báo cáo vi phạm từ người dùng" />

      <DataTable
        headers={headers}
        empty={violations.length === 0 ? <EmptyState title="Không có báo cáo" description="Hiện tại không có báo cáo vi phạm nào." /> : null}
      >
        {violations.map((v) => (
          <tr key={v.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3 px-5 text-sm font-medium text-gray-900">{v.id}</td>
            <td className="py-3 px-5 text-sm text-gray-600">{v.reporter}</td>
            <td className="py-3 px-5 text-sm text-gray-600">{v.reportedUser}</td>
            <td className="py-3 px-5 text-sm text-gray-600 truncate max-w-xs" title={v.reason}>{v.reason}</td>
            <td className="py-3 px-5 text-sm text-gray-500">{formatDate(v.date)}</td>
            <td className="py-3 px-5">
              <StatusBadge status={v.status} />
            </td>
            <td className="py-3 px-5">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors">
                  Xem chi tiết
                </button>
                <button className="px-3 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-medium transition-colors">
                  Cảnh cáo
                </button>
                <button className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium transition-colors">
                  Khóa tài khoản
                </button>
                <button className="px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium transition-colors">
                  Bỏ qua
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
