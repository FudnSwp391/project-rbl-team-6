import React, { useState, useEffect } from 'react';
import { withdrawRequest, getWalletOverview, getWalletTransactions } from '../../services/api';

export default function WalletWithdraw({ onBack }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank');
  
  // Form fields
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  
  const [momoPhone, setMomoPhone] = useState('');
  const [momoName, setMomoName] = useState('');
  
  const [zaloPhone, setZaloPhone] = useState('');
  const [zaloName, setZaloName] = useState('');

  const [wallet, setWallet] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, txRes] = await Promise.all([
          getWalletOverview(),
          getWalletTransactions()
        ]);
        setWallet(overviewRes.wallet);
        
        // Filter recent withdraw transactions
        const withdraws = (txRes.transactions || []).filter(tx => tx.type === 'WITHDRAW').slice(0, 3);
        setRecentTx(withdraws);
      } catch (err) {
        console.error("Error fetching data", err);
      }
    };
    fetchData();
  }, []);

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
  };

  const handleMaxWithdraw = () => {
    if (wallet?.balance) {
      setAmount(Math.floor(Number(wallet.balance)).toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    const numAmount = Number(amount);
    
    // Validation
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (numAmount < 100000) {
      setError('Số tiền rút tối thiểu là 100.000đ');
      return;
    }
    if (wallet && numAmount > Number(wallet.balance)) {
      setError('Số dư không đủ để thực hiện giao dịch này');
      return;
    }

    let accountDetails = {};
    if (method === 'bank') {
      if (!accountNumber || !accountHolder) {
        setError('Vui lòng nhập đầy đủ thông tin ngân hàng');
        return;
      }
      accountDetails = { bankName, accountNumber, accountHolder };
    } else if (method === 'momo') {
      if (!momoPhone || !momoName) {
        setError('Vui lòng nhập đầy đủ thông tin ví MoMo');
        return;
      }
      accountDetails = { phone: momoPhone, name: momoName };
    } else if (method === 'zalopay') {
      if (!zaloPhone || !zaloName) {
        setError('Vui lòng nhập đầy đủ thông tin ví ZaloPay');
        return;
      }
      accountDetails = { phone: zaloPhone, name: zaloName };
    }

    setLoading(true);
    try {
      await withdrawRequest({ amount: numAmount, method: method === 'bank' ? 'Bank Transfer' : method === 'momo' ? 'MoMo' : 'ZaloPay', accountDetails });
      setSuccess(true);
      // Redirect back after 2 seconds or show success state
      setTimeout(() => {
        if (onBack) onBack();
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi yêu cầu rút tiền');
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = Number(wallet?.balance || 0);
  
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="p-container-padding max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <nav className="flex items-center text-sm text-on-surface-variant mb-2 gap-2">
          <button onClick={onBack} className="hover:text-primary transition-colors cursor-pointer">Wallet</button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-on-surface font-medium">Trang rút tiền</span>
        </nav>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Yêu cầu rút tiền</h1>
        <p className="text-on-surface-variant mt-2">Dễ dàng rút thu nhập của bạn về tài khoản ngân hàng hoặc ví điện tử.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-md">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-gutter-md">
          {/* Balance Card (Bento Style) */}
          <div className="bg-primary-container p-8 rounded-xl text-white relative overflow-hidden flex flex-col justify-between h-48 card-shadow">
            <div className="relative z-10">
              <p className="font-label-caps text-label-caps opacity-90 uppercase tracking-wider">Số dư khả dụng</p>
              <h2 className="font-headline-xl text-headline-xl mt-2 flex items-baseline gap-2">
                {currentBalance.toLocaleString('vi-VN')} <span className="text-xl font-normal opacity-80 underline underline-offset-4 decoration-2">đ</span>
              </h2>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              Tiền có thể rút ngay
            </div>
            {/* Abstract Background Decoration */}
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          {/* Withdrawal Form Card */}
          <div className="bg-white p-8 rounded-xl border border-outline-variant card-shadow">
            <h3 className="font-headline-lg text-lg mb-6">Thông tin rút tiền</h3>
            
            {error && <div className="mb-6 p-4 bg-error-container text-on-error-container text-sm rounded-xl">{error}</div>}
            {success && <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check_circle</span>Yêu cầu rút tiền đã được gửi. Đang chờ Admin duyệt!</div>}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Amount Field */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-on-surface">Số tiền cần rút</label>
                <div className="relative">
                  <input 
                    className="w-full bg-background border border-outline-variant rounded-lg p-4 text-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all pr-12" 
                    placeholder="Nhập số tiền..." 
                    type="text" 
                    value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                    onChange={handleAmountChange}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold underline">đ</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-on-surface-variant italic">Số tiền rút tối thiểu là 100.000đ</span>
                  <button type="button" onClick={handleMaxWithdraw} className="text-xs text-primary font-bold hover:underline">Rút toàn bộ số dư</button>
                </div>
              </div>

              {/* Payout Method */}
              <div>
                <label className="block text-sm font-semibold mb-4 text-on-surface">Phương thức thanh toán</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="cursor-pointer group">
                    <input 
                      checked={method === 'bank'} 
                      onChange={() => setMethod('bank')} 
                      className="hidden peer" 
                      name="method" 
                      type="radio" 
                      value="bank"
                    />
                    <div className="flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl peer-checked:border-primary peer-checked:bg-primary/5 group-hover:border-primary/50 transition-all">
                      <span className="material-symbols-outlined text-3xl mb-2 text-on-surface-variant peer-checked:text-primary">account_balance</span>
                      <span className="text-sm font-medium">Ngân hàng</span>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer group">
                    <input 
                      checked={method === 'momo'} 
                      onChange={() => setMethod('momo')} 
                      className="hidden peer" 
                      name="method" 
                      type="radio" 
                      value="momo"
                    />
                    <div className="flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl peer-checked:border-primary peer-checked:bg-primary/5 group-hover:border-primary/50 transition-all">
                      <div className="w-8 h-8 rounded mb-2 bg-[#A50064] flex items-center justify-center text-white text-[10px] font-black">MoMo</div>
                      <span className="text-sm font-medium">MoMo</span>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer group">
                    <input 
                      checked={method === 'zalopay'} 
                      onChange={() => setMethod('zalopay')} 
                      className="hidden peer" 
                      name="method" 
                      type="radio" 
                      value="zalopay"
                    />
                    <div className="flex flex-col items-center justify-center p-4 border border-outline-variant rounded-xl peer-checked:border-primary peer-checked:bg-primary/5 group-hover:border-primary/50 transition-all">
                      <div className="w-8 h-8 rounded mb-2 bg-[#0068FF] flex items-center justify-center text-white text-[10px] font-black">Zalo</div>
                      <span className="text-sm font-medium">ZaloPay</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dynamic Fields Section */}
              <div className="space-y-4 pt-4 border-t border-outline-variant">
                {method === 'bank' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tên ngân hàng</label>
                        <select 
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                          <option value="Vietcombank">Vietcombank</option>
                          <option value="Techcombank">Techcombank</option>
                          <option value="MB Bank">MB Bank</option>
                          <option value="TPBank">TPBank</option>
                          <option value="Agribank">Agribank</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Số tài khoản</label>
                        <input 
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none" 
                          placeholder="Nhập số tài khoản..." 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tên chủ tài khoản</label>
                      <input 
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                        className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none uppercase font-semibold" 
                        placeholder="VIET TUONG PHAM" 
                      />
                    </div>
                  </>
                )}

                {method === 'momo' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Số điện thoại MoMo</label>
                      <input 
                        type="text"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none" 
                        placeholder="Nhập số điện thoại..." 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tên chủ ví</label>
                      <input 
                        type="text"
                        value={momoName}
                        onChange={(e) => setMomoName(e.target.value.toUpperCase())}
                        className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none uppercase font-semibold" 
                        placeholder="VD: NGUYEN VAN A" 
                      />
                    </div>
                  </>
                )}

                {method === 'zalopay' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Số điện thoại ZaloPay</label>
                      <input 
                        type="text"
                        value={zaloPhone}
                        onChange={(e) => setZaloPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none" 
                        placeholder="Nhập số điện thoại..." 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tên chủ ví</label>
                      <input 
                        type="text"
                        value={zaloName}
                        onChange={(e) => setZaloName(e.target.value.toUpperCase())}
                        className="w-full bg-background border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none uppercase font-semibold" 
                        placeholder="VD: NGUYEN VAN A" 
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Summary Area */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant space-y-2 mt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Số tiền rút:</span>
                  <span className="font-medium">{amount ? Number(amount).toLocaleString('vi-VN') : 0}đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Phí giao dịch:</span>
                  <span className="font-medium text-green-600">Miễn phí</span>
                </div>
                <div className="border-t border-outline-variant pt-2 flex justify-between font-bold">
                  <span>Số tiền thực nhận:</span>
                  <span className="text-primary text-lg">{amount ? Number(amount).toLocaleString('vi-VN') : 0}đ</span>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading || success}
                  className={`w-full text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${success ? 'bg-[#10b981]' : 'bg-primary'} disabled:opacity-50`}
                >
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...</>
                  ) : success ? (
                    <><span className="material-symbols-outlined">check_circle</span> Thành công!</>
                  ) : (
                    <>
                      Yêu cầu rút tiền
                      <span className="material-symbols-outlined">send</span>
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-on-surface-variant mt-4">
                  Bằng việc nhấn yêu cầu, bạn đồng ý với <a href="#" className="text-primary underline">Điều khoản rút tiền</a> của EduX.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-gutter-md">
          {/* Processing Info Card */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h4 className="font-bold text-on-surface">Lưu ý quan trọng</h4>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">schedule</span>
                <div>
                  <p className="text-sm font-semibold">Thời gian xử lý dự kiến</p>
                  <p className="text-xs text-on-surface-variant">1 - 2 ngày làm việc (không tính T7, CN &amp; Lễ)</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">monetization_on</span>
                <div>
                  <p className="text-sm font-semibold">Phí giao dịch</p>
                  <p className="text-xs text-on-surface-variant">Miễn phí cho tài khoản Ngân hàng nội địa</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Security Banner */}
          <div className="bg-white p-6 rounded-xl border border-outline-variant card-shadow overflow-hidden relative">
            <div className="flex flex-col items-center text-center relative z-10">
              <span className="material-symbols-outlined text-5xl text-[#10b981] mb-2" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
              <h4 className="font-bold mb-2">Bảo mật tuyệt đối</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">Giao dịch của bạn được mã hóa và bảo vệ theo tiêu chuẩn SSL quốc tế.</p>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5">
              <span className="material-symbols-outlined text-9xl">security</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-outline-variant card-shadow overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-sm">Giao dịch gần đây</h4>
              <button onClick={onBack} className="text-primary text-xs font-bold hover:underline">Xem tất cả</button>
            </div>
            <div className="divide-y divide-outline-variant/30">
              {recentTx.length === 0 ? (
                <div className="p-4 text-center text-xs text-on-surface-variant">Chưa có giao dịch rút tiền nào</div>
              ) : (
                recentTx.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">south_east</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold line-clamp-1 max-w-[120px]" title={tx.description}>{tx.description || 'Rút tiền'}</p>
                        <p className="text-[10px] text-on-surface-variant">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-on-surface">-{Number(tx.amount).toLocaleString('vi-VN')}đ</p>
                      <p className={`text-[10px] font-medium ${tx.status === 'SUCCESS' ? 'text-[#10b981]' : tx.status === 'PENDING' ? 'text-orange-500' : 'text-red-500'}`}>
                        {tx.status === 'SUCCESS' ? 'Hoàn tất' : tx.status === 'PENDING' ? 'Đang xử lý' : 'Thất bại'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Help */}
      <footer className="mt-12 py-8 border-t border-outline-variant text-center">
        <p className="text-on-surface-variant text-sm mb-4">Bạn gặp khó khăn trong quá trình rút tiền?</p>
        <div className="flex justify-center gap-4">
          <button className="flex items-center gap-2 px-6 py-2 rounded-full border border-outline-variant text-sm font-bold hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-sm">help</span>
            Trung tâm trợ giúp
          </button>
          <button className="flex items-center gap-2 px-6 py-2 rounded-full border border-outline-variant text-sm font-bold hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-sm">chat_bubble</span>
            Chat với tư vấn viên
          </button>
        </div>
      </footer>
    </div>
  );
}
