/**
 * Task 3.1 — PATCH /api/admin/violations/:id/status
 * Unit + integration tests for state machine logic.
 */

jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { adminToken } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => {
  app = require('../server');
  await waitReady();
});
beforeEach(() => jest.clearAllMocks());

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Setup mock client for transactions
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};
pool.connect.mockResolvedValue(mockClient);

describe('PATCH /api/admin/violations/:id/status', () => {

  beforeEach(() => {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  test('Rejects invalid transition (e.g. CLOSED to INVESTIGATING)', async () => {
    mockClient.query
      .mockResolvedValueOnce() // BEGIN
      .mockResolvedValueOnce({ rows: [{ investigation_status: 'CLOSED' }], rowCount: 1 }); // SELECT FOR UPDATE

    const res = await request(app)
      .patch(`/api/admin/violations/${VALID_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVESTIGATING' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Chuyển đổi trạng thái không hợp lệ/);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    // Ensure no UPDATE was executed
    expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE'));
  });

  test('Allows valid transition (OPEN to INVESTIGATING) and logs audit note', async () => {
    mockClient.query
      .mockResolvedValueOnce() // BEGIN
      .mockResolvedValueOnce({ rows: [{ investigation_status: 'OPEN' }], rowCount: 1 }) // SELECT
      .mockResolvedValueOnce() // UPDATE
      .mockResolvedValueOnce() // INSERT note
      .mockResolvedValueOnce(); // COMMIT

    const res = await request(app)
      .patch(`/api/admin/violations/${VALID_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVESTIGATING' });

    expect(res.status).toBe(200);
    expect(res.body.investigation_status).toBe('INVESTIGATING');
    
    // Verify transaction
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE disputes SET investigation_status = $1 WHERE id = $2',
      ['INVESTIGATING', VALID_UUID]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO dispute_admin_notes (dispute_id, admin_id, note) VALUES ($1, $2, $3)',
      [VALID_UUID, expect.any(String), expect.stringContaining('OPEN thành INVESTIGATING')]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('Validates financial status column is NOT updated', async () => {
    mockClient.query
      .mockResolvedValueOnce() // BEGIN
      .mockResolvedValueOnce({ rows: [{ investigation_status: 'INVESTIGATING' }], rowCount: 1 }) // SELECT
      .mockResolvedValueOnce() // UPDATE
      .mockResolvedValueOnce() // INSERT
      .mockResolvedValueOnce(); // COMMIT

    const res = await request(app)
      .patch(`/api/admin/violations/${VALID_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WAITING_TUTOR' });

    expect(res.status).toBe(200);

    // Get the UPDATE query call
    const updateCall = mockClient.query.mock.calls.find(call => call[0].startsWith('UPDATE disputes'));
    expect(updateCall).toBeDefined();
    
    const sql = updateCall[0];
    expect(sql).toMatch(/investigation_status = \$1/);
    expect(sql).not.toMatch(/\bstatus\b =/i); // Ensure the financial status column is not in the SET clause
  });
});
