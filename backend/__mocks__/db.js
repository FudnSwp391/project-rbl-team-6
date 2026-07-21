// Manual mock for backend/db.js — used by all tests via jest.config.js moduleNameMapper.
// pool.query and pool.connect return empty successes by default; individual tests
// override with mockResolvedValueOnce() as needed.

const mockClientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockRelease = jest.fn();
const mockClient = {
  query: mockClientQuery,
  release: mockRelease,
};

const pool = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue(mockClient),
};

module.exports = pool;
module.exports.mockClient = mockClient;
module.exports.mockClientQuery = mockClientQuery;
