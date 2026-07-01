export const AI_CONFIG = {
  // Fraud Prevention & Anti-Abuse Rules
  antiAbuse: {
    autoResolveThresholdLast30Days: 3, // How many times a user can be auto-resolved before escalating
    appealThresholdLast30Days: 2,
  },
  
  // SLA Target (hours)
  sla: {
    CRITICAL: 1,  // 60 minutes
    HIGH: 24,     // 24 hours
    MEDIUM: 48,   // 48 hours
    LOW: 72       // 72 hours, though AI usually auto-resolves immediately
  },

  // Hard rules keywords triggering CRITICAL severity
  criticalKeywords: [
    'lừa đảo',
    'quấy rối',
    'tống tiền',
    'đe dọa',
    'bạo lực'
  ],

  // Status Enums
  CASE_STATUS: {
    OPEN: 'OPEN',
    AI_ASSESSED: 'AI_ASSESSED',
    AWAITING_ADMIN: 'AWAITING_ADMIN',
    PENDING_EVIDENCE: 'PENDING_EVIDENCE',
    RESOLVED: 'RESOLVED',
    CLOSED_BY_AI: 'CLOSED_BY_AI',
    REOPENED: 'REOPENED'
  },

  // Action Codes
  ACTION_CODES: {
    AUTO_REFUND_100: 'AUTO_REFUND_100',
    AUTO_REFUND_50: 'AUTO_REFUND_50',
    WARN_TUTOR_LEVEL_1: 'WARN_TUTOR_LEVEL_1',
    WARN_TUTOR_LEVEL_2: 'WARN_TUTOR_LEVEL_2',
    REQUEST_EVIDENCE: 'REQUEST_EVIDENCE',
    MANUAL_REVIEW: 'MANUAL_REVIEW',
    ESCALATE_CRITICAL_REVIEW: 'ESCALATE_CRITICAL_REVIEW'
  }
}
