// Three distinct situations, three distinct recoveries. A single generic
// "no data" state leaves the admin guessing whether they broke a filter or the
// platform genuinely has nothing.
const VARIANTS = {
  'no-data': {
    icon: 'school',
    title: 'Chưa có môn học nào',
    body:  'Tạo môn học đầu tiên để gia sư và khóa học có thể gắn vào.',
    cta:   'Tạo môn học',
  },
  'no-search': {
    icon: 'search_off',
    title: q => `Không tìm thấy môn khớp “${q}”`,
    body:  'Thử từ khóa ngắn hơn — tìm kiếm không phân biệt dấu.',
    cta:   'Xóa tìm kiếm',
  },
  'no-filter': {
    icon: 'filter_list_off',
    title: 'Không có môn nào ở bộ lọc này',
    body:  'Đổi bộ lọc hoặc xem toàn bộ danh sách.',
    cta:   'Xem tất cả',
  },
}

export default function EmptyState({ variant, query, onAction }) {
  const v = VARIANTS[variant] || VARIANTS['no-data']
  const title = typeof v.title === 'function' ? v.title(query) : v.title

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-low grid place-items-center mb-4">
        <span className="material-symbols-outlined text-[32px] text-outline">{v.icon}</span>
      </div>
      <h3 className="text-base font-semibold text-on-surface mb-1.5">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mb-5">{v.body}</p>
      <button
        onClick={onAction}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary
                   hover:brightness-125 active:scale-[0.98] transition"
      >
        {v.cta}
      </button>
    </div>
  )
}
