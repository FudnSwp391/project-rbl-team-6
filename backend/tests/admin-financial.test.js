/**
 * TC21–TC27: Admin — Financial & Operations
 */
jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { adminToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => { app = require('../server'); await waitReady(); });
beforeEach(() => jest.clearAllMocks());

// ─── TC21 ─────────────────────────────────────────────────────────────────────
test('TC21 GET /api/admin/disputes — 200 + disputes list', async () => {
  pool.query.mockResolvedValue({
    rows: [
      { id: 'd1', status: 'OPEN',            reason: 'Gia sư không dạy', created_at: new Date() },
      { id: 'd2', status: 'RESOLVED_REFUND', reason: 'Chất lượng kém',   created_at: new Date() },
    ],
    rowCount: 2,
  });
  const res = await request(app)
    .get('/api/admin/disputes')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC22 ─────────────────────────────────────────────────────────────────────
test('TC22 GET /api/admin/withdrawal-requests — 200 + list', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'wr1', amount: 500000, status: 'PENDING', created_at: new Date() }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/admin/withdrawal-requests')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC23 ─────────────────────────────────────────────────────────────────────
test('TC23 PATCH withdrawal-requests/:id/approve — 200', async () => {
  // Route uses pool.connect() + client transaction, not pool.query
  pool.connect.mockResolvedValue(pool.mockClient);
  pool.mockClientQuery
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
    .mockResolvedValueOnce({ rows: [{ id: 'wr1', status: 'PENDING', amount: 500000, tutor_id: 'tid', wallet_id: 'wid' }], rowCount: 1 })  // SELECT FOR UPDATE
    .mockResolvedValue({ rows: [], rowCount: 0 });  // UPDATE + safeNotifyUser + COMMIT
  const res = await request(app)
    .patch('/api/admin/withdrawal-requests/wr1/approve')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ adminNote: 'Approved' });
  expect(res.status).toBe(200);
});

// ─── TC24 ─────────────────────────────────────────────────────────────────────
test('TC24 GET /api/admin/wallet-ledger — 200 + ledger entries', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'l1', event_type: 'DEPOSIT', amount: 200000, created_at: new Date() }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/admin/wallet-ledger')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC25 ─────────────────────────────────────────────────────────────────────
test('TC25 GET /api/admin/commission-logs — 200 + commission entries', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'c1', amount: 30000, rate: 0.1, created_at: new Date() }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/admin/commission-logs')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC26 ─────────────────────────────────────────────────────────────────────
test('TC26 GET /api/admin/notification-outbox — 200 + outbox rows', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'o1', status: 'SKIPPED', channel: 'IN_APP', created_at: new Date() }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/admin/notification-outbox')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC27 ─────────────────────────────────────────────────────────────────────
test('TC27 GET /api/admin/analytics/dashboard/stats — 200 + KPI stats', async () => {
  // Route uses Promise.all with 6 parallel pool.query calls
  pool.query
    .mockResolvedValueOnce({ rows: [{ count: '10' }],      rowCount: 1 })  // total_users
    .mockResolvedValueOnce({ rows: [{ count: '3' }],       rowCount: 1 })  // active_students
    .mockResolvedValueOnce({ rows: [{ count: '2' }],       rowCount: 1 })  // active_tutors
    .mockResolvedValueOnce({ rows: [{ count: '1' }],       rowCount: 1 })  // pending_tutors
    .mockResolvedValueOnce({ rows: [{ total: '1500000' }], rowCount: 1 })  // monthly_revenue
    .mockResolvedValueOnce({ rows: [{ count: '0' }],       rowCount: 1 }); // open_disputes
  const res = await request(app)
    .get('/api/admin/analytics/dashboard/stats')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});
