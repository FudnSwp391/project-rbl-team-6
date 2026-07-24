import React, { useState, useEffect } from 'react';
import { getAdminDisputeAppeals, resolveDisputeAppeal } from '../../services/api';

export default function TutorDisputeAppealsAdmin() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('APPROVED');
  const [resolveResponse, setResolveResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const data = await getAdminDisputeAppeals();
      setAppeals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleResolve = async () => {
    if (!resolveResponse.trim()) {
      alert('Vui lòng nhập phản hồi.');
      return;
    }
    setSubmitting(true);
    try {
      await resolveDisputeAppeal(resolveModal.id, {
        status: resolveStatus,
        response: resolveResponse
      });
      alert('Đã xử lý kháng cáo.');
      setResolveModal(null);
      fetchAppeals();
    } catch (e) {
      alert(e.message || 'Lỗi xử lý.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Đang tải...</div>;

  return (
    <div className="p-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Kháng Cáo Từ Gia Sư</h2>
      <p className="text-sm text-gray-500 mb-6">Xử lý các kháng cáo của gia sư về các quyết định khiếu nại trước đó.</p>

      {appeals.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500">
          Không có kháng cáo nào.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">ID Khiếu Nại</th>
                <th className="py-4 px-6">Gia Sư</th>
                <th className="py-4 px-6">Trạng Thái</th>
                <th className="py-4 px-6">Ngày Gửi</th>
                <th className="py-4 px-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appeals.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">#{a.id.substring(0,8)}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{a.tutor_name}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${a.tutor_appeal_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : a.tutor_appeal_status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {a.tutor_appeal_status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">{new Date(a.tutor_appealed_at).toLocaleDateString('vi-VN')}</td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => { setResolveModal(a); setResolveStatus('APPROVED'); setResolveResponse(''); }}
                      className="text-primary hover:text-primary/80 font-bold text-sm"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-xl">Chi tiết kháng cáo #{resolveModal.id.substring(0,8)}</h3>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-bold text-sm mb-2 text-gray-700">Thông tin khiếu nại gốc</h4>
                <p className="text-sm"><strong>Lý do:</strong> {resolveModal.reason}</p>
                <p className="text-sm"><strong>Quyết định admin:</strong> {resolveModal.admin_note}</p>
                <p className="text-sm text-red-600 font-bold mt-1">Gia sư đã bị trừ {resolveModal.reputation_points_deducted || 0} uy tín.</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl">
                <h4 className="font-bold text-sm mb-2 text-yellow-800">Lý do kháng cáo từ Gia sư</h4>
                <p className="text-sm whitespace-pre-wrap">{resolveModal.tutor_appeal_reason}</p>
              </div>

              {resolveModal.tutor_appeal_status === 'PENDING' ? (
                <div className="space-y-4 mt-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Quyết định *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="appeal_decision" checked={resolveStatus === 'APPROVED'} onChange={() => setResolveStatus('APPROVED')} />
                        <span className="text-sm font-bold text-green-700">Chấp nhận (Hoàn lại {resolveModal.reputation_points_deducted || 0} uy tín)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="appeal_decision" checked={resolveStatus === 'REJECTED'} onChange={() => setResolveStatus('REJECTED')} />
                        <span className="text-sm font-bold text-red-700">Từ chối (Giữ nguyên hình phạt)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phản hồi cho gia sư *</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      value={resolveResponse}
                      onChange={e => setResolveResponse(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-xl mt-4">
                  <h4 className="font-bold text-sm mb-2 text-blue-800">Admin đã xử lý ({resolveModal.tutor_appeal_status})</h4>
                  <p className="text-sm"><strong>Phản hồi:</strong> {resolveModal.tutor_appeal_response}</p>
                  <p className="text-sm"><strong>Ngày xử lý:</strong> {new Date(resolveModal.tutor_appeal_reviewed_at).toLocaleString('vi-VN')}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setResolveModal(null)} className="px-6 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200">Đóng</button>
              {resolveModal.tutor_appeal_status === 'PENDING' && (
                <button 
                  onClick={handleResolve}
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/90"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Quyết Định'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
