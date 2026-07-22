// ── AI Summary + Difference Analysis (Batch 38, spec Modules 2 & 3) ──────────
// Mirrors server.js's maybeCopilotLLMRewrite idiom (Batch 26) exactly: the
// rule-based result is always computed first and is what's actually shown;
// an optional, off-by-default LLM call may only REPHRASE those already-
// computed facts into a nicer narrative — it is never allowed to introduce
// new facts, and any failure/disabled state falls back to the rule-based
// template. This is what makes "never fabricate evidence" hold even if the
// LLM is later turned on.
const { analyzeRootCause } = require('./rootCauseAnalyzer');

const AI_LLM_ENABLED = String(process.env.RECONCILIATION_AI_LLM_ENABLED ?? 'false').toLowerCase() === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
].filter((m, i, arr) => arr.indexOf(m) === i);

const IMPACT_BY_CAUSE = {
  'Escrow Release Failed': 'Tiền đang bị giữ tạm thời trong escrow. Chưa mất tiền.',
  'Wallet Updated but Escrow Not Updated': 'Số dư ví có thể đã cập nhật nhưng escrow chưa phản ánh đúng — cần đối chiếu thêm.',
  'Escrow Updated but Wallet Not Updated': 'Escrow đã ghi nhận nhưng số dư ví khả dụng chưa được cập nhật.',
  'Duplicate Deposit': 'Số dư ví có thể bị ghi nhận cao hơn thực tế nếu xác nhận có trùng lặp.',
  'Duplicate Payment': 'Số dư ví có thể bị trừ nhiều hơn thực tế nếu xác nhận có trùng lặp.',
  'Failed Withdrawal': 'Gia sư chưa nhận được tiền rút; tiền vẫn nằm trong ví nền tảng.',
  'Refund Not Applied': 'Học viên có thể chưa nhận được khoản hoàn tiền đã được duyệt.',
  'Pending Withdrawal Too Long': 'Yêu cầu rút tiền bị trễ so với quy trình thông thường; tiền vẫn được giữ an toàn.',
  'Booking Completed Without Settlement': 'Buổi học đã hoàn thành nhưng chưa từng được đưa vào quy trình thanh toán escrow.',
  'Payment Callback Missing': 'Giao dịch nạp tiền có thể đã thành công ở cổng thanh toán nhưng chưa được ghi nhận vào ví.',
  'Manual Adjustment': 'Thay đổi số dư đến từ thao tác thủ công của admin, ngoài luồng giao dịch thông thường.',
  Unknown: 'Chưa thể xác định tác động tự động — cần kiểm tra thủ công.',
};

function buildDifferenceAnalysis(resolved, bundle) {
  const rootCause = analyzeRootCause(resolved, bundle);
  return {
    difference_amount: Math.round(Number(resolved.difference) || 0),
    confidence: rootCause.confidence,
    root_cause: rootCause.cause,
    supporting_evidence: [...(bundle.notes || []), ...rootCause.evidence],
    impact: IMPACT_BY_CAUSE[rootCause.cause] || IMPACT_BY_CAUSE.Unknown,
    recommendation: rootCause.confidence === 0 ? ['Manual Investigation Required'] : rootCause.recommendation,
    severity: resolved.severity,
  };
}

function templateSummary(resolved, analysis) {
  const amount = analysis.difference_amount.toLocaleString('vi-VN');
  if (analysis.root_cause === 'Unknown' || analysis.confidence === 0) {
    return `Đối soát phát hiện chênh lệch ₫${amount}. Chưa xác định được nguyên nhân rõ ràng — cần điều tra thủ công.`;
  }
  return `Đối soát phát hiện chênh lệch ₫${amount}. Nguyên nhân khả năng cao nhất: ${analysis.root_cause} (độ tin cậy ${analysis.confidence}%). ${analysis.impact}`;
}

async function callGemini(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, topP: 0.9, maxOutputTokens: 1024, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, text: data?.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  } catch {
    return { ok: false };
  }
}

// Never invents facts: receives only the already-computed structured analysis,
// asked strictly to rephrase it into Vietnamese prose. Always falls back to
// the deterministic template on any failure, invalid JSON, or when disabled.
async function maybeRewriteWithLLM(resolved, analysis, fallbackSummary) {
  if (!AI_LLM_ENABLED || !GEMINI_API_KEY) return { summary: fallbackSummary, model_used: 'RULE_BASED' };
  try {
    const payload = JSON.stringify({
      difference_amount: analysis.difference_amount,
      root_cause: analysis.root_cause,
      confidence: analysis.confidence,
      severity: analysis.severity,
      evidence: analysis.supporting_evidence,
      impact: analysis.impact,
    }).slice(0, 4000);
    const prompt = `Bạn là trợ lý cho quản trị viên nền tảng gia sư EduX. Viết lại phần TÓM TẮT đối soát tài chính bằng tiếng Việt, ngắn gọn (2-3 câu), khách quan, CHỈ dựa trên dữ liệu JSON dưới đây và TUYỆT ĐỐI KHÔNG bịa thêm dữ kiện, số liệu, hay booking/giao dịch không có trong dữ liệu. Không đề xuất hành động tự động di chuyển tiền. Trả về đúng JSON dạng {"summary_vi":"..."}. Dữ liệu: ${payload}`;
    for (const model of GEMINI_MODELS) {
      const r = await callGemini(model, prompt);
      if (r.ok) {
        try {
          const parsed = JSON.parse(r.text);
          if (parsed && typeof parsed.summary_vi === 'string' && parsed.summary_vi.trim().length > 10) {
            return { summary: parsed.summary_vi.trim().slice(0, 1000), model_used: 'LLM_GEMINI' };
          }
        } catch { /* invalid JSON -> try next model */ }
      }
    }
    return { summary: fallbackSummary, model_used: 'RULE_BASED' };
  } catch (err) {
    console.warn('[reconciliation-ai] LLM rewrite failed, falling back:', err.message);
    return { summary: fallbackSummary, model_used: 'RULE_BASED' };
  }
}

async function buildAnalysis(resolved, bundle) {
  const analysis = buildDifferenceAnalysis(resolved, bundle);
  const fallbackSummary = templateSummary(resolved, analysis);
  const { summary, model_used } = await maybeRewriteWithLLM(resolved, analysis, fallbackSummary);
  return {
    ai_summary: summary,
    ai_model_used: model_used,
    risk_level: analysis.severity,
    analysis,
  };
}

module.exports = { buildAnalysis, buildDifferenceAnalysis };
