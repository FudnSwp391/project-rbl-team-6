import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PaymentResult() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('');
    const [isOrder, setIsOrder] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        const rspCode = queryParams.get('vnp_ResponseCode');

        if (rspCode === '00') {
            setStatus('success');
            const pendingRaw = localStorage.getItem('edux_pending_order');

            if (pendingRaw) {
                // ── Mã QR thanh toán ĐƠN HÀNG → đăng ký khóa (VNPAY đã thu tiền) ──
                setIsOrder(true);
                setMessage('Đang kích hoạt khóa học của bạn...');
                let order = {};
                try { order = JSON.parse(pendingRaw); } catch { /* ignore */ }
                const token = localStorage.getItem('token');
                fetch(`${API_BASE}/api/cart/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ items: order.items || [], couponCode: order.couponCode || null, source: 'vnpay' }),
                })
                    .then(r => r.json())
                    .then(d => {
                        localStorage.removeItem('edux_pending_order');
                        localStorage.setItem('edux_cart', '[]');
                        window.dispatchEvent(new Event('cartUpdated'));
                        setMessage(d.success
                            ? `Thanh toán qua mã QR thành công! Bạn đã sở hữu ${d.enrolled} khóa học. Vào "Khóa học của tôi" để bắt đầu học.`
                            : (d.message || 'Đã thanh toán nhưng kích hoạt khóa gặp lỗi — vui lòng liên hệ hỗ trợ.'));
                    })
                    .catch(() => setMessage('Đã thanh toán nhưng kích hoạt khóa gặp lỗi — vui lòng liên hệ hỗ trợ.'));
            } else {
                // ── Nạp tiền vào ví ──
                setMessage('Giao dịch nạp tiền thành công! Số dư ví của bạn đã được cập nhật.');
                const ipnUrl = `${API_BASE}/api/payment/vnpay-ipn?${queryParams.toString()}`;
                fetch(ipnUrl).catch(e => console.error('Lỗi giả lập IPN:', e));
            }
        } else if (rspCode) {
            localStorage.removeItem('edux_pending_order');
            setStatus('error');
            setMessage('Giao dịch thất bại hoặc đã bị huỷ. Mã lỗi: ' + rspCode);
        } else {
            setStatus('error');
            setMessage('Không tìm thấy thông tin giao dịch.');
        }
    }, []);

    const goPrimary = () => { window.location.hash = isOrder ? '/my-courses' : '/dashboard'; };

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center border border-outline-variant/30">
                {status === 'processing' && (
                    <>
                        <span className="material-symbols-outlined text-[64px] text-primary animate-spin mb-4">progress_activity</span>
                        <h2 className="text-2xl font-bold text-on-surface mb-2">Đang xử lý</h2>
                        <p className="text-on-surface-variant">Vui lòng đợi trong giây lát...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-[48px] text-green-600">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">{isOrder ? 'Thanh Toán Thành Công' : 'Nạp Tiền Thành Công'}</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
                        <button
                            onClick={goPrimary}
                            className="w-full h-12 bg-[#00288e] text-white font-semibold rounded-xl hover:bg-[#00288e]/90 transition-colors"
                        >
                            {isOrder ? 'Vào Khóa học của tôi' : 'Quay về Bảng Điều Khiển'}
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-[48px] text-red-600">error</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Giao Dịch Thất Bại</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
                        <button
                            onClick={() => window.location.hash = '/cart'}
                            className="w-full h-12 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Quay lại giỏ hàng
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
