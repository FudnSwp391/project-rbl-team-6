import { useEffect, useState } from 'react';

// Icon giỏ hàng dùng chung cho header mọi trang — tự đồng bộ badge số lượng
// qua event 'cartUpdated' (cùng tab) và 'storage' (đa tab), đọc localStorage
// edux_cart (cùng định dạng CartPage/CourseMarketplace/CourseDetail ghi).
const readCount = () => {
  try {
    const arr = JSON.parse(localStorage.getItem('edux_cart') || '[]');
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
};

export default function CartButton({
  className = 'text-[#00288e] flex items-center',
  iconSize = 24,
}) {
  const [count, setCount] = useState(readCount);

  useEffect(() => {
    const sync = () => setCount(readCount());
    window.addEventListener('cartUpdated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('cartUpdated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <a href="#/cart" className={`relative ${className}`} title="Giỏ hàng">
      <span className="material-symbols-outlined" style={{ fontSize: `${iconSize}px` }}>shopping_cart</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#e11d48] text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </a>
  );
}
