import { useState, useEffect } from 'react';

export default function WalletWidget({ token }) {
    const [wallet, setWallet] = useState(null);
    const [showTopUp, setShowTopUp] = useState(false);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWallet();
    }, [token]);

    const fetchWallet = async () => {
        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE}/api/payment/wallet`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.wallet) setWallet(data.wallet);
        } catch (e) {
            console.error('Lỗi lấy ví', e);
        }
    };

    const handleTopUp = async () => {
        if (!amount || isNaN(amount) || amount < 10000) {
            return alert('Vui lòng nhập số tiền hợp lệ (Tối thiểu 10,000 VND)');
        }
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            // Return URL should point to a specific screen in our frontend to handle the VNPAY result
            const returnUrl = `${window.location.origin}/#/payment/result`;
            const res = await fetch(`${API_BASE}/api/payment/create-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: Number(amount), returnUrl, walletId: wallet.id })
            });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url; // Redirect to VNPAY
            } else {
                alert(data.message || 'Có lỗi xảy ra');
                setLoading(false);
            }
        } catch (e) {
            console.error('Lỗi tạo payment url', e);
            alert('Lỗi kết nối máy chủ');
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/30 text-sm font-semibold">
                <span className="material-symbols-outlined text-[#10B981] text-[18px]">account_balance_wallet</span>
                <span>{wallet ? Number(wallet.balance).toLocaleString('vi-VN') + ' đ' : '...'}</span>
                <button 
                    onClick={() => setShowTopUp(true)}
                    className="ml-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                    title="Nạp tiền"
                >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
            </div>

            {showTopUp && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative">
                        <button onClick={() => setShowTopUp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#00288e]">account_balance</span>
                            Nạp Tiền VNPAY
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">Nhập số tiền bạn muốn nạp vào ví EduX. Tối thiểu 10.000đ.</p>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Số tiền (VND)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="VD: 500000"
                                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00288e] focus:border-transparent outline-none text-lg font-medium"
                            />
                        </div>

                        <button 
                            onClick={handleTopUp}
                            disabled={loading}
                            className="w-full h-12 bg-[#00288e] text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#00288e]/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">payments</span>
                                    Thanh Toán Bằng VNPAY
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
