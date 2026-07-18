/**
 * Central API service layer for GST ReconGraph.
 *
 * All requests go through the `apiFetch` wrapper which:
 *  - Prepends VITE_API_BASE_URL (empty in dev — Vite proxy handles /api/*)
 *  - Attaches the JWT Authorization header automatically
 *  - Throws structured ApiError on non-2xx responses
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// ── Error class ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name  = 'ApiError';
    this.status = status;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers ?? {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData — browser sets it with the boundary
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || data.message || detail;
    } catch {
      // ignore parse error
    }
    throw new ApiError(detail, res.status);
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (fullName, email, password) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password }),
    }),

  verifyOtp: (email, otp) =>
    apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resetPasswordRequest: (email) =>
    apiFetch('/api/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPasswordVerify: (email, otp, newPassword) =>
    apiFetch('/api/auth/reset-password-verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  googleLogin: (token, email, name, picture) =>
    apiFetch('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ token, email, name, picture }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation API
// ─────────────────────────────────────────────────────────────────────────────
export const reconApi = {
  /**
   * Upload one or both files via multipart/form-data.
   * @param {File|null} purchaseRegister  - Excel/CSV file
   * @param {File|null} gstr2b            - JSON file
   */
  uploadFiles: (purchaseRegister, gstr2b) => {
    const form = new FormData();
    if (purchaseRegister) form.append('purchase_register', purchaseRegister);
    if (gstr2b)           form.append('gstr2b',           gstr2b);
    return apiFetch('/api/reconciliation/upload', { method: 'POST', body: form });
  },

  /** Trigger the matching engine on previously uploaded files. */
  runReconciliation: () =>
    apiFetch('/api/reconciliation/run', { method: 'POST' }),

  /**
   * Fetch paginated reconciliation results.
   * @param {object} params - { page, limit, status, search }
   */
  getResults: ({ page = 1, limit = 50, status, search } = {}) => {
    const q = new URLSearchParams({ page, limit });
    if (status && status !== 'all') q.set('status', status);
    if (search) q.set('search', search);
    return apiFetch(`/api/reconciliation/results?${q}`);
  },

  /** Aggregate counts for the last reconciliation run. */
  getSummary: () => apiFetch('/api/reconciliation/summary'),

  /** List of recently uploaded files. */
  getUploads: () => apiFetch('/api/reconciliation/uploads'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard API
// ─────────────────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:  () => apiFetch('/api/dashboard/stats'),
  getAlerts: () => apiFetch('/api/dashboard/alerts'),
  getTrend:  () => apiFetch('/api/dashboard/trend'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Fraud API
// ─────────────────────────────────────────────────────────────────────────────
export const fraudApi = {
  getSummary: () => apiFetch('/api/fraud/summary'),
  getCases:   ({ page = 1, limit = 20 } = {}) =>
    apiFetch(`/api/fraud/cases?page=${page}&limit=${limit}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Graph API
// ─────────────────────────────────────────────────────────────────────────────
export const graphApi = {
  getData: (params = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.limit) q.set('limit', params.limit);
    if (params.riskScore) q.set('riskScore', params.riskScore);
    if (params.searchQuery) q.set('searchQuery', params.searchQuery);
    return apiFetch(`/api/graph/data?${q.toString()}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics API
// ─────────────────────────────────────────────────────────────────────────────
export const analyticsApi = {
  /**
   * Aggregate KPI summary for the given fiscal year.
   * Returns: { totalITC, riskITC, invoicesReconciled, suppliersTracked, changes }
   * @param {string} [fy] e.g. "FY 24-25"
   */
  getSummary: (fy) => {
    const q = new URLSearchParams();
    if (fy) q.set('fy', fy);
    return apiFetch(`/api/analytics/summary?${q}`);
  },

  /**
   * Monthly reconciliation breakdown for the given FY.
   * Returns: Array<{ month, matched, partial, missing, itc }>
   * @param {string} [fy]
   */
  getMonthly: (fy) => {
    const q = new URLSearchParams();
    if (fy) q.set('fy', fy);
    return apiFetch(`/api/analytics/monthly?${q}`);
  },

  /**
   * Top suppliers by ITC volume with risk classification.
   * Returns: Array<{ name, gstin, invoices, matched, risk, itc }>
   * @param {string} [fy]
   */
  getSuppliers: (fy) => {
    const q = new URLSearchParams();
    if (fy) q.set('fy', fy);
    return apiFetch(`/api/analytics/suppliers?${q}`);
  },
};
