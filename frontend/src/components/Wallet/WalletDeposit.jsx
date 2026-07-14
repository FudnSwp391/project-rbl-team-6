import React, { useState, useEffect } from 'react';
import { depositRequest, getWalletOverview } from '../../services/api';

export default function WalletDeposit({ onBack }) {
  const [amount, setAmount] = useState('500000');
  const [method, setMethod] = useState('MoMo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    getWalletOverview().then(res => setWallet(res.wallet)).catch(console.error);
  }, []);

  const handleQuickAmount = (val) => {
    setAmount(val.toString());
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setLoading(true);
    try {
      await depositRequest({ amount: Number(amount), method });
      setSuccess(true);
      setTimeout(() => {
        if (onBack) onBack(); // Go back to wallet dashboard on success
      }, 2500);
    } catch (err) {
      setError(err.message || 'Lỗi khi nạp tiền, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = Number(wallet?.balance || 0);
  const formattedAmount = amount ? Number(amount).toLocaleString('vi-VN') : '0';

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant text-body-sm mb-2">
            <button onClick={onBack} className="hover:text-primary transition-colors cursor-pointer">Wallet</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-on-surface font-bold">Deposit Money</span>
          </nav>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Nạp tiền vào ví</h2>
          <p className="text-on-surface-variant font-body-md mt-1">Chọn phương thức và nhập số tiền bạn muốn nạp vào tài khoản EduX.</p>
        </div>
        <div className="bg-surface-container-high p-4 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[30px]" style={{fontVariationSettings: "'FILL' 1"}}>account_balance_wallet</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Số dư hiện tại</p>
            <p className="text-headline-lg font-bold text-primary">{currentBalance.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-error-container text-on-error-container text-sm rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings */}
        <div className="lg:col-span-8 space-y-8">
          {/* Amount Selection Card */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">1. Chọn số tiền</h3>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-body-sm font-bold text-on-surface-variant mb-2 ml-1">Số tiền muốn nạp (đ)</label>
                <div className="relative">
                  <input 
                    className="w-full text-headline-xl font-bold p-6 bg-surface-container-low border-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl transition-all outline-none" 
                    id="depositAmount" 
                    placeholder="Nhập số tiền muốn nạp" 
                    type="text" 
                    value={formattedAmount}
                    onChange={handleInputChange}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-headline-lg">đ</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['100000', '200000', '500000', '1000000'].map(val => (
                  <button 
                    key={val}
                    className={`py-4 border-2 rounded-xl font-bold transition-all active:scale-95 ${
                      amount === val 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-outline-variant hover:border-primary hover:text-primary'
                    }`} 
                    onClick={() => handleQuickAmount(val)}
                  >
                    {Number(val).toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Payment Method Selection */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>account_balance</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">2. Phương thức thanh toán</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MoMo */}
              <div 
                className={`payment-card group relative p-5 border-2 rounded-2xl cursor-pointer transition-all ${method === 'MoMo' ? 'border-primary bg-[#f0f7ff] shadow-[0_0_0_2px_#004ac6]' : 'border-outline-variant hover:border-primary'}`} 
                onClick={() => setMethod('MoMo')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#A50064] flex items-center justify-center shrink-0">
                    <img className="w-8 h-8 object-contain" alt="MoMo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtS5J23yCiUSRxoT6u7r5VpmNRbKvpEpXmUqqdnaD_fwWgmh7qz7bhQxaVuJlRGzMoAtVvLjC0qsCPkGdPp5vyVLNmOsp1C-b9EqzoUeF4AXuhmA4ZdEeFnvCplc9wlwhzvDTK929LELuFNmDGn6lyojkXwo13-zcfF067tAc7cttmVeSn7W500H-mfktOzASGv4mS5PAjL18LprINi-A7xKtXdgG638LpS8nILP_LUuPAZ5Rpb57vAJsN_WMUyu0iUq6a6PF3Ti76" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface">Ví MoMo</p>
                    <p className="text-body-sm text-on-surface-variant">Thanh toán nhanh chóng</p>
                  </div>
                  <span className={`material-symbols-outlined text-primary ${method === 'MoMo' ? 'visible' : 'invisible'}`}>check_circle</span>
                </div>
              </div>

              {/* VNPay */}
              <div 
                className={`payment-card group relative p-5 border-2 rounded-2xl cursor-pointer transition-all ${method === 'VNPay' ? 'border-primary bg-[#f0f7ff] shadow-[0_0_0_2px_#004ac6]' : 'border-outline-variant hover:border-primary'}`} 
                onClick={() => setMethod('VNPay')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant flex items-center justify-center shrink-0 overflow-hidden">
                    <img className="w-10 h-10 object-contain" alt="VNPay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaNUvHrDrxKmCISnP51lVn2jqK5XVyOXsD6uyP4XYBkdzlYVMPsQXZpJHmn9FT9EiXRHNHMMzmL-po3cQLmnhY4_68qINT-2hDJxHFV79dscYioGwBZ_iZmJY0wzfjwYtqc4CNnMfDv1ZyeQ_RbWQjg_ppzeD8UzEi5teIIy8RlEh93cUS3CE-e5c3ZOIJGjCO3GCRJylXBkW-yLLza3Y_2pO_0X8lYMDoWAKIeoMqBzF45bzXvDvhYySmG6-O6Y_qNoLkRIJz9X_r" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface">VNPay</p>
                    <p className="text-body-sm text-on-surface-variant">Quét mã QR Ngân hàng</p>
                  </div>
                  <span className={`material-symbols-outlined text-primary ${method === 'VNPay' ? 'visible' : 'invisible'}`}>check_circle</span>
                </div>
              </div>

              {/* ZaloPay */}
              <div 
                className={`payment-card group relative p-5 border-2 rounded-2xl cursor-pointer transition-all ${method === 'ZaloPay' ? 'border-primary bg-[#f0f7ff] shadow-[0_0_0_2px_#004ac6]' : 'border-outline-variant hover:border-primary'}`} 
                onClick={() => setMethod('ZaloPay')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#008FE5] flex items-center justify-center shrink-0">
                    <img className="w-8 h-8 object-contain" alt="ZaloPay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTUP1apw-tRkqbazQeBL8fWQ-qDx9-UTgfZ16RklsyumgZtI9ZwtapstcZhP5F0W0llnDmFuyO2m_dA-Xe_V1Qdsu3PE9yxN01fV_yWLgpoJ8eaFqoPUNSGa-fVlVIXsrbst5OUEg09i-P-viOcjtnWo9MJkS3vGtS7wjb4QGrUyAJ9ITsKpYnVwPpb-nf4coya07n5w0moJa2_D1uEk3cSph3lrE0LDSctYaF4EquhtI0kFHIUl-s1gmK-f2kWTOeh8MwVeN40yTn" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface">Ví ZaloPay</p>
                    <p className="text-body-sm text-on-surface-variant">Thanh toán Zalo</p>
                  </div>
                  <span className={`material-symbols-outlined text-primary ${method === 'ZaloPay' ? 'visible' : 'invisible'}`}>check_circle</span>
                </div>
              </div>

              {/* Visa/MasterCard */}
              <div 
                className={`payment-card group relative p-5 border-2 rounded-2xl cursor-pointer transition-all ${method === 'Visa/MasterCard' ? 'border-primary bg-[#f0f7ff] shadow-[0_0_0_2px_#004ac6]' : 'border-outline-variant hover:border-primary'}`} 
                onClick={() => setMethod('Visa/MasterCard')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">credit_card</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface">Thẻ Quốc tế</p>
                    <p className="text-body-sm text-on-surface-variant">Visa, MasterCard, JCB</p>
                  </div>
                  <span className={`material-symbols-outlined text-primary ${method === 'Visa/MasterCard' ? 'visible' : 'invisible'}`}>check_circle</span>
                </div>
              </div>

              {/* Bank Transfer */}
              <div 
                className={`payment-card md:col-span-2 group relative p-5 border-2 rounded-2xl cursor-pointer transition-all ${method === 'Bank Transfer' ? 'border-primary bg-[#f0f7ff] shadow-[0_0_0_2px_#004ac6]' : 'border-outline-variant hover:border-primary'}`} 
                onClick={() => setMethod('Bank Transfer')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">account_balance</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface">Chuyển khoản Ngân hàng</p>
                    <p className="text-body-sm text-on-surface-variant">Chuyển trực tiếp qua số tài khoản</p>
                  </div>
                  <span className={`material-symbols-outlined text-primary ${method === 'Bank Transfer' ? 'visible' : 'invisible'}`}>check_circle</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Summary */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant shadow-xl overflow-hidden relative">
              {/* Decorative background element */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
              
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-8 border-b border-outline-variant pb-4">Tóm tắt nạp tiền</h3>
              
              <div className="space-y-5 mb-8">
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-on-surface-variant">Số tiền nạp</span>
                  <span className="font-bold text-on-surface">{formattedAmount}đ</span>
                </div>
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-on-surface-variant">Phí giao dịch</span>
                  <span className="font-bold text-on-surface">Miễn phí</span>
                </div>
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-on-surface-variant">Phương thức</span>
                  <span className="font-bold text-primary">{method}</span>
                </div>
                <div className="pt-4 mt-4 border-t-2 border-dashed border-outline-variant flex justify-between items-end">
                  <span className="text-on-surface font-bold">Tổng thanh toán</span>
                  <div className="text-right">
                    <p className="text-headline-xl font-black text-primary leading-none">{formattedAmount}đ</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Yêu cầu nạp tiền đã được gửi. Đang chờ Admin duyệt!
                </div>
              )}

              <button 
                onClick={handleSubmit}
                disabled={loading || success}
                className="w-full mt-6 bg-primary text-on-primary py-5 px-6 rounded-2xl font-black text-body-md flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <span className="material-symbols-outlined animate-spin">autorenew</span> : null}
                {loading ? 'Đang xử lý...' : success ? 'Thành công' : 'Tiếp tục thanh toán'}
                {!loading && !success && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>

              <div className="mt-6 flex items-start gap-3 p-4 bg-surface-container rounded-xl">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">Giao dịch của bạn được bảo mật bởi hệ thống thanh toán quốc tế và tiêu chuẩn bảo mật PCI DSS.</p>
              </div>
            </div>

            <div className="bg-primary-container/10 p-6 rounded-2xl border border-primary/20">
              <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                Lưu ý
              </h4>
              <ul className="text-body-sm text-on-surface-variant space-y-2 list-disc pl-4">
                <li>Tiền sẽ được cộng vào ví ngay sau khi giao dịch thành công.</li>
                <li>Hỗ trợ hoàn trả trong vòng 24h nếu có sai sót kỹ thuật.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
