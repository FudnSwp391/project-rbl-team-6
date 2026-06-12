/**
 * Skeletons.jsx — Khung xương tải (loading skeleton) có hiệu ứng shimmer.
 */
const shimmer = {
  background: 'linear-gradient(90deg, #eceef1 25%, #f5f6f8 37%, #eceef1 63%)',
  backgroundSize: '400% 100%',
  animation: 'skeletonShimmer 1.4s ease infinite',
  borderRadius: 8,
}

function Bar({ w = '100%', h = 14, style }) {
  return <div style={{ ...shimmer, width: w, height: h, ...style }} />
}

export function TutorRowSkeleton() {
  return (
    <article className="tutor-card-v2" style={{ pointerEvents: 'none' }}>
      <div style={{ ...shimmer, width: 88, height: 88, borderRadius: 16, flexShrink: 0 }} />
      <div className="tutor-card-v2-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Bar w="45%" h={18} />
        <Bar w="70%" h={12} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Bar w={60} h={20} style={{ borderRadius: 999 }} />
          <Bar w={60} h={20} style={{ borderRadius: 999 }} />
        </div>
        <Bar w="90%" h={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Bar w={90} h={20} />
          <Bar w={110} h={40} style={{ borderRadius: 12 }} />
        </div>
      </div>
      <style>{globalKeyframe}</style>
    </article>
  )
}

export function CourseCardSkeleton() {
  return (
    <article className="course-card" style={{ pointerEvents: 'none' }}>
      <div style={{ ...shimmer, height: 150, borderRadius: 0 }} />
      <div className="course-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Bar w={70} h={18} style={{ borderRadius: 999 }} />
        <Bar w="90%" h={16} />
        <Bar w="50%" h={12} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Bar w={50} h={12} /><Bar w={50} h={12} /><Bar w={50} h={12} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <Bar w={80} h={22} />
          <Bar w={100} h={36} style={{ borderRadius: 10 }} />
        </div>
      </div>
      <style>{globalKeyframe}</style>
    </article>
  )
}

const globalKeyframe = `@keyframes skeletonShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`
