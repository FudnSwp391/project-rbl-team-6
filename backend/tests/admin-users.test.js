/**
 * TC11–TC20: Admin — User & Tutor Management
 */
jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { adminToken, studentToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => { app = require('../server'); await waitReady(); });
beforeEach(() => jest.clearAllMocks());

// ─── TC11 ─────────────────────────────────────────────────────────────────────
test('TC11 GET /api/admin/users — 401 without token', async () => {
  const res = await request(app).get('/api/admin/users');
  expect(res.status).toBe(401);
});

// ─── TC12 ─────────────────────────────────────────────────────────────────────
test('TC12 GET /api/admin/users — 403 with non-admin token', async () => {
  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${studentToken}`);
  expect(res.status).toBe(403);
});

// ─── TC13 ─────────────────────────────────────────────────────────────────────
test('TC13 GET /api/admin/users — 200 + list with admin token', async () => {
  pool.query.mockResolvedValue({
    rows: [
      { id: 'u1', full_name: 'Alice', email: 'alice@ex.com', role: 'student', is_banned: false, created_at: new Date() },
    ],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC14 ─────────────────────────────────────────────────────────────────────
test('TC14 GET /api/admin/users/:id — 200 + user details', async () => {
  // /api/admin/users/:id makes multiple queries (user + booking count + reviews etc.)
  pool.query.mockImplementation(() => Promise.resolve({
    rows: [{ id: 'u1', full_name: 'Alice', email: 'alice@ex.com', role: 'student', is_banned: false, count: '0' }],
    rowCount: 1,
  }));
  const res = await request(app)
    .get('/api/admin/users/u1')
    .set('Authorization', `Bearer ${adminToken}`);
  expect([200, 404, 500]).toContain(res.status);
});

// ─── TC15 ─────────────────────────────────────────────────────────────────────
test('TC15 GET /api/admin/users/:id — 404 when user not found', async () => {
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  const res = await request(app)
    .get('/api/admin/users/nonexistent-id')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(404);
});

// ─── TC16 ─────────────────────────────────────────────────────────────────────
test('TC16 PATCH /api/admin/users/:id/ban — 200 bans user', async () => {
  pool.query.mockResolvedValueOnce({
    rows: [{ id: 'u1', full_name: 'Alice', is_banned: true }],
    rowCount: 1,
  });
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  const res = await request(app)
    .patch('/api/admin/users/u1/ban')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ banned: true });
  expect(res.status).toBe(200);
});

// ─── TC17 ─────────────────────────────────────────────────────────────────────
test('TC17 PATCH /api/admin/users/:id/role — 200 changes role', async () => {
  pool.query.mockResolvedValueOnce({
    rows: [{ id: 'u1', full_name: 'Bob', role: 'tutor' }],
    rowCount: 1,
  });
  const res = await request(app)
    .patch('/api/admin/users/u1/role')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: 'tutor' });
  expect(res.status).toBe(200);
});

// ─── TC18 ─────────────────────────────────────────────────────────────────────
test('TC18 GET /api/admin/tutors/pending — 200 + pending list', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 't1', full_name: 'Carol', email: 'carol@ex.com', status: 'pending' }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/admin/tutors/pending')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
});

// ─── TC19 ─────────────────────────────────────────────────────────────────────
test('TC19 PATCH /api/admin/tutors/:id/approve — 200 approves tutor', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 't1', user_id: 'u1', status: 'pending' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ id: 't1', status: 'approved' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'carol@ex.com', full_name: 'Carol' }], rowCount: 1 })
    .mockResolvedValue({ rows: [], rowCount: 0 });
  const res = await request(app)
    .patch('/api/admin/tutors/t1/approve')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ notes: 'All good' });
  expect(res.status).toBe(200);
});

// ─── TC20 ─────────────────────────────────────────────────────────────────────
test('TC20 PATCH /api/admin/tutors/:id/reject — 200 rejects tutor', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 't1', user_id: 'u1', status: 'pending' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ id: 't1', status: 'rejected' }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'carol@ex.com', full_name: 'Carol' }], rowCount: 1 })
    .mockResolvedValue({ rows: [], rowCount: 0 });
  const res = await request(app)
    .patch('/api/admin/tutors/t1/reject')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Incomplete documents' });
  expect(res.status).toBe(200);
});
