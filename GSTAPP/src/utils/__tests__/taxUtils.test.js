import { describe, it, expect } from 'vitest';
import { 
  formatCurrency, 
  getStatusStyles, 
  calculateTaxDifference, 
  getRiskCategory 
} from '../taxUtils';

describe('taxUtils - formatCurrency', () => {
  it('should format numbers into standard INR currency strings', () => {
    // Note: Intl.NumberFormat space formatting might contain non-breaking spaces (\xa0 or standard space).
    // We clean or assert with a regex/substring to be robust.
    const res1 = formatCurrency(125000.00);
    expect(res1).toContain('1,25,000.00');
    expect(res1).toContain('₹');

    const res2 = formatCurrency(0);
    expect(res2).toContain('0.00');

    const res3 = formatCurrency(56000.50);
    expect(res3).toContain('56,000.50');
  });

  it('should gracefully handle null, undefined, or NaN values', () => {
    expect(formatCurrency(null)).toContain('0.00');
    expect(formatCurrency(undefined)).toContain('0.00');
    expect(formatCurrency(NaN)).toContain('0.00');
  });
});

describe('taxUtils - getStatusStyles', () => {
  it('should return correct style classes for exact matches', () => {
    expect(getStatusStyles('Exact')).toBe('bg-green-100 text-green-700 border-green-200');
  });

  it('should return correct style classes for missing matches', () => {
    expect(getStatusStyles('Missing')).toBe('bg-red-100 text-red-700 border-red-200');
  });

  it('should return default style classes for unknown statuses', () => {
    expect(getStatusStyles('Unknown')).toBe('bg-gray-100 text-gray-700 border-gray-200');
  });
});

describe('taxUtils - calculateTaxDifference', () => {
  it('should calculate the absolute difference between taxes', () => {
    expect(calculateTaxDifference(450000, 350000)).toBe(100000);
    expect(calculateTaxDifference(350000, 450000)).toBe(100000);
  });

  it('should handle decimal values properly and round to 2 decimal places', () => {
    expect(calculateTaxDifference(56000.50, 56000.00)).toBe(0.5);
    expect(calculateTaxDifference(10.004, 10.009)).toBe(0.01);
  });

  it('should treat null or undefined inputs as zero', () => {
    expect(calculateTaxDifference(null, 100)).toBe(100);
    expect(calculateTaxDifference(100, undefined)).toBe(100);
  });
});

describe('taxUtils - getRiskCategory', () => {
  it('should categorize high risk scores (> 80)', () => {
    expect(getRiskCategory(81)).toBe('High');
    expect(getRiskCategory(100)).toBe('High');
  });

  it('should categorize medium risk scores (51-80)', () => {
    expect(getRiskCategory(51)).toBe('Medium');
    expect(getRiskCategory(75)).toBe('Medium');
    expect(getRiskCategory(80)).toBe('Medium');
  });

  it('should categorize low risk scores (<= 50)', () => {
    expect(getRiskCategory(0)).toBe('Low');
    expect(getRiskCategory(12)).toBe('Low');
    expect(getRiskCategory(50)).toBe('Low');
  });
});
