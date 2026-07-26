/**
 * Task 5.1 — AI Proxy API Tests
 * Tests for POST /api/admin/violations/:id/copilot-analyze
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

const VALID_DISPUTE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('POST /api/admin/violations/:id/copilot-analyze', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('Degrades gracefully to fallback state on AI service timeout', async () => {
    // 1. Mock DB query to return a valid violation
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: VALID_DISPUTE_ID,
        reason: 'Lý do test',
        status: 'PENDING',
        investigation_status: 'OPEN',
        severity: 'high'
      }]
    });

    // 2. Mock global.fetch to simulate a hanging request that never resolves
    global.fetch = jest.fn(() => new Promise(() => {}));

    // 3. Initiate the request
    const res = await request(app)
      .post(`/api/admin/violations/${VALID_DISPUTE_ID}/copilot-analyze`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 4. Assertions
    expect(res.status).toBe(200); // We return a 200 with fallback data
    expect(res.body.success).toBe(false);
    expect(res.body.fallback).toBe(true);
    expect(res.body.data.risk_score).toBe(50);
    expect(res.body.data.risk_level).toBe('UNKNOWN');
    expect(res.body.data.analysis).toMatch(/thời gian phản hồi/i);
    
    // Ensure DB was not mutated (no UPDATE statements)
    const hasUpdateCall = pool.query.mock.calls.some(call => call[0].includes('UPDATE'));
    expect(hasUpdateCall).toBe(false);
  }, 10000);
  
  test('Returns successful parsed response from AI', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: VALID_DISPUTE_ID,
        reason: 'Lý do test',
      }]
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '{"risk_score": 85, "risk_level": "HIGH", "analysis": "Tested."}' }]
          }
        }]
      })
    });

    const res = await request(app)
      .post(`/api/admin/violations/${VALID_DISPUTE_ID}/copilot-analyze`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.risk_score).toBe(85);
    expect(res.body.data.risk_level).toBe('HIGH');
    expect(res.body.data.analysis).toBe('Tested.');
  });
});
