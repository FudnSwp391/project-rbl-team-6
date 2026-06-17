import { useEffect, useState } from 'react';

export default function PaymentResult() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        const rspCode = queryParams.get('vnp_ResponseCode');

        if (rspCode === '00') {
            setStatus('success');
            setMessage('Giao dịch nạp tiền thành công! Số dư ví của bạn đã được cập nhật.');
            
            // Giả lập VNPAY gọi IPN Webhook (vì localhost VNPAY không tự gọi được)
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const ipnUrl = `${API_BASE}/api/payment/vnpay-ipn?${queryParams.toString()}`;
            fetch(ipnUrl).catch(e => console.error('Lỗi giả lập IPN:', e));

        } else if (rspCode) {
            setStatus('error');
            setMessage('Giao dịch thất bại hoặc đã bị huỷ. Mã lỗi: ' + rspCode);
        } else {
            setStatus('error');
            setMessage('Không tìm thấy thông tin giao dịch.');
        }
    }, []);

    const navigateToDashboard = () => {
        window.location.hash = '/dashboard';
    };

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
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Nạp Tiền Thành Công</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
                        <button 
                            onClick={navigateToDashboard}
                            className="w-full h-12 bg-[#00288e] text-white font-semibold rounded-xl hover:bg-[#00288e]/90 transition-colors"
                        >
                            Quay về Bảng Điều Khiển
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
                            onClick={navigateToDashboard}
                            className="w-full h-12 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Quay về Bảng Điều Khiển
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
