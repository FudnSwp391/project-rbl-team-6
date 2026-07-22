/**
 * TC28–TC35: Tutor-role features
 */
jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { tutorToken, TUTOR_ID } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => { app = require('../server'); await waitReady(); });
beforeEach(() => jest.clearAllMocks());

// ─── TC28 ─────────────────────────────────────────────────────────────────────
test('TC28 GET /api/tutor/profile — 401 without token', async () => {
  const res = await request(app).get('/api/tutor/profile');
  expect(res.status).toBe(401);
});

// ─── TC29 ─────────────────────────────────────────────────────────────────────
test('TC29 GET /api/tutor/profile — 200 with tutor token', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'tp1', user_id: TUTOR_ID, status: 'approved', bio: 'Experienced', hourly_rate: 200000 }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/tutor/profile')
    .set('Authorization', `Bearer ${tutorToken}`);
  expect(res.status).toBe(200);
});

// ─── TC30 ─────────────────────────────────────────────────────────────────────
test('TC30 GET /api/tutor/bookings — 200 + bookings list', async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 'b1', status: 'Confirmed', lesson_date: new Date(), student_name: 'Nguyen A' }],
    rowCount: 1,
  });
  const res = await request(app)
    .get('/api/tutor/bookings')
    .set('Authorization', `Bearer ${tutorToken}`);
  expect(res.status).toBe(200);
});

// ─── TC31 ─────────────────────────────────────────────────────────────────────
test('TC31 GET /api/tutor/earnings — 200 + earnings summary', async () => {
  // requireTutor queries tutor_profiles first; route query follows
  pool.query
    .mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 })  // requireTutor
    .mockResolvedValue({ rows: [{ total_earned: '2500000', total_bookings: '8', wallet_balance: '1000000' }], rowCount: 1 });
  const res = await request(app)
    .get('/api/tutor/earnings')
    .set('Authorization', `Bearer ${tutorToken}`);
  expect(res.status).toBe(200);
});

// ─── TC32 ─────────────────────────────────────────────────────────────────────
test('TC32 POST /api/tutor/withdrawals — 201 creates withdrawal request', async () => {
  // requireTutor uses pool.query; route transaction uses pool.connect/client
  pool.query.mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 });  // requireTutor
  pool.connect.mockResolvedValue(pool.mockClient);
  pool.mockClientQuery
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
    .mockResolvedValueOnce({ rows: [{ id: 'w1', user_id: TUTOR_ID, balance: 1000000, held_balance: 0 }], rowCount: 1 })  // getTutorWalletForUpdate
    .mockResolvedValueOnce({ rows: [{ id: 'tx1' }], rowCount: 1 })  // INSERT transactions
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // setLedgerContext (set_config)
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // UPDATE wallets
    .mockResolvedValueOnce({ rows: [{ id: 'wr1', amount: 500000, status: 'PENDING' }], rowCount: 1 })  // INSERT withdrawal_requests
    .mockResolvedValue({ rows: [], rowCount: 0 });  // UPDATE transactions + safeNotifyUser + COMMIT
  const res = await request(app)
    .post('/api/tutor/withdrawals')
    .set('Authorization', `Bearer ${tutorToken}`)
    .send({ amount: 500000, bankName: 'Vietcombank', bankAccountNo: '1234567890', bankAccountName: 'Le Tuan' });
  expect(res.status).toBe(201);
});

// ─── TC33 ─────────────────────────────────────────────────────────────────────
test('TC33 PUT /api/tutor/availability — 200 updates availability slots', async () => {
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  const res = await request(app)
    .put('/api/tutor/availability')
    .set('Authorization', `Bearer ${tutorToken}`)
    .send({ slots: [{ day_of_week: 1, start_time: '09:00', end_time: '11:00' }] });
  expect(res.status).toBe(200);
});

// ─── TC34 ─────────────────────────────────────────────────────────────────────
test('TC34 GET /api/tutor/courses — 200 + courses list', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 })  // requireTutor
    .mockResolvedValue({ rows: [{ id: 'c1', title: 'Toán lớp 12', price: 500000, status: 'published' }], rowCount: 1 });
  const res = await request(app)
    .get('/api/tutor/courses')
    .set('Authorization', `Bearer ${tutorToken}`);
  expect(res.status).toBe(200);
});

// ─── TC35 ─────────────────────────────────────────────────────────────────────
test('TC35 GET /api/tutor/students — 200 + student list', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 })  // requireTutor
    .mockResolvedValue({ rows: [{ id: 'u1', full_name: 'Nguyen A', email: 'a@ex.com', total_sessions: '5' }], rowCount: 1 });
  const res = await request(app)
    .get('/api/tutor/students')
    .set('Authorization', `Bearer ${tutorToken}`);
  expect(res.status).toBe(200);
});
