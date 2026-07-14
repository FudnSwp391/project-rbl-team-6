/**
 * TC49–TC50: Bookings & Student schedule
 */
jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { studentToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => { app = require('../server'); await waitReady(); });
beforeEach(() => jest.clearAllMocks());

// ─── TC49 ─────────────────────────────────────────────────────────────────────
test('TC49 GET /api/bookings — 200 + booking list for authenticated user', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'b1', status: 'Confirmed', lesson_date: new Date(), lesson_fee: 200000 }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/bookings')
    .set('Authorization', `Bearer ${studentToken}`);
  expect(res.status).toBe(200);
});

// ─── TC50 ─────────────────────────────────────────────────────────────────────
test('TC50 GET /api/bookings — 401 without token', async () => {
  const res = await request(app).get('/api/bookings');
  expect(res.status).toBe(401);
});
