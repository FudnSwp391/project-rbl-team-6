import React, { useState, useEffect } from 'react';
import { getWalletOverview, getWalletTransactions } from '../../services/api';

export default function WalletDashboard({ onDepositClick, onWithdrawClick }) {
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState({ totalDeposited: 0, totalWithdrawn: 0, pendingWithdraw: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [overviewRes, txRes] = await Promise.all([
        getWalletOverview(),
        getWalletTransactions()
      ]);
      setWallet(overviewRes.wallet);
      setStats(overviewRes.stats);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error("Error fetching wallet data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SUCCESS':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Thành công</span>;
      case 'PENDING':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Đang chờ</span>;
      case 'FAILED':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Thất bại</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'DEPOSIT':
        return <span className="material-symbols-outlined text-green-500 mr-2 text-[20px]">add_circle</span>;
      case 'WITHDRAW':
        return <span className="material-symbols-outlined text-red-500 mr-2 text-[20px]">account_balance_wallet</span>;
      case 'PAYMENT':
        return <span className="material-symbols-outlined text-primary mr-2 text-[20px]">school</span>;
      case 'COMMISSION':
      case 'BONUS':
        return <span className="material-symbols-outlined text-green-500 mr-2 text-[20px]">card_giftcard</span>;
      default:
        return <span className="material-symbols-outlined text-gray-500 mr-2 text-[20px]">receipt_long</span>;
    }
  };

  const getAmountStyle = (type, amount) => {
    if (['DEPOSIT', 'COMMISSION', 'BONUS', 'REFUND'].includes(type)) {
      return <span className="text-sm font-bold text-green-600">+ {Number(amount).toLocaleString()}đ</span>;
    }
    return <span className="text-sm font-bold text-red-600">- {Number(amount).toLocaleString()}đ</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span></div>;
  }

  const balance = Number(wallet?.balance || 0);
  const bonus = Number(wallet?.bonus_balance || 0);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-1">Ví của tôi</h1>
        <p className="text-on-surface-variant">Quản lý thu nhập, lịch sử giao dịch và rút tiền một cách thuận tiện.</p>
      </div>

      {/* Payout policy banner */}
      <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <span className="material-symbols-outlined text-green-600 text-[22px] mt-0.5" style={{fontVariationSettings:"'FILL' 1"}}>bolt</span>
        <div>
          <p className="text-sm font-bold text-green-800">Giải ngân tức thì sau mỗi buổi dạy</p>
          <p className="text-xs text-green-700 mt-0.5">
            Sau khi bạn xác nhận hoàn thành buổi học (mark "Đã dạy"), học phí sẽ được chuyển vào ví của bạn <span className="font-bold">ngay lập tức</span> — không cần chờ 24h.
            Nền tảng giữ lại 10% hoa hồng, bạn nhận 90%.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Balance Highlight Card */}
        <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-primary to-primary-container p-8 rounded-[2rem] text-on-primary shadow-xl flex flex-col md:flex-row items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
          <div className="relative z-10">
            <span className="font-label-caps text-label-caps opacity-80 mb-2 block">Số dư có thể rút</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-black tracking-tight">{balance.toLocaleString()}</span>
              <span className="text-2xl font-bold">đ</span>
            </div>
            <div className="mt-6 flex space-x-2">
              <div className="flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs">
                <span className="material-symbols-outlined text-[14px] mr-1">verified_user</span>
                <span>Ví đã xác thực</span>
              </div>
              <div className="flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs">
                <span className="material-symbols-outlined text-[14px] mr-1">lock</span>
                <span>Bảo mật 2FA</span>
              </div>
            </div>
          </div>
          <div className="mt-8 md:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 relative z-10">
            <button 
              onClick={onWithdrawClick}
              className="bg-white text-primary px-8 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-surface-container-lowest transition-all hover:-translate-y-1 active:scale-95 shadow-lg"
            >
              <span className="material-symbols-outlined mr-2">account_balance</span>
              Rút tiền
            </button>
          </div>
        </div>

        {/* Rewards / Promotions Card */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-8 shadow-sm flex flex-col justify-center items-center text-center group hover:border-primary/50 transition-colors">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
            <span className="material-symbols-outlined text-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>card_giftcard</span>
          </div>
          <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">Thưởng / Khuyến mãi</span>
          <div className="text-3xl font-black text-on-surface mb-2">{bonus.toLocaleString()}<span className="text-lg ml-1 font-bold">đ</span></div>
          <p className="text-xs text-on-surface-variant max-w-[200px]">Hết hạn sau 14 ngày. Hãy sử dụng để thanh toán các khóa học.</p>
        </div>

        {/* Stat Cards Row */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <span className="material-symbols-outlined text-red-600">arrow_upward</span>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">Tổng tiền đã rút</p>
              <p className="text-xl font-bold text-on-surface">{stats.totalWithdrawn.toLocaleString()}đ</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <span className="material-symbols-outlined text-orange-600">hourglass_empty</span>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">Đang chờ duyệt rút</p>
              <p className="text-xl font-bold text-on-surface">{stats.pendingWithdraw.toLocaleString()}đ</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <span className="material-symbols-outlined text-blue-600">lock_clock</span>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface-variant">Tiền đang tạm giữ</p>
              <p className="text-xl font-bold text-on-surface">{Number(wallet?.held_balance || 0).toLocaleString()}đ</p>
            </div>
          </div>
        </div>

        {/* Cash Flow Chart Container (Visual mockup as per design) */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-outline-variant rounded-[2rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Dòng tiền</h3>
              <p className="text-sm text-on-surface-variant">Phân tích rút tiền 6 tháng qua</p>
            </div>
            <div className="flex space-x-2">
              <button className="px-4 py-2 text-xs font-bold rounded-lg border border-outline-variant hover:bg-surface-container transition-colors">Tháng</button>
              <button className="px-4 py-2 text-xs font-bold rounded-lg bg-primary/10 text-primary">6 Tháng</button>
            </div>
          </div>
          <div className="relative h-[300px] w-full flex items-end justify-between px-4">
            <div className="absolute inset-0 flex flex-col justify-between py-2 border-b border-l border-outline-variant">
              <div className="w-full border-t border-dashed border-outline-variant/30"></div>
              <div className="w-full border-t border-dashed border-outline-variant/30"></div>
              <div className="w-full border-t border-dashed border-outline-variant/30"></div>
              <div className="w-full border-t border-dashed border-outline-variant/30"></div>
            </div>
            {/* Hardcoded chart for visual as per template */}
            {[
              { m: 'Feb', d: '60%', w: '40%' },
              { m: 'Mar', d: '75%', w: '55%' },
              { m: 'Apr', d: '45%', w: '30%' },
              { m: 'May', d: '90%', w: '60%' },
              { m: 'Jun', d: '65%', w: '45%' },
              { m: 'Jul', d: '80%', w: '70%' },
            ].map((col) => (
              <div key={col.m} className="flex flex-col items-center flex-1 z-10 group">
                <div className="flex items-end space-x-1 h-48 w-full justify-center">
                  <div className="w-4 bg-secondary-container rounded-t-sm transition-all duration-500 group-hover:w-5 group-hover:bg-secondary" style={{height: col.w}}></div>
                </div>
                <span className="text-xs mt-3 text-on-surface-variant">{col.m}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center space-x-8">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-secondary-container rounded-full mr-2"></span>
              <span className="text-xs font-medium text-on-surface-variant">Rút tiền</span>
            </div>
          </div>
        </div>

        {/* Notification/Tip Area */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container rounded-[2rem] p-8 shadow-inner overflow-hidden relative">
          <h3 className="font-bold text-lg mb-4 text-on-surface">Mẹo quản lý tài chính</h3>
          <div className="space-y-4 relative z-10">
            <div className="p-4 bg-white rounded-xl shadow-sm border-l-4 border-primary">
              <p className="text-sm font-semibold mb-1">Xác thực tài khoản</p>
              <p className="text-xs text-on-surface-variant">Nâng hạn mức rút tiền lên 50.000.000đ mỗi ngày khi hoàn tất định danh.</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border-l-4 border-green-500">
              <p className="text-sm font-semibold mb-1">Rút tiền nhanh</p>
              <p className="text-xs text-on-surface-variant">Sử dụng liên kết VietQR để nhận tiền chỉ trong 5 phút làm việc.</p>
            </div>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="col-span-12 bg-white border border-outline-variant rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Lịch sử giao dịch</h3>
            <button className="text-primary text-sm font-bold flex items-center hover:underline">
              Tải báo cáo <span className="material-symbols-outlined text-sm ml-1">download</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps">
                  <th className="px-8 py-4">Ngày giao dịch</th>
                  <th className="px-8 py-4">Loại</th>
                  <th className="px-8 py-4">Mô tả</th>
                  <th className="px-8 py-4">Số tiền</th>
                  <th className="px-8 py-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-12 text-center text-on-surface-variant">
                      Chưa có giao dịch nào
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const { date, time } = formatDate(tx.created_at);
                    return (
                      <tr key={tx.id} className="hover:bg-surface-container transition-colors group">
                        <td className="px-8 py-5">
                          <div className="text-sm font-semibold">{date}</div>
                          <div className="text-xs text-on-surface-variant">{time}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                            {getTypeIcon(tx.type)}
                            <span className="text-sm font-medium">
                              {tx.type === 'DEPOSIT' ? 'Nạp tiền' : 
                               tx.type === 'WITHDRAW' ? 'Rút tiền' : 
                               tx.type === 'PAYMENT' ? 'Học phí' : 
                               tx.type === 'COMMISSION' || tx.type === 'BONUS' ? 'Thưởng' : tx.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm">{tx.description}</span>
                        </td>
                        <td className="px-8 py-5">
                          {getAmountStyle(tx.type, tx.amount)}
                        </td>
                        <td className="px-8 py-5">
                          {getStatusBadge(tx.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {transactions.length > 0 && (
            <div className="p-6 bg-surface-container-low flex justify-center">
              <button className="px-6 py-2 border border-outline-variant bg-white rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container transition-all active:scale-95">Xem tất cả giao dịch</button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
