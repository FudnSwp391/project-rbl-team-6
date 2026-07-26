/**
 * Task 4.1 — Notes & Actions API Tests
 */

jest.mock('../db');
const pool = require('../db');
const request = require('supertest');
const { adminToken, ADMIN_ID } = require('./helpers');

const waitReady = () => new Promise(r => setImmediate(() => setImmediate(r)));

let app;
beforeAll(async () => {
  app = require('../server');
  await waitReady();
});
beforeEach(() => jest.clearAllMocks());

const VALID_DISPUTE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_NOTE_ID = 'b1ffcd88-8d0b-4ef8-bb6d-6bb9bd380b22';

describe('POST /api/admin/violations/:id/note', () => {
  test('Blocks XSS injection by sanitizing input', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: VALID_NOTE_ID, note: '&lt;script&gt;alert(1)&lt;/script&gt;' }]
    });

    const res = await request(app)
      .post(`/api/admin/violations/${VALID_DISPUTE_ID}/note`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: '<script>alert(1)</script>' });

    expect(res.status).toBe(201);
    
    // Check that the query was called with the sanitized string
    const queryCall = pool.query.mock.calls[0];
    const sanitizedNoteArg = queryCall[1][2]; // 3rd argument is note
    expect(sanitizedNoteArg).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sanitizedNoteArg).not.toContain('<script>');
  });
});

describe('PATCH /api/admin/violations/:id/note/:noteId', () => {
  test('Fails when attempting to patch another admin\'s note', async () => {
    // Mock the SELECT query to return a DIFFERENT admin_id
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ admin_id: 'some-other-admin-uuid' }]
    });

    const res = await request(app)
      .patch(`/api/admin/violations/${VALID_DISPUTE_ID}/note/${VALID_NOTE_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Cập nhật ghi chú mới' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Không có quyền sửa ghi chú của quản trị viên khác/);
    
    // Ensure UPDATE was NOT called
    const hasUpdateCall = pool.query.mock.calls.some(call => call[0].includes('UPDATE dispute_admin_notes'));
    expect(hasUpdateCall).toBe(false);
  });

  test('Allows patching own note and sanitizes input', async () => {
    // Mock the SELECT query to return the SAME admin_id 
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ admin_id: ADMIN_ID }] }) // SELECT
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ note: 'Sanitized &amp; updated' }] }); // UPDATE

    const res = await request(app)
      .patch(`/api/admin/violations/${VALID_DISPUTE_ID}/note/${VALID_NOTE_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Sanitized & updated' });

    expect(res.status).toBe(200);
    
    // Verify sanitization on UPDATE
    const updateCall = pool.query.mock.calls.find(call => call[0].includes('UPDATE dispute_admin_notes'));
    expect(updateCall[1][0]).toBe('Sanitized &amp; updated');
  });
});
