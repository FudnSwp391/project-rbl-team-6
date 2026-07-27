import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL as API } from '../../config';

export default function BankAccountsAdmin({ token }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Không thể tải danh sách tài khoản NH');
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleApprove = async (id) => {
    if (!window.confirm('Xác nhận duyệt tài khoản ngân hàng này?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bank-accounts/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Lỗi khi duyệt');
      fetchAccounts();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return alert('Vui lòng nhập lý do từ chối');
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bank-accounts/${rejectId}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!res.ok) throw new Error('Lỗi khi từ chối');
      setRejectId(null);
      setRejectReason('');
      fetchAccounts();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <h2 className="text-lg font-bold text-on-surface">Duyệt Tài Khoản Ngân Hàng</h2>
          <p className="text-sm text-on-surface-variant">Tài khoản được duyệt mới có thể rút tiền tự động</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-outline-variant">
              <tr>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Gia sư</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Ngân hàng</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Số TK</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Chủ TK</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50/50">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-on-surface text-sm">{acc.tutor_name}</p>
                    <p className="text-xs text-on-surface-variant">{acc.tutor_email}</p>
                  </td>
                  <td className="py-4 px-6 text-sm text-on-surface">{acc.bank_name}</td>
                  <td className="py-4 px-6 text-sm text-on-surface font-mono">{acc.account_number}</td>
                  <td className="py-4 px-6 text-sm text-on-surface">{acc.account_holder}</td>
                  <td className="py-4 px-6">
                    {acc.status === 'PENDING' && <span className="inline-flex px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Chờ duyệt</span>}
                    {acc.status === 'APPROVED' && <span className="inline-flex px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Đã duyệt</span>}
                    {acc.status === 'REJECTED' && (
                      <div>
                        <span className="inline-flex px-2 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">Từ chối</span>
                        <p className="text-[10px] text-rose-600 mt-1 max-w-[120px] truncate" title={acc.rejection_reason}>{acc.rejection_reason}</p>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {acc.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button disabled={actionLoading} onClick={() => handleApprove(acc.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">Duyệt</button>
                        <button disabled={actionLoading} onClick={() => setRejectId(acc.id)} className="px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 disabled:opacity-50">Từ chối</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-on-surface-variant">Không có tài khoản nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-headline-sm font-headline-sm text-on-surface mb-4">Từ chối tài khoản</h3>
            <form onSubmit={handleReject}>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Lý do từ chối (VD: Tên không khớp CMND)..."
                className="w-full p-3 bg-surface-container border border-outline rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow min-h-[100px] text-sm text-on-surface mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setRejectId(null)} className="px-4 py-2 rounded-xl text-sm font-label-md text-on-surface-variant hover:bg-surface-variant transition-colors">Hủy</button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-xl bg-error text-on-error text-sm font-label-md hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {actionLoading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  Xác nhận Từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
