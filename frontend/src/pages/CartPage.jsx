import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CartPage({ onGoSignIn, user }) {
  const { logout } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, message }
  const [promoErr, setPromoErr] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (user && (user.role === 'admin' || user.role === 'tutor')) {
      window.location.hash = '/dashboard';
      return;
    }
    const loadCart = () => {
      try {
        const stored = localStorage.getItem('edux_cart');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          } else {
            setCartItems([]);
          }
        }
      } catch (e) {
        setCartItems([]);
      }
    };
    loadCart();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, [user]);

  // Giỏ hàng thay đổi → bỏ mã đã áp (cần áp lại theo tổng mới)
  useEffect(() => { setAppliedCoupon(null); setPromoErr(''); }, [cartItems]);

  const removeItem = (id) => {
    const newCart = cartItems.filter(item => item.id !== id);
    setCartItems(newCart);
    localStorage.setItem('edux_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateQuantity = (id, delta) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        const newQ = (item.quantity || 1) + delta;
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
      }
      return item;
    });
    setCartItems(newCart);
    localStorage.setItem('edux_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const totalPrice = cartItems.reduce((acc, item) => acc + ((Number(item.price) || 0) * (item.quantity || 1)), 0);
  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0));
  const discount = appliedCoupon?.discount || 0;
  const finalTotal = Math.max(0, totalPrice - discount);

  const applyPromo = async () => {
    const code = promoCode.trim();
    if (!code) { setPromoErr('Vui lòng nhập mã giảm giá.'); return; }
    setPromoLoading(true); setPromoErr('');
    try {
      const res = await fetch(`${API_BASE}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: totalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({ code: data.code, discount: data.discount, message: data.message });
      } else {
        setAppliedCoupon(null);
        setPromoErr(data.message || 'Mã không hợp lệ.');
      }
    } catch {
      setPromoErr('Không kiểm tra được mã, vui lòng thử lại.');
    } finally {
      setPromoLoading(false);
    }
  };
  const removeCoupon = () => { setAppliedCoupon(null); setPromoCode(''); setPromoErr(''); };

  const handleCheckout = async () => {
    if (!user) {
      if (onGoSignIn) onGoSignIn();
      else window.location.hash = '/signin';
      return;
    }
    if (cartItems.length === 0) return;
    
    setLoadingPayment(true);
    try {
      const token = localStorage.getItem('token');
      // Thanh toán bằng VÍ: trừ số dư + đăng ký các khóa trong giỏ
      const res = await fetch(`${API_BASE}/api/cart/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: cartItems.map(i => i.id), couponCode: appliedCoupon?.code || null }),
      });

      if (res.status === 401 || res.status === 403) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục thanh toán.');
        logout();
        window.location.hash = '/signin';
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('edux_cart', '[]');
        window.dispatchEvent(new Event('cartUpdated'));
        window.dispatchEvent(new Event('walletUpdated'));
        alert(`Thanh toán thành công! Đã trừ ${fmt(data.total)} đ từ ví. Bạn đã sở hữu ${data.enrolled} khóa học.`);
        window.location.hash = '/my-courses';
        return;
      }

      if (data.code === 'INSUFFICIENT_FUNDS') {
        const go = window.confirm(`Số dư ví không đủ (cần ${fmt(data.needed)} đ, ví đang có ${fmt(data.balance)} đ).\nNạp thêm tiền qua VNPAY?`);
        if (go) return topUp(data.needed - data.balance);
        setLoadingPayment(false);
        return;
      }

      alert(data.message || 'Thanh toán thất bại.');
      setLoadingPayment(false);
    } catch (e) {
      alert('Không thể kết nối máy chủ thanh toán.');
      setLoadingPayment(false);
    }
  };

  // Nạp tiền vào ví qua VNPAY (khi số dư không đủ)
  const topUp = async (amount) => {
    try {
      const token = localStorage.getItem('token');
      const returnUrl = `${window.location.origin}/#/payment/result`;
      const res = await fetch(`${API_BASE}/api/payment/create-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: Math.max(10000, Math.ceil(Number(amount) || 0)), returnUrl }),
      });
      const data = await res.json();
      if (data.success && data.url) window.location.href = data.url;
      else { alert(data.message || 'Lỗi tạo giao dịch nạp tiền.'); setLoadingPayment(false); }
    } catch {
      alert('Không thể kết nối cổng nạp tiền.');
      setLoadingPayment(false);
    }
  };

  const formattedTotal = new Intl.NumberFormat('vi-VN').format(totalPrice) + ' đ';

  // Mock suggested courses based on the user's screenshot
  const suggestedCourses = [
    {
      id: 1,
      title: 'WEB DESIGN FOR EVERYONE!!!',
      instructor: 'Khánh Nhật',
      price: '500,000 đ',
      thumbnail: 'https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'SOFTWARE TESTING',
      instructor: 'FPT Edu',
      price: '800,000 đ',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'SOFTWARE REQUIREMENT',
      instructor: 'FPT Edu',
      price: '750,000 đ',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 4,
      title: 'SWE202c INTRODUCING SOFTWARE ENGINEERING',
      instructor: 'FPT Edu',
      price: '600,000 đ',
      thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
    }
  ]

  return (
    <div className="academia-page min-h-screen font-sans text-[#191c1e] flex flex-col">
      <style>{`
        .card-shadow {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #00288e;
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[72px]">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            EduX
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors" href="#/courses">Khóa Học</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors" href="#/subjects">Môn Học</a>
          </nav>

          <div className="flex items-center gap-6">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <a href="#/cart" className="text-[#00288e] flex items-center" title="Giỏ hàng">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_cart</span>
              </a>
            )}
            {user ? (
              <a href="#/dashboard" className="flex items-center gap-2 cursor-pointer text-[#444653] hover:text-[#00288e] transition-colors">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="material-symbols-outlined">account_circle</span>
                )}
                <span className="font-semibold text-sm">{user.name || user.email}</span>
              </a>
            ) : (
              <button onClick={onGoSignIn} className="bg-[#00288e] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-colors">
                Đăng Nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-[#191c1e] mb-6 border-b border-[#e1e2e4] pb-4">Giỏ hàng</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Left Column - Cart Items */}
          {cartItems.length === 0 ? (
            <div className="bg-white rounded-xl card-shadow border border-[#e1e2e4] flex flex-col items-center justify-center p-16 min-h-[400px]">
              <div className="relative mb-6">
                <span className="material-symbols-outlined text-[100px] text-[#c4c5d5]">inventory_2</span>
                <span className="material-symbols-outlined absolute -top-2 -right-4 text-[40px] text-[#e1e2e4]">chat_bubble</span>
                <span className="absolute -top-1 -right-2 text-white text-[24px] material-symbols-outlined" style={{ fontSize: '24px' }}>more_horiz</span>
              </div>
              <p className="text-[#757684] text-sm mb-4">No data</p>
              <p className="text-lg font-semibold text-[#191c1e]">Giỏ hàng của bạn đang trống</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl card-shadow border border-[#e1e2e4] p-6 flex flex-col gap-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 border-b border-[#e1e2e4] pb-6 last:border-0 last:pb-0 relative pr-8">
                  <div className="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#00288e] to-[#3a6fe0] flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-white text-4xl opacity-50 absolute">school</span>
                  </div>
                  <div className="flex flex-col justify-between flex-grow">
                    <div>
                      <h3 className="text-lg font-bold text-[#191c1e] line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-[#757684] mt-1">Gia sư: {item.tutor_name || item.tutorName || 'EduX'}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="font-bold text-[#00288e] text-lg">
                        {new Intl.NumberFormat('vi-VN').format(Number(item.price))} đ
                      </div>
                      <div className="flex items-center gap-3 bg-[#f8f9fb] rounded-lg border border-[#e1e2e4] p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center rounded bg-white border border-[#c4c5d5] hover:bg-[#e1e2e4] transition-colors">
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">{item.quantity || 1}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center rounded bg-white border border-[#c4c5d5] hover:bg-[#e1e2e4] transition-colors">
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="absolute top-0 right-0 text-[#757684] hover:text-[#ba1a1a] transition-colors p-1" title="Xóa">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl card-shadow border border-[#e1e2e4] p-6">
              {/* Tạm tính / Giảm giá / Tổng */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-[#444653]">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-[#191c1e]">{fmt(totalPrice)} đ</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#16a34a] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">sell</span>Giảm giá ({appliedCoupon.code})
                    </span>
                    <span className="text-[#16a34a] font-semibold">− {fmt(discount)} đ</span>
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-[#191c1e] mt-3 pt-3 mb-6 border-t border-[#e1e2e4] flex items-center justify-between">
                <span>Tổng:</span>
                <span className="text-[#00288e]">{fmt(finalTotal)} đ</span>
              </div>

              {/* Mã khuyến mãi */}
              <div className="border-t border-[#e1e2e4] pt-6 mb-6">
                <label className="block text-sm font-semibold text-[#191c1e] mb-2">Mã khuyến mãi</label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[#16a34a] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <span className="font-bold text-[#15803d]">{appliedCoupon.code}</span>
                      <span className="text-[#16a34a]">− {fmt(discount)}đ</span>
                    </div>
                    <button onClick={removeCoupon} className="text-[#757684] hover:text-[#ba1a1a]" title="Bỏ mã">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text" value={promoCode}
                        onChange={e => { setPromoCode(e.target.value); setPromoErr(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') applyPromo(); }}
                        placeholder="Nhập mã (vd: EDUX10)"
                        className="flex-1 border border-[#c4c5d5] rounded-lg px-4 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]"
                      />
                      <button onClick={applyPromo} disabled={promoLoading}
                        className="bg-white border border-[#00288e] text-[#00288e] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#f8f9fb] transition-colors whitespace-nowrap disabled:opacity-50">
                        {promoLoading ? '...' : 'Áp dụng'}
                      </button>
                    </div>
                    {promoErr && <p className="text-xs text-[#ba1a1a] mt-1.5">{promoErr}</p>}
                    <p className="text-xs text-[#757684] mt-1.5">Mã thử: <b>EDUX10</b> · <b>GIAM50K</b> · <b>WELCOME20</b> · <b>SALE100K</b></p>
                  </>
                )}
              </div>

              <div className="border-t border-[#e1e2e4] pt-6 mb-6">
                <div className="text-sm font-semibold text-[#191c1e] mb-2">Dùng điểm tích lũy: <span className="text-[#00288e]">0</span></div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#191c1e]">Tổng điểm: <span className="text-[#00288e]">0 đ</span></span>
                    <span className="text-xs text-[#757684]">(1 điểm = 1000 đ)</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={loadingPayment || cartItems.length === 0}
                className="w-full bg-[#00288e] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#1e40af] transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingPayment ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                )}
                {loadingPayment ? 'Đang xử lý...' : `Thanh toán ${fmt(finalTotal)} đ (trừ ví)`}
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Courses */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-[#191c1e] mb-8 border-b border-[#e1e2e4] pb-4">Khóa học gợi ý</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestedCourses.map(course => (
              <div key={course.id} className="bg-white rounded-xl card-shadow border border-[#e1e2e4] overflow-hidden group cursor-pointer hover:border-[#00288e]/30 transition-all hover:-translate-y-1">
                <div className="relative aspect-video overflow-hidden">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-[#00288e] text-xs font-bold px-2 py-1 rounded">
                    HOT
                  </div>
                </div>
                <div className="p-4 flex flex-col h-[140px]">
                  <h3 className="font-bold text-[#191c1e] text-sm line-clamp-2 mb-2 group-hover:text-[#00288e] transition-colors">{course.title}</h3>
                  <div className="text-xs text-[#757684] mt-auto">Giảng viên: <span className="font-medium text-[#444653]">{course.instructor}</span></div>
                  <div className="text-lg font-bold text-[#00288e] mt-2">{course.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f2557] text-[#e1e2e4] w-full mt-auto pt-16 pb-8">
        <div className="max-w-[1280px] mx-auto px-6">
          {/* Top Links Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            {/* Column 1: Về EduX */}
            <div>
              <h3 className="font-bold text-white mb-4">Về EduX</h3>
              <div className="border-t border-white/20 pt-4 space-y-3 flex flex-col">
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Giới thiệu</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Điều khoản</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Bảo mật</a>
              </div>
            </div>

            {/* Column 2: Blogs */}
            <div>
              <h3 className="font-bold text-white mb-4">Blogs</h3>
              <div className="border-t border-white/20 pt-4 space-y-3 flex flex-col">
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Sự kiện</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Vinh danh</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Thông báo</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Chia sẻ</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Tuyển sinh</a>
                <a href="#" className="text-sm text-[#c4c5d5] hover:text-white transition-colors">Hỏi đáp</a>
              </div>
            </div>

            {/* Column 3: Company Info */}
            <div>
              <h3 className="font-bold text-white mb-4 uppercase">Công ty TNHH Giải pháp công nghệ giáo dục EduX</h3>
              <div className="border-t border-white/20 pt-4 space-y-3 text-sm text-[#c4c5d5] leading-relaxed">
                <p>Mã số doanh nghiệp: 5901235207</p>
                <p>Ngày thành lập: 26/08/2025</p>
                <p>Giáo dục và Công nghệ - phát triển sản phẩm hỗ trợ học tập</p>
              </div>
            </div>
          </div>

          {/* Bottom Branding Section */}
          <div className="border-t border-white/10 pt-8 flex flex-col gap-6">
            {/* Logo & Slogan */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-3xl font-bold text-white italic tracking-tighter">
                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                EduX
              </div>
              <div className="border-l border-white/30 pl-4">
                <p className="text-sm font-semibold text-white">Khơi mở tiềm năng</p>
                <p className="text-sm text-[#c4c5d5]">Dẫn đầu công nghệ</p>
              </div>
            </div>

            {/* Social Icons & Copyright */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-6">
                <a href="#" className="text-white hover:opacity-80 transition-opacity">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="text-white hover:opacity-80 transition-opacity">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                </a>
                <a href="#" className="text-white hover:opacity-80 transition-opacity">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
              <p className="text-sm text-[#c4c5d5]">© EduX - Nền tảng học tập uy tín tại Việt Nam</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
