/**
 * Task 2A.1 — GET /api/admin/violations/:id
 * Unit + integration tests.
 *
 * Test coverage:
 *   TC-VD01 — 200 OK with valid UUID and admin JWT
 *   TC-VD02 — 401 when no JWT provided
 *   TC-VD03 — 403 for non-admin (student) JWT
 *   TC-VD04 — 400 for a malformed UUID (not UUID format)
 *   TC-VD05 — 400 for a plain integer ID
 *   TC-VD06 — 400 for an empty string segment (route mismatch → falls to 404 via express, not our concern)
 *   TC-VD07 — 404 for a valid UUID that does not exist in DB
 *   TC-VD08 — 400 via PostgreSQL error 22P02 (belt-and-suspenders)
 *   TC-VD09 — Response shape contains all required base fields
 *   TC-VD10 — ai_risk_score is never in the SELECT query string
 *   TC-VD11 — evidence_urls field is present in the response (even if null)
 *   TC-VD12 — 400 for UUID with wrong version digit (v0)
 */

jest.mock('../db');
const pool    = require('../db');
const request = require('supertest');
const { adminToken, studentToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => {
  app = require('../server');
  await waitReady();
});
beforeEach(() => jest.clearAllMocks());

// ── Shared ────────────────────────────────────────────────────────────────────
const VALID_UUID   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MISSING_UUID = 'ffffffff-ffff-4fff-bfff-ffffffffffff'; // valid format, won't exist in mock

function makeDisputeRow(overrides = {}) {
  return {
    id:                   VALID_UUID,
    reason:               'Gia sư không xuất hiện',
    status:               'OPEN',
    investigation_status: 'OPEN',
    severity:             'high',
    target_type:          'booking',
    penalty_type:         null,
    admin_note:           null,
    evidence_urls:        ['https://example.com/proof1.jpg'],
    created_at:           new Date('2026-07-01T08:00:00Z'),
    resolved_at:          null,
    withdrawn_at:         null,
    booking_id:           'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    course_id:            null,
    tutor_id:             'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    raised_by:            'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    reporter_name:        'Nguyen Van A',
    reporter_email:       'student@example.com',
    accused_name:         'Tran Thi B',
    accused_email:        'tutor@example.com',
    ...overrides,
  };
}

// ─── TC-VD01: 200 with valid UUID and admin JWT ────────────────────────────────
test('TC-VD01 GET /api/admin/violations/:id — 200 valid UUID, admin JWT', async () => {
  pool.query.mockResolvedValueOnce({ rows: [makeDisputeRow()], rowCount: 1 });
  const res = await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('violation');
});

