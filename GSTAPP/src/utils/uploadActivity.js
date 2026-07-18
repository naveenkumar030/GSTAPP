/**
 * uploadActivity.js
 * Persists upload events to localStorage so the Overview
 * activity ticker can display real upload data.
 */

const STORAGE_KEY = 'gst_upload_activity';
const MAX_EVENTS  = 20;

/**
 * @typedef {Object} UploadEvent
 * @property {string} id        - Unique ID
 * @property {'pr'|'g2b'} type  - File type
 * @property {string} filename  - Original filename
 * @property {number} records   - Number of records parsed
 * @property {number} sizeMB    - File size in MB
 * @property {string} timestamp - ISO timestamp
 * @property {string} gstin     - First GSTIN found (optional)
 */

/**
 * Read all stored upload events (newest first).
 * @returns {UploadEvent[]}
 */
export function getUploadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist a new upload event.
 * @param {Omit<UploadEvent,'id'|'timestamp'>} event
 * @returns {UploadEvent} the stored event
 */
export function addUploadEvent(event) {
  const stored = getUploadEvents();
  const entry = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  // Keep newest MAX_EVENTS only
  const updated = [entry, ...stored].slice(0, MAX_EVENTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch a custom event so same-tab subscribers (e.g. Reports page) are notified immediately.
    window.dispatchEvent(new CustomEvent('gst_upload_activity', { detail: entry }));
  } catch {
    // Storage full — ignore
  }
  return entry;
}

/**
 * Clear all stored upload events.
 */
export function clearUploadEvents() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Convert an UploadEvent into a human-readable ticker line.
 * @param {UploadEvent} ev
 * @returns {{ color: string, text: string }}
 */
export function eventToTicker(ev) {
  const label  = ev.type === 'pr' ? 'Purchase Register' : 'GSTR-2B';
  const recs   = ev.records > 0
    ? `${ev.records.toLocaleString('en-IN')} records`
    : `${ev.sizeMB.toFixed(2)} MB`;
  const color  = ev.type === 'pr' ? 'bg-blue-500' : 'bg-emerald-500';
  const text   = `${label} uploaded — ${ev.filename} · ${recs}`;
  return { color, text };
}

/**
 * Format a timestamp as a relative string.
 * @param {string} iso
 */
export function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 10)    return 'just now';
  if (diff < 120)   return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}
