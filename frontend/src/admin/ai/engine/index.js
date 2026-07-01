import { AI_CONFIG } from '../config'
import { mockAIEngine } from './mockAIEngine'

/**
 * Đánh giá Case: Áp dụng Hard Rules, Fraud Prevention trước khi hoặc sau khi gọi LLM
 */
export const evaluateCase = async (enrichedData) => {
  const desc = enrichedData.description.toLowerCase()
  
  // 1. HARD RULES (Keyword detection)
  const isCritical = AI_CONFIG.criticalKeywords.some(kw => desc.includes(kw))
  if (isCritical) {
    return {
      severity: 'CRITICAL',
      sentiment: 'NEGATIVE',
      confidence: 100,
      recommendation: 'Ngừng tự động hóa. Chuyển cho Admin ngay lập tức vì vi phạm nghiêm trọng (Tống tiền/Lừa đảo/Đe dọa/...).',
      reasoning: 'Hard Rule: Phát hiện từ khóa nghiêm trọng trong nội dung.',
      actionCode: AI_CONFIG.ACTION_CODES.ESCALATE_CRITICAL_REVIEW,
      autoResolved: false
    }
  }

  // 2. Gọi AI Engine
  let aiResult = await mockAIEngine(enrichedData)

  // 3. FRAUD PREVENTION & ANTI-ABUSE
  // Nếu AI đề xuất AUTO_RESOLVE nhưng user vượt ngưỡng
  if (aiResult.autoResolved && enrichedData.userHistory) {
    if (enrichedData.userHistory.autoResolvedCount >= AI_CONFIG.antiAbuse.autoResolveThresholdLast30Days) {
      aiResult.severity = 'MEDIUM'
      aiResult.confidence = 100
      aiResult.recommendation = 'User có dấu hiệu lạm dụng Auto Resolve. Yêu cầu Review thủ công.'
      aiResult.reasoning = `Anti-Abuse Rule: User đã được Auto Resolve ${enrichedData.userHistory.autoResolvedCount} lần trong 30 ngày (Ngưỡng: ${AI_CONFIG.antiAbuse.autoResolveThresholdLast30Days}).`
      aiResult.actionCode = AI_CONFIG.ACTION_CODES.MANUAL_REVIEW
      aiResult.autoResolved = false
    }
  }

  return aiResult
}