// ─── TC-VD02: 401 without JWT ─────────────────────────────────────────────────
test('TC-VD02 GET /api/admin/violations/:id — 401 without JWT', async () => {
  const res = await request(app).get(`/api/admin/violations/${VALID_UUID}`);
  expect(res.status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-VD03: 403 for non-admin JWT ───────────────────────────────────────────
test('TC-VD03 GET /api/admin/violations/:id — 403 student JWT', async () => {
  const res = await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${studentToken}`);
  expect(res.status).toBe(403);
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-VD04: 400 for malformed UUID (random string) ─────────────────────────
test('TC-VD04 GET /api/admin/violations/:id — 400 malformed UUID string', async () => {
  const res = await request(app)
    .get('/api/admin/violations/not-a-real-uuid')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/UUID/);
  // Pre-DB guard must fire — no DB call
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-VD05: 400 for a plain integer ─────────────────────────────────────────
test('TC-VD05 GET /api/admin/violations/:id — 400 plain integer ID', async () => {
  const res = await request(app)
    .get('/api/admin/violations/12345')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-VD06: 400 for SQL injection attempt in :id ───────────────────────────
test('TC-VD06 GET /api/admin/violations/:id — 400 SQL injection in :id', async () => {
  // URL-encode the value
  const res = await request(app)
    .get('/api/admin/violations/1%27+OR+%271%27%3D%271')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-VD07: 404 for valid UUID not in DB ────────────────────────────────────
test('TC-VD07 GET /api/admin/violations/:id — 404 UUID not found', async () => {
  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  const res = await request(app)
    .get(`/api/admin/violations/${MISSING_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toMatch(/Không tìm thấy/);
});

// ─── TC-VD08: 400 via PostgreSQL 22P02 (belt-and-suspenders) ──────────────────
test('TC-VD08 GET /api/admin/violations/:id — 400 via PG error 22P02', async () => {
  // Simulate a UUID that passes our regex but fails PG cast
  const pgError = Object.assign(new Error('invalid uuid'), { code: '22P02' });
  pool.query.mockRejectedValueOnce(pgError);
  const res = await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/UUID/);
});

// ─── TC-VD09: Response shape contains all required base fields ────────────────
test('TC-VD09 GET /api/admin/violations/:id — response has required base fields', async () => {
  pool.query.mockResolvedValueOnce({ rows: [makeDisputeRow()], rowCount: 1 });
  const res = await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  const v = res.body.violation;
  // Base row fields
  expect(v).toHaveProperty('id');
  expect(v).toHaveProperty('reason');
  expect(v).toHaveProperty('status');
  expect(v).toHaveProperty('investigation_status');
  expect(v).toHaveProperty('severity');
  expect(v).toHaveProperty('target_type');
  expect(v).toHaveProperty('admin_note');
  expect(v).toHaveProperty('evidence_urls');
  expect(v).toHaveProperty('created_at');
  expect(v).toHaveProperty('resolved_at');
  expect(v).toHaveProperty('withdrawn_at');
  expect(v).toHaveProperty('booking_id');
  expect(v).toHaveProperty('course_id');
  expect(v).toHaveProperty('tutor_id');
  expect(v).toHaveProperty('raised_by');
  // Reporter / accused identity
  expect(v).toHaveProperty('reporter_name');
  expect(v).toHaveProperty('reporter_email');
  expect(v).toHaveProperty('accused_name');
  expect(v).toHaveProperty('accused_email');
});

// ─── TC-VD10: ai_risk_score absent from SELECT query ─────────────────────────
test('TC-VD10 GET /api/admin/violations/:id — ai_risk_score not in SELECT SQL', async () => {
  pool.query.mockResolvedValueOnce({ rows: [makeDisputeRow()], rowCount: 1 });
  await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  const sql = pool.query.mock.calls[0][0];
  expect(sql).not.toMatch(/ai_risk_score/i);
});

// ─── TC-VD11: evidence_urls present in response ───────────────────────────────
test('TC-VD11 GET /api/admin/violations/:id — evidence_urls present', async () => {
  const row = makeDisputeRow({ evidence_urls: ['https://s3.example.com/a.png', 'https://s3.example.com/b.png'] });
  pool.query.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
  const res = await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.violation.evidence_urls)).toBe(true);
  expect(res.body.violation.evidence_urls).toHaveLength(2);
});

// ─── TC-VD12: 400 for UUID with invalid version (v0) ─────────────────────────
test('TC-VD12 GET /api/admin/violations/:id — 400 UUID version 0 rejected', async () => {
  // Version digit must be 1-5; '0' is invalid per RFC 4122
  const invalidVersionUUID = 'a0eebc99-9c0b-0ef8-bb6d-6bb9bd380a11';
  const res = await request(app)
    .get(`/api/admin/violations/${invalidVersionUUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

// ─── TC-VD13: Snapshots from concurrent DB lookups (Task 2B.1) ────────────────
test('TC-VD13 GET /api/admin/violations/:id — returns aggregated snapshots', async () => {
  // Mock the main query
  pool.query.mockResolvedValueOnce({ rows: [makeDisputeRow()], rowCount: 1 });
  
  // Mock the 4 concurrent Promise.all queries
  pool.query.mockResolvedValueOnce({ rows: [{ id: 'b1...', subject: 'Math', lesson_fee: 500 }] }); // Booking
  pool.query.mockResolvedValueOnce({ rows: [] }); // Course
  pool.query.mockResolvedValueOnce({ rows: [{ user_id: 'c1...', headline: 'Expert' }] }); // Tutor
  pool.query.mockResolvedValueOnce({ rows: [{ phone: '123', city: 'Hanoi', total_bookings: 5 }] }); // Student
  
  const res = await request(app)
    .get(`/api/admin/violations/${VALID_UUID}`)
    .set('Authorization', `Bearer ${adminToken}`);
    
  expect(res.status).toBe(200);
  const v = res.body.violation;
  
  expect(v).toHaveProperty('booking_snapshot');
  expect(v).toHaveProperty('course_snapshot');
  expect(v).toHaveProperty('tutor_snapshot');
  expect(v).toHaveProperty('student_snapshot');
});
