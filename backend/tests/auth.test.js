/**
 * TC01–TC10: Authentication
 * Covers: check-email, register, login, forgot-password OTP reset
 */
jest.mock('../db');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { makeToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => { app = require('../server'); await waitReady(); });
beforeEach(() => jest.clearAllMocks());

// ─── TC01 ─────────────────────────────────────────────────────────────────────
test('TC01 check-email — 400 when email is missing', async () => {
  const res = await request(app).post('/api/auth/check-email').send({});
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('message');
});

// ─── TC02 ─────────────────────────────────────────────────────────────────────
test('TC02 check-email — 200 available:true when email not in DB', async () => {
  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  const res = await request(app).post('/api/auth/check-email').send({ email: 'new@ex.com' });
  expect(res.status).toBe(200);
  expect(res.body.available).toBe(true);
});

// ─── TC03 ─────────────────────────────────────────────────────────────────────
test('TC03 check-email — 409 when email already registered', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', google_id: null }], rowCount: 1 });
  const res = await request(app).post('/api/auth/check-email').send({ email: 'exists@ex.com' });
  expect(res.status).toBe(409);
  expect(res.body.available).toBe(false);
});

// ─── TC04 ─────────────────────────────────────────────────────────────────────
test('TC04 register — 400 when required fields are missing', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
  expect(res.status).toBe(400);
});

// ─── TC05 ─────────────────────────────────────────────────────────────────────
test('TC05 register — 400 when password shorter than 8 chars', async () => {
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Test User', email: 'test@ex.com', password: 'short',
  });
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/8/);
});

// ─── TC06 ─────────────────────────────────────────────────────────────────────
test('TC06 register — 409 when email already exists', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', google_id: null }], rowCount: 1 });
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Test User', email: 'dup@ex.com', password: 'password123',
  });
  expect(res.status).toBe(409);
});

// ─── TC07 ─────────────────────────────────────────────────────────────────────
test('TC07 register — 201 + JWT token on success', async () => {
  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  pool.query.mockResolvedValueOnce({
    rows: [{ id: 'new-uuid', full_name: 'Test User', email: 'new@ex.com', role: 'student', picture: null, created_at: new Date() }],
    rowCount: 1,
  });
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Test User', email: 'new@ex.com', password: 'securepass123', role: 'student',
  });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('token');
  expect(res.body.user.email).toBe('new@ex.com');
});

// ─── TC08 ─────────────────────────────────────────────────────────────────────
test('TC08 login — 400 when email or password missing', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
  expect(res.status).toBe(400);
});

// ─── TC09 ─────────────────────────────────────────────────────────────────────
test('TC09 login — 401 when password does not match', async () => {
  const hash = await bcrypt.hash('correct-password', 10);
  pool.query.mockResolvedValueOnce({
    rows: [{ id: 'u1', full_name: 'User', email: 'u@ex.com', password_hash: hash, role: 'student', picture: null }],
    rowCount: 1,
  });
  const res = await request(app).post('/api/auth/login').send({ email: 'u@ex.com', password: 'wrong-password' });
  expect(res.status).toBe(401);
});

// ─── TC10 ─────────────────────────────────────────────────────────────────────
test('TC10 login — 200 + token when credentials are valid', async () => {
  const hash = await bcrypt.hash('goodpassword', 10);
  pool.query.mockResolvedValueOnce({
    rows: [{ id: 'u1', full_name: 'User', email: 'u@ex.com', password_hash: hash, role: 'student', picture: null }],
    rowCount: 1,
  });
  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });   // logLoginAttempt: recent IPs
  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });   // logLoginAttempt: INSERT log
  const res = await request(app).post('/api/auth/login').send({ email: 'u@ex.com', password: 'goodpassword' });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('token');
  expect(res.body.user.role).toBe('student');
});
