const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const DOC_TYPES = ['application/pdf']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Không đọc được file.'))
    reader.readAsDataURL(file)
  })
}

async function uploadViaBackend(file, folder) {
  const token = localStorage.getItem('token')
  const dataUrl = await fileToDataUrl(file)

  const response = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      dataUrl,
      folder,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Upload thất bại.')
  }

  const data = await response.json()
  return data.url
}

export function validateProofFile(file) {
  const maxMb = 10
  if (![...IMAGE_TYPES, ...DOC_TYPES].includes(file.type)) {
    return 'Chỉ chấp nhận JPG, PNG, WebP hoặc PDF.'
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `File không được vượt quá ${maxMb}MB.`
  }
  return null
}

export function validateAvatarFile(file) {
  const maxMb = 5
  if (!IMAGE_TYPES.includes(file.type)) {
    return 'Avatar chỉ chấp nhận JPG, PNG hoặc WebP.'
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `Avatar không được vượt quá ${maxMb}MB.`
  }
  return null
}

export function validateVideoFile(file) {
  const maxMb = 100
  if (!VIDEO_TYPES.includes(file.type)) {
    return 'Video demo chỉ chấp nhận MP4, WebM hoặc MOV.'
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `Video không được vượt quá ${maxMb}MB.`
  }
  return null
}

export async function uploadProofFile(file, folder = 'proofs') {
  const err = validateProofFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, folder)
}

export async function uploadAvatarFile(file, userId = 'anonymous') {
  const err = validateAvatarFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, `avatars/${userId}`)
}

export async function uploadDemoVideo(file, userId = 'anonymous') {
  const err = validateVideoFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, `demo-videos/${userId}`)
}

export async function uploadCourseVideo(file, userId = 'anonymous') {
  const err = validateVideoFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, `course-videos/${userId}`)
}

export async function uploadCourseThumbnail(file, userId = 'anonymous') {
  const err = validateAvatarFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, `course-thumbnails/${userId}`)
}
