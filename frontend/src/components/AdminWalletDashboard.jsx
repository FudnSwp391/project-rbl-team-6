import React, { useState, useEffect } from 'react';
import { 
  getAdminDepositRequests, 
  getAdminWithdrawRequests, 
  approveDepositRequest, 
  rejectDepositRequest, 
  approveWithdrawRequest, 
  rejectWithdrawRequest 
} from '../services/api';

export default function AdminWalletDashboard() {
  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' or 'withdraw'
  const [depositRequests, setDepositRequests] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'approve' or 'reject'
  const [selectedReq, setSelectedReq] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'deposit') {
        const data = await getAdminDepositRequests();
        setDepositRequests(data);
      } else {
        const data = await getAdminWithdrawRequests();
        setWithdrawRequests(data);
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (req, type) => {
    setSelectedReq(req);
    setModalType(type);
    setAdminNote('');
    setModalOpen(true);
  };

  const submitAction = async () => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      if (activeTab === 'deposit') {
        if (modalType === 'approve') await approveDepositRequest(selectedReq.id, adminNote);
        else await rejectDepositRequest(selectedReq.id, adminNote);
      } else {
        if (modalType === 'approve') await approveWithdrawRequest(selectedReq.id, adminNote);
        else await rejectWithdrawRequest(selectedReq.id, adminNote);
      }
      setModalOpen(false);
      fetchData(); // Refresh data
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatus = (status) => {
    if (status === 'PENDING') return <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">Chờ duyệt</span>;
    if (status === 'COMPLETED') return <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Thành công</span>;
    if (status === 'REJECTED') return <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Từ chối</span>;
    return status;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Quản lý giao dịch Ví</h2>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button 
          className={`py-3 px-6 font-semibold text-sm focus:outline-none ${activeTab === 'deposit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('deposit')}
        >
          Yêu cầu Nạp tiền
        </button>
        <button 
          className={`py-3 px-6 font-semibold text-sm focus:outline-none ${activeTab === 'withdraw' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('withdraw')}
        >
          Yêu cầu Rút tiền
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded mb-4">{error}</div>}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Ngày yêu cầu</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Người dùng</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Số tiền (VNĐ)</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Phương thức</th>
                {activeTab === 'withdraw' && <th className="px-6 py-3 text-left font-semibold text-gray-600">Chi tiết tài khoản</th>}
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Trạng thái</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(activeTab === 'deposit' ? depositRequests : withdrawRequests).map(req => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(req.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{req.full_name}</div>
                    <div className="text-gray-500 text-xs">{req.email}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {Number(req.amount).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {req.method}
                  </td>
                  {activeTab === 'withdraw' && (
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {req.account_details && Object.entries(req.account_details).map(([k, v]) => (
                        <div key={k}><span className="font-semibold capitalize">{k}:</span> {v}</div>
                      ))}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatus(req.status)}
                    {req.admin_note && <div className="text-xs text-gray-500 mt-1 italic">Note: {req.admin_note}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleActionClick(req, 'approve')} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm text-xs transition-colors">Duyệt</button>
                        <button onClick={() => handleActionClick(req, 'reject')} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded shadow-sm text-xs transition-colors">Từ chối</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(activeTab === 'deposit' ? depositRequests : withdrawRequests).length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'withdraw' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {modalType === 'approve' ? 'Xác nhận duyệt giao dịch' : 'Từ chối giao dịch'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Số tiền:</p>
                <p className="font-bold text-lg">{Number(selectedReq?.amount).toLocaleString('vi-VN')}đ</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Ghi chú của Admin (tùy chọn / bắt buộc nếu từ chối):</p>
                <textarea 
                  className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                  placeholder="Lý do từ chối hoặc mã giao dịch ngân hàng..."
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button 
                onClick={submitAction}
                disabled={actionLoading || (modalType === 'reject' && !adminNote.trim())}
                className={`px-4 py-2 font-medium text-white rounded transition-colors shadow-sm disabled:opacity-50 ${modalType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
