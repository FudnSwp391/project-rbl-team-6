import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

export default function WalletWidget({ token }) {
    const [wallet, setWallet] = useState(null);
    const [showTopUp, setShowTopUp] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWallet();
    }, [token]);

    const fetchWallet = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/payment/wallet/full`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.wallet) setWallet(data.wallet);
        } catch (e) {
            // fallback to basic wallet
            try {
                const res2 = await fetch(`${API_BASE}/api/payment/wallet`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data2 = await res2.json();
                if (data2.wallet) setWallet(data2.wallet);
            } catch {}
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/payment/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTransactions(data.transactions || []);
        } catch {}
    };

    const handleTopUp = async () => {
        if (!amount || isNaN(amount) || amount < 10000) {
            return alert('Vui lòng nhập số tiền hợp lệ (Tối thiểu 10,000 VND)');
        }
        setLoading(true);
        try {
            const returnUrl = `${window.location.origin}/#/payment/result`;
            const res = await fetch(`${API_BASE}/api/payment/create-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: Number(amount), returnUrl, walletId: wallet?.id })
            });
            const data = await res.json();
            if (data.success && data.vnpUrl && data.params) {
                // Dùng form redirect để tránh browser re-encode URL (gây sai chữ ký VNPAY)
                const form = document.createElement('form');
                form.method = 'GET';
                form.action = data.vnpUrl;
                for (const [key, value] of Object.entries(data.params)) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                }
                document.body.appendChild(form);
                form.submit();
            } else {
                alert(data.message || 'Có lỗi xảy ra');
                setLoading(false);
            }
        } catch (e) {
            alert('Lỗi kết nối máy chủ');
            setLoading(false);
        }
    };

    const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

    const txTypeConfig = (type, status) => {
        if (type === 'DEPOSIT') return { label: 'Nạp tiền', icon: 'add_circle', color: 'text-green-600' };
        if (type === 'REFUND') return { label: 'Hoàn tiền', icon: 'undo', color: 'text-blue-600' };
        if (type === 'COMMISSION') return { label: 'Hoa hồng', icon: 'percent', color: 'text-red-500' };
        if (status === 'HELD_IN_ESCROW') return { label: 'Tạm giữ', icon: 'lock', color: 'text-amber-600' };
        if (status === 'RELEASED') return { label: 'Giải ngân', icon: 'payments', color: 'text-green-600' };
        if (type === 'PAYMENT') return { label: 'Thanh toán', icon: 'shopping_cart', color: 'text-red-500' };
        return { label: type, icon: 'swap_horiz', color: 'text-on-surface-variant' };
    };

    return (
        <div className="relative">
            {/* Wallet display */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/30 text-sm font-semibold">
                <span className="material-symbols-outlined text-[#10B981] text-[18px]">account_balance_wallet</span>
                <div className="flex flex-col leading-tight">
                    <span>{wallet ? fmtMoney(wallet.balance) : '...'}</span>
                    {wallet?.held_balance > 0 && (
                        <span className="text-[10px] text-amber-600 font-normal">
                            🔒 {fmtMoney(wallet.held_balance)} tạm giữ
                        </span>
                    )}
                </div>
                <button
                    onClick={() => { setShowHistory(true); fetchTransactions(); }}
                    className="ml-1 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-variant transition-colors"
                    title="Lịch sử giao dịch"
                >
                    <span className="material-symbols-outlined text-[13px]">history</span>
                </button>
                <button
                    onClick={() => setShowTopUp(true)}
                    className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                    title="Nạp tiền"
                >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
            </div>

            {/* Top-up Modal via Portal */}
            {showTopUp && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative">
                        <button onClick={() => setShowTopUp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#00288e]">account_balance</span>
                            Nạp Tiền VNPAY
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">Tối thiểu 10.000đ. Tiền sẽ vào ví ngay sau khi thanh toán.</p>

                        <div className="bg-green-50 rounded-xl p-3 mb-4 text-sm">
                            <p className="text-green-700 font-medium">Số dư hiện tại: <span className="font-bold">{fmtMoney(wallet?.balance)}</span></p>
                            {wallet?.held_balance > 0 && (
                                <p className="text-amber-600 text-xs mt-1">🔒 {fmtMoney(wallet.held_balance)} đang tạm giữ cho các buổi học</p>
                            )}
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-1">Số tiền (VND)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="VD: 500000"
                            className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00288e] outline-none text-lg font-medium mb-4"
                        />
                        {/* Quick amounts */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {[100000, 200000, 500000, 1000000].map(v => (
                                <button key={v} onClick={() => setAmount(v)}
                                    className="flex-1 min-w-[70px] py-1.5 rounded-lg border border-gray-300 text-sm hover:border-[#00288e] hover:text-[#00288e] transition-colors">
                                    {(v/1000)}K
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleTopUp}
                            disabled={loading}
                            className="w-full h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Đang tạo thanh toán...' : 'Thanh Toán VNPAY'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Transaction History Modal via Portal */}
            {showHistory && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl relative flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between p-5 border-b shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#10B981]">history</span>
                                Lịch sử giao dịch
                            </h2>
                            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Balance summary */}
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border-b shrink-0">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Số dư khả dụng</p>
                                <p className="font-bold text-green-600">{fmtMoney(wallet?.balance)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Đang tạm giữ</p>
                                <p className="font-bold text-amber-600">{fmtMoney(wallet?.held_balance)}</p>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 divide-y">
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">Chưa có giao dịch nào</div>
                            ) : (
                                transactions.map(tx => {
                                    const cfg = txTypeConfig(tx.type, tx.status);
                                    const isIn = Number(tx.amount) > 0;
                                    return (
                                        <div key={tx.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                                            <div className={`w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
                                                <span className={`material-symbols-outlined text-[18px] ${isIn ? 'text-green-600' : 'text-red-500'}`}>{cfg.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{cfg.label}</p>
                                                <p className="text-xs text-gray-400 truncate">{tx.description || tx.subject || '—'}</p>
                                                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-bold text-sm ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                                                    {isIn ? '+' : '-'}{fmtMoney(Math.abs(tx.amount))}
                                                </p>
                                                <p className="text-xs text-gray-400">{tx.status}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
