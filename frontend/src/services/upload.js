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

  // Xin quyền upload từ Backend (Lấy Presigned URL)
  const resUrl = await fetch(`${API_BASE_URL}/api/tutor/presigned-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      filename: file.name,
      bucket: 'tutor-documents',
      folder
    })
  })

  if (!resUrl.ok) {
    const errorData = await resUrl.json().catch(() => ({}))
    throw new Error(errorData.message || 'Không thể xin quyền upload.')
  }

  const { signedUrl, publicUrl, viewUrl, storageUrl } = await resUrl.json()

  // Upload thẳng từ trình duyệt lên Supabase
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file
  })

  if (!uploadRes.ok) {
    throw new Error('Upload lên Supabase thất bại.')
  }

  // Trả về full URL để lưu vào Database
  return {
    url: viewUrl || publicUrl || storageUrl,
    storageUrl: storageUrl || publicUrl,
    previewUrl: viewUrl || publicUrl,
  }
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
  const uploaded = await uploadViaBackend(file, folder)
  return uploaded.previewUrl || uploaded.url
}

export async function uploadAvatarFile(file, userId = 'anonymous') {
  const err = validateAvatarFile(file)
  if (err) throw new Error(err)
  const uploaded = await uploadViaBackend(file, `avatars/${userId}`)
  return uploaded.previewUrl || uploaded.url
}

export async function uploadDemoVideo(file, userId = 'anonymous') {
  const err = validateVideoFile(file)
  if (err) throw new Error(err)
  const uploaded = await uploadViaBackend(file, `demo-videos/${userId}`)
  return uploaded.storageUrl || uploaded.url
}

export async function uploadCourseVideo(file, userId = 'anonymous') {
  const err = validateVideoFile(file)
  if (err) throw new Error(err)
  const uploaded = await uploadViaBackend(file, `course-videos/${userId}`)
  return uploaded.storageUrl || uploaded.url
}

export async function uploadCourseThumbnail(file, userId = 'anonymous') {
  const err = validateAvatarFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, `course-thumbnails/${userId}`)
}

export async function getSignedStorageUrl(storageUrl) {
  if (!storageUrl || !String(storageUrl).startsWith('storage://')) return storageUrl
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE_URL}/api/storage/signed-url?path=${encodeURIComponent(storageUrl)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) return storageUrl
  const data = await res.json()
  return data.signedUrl || storageUrl
}

export async function uploadHomeworkFile(file, tutorId = 'anonymous') {
  const uploaded = await uploadViaBackend(file, `homeworks/${tutorId}`)
  return uploaded.storageUrl || uploaded.url
}

export async function uploadEvidenceFile(file, userId = 'anonymous') {
  const err = validateProofFile(file)
  if (err) throw new Error(err)
  return uploadViaBackend(file, `dispute-evidence/${userId}`)
}
