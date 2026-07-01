import { AI_CONFIG } from '../config'

/**
 * Giả lập kết quả từ một LLM (như OpenAI hoặc Gemini).
 * Trong tương lai, hàm này sẽ fetch đến LLM Provider.
 */
export const mockAIEngine = async (enrichedData) => {
  // Trì hoãn 1s để giả lập mạng
  await new Promise(resolve => setTimeout(resolve, 1000))

  const desc = enrichedData.description.toLowerCase()
  
  // Trả về mock data tùy theo loại content
  if (desc.includes('muộn') || desc.includes('trễ')) {
    return {
      severity: 'LOW',
      sentiment: 'NEGATIVE',
      confidence: 85, // >70%
      recommendation: 'Hoàn 100% tiền và cảnh cáo gia sư.',
      reasoning: 'Gia sư vi phạm nội quy lớp học khi đi trễ. Dữ liệu LessonContext xác nhận gia sư vào trễ.',
      actionCode: AI_CONFIG.ACTION_CODES.AUTO_REFUND_100,
      autoResolved: true
    }
  }

  if (desc.includes('lỗi hệ thống') || desc.includes('thanh toán')) {
    return {
      severity: 'MEDIUM',
      sentiment: 'NEUTRAL',
      confidence: 65, // <70% -> Needs Warning
      recommendation: 'Kiểm tra lại giao dịch thanh toán và đối soát.',
      reasoning: 'Hệ thống cần con người kiểm tra nhật ký giao dịch ngân hàng.',
      actionCode: AI_CONFIG.ACTION_CODES.MANUAL_REVIEW,
      autoResolved: false
    }
  }

  // Mặc định
  return {
    severity: 'LOW',
    sentiment: 'NEUTRAL',
    confidence: 90,
    recommendation: 'Nhắc nhở hai bên.',
    reasoning: 'Vấn đề nhỏ, có thể xử lý tự động.',
    actionCode: AI_CONFIG.ACTION_CODES.WARN_TUTOR_LEVEL_1,
    autoResolved: true
  }
}
