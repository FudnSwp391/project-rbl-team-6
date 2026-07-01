export const AUDIT_LOGS = [
  {
    id: "LOG-001",
    caseId: "CP-001",
    actorType: "USER",
    actorId: "USR-NORMAL",
    action: "USER_CREATE_CASE",
    metadata: { note: "Khởi tạo khiếu nại" },
    createdAt: "2026-06-20T08:30:00Z"
  },
  {
    id: "LOG-002",
    caseId: "CP-002",
    actorType: "USER",
    actorId: "USR-001",
    action: "USER_CREATE_CASE",
    metadata: {},
    createdAt: "2026-06-22T14:15:00Z"
  },
  {
    id: "LOG-003",
    caseId: "CP-003",
    actorType: "USER",
    actorId: "USR-002",
    action: "USER_CREATE_CASE",
    metadata: {},
    createdAt: "2026-06-24T10:00:00Z"
  }
];

export const getAuditLogs = (caseId) => {
  return AUDIT_LOGS.filter(log => log.caseId === caseId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}
