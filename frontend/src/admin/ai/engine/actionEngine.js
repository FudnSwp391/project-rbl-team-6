import { AI_CONFIG } from '../config'

// Import callback để thêm log vào store. 
// Trong thực tế, hàm này sẽ gọi API. Ở mock, ta sẽ truyền state setter callback vào.
let addAuditLogCallback = null

export const setAuditLogCallback = (cb) => {
  addAuditLogCallback = cb
}

export const appendAuditLog = (caseId, actorType, actorId, action, metadata = {}) => {
  const newLog = {
    id: `LOG-${Math.floor(Math.random() * 90000) + 10000}`,
    caseId,
    actorType,
    actorId,
    action,
    metadata,
    createdAt: new Date().toISOString()
  }
  if (addAuditLogCallback) {
    addAuditLogCallback(newLog)
  } else {
    console.warn("No audit log callback registered. Log dropped: ", newLog)
  }
}

const performAction = (actionCode, caseId, updateCaseStatus) => {
  // Thực thi nghiệp vụ dựa trên Action Code
  switch(actionCode) {
    case AI_CONFIG.ACTION_CODES.AUTO_REFUND_100:
      updateCaseStatus(caseId, AI_CONFIG.CASE_STATUS.CLOSED_BY_AI)
      // Call Refund Service API...
      break;
    case AI_CONFIG.ACTION_CODES.AUTO_REFUND_50:
      updateCaseStatus(caseId, AI_CONFIG.CASE_STATUS.CLOSED_BY_AI)
      break;
    case AI_CONFIG.ACTION_CODES.WARN_TUTOR_LEVEL_1:
      updateCaseStatus(caseId, AI_CONFIG.CASE_STATUS.CLOSED_BY_AI)
      // Call Notification Service...
      break;
    case AI_CONFIG.ACTION_CODES.REQUEST_EVIDENCE:
      updateCaseStatus(caseId, AI_CONFIG.CASE_STATUS.PENDING_EVIDENCE)
      break;
    case AI_CONFIG.ACTION_CODES.MANUAL_REVIEW:
    case AI_CONFIG.ACTION_CODES.ESCALATE_CRITICAL_REVIEW:
      updateCaseStatus(caseId, AI_CONFIG.CASE_STATUS.AWAITING_ADMIN)
      break;
    default:
      // Các action thủ công hoặc khác
      updateCaseStatus(caseId, AI_CONFIG.CASE_STATUS.RESOLVED)
  }
}

/**
 * Hàm trung tâm thực thi bất kỳ action nào trên Case
 * Tuân thủ SRP: Thực thi -> Ghi Log
 */
export const executeAction = (actionCode, caseId, actorType, actorId, updateCaseStatus, metadata = {}) => {
  // 1. Thực thi
  performAction(actionCode, caseId, updateCaseStatus)

  // 2. Ghi Log
  appendAuditLog(caseId, actorType, actorId, actionCode, metadata)
}
