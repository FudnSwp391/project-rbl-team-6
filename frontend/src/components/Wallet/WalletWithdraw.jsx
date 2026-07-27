import { useState, useEffect } from 'react';
import { 
  withdrawRequest, 
  getWalletOverview, 
  getWalletTransactions,
  getBankAccounts,
  addBankAccount,
  updateBankAccount
} from '../../services/api';

export default function WalletWithdraw({ onBack, initialAccountId }) {
  const [amount, setAmount] = useState('');
  
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || 'new');
  
  // Fields for adding/editing bank account
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [wallet, setWallet] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = async () => {
    try {
      const [overviewRes, txRes, bankRes] = await Promise.all([
        getWalletOverview(),
        getWalletTransactions(),
        getBankAccounts()
      ]);
      setWallet(overviewRes.wallet);
      
      const withdraws = (txRes.transactions || []).filter(tx => tx.type === 'WITHDRAW').slice(0, 3);
      setRecentTx(withdraws);
      
      const accounts = bankRes.bankAccounts || [];
      setBankAccounts(accounts);
      if (initialAccountId && accounts.some(a => a.id === initialAccountId)) {
        setSelectedAccountId(initialAccountId);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialAccountId && bankAccounts.some(a => a.id === initialAccountId)) {
      setSelectedAccountId(initialAccountId);
    }
  }, [initialAccountId, bankAccounts]);

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
  };

  const handleMaxWithdraw = () => {
    if (wallet?.balance) {
      setAmount(Math.floor(Number(wallet.balance)).toString());
    }
  };

  const handleSelectAccount = (id) => {
    setSelectedAccountId(id);
    setError(null);
    if (id !== 'new') {
      const acc = bankAccounts.find(a => a.id === id);
      if (acc && acc.status === 'REJECTED') {
        setBankName(acc.bank_name);
        setAccountNumber(acc.account_number);
        setAccountHolder(acc.account_holder);
      }
    }
  };

  const handleSaveBankAccount = async () => {
    setError(null);
    if (!bankName || !accountNumber || !accountHolder) {
      setError('Vui lòng nhập đầy đủ thông tin ngân hàng');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (selectedAccountId === 'new') {
        res = await addBankAccount({ bankName, accountNumber, accountHolder });
      } else {
        res = await updateBankAccount(selectedAccountId, { bankName, accountNumber, accountHolder });
      }
      setSuccess(true);
      setSuccessMessage(res.message || 'Đã gửi yêu cầu xác minh.');
      await fetchData();
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
        setAccountNumber('');
        setAccountHolder('');
      }, 3000);
    } catch (err) {
      setError(err.serverError || err.message || 'Lỗi khi lưu tài khoản ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (selectedAccountId === 'new') {
      await handleSaveBankAccount();
      return;
    }
    
    const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);
    if (selectedAccount?.status === 'REJECTED') {
      await handleSaveBankAccount();
      return;
    }

    const numAmount = Number(amount);
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

    setLoading(true);
    try {
      await withdrawRequest({ amount: numAmount, method: 'BANK_TRANSFER', bankAccountId: selectedAccountId });
      setSuccess(true);
      setSuccessMessage('Yêu cầu rút tiền đã được gửi. Đang chờ xử lý!');
      setTimeout(() => {
        if (onBack) onBack();
      }, 2500);
    } catch (err) {
      setError(err.serverError || err.message || 'Lỗi khi yêu cầu rút tiền');
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = Number(wallet?.balance || 0);
  
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const selectedAccObj = bankAccounts.find(a => a.id === selectedAccountId);
  const isSelectedPending = selectedAccObj && selectedAccObj.status === 'PENDING';
  const isSelectedRejected = selectedAccObj && selectedAccObj.status === 'REJECTED';
  const isSelectedApproved = selectedAccObj && selectedAccObj.status === 'APPROVED';

  return (
    <div className="p-container-padding max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <nav className="flex items-center text-sm text-on-surface-variant mb-2 gap-2">
          <button onClick={onBack} className="hover:text-primary transition-colors cursor-pointer">Ví</button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-on-surface font-medium">Trang rút tiền</span>
        </nav>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Yêu cầu rút tiền</h1>
        <p className="text-on-surface-variant mt-2">Dễ dàng rút thu nhập của bạn về tài khoản ngân hàng đã được xác minh.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-md">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-gutter-md">
          {/* Balance Card */}
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
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          {/* Withdrawal Form Card */}
          <div className="bg-white p-8 rounded-xl border border-outline-variant card-shadow">
            <h3 className="font-headline-lg text-lg mb-6">Thông tin rút tiền</h3>
            
            {error && <div className="mb-6 p-4 bg-error-container text-on-error-container text-sm rounded-xl">{error}</div>}
            {success && <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check_circle</span>{successMessage}</div>}
            
            <form className="space-y-6" onSubmit={handleSubmitWithdraw}>
              
              {/* Select Bank Account */}
              <div>
                <label className="block text-sm font-semibold mb-4 text-on-surface">Tài khoản ngân hàng</label>
                <div className="space-y-3">
                  {bankAccounts.map((acc) => (
                    <label key={acc.id} className="flex items-start gap-4 p-4 border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <div className="pt-1">
                        <input 
                          type="radio" 
                          name="bankAccount" 
                          value={acc.id} 
                          checked={selectedAccountId === acc.id}
                          onChange={() => handleSelectAccount(acc.id)}
                          className="w-4 h-4 text-primary focus:ring-primary accent-primary" 
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-on-surface">{acc.bank_name}</span>
                          {acc.status === 'APPROVED' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">Đã xác minh</span>}
                          {acc.status === 'PENDING' && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-semibold">Chờ duyệt</span>}
                          {acc.status === 'REJECTED' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-semibold">Bị từ chối</span>}
                        </div>
                        <div className="text-sm text-on-surface-variant flex gap-2">
                          <span>{acc.account_number}</span>
                          <span>•</span>
                          <span>{acc.account_holder}</span>
                        </div>
                        {acc.status === 'REJECTED' && acc.rejection_reason && (
                          <div className="mt-2 text-xs text-error font-medium bg-error-container p-2 rounded">
                            Lý do: {acc.rejection_reason}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                  
                  <label className="flex items-center gap-4 p-4 border border-outline-variant border-dashed rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input 
                      type="radio" 
                      name="bankAccount" 
                      value="new" 
                      checked={selectedAccountId === 'new'}
                      onChange={() => handleSelectAccount('new')}
                      className="w-4 h-4 text-primary focus:ring-primary accent-primary" 
                    />
                    <span className="font-medium text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Thêm tài khoản ngân hàng mới
                    </span>
                  </label>
                </div>
              </div>

              {/* Dynamic Fields Section (For New or Rejected Account) */}
              {(selectedAccountId === 'new' || isSelectedRejected) && (
                <div className="space-y-4 pt-4 border-t border-outline-variant bg-surface-container-lowest p-4 rounded-xl">
                  <h4 className="font-semibold text-sm text-on-surface mb-2">{isSelectedRejected ? 'Cập nhật tài khoản ngân hàng' : 'Nhập thông tin tài khoản mới'}</h4>
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
                        <option value="BIDV">BIDV</option>
                        <option value="VietinBank">VietinBank</option>
                        <option value="VPBank">VPBank</option>
                        <option value="ACB">ACB</option>
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
                      placeholder="VD: NGUYEN VAN A" 
                    />
                  </div>
                  {(selectedAccountId === 'new' || isSelectedRejected) && (
                    <div className="text-xs text-primary-600 bg-primary-50 p-3 rounded-lg flex gap-2 items-start mt-2">
                      <span className="material-symbols-outlined text-[16px] mt-0.5">info</span>
                      <p>Tài khoản sau khi thêm sẽ được Admin kiểm duyệt để đảm bảo an toàn trước khi có thể thực hiện rút tiền.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Amount Field (Only show if account is approved) */}
              {isSelectedApproved && (
                <div className="pt-4 border-t border-outline-variant">
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
                </div>
              )}
              
              {isSelectedPending && (
                <div className="pt-4">
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-600">pending_actions</span>
                    <div>
                      <p className="font-bold text-sm">Tài khoản đang chờ duyệt</p>
                      <p className="text-xs mt-1">Vui lòng chờ Admin xác minh tài khoản này trước khi tạo lệnh rút tiền.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading || success || isSelectedPending}
                  className={`w-full text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${success ? 'bg-[#10b981]' : 'bg-primary'} disabled:opacity-50`}
                >
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...</>
                  ) : success ? (
                    <><span className="material-symbols-outlined">check_circle</span> Thành công!</>
                  ) : (selectedAccountId === 'new' || isSelectedRejected) ? (
                    <><span className="material-symbols-outlined">save</span> Lưu tài khoản ngân hàng</>
                  ) : (
                    <><span className="material-symbols-outlined">account_balance_wallet</span> Yêu cầu rút tiền</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: History & Info */}
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
