/**
 * Utility functions for tax calculations, currency formatting, and state stylings.
 */

/**
 * Formats a numeric value into INR currency string.
 * @param {number} value - The numeric amount to format.
 * @returns {string} - Formatted currency string.
 */
export function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
}

/**
 * Determines CSS class styles based on invoice reconciliation status.
 * @param {string} status - Reconciliation status.
 * @returns {string} - CSS class names.
 */
export function getStatusStyles(status) {
  switch (status) {
    case 'Exact':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'Partial':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Missing':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'Duplicate':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Fraud':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Under Review':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/**
 * Calculates absolute tax difference rounded to two decimal places.
 * @param {number} prTax - Purchase Register Tax.
 * @param {number} g2bTax - GSTR-2B Tax.
 * @returns {number} - Absolute tax difference.
 */
export function calculateTaxDifference(prTax, g2bTax) {
  const p = prTax || 0;
  const g = g2bTax || 0;
  const diff = Math.abs(p - g);
  return Math.round(diff * 100) / 100;
}

/**
 * Determines risk category based on score.
 * @param {number} score - Risk score (0 - 100).
 * @returns {string} - Risk classification.
 */
export function getRiskCategory(score) {
  if (score > 80) return 'High';
  if (score > 50) return 'Medium';
  return 'Low';
}
