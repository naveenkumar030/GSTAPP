import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAnalyticsSnapshot } from '../analyticsStore';
import * as uploadActivity from '../uploadActivity';

describe('analyticsStore getAnalyticsSnapshot', () => {
  let getUploadEventsSpy;

  beforeEach(() => {
    getUploadEventsSpy = vi.spyOn(uploadActivity, 'getUploadEvents');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return hasData: false when there are no events', () => {
    getUploadEventsSpy.mockReturnValue([]);
    const result = getAnalyticsSnapshot('FY 26-27');
    expect(result.hasData).toBe(false);
    expect(result.summary.totalITC).toBe(0);
    expect(result.suppliers).toEqual([]);
  });

  it('should return hasData: true and process metrics when events are present', () => {
    const mockEvents = [
      {
        id: '1',
        type: 'pr',
        filename: 'purchase_register.csv',
        records: 10,
        sizeMB: 0.1,
        timestamp: '2026-06-15T10:00:00Z',
        gstin: '27APEX9999F1Z1',
      },
      {
        id: '2',
        type: 'g2b',
        filename: 'gstr2b.json',
        records: 20,
        sizeMB: 0.2,
        timestamp: '2026-07-20T11:00:00Z',
        gstin: '29GOOD1111G1Z1',
      }
    ];
    getUploadEventsSpy.mockReturnValue(mockEvents);

    const result = getAnalyticsSnapshot('FY 26-27');
    expect(result.hasData).toBe(true);
    expect(result.summary.totalITC).toBe(30 * 25000); // 30 records * avgITCPerRecord (25000)
    expect(result.summary.invoicesReconciled).toBe(30);
    expect(result.summary.suppliersTracked).toBe(2);
    expect(result.suppliers.length).toBe(2);
    expect(result.suppliers[0].name).toBe('Purchase Register');
    expect(result.suppliers[1].name).toBe('Gstr2b');
  });
});
