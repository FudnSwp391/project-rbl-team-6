import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Violations from './Violations';

// Mock the CSS imports and any missing browser globals if needed
beforeAll(() => {
  global.fetch = jest.fn();
});

jest.mock('../config', () => ({
  API_BASE_URL: 'http://localhost:5000'
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('token', 'fake-token');
});

const mockViolationsData = {
  violations: [
    {
      id: 'disp-001',
      accused_name: 'John Tutor',
      accused_email: 'john@example.com',
      reason: 'Did not attend class',
      severity: 'high',
      investigation_status: 'OPEN',
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 days ago
    },
    {
      id: 'disp-002',
      accused_name: 'Jane Student',
      accused_email: 'jane@example.com',
      reason: 'Inappropriate language',
      severity: 'critical',
      investigation_status: 'INVESTIGATING',
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    }
  ],
  total: 2,
  by_status: { 'OPEN': 1, 'RESOLVED': 0 },
  by_severity: { 'high': 1, 'critical': 1 },
  page: 1,
  limit: 10,
  total_pages: 1
};

describe('Violations UI', () => {
  it('renders KPI cards correctly based on API data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockViolationsData
    });

    render(<Violations />);

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('disp-001...')).toBeInTheDocument();
    });

    // Check KPIs
    expect(screen.getByText('Tổng Vụ Việc')).toBeInTheDocument();
    // In our mocked data, total is 2 (and another KPI also has 2)
    expect(screen.getAllByText('2', { selector: 'div' }).length).toBeGreaterThanOrEqual(1);

    // Check Open cases
    expect(screen.getByText('Đang Mở')).toBeInTheDocument();
    // from by_status['OPEN'] = 1
    expect(screen.getAllByText('1', { selector: 'div' }).length).toBeGreaterThanOrEqual(1);

    // Check Critical/High cases
    expect(screen.getByText('Nghiêm Trọng/Cao')).toBeInTheDocument();
    // high (1) + critical (1) = 2
    expect(screen.getAllByText('2', { selector: 'div' }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the table rows with Severity, Age, and Prior Cases', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockViolationsData
    });

    render(<Violations />);

    await waitFor(() => {
      expect(screen.getByText('John Tutor')).toBeInTheDocument();
    });

    // Severity badges (also appear in <option>)
    expect(screen.getAllByText('Cao').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nghiêm trọng').length).toBeGreaterThanOrEqual(1);

    // Investigation status (also appear in <option>)
    expect(screen.getAllByText('Mở').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Đang điều tra').length).toBeGreaterThanOrEqual(1);

    // Check Age is rendered
    expect(screen.getByText('2 ngày')).toBeInTheDocument();
    expect(screen.getByText('5 giờ')).toBeInTheDocument();

    // Prior Cases placeholder (should be '0')
    const priorCases = screen.getAllByText('0');
    expect(priorCases.length).toBeGreaterThanOrEqual(2);

    // Verify AI score is nowhere to be found
    expect(screen.queryByText(/AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Risk Score/i)).not.toBeInTheDocument();
  });

  it('applies filters and debounces API calls', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockViolationsData
    });

    render(<Violations />);
    
    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Change status filter
    const statusSelect = screen.getAllByRole('combobox')[0]; // first select is status
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });

    // Should not call immediately due to debounce
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Wait for debounce (300ms)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const secondCallUrl = global.fetch.mock.calls[1][0];
    expect(secondCallUrl).toContain('investigation_status=OPEN');
  });

  it('renders empty state when no data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        violations: [],
        total: 0,
        by_status: {},
        by_severity: {},
        total_pages: 0
      })
    });

    render(<Violations />);

    await waitFor(() => {
      expect(screen.getByText('Không có vụ việc nào')).toBeInTheDocument();
    });
  });
});
