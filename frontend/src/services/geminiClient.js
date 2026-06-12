/**
 * geminiClient.js — Gọi endpoint backend `/api/ask-ai`
 * ─────────────────────────────────────────────────────────────
 * API key Gemini được giữ kín ở backend (.env), client KHÔNG
 * cần biết key — chỉ gọi endpoint của server tự host.
 */

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * POST /api/ask-ai với { userMessage }
 * Backend tự query DB → lấy danh sách gia sư approved → gọi Gemini.
 * Trả về { reply, tutorIds } (tutorIds là UUID).
 * Nếu lỗi mạng / server không chạy / Gemini lỗi → trả null để caller fallback.
 */
export async function askGemini(userMessage) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/ask-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage }),
    })

    if (!res.ok) {
      console.warn('[askGemini] Backend HTTP', res.status, await res.text())
      return null
    }

    const data = await res.json()
    if (typeof data.reply !== 'string' || !Array.isArray(data.tutorIds)) {
      console.warn('[askGemini] Invalid response shape', data)
      return null
    }
    return data
  } catch (err) {
    console.warn('[askGemini] Request failed:', err)
    return null
  }
}
