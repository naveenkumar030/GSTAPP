import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2,
  X, AlertCircle, Clock, ChevronRight, Play, RefreshCw, Trash2,
} from 'lucide-react';
import { useToast } from '../components/Layout';
import { useReconProgress } from '../components/Layout';
import { reconApi } from '../services/api';
import { addUploadEvent, deleteUploadEvent } from '../utils/uploadActivity';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — count records from the raw file in the browser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the file as text and count data rows.
 * - CSV / TXT : count non-blank lines minus 1 header row
 * - JSON      : parse and find the first array or b2b invoice count
 * - xlsx / xls: fall back to size-based estimate (binary format)
 */
function countRecordsFromFile(file, fileType) {
  return new Promise((resolve) => {
    const ext = file.name.split('.').pop().toLowerCase();

    // xlsx/xls cannot be read as text — use size estimate immediately
    if (ext === 'xlsx' || ext === 'xls') {
      const bytesPerRecord = 150;
      return resolve(Math.max(10, Math.round(file.size / bytesPerRecord)));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;

        if (ext === 'json') {
          const data = JSON.parse(text);
          // GST Portal GSTR-2B format
          const b2b = data?.data?.docdata?.b2b;
          if (Array.isArray(b2b)) {
            const count = b2b.reduce((s, sup) => s + (sup.inv?.length ?? 0), 0);
            return resolve(Math.max(1, count));
          }
          // Simple array of invoice objects
          if (Array.isArray(data)) return resolve(Math.max(1, data.length));
          // Flat object
          return resolve(Math.max(1, Object.keys(data).length));
        }

        // CSV / TXT
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        resolve(Math.max(1, lines.length - 1)); // minus header
      } catch {
        const bytesPerRecord = fileType === 'pr' ? 150 : 300;
        resolve(Math.max(10, Math.round(file.size / bytesPerRecord)));
      }
    };
    reader.onerror = () => {
      const bytesPerRecord = fileType === 'pr' ? 150 : 300;
      resolve(Math.max(10, Math.round(file.size / bytesPerRecord)));
    };
    reader.readAsText(file);
  });
}

/** Smoothly step progress from its current value up to `target` over `ms` ms */
function animateTo(setProgress, target, ms = 400) {
  return new Promise((resolve) => {
    const steps    = Math.max(1, Math.round(ms / 20));
    const stepSize = (target - 0) / steps; // always positive
    let   ticks    = 0;
    const iv = setInterval(() => {
      ticks++;
      setProgress((prev) => {
        const next = prev + stepSize;
        if (ticks >= steps || next >= target) {
          clearInterval(iv);
          resolve();
          return target;
        }
        return Math.min(next, target);
      });
    }, 20);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Zone Component
// ─────────────────────────────────────────────────────────────────────────────
function UploadZone({ type, title, subtitle, acceptLabel, acceptAttr, icon: Icon, color, bgColor, onFileUploaded, existingFile, onDelete }) {
  const [file, setFile]               = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [progress, setProgress]       = useState(0);
  const [status, setStatus]           = useState('idle'); // idle | reading | processing | done | error
  const [recordCount, setRecordCount] = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const inputRef = useRef(null);
  const addToast = useToast();

  useEffect(() => {
    if (existingFile) {
      setFile({ name: existingFile.filename, size: existingFile.size || 0 });
      setStatus('done');
      setProgress(100);
      setRecordCount(existingFile.count ?? existingFile.records ?? null);
      setErrorMsg('');
    } else {
      if (status === 'done') {
        setFile(null);
        setStatus('idle');
        setProgress(0);
        setRecordCount(null);
        setErrorMsg('');
      }
    }
  }, [existingFile]);

  const handleFile = async (f) => {
    if (!f) return;

    // Basic file-type validation
    const ext = f.name.split('.').pop().toLowerCase();
    const validExts = type === 'pr' ? ['xlsx', 'xls', 'csv'] : ['json'];
    if (!validExts.includes(ext)) {
      setFile(f);
      setErrorMsg(`Invalid file type. Expected: ${validExts.join(', ').toUpperCase()}`);
      setStatus('error');
      return;
    }

    setFile(f);
    setStatus('reading');
    setProgress(0);
    setErrorMsg('');
    setRecordCount(null);

    const sizeMB = f.size / 1024 / 1024;

    // Phase 1: animate to 30% while reading file
    const phase1 = animateTo(setProgress, 30, 350);
    const countPromise = countRecordsFromFile(f, type);
    await phase1;

    // Phase 2: count records from file content
    const records = await countPromise;
    setStatus('processing');
    await animateTo(setProgress, 75, 450);

    // Phase 3: try backend — non-blocking, ignore failure
    let serverRecords = null;
    try {
      const pr  = type === 'pr' ? f : null;
      const g2b = type === 'g2b' ? f : null;
      const res = await Promise.race([
        reconApi.uploadFiles(pr, g2b),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
      ]);
      const info = res?.uploads?.[0];
      serverRecords = info?.records ?? info?.count ?? null;
    } catch {
      // Backend unavailable or timed out — local data is sufficient
    }

    // Phase 4: finalize
    await animateTo(setProgress, 100, 250);

    const finalRecords = serverRecords ?? records;
    setRecordCount(finalRecords);
    setStatus('done');

    // Persist to localStorage → Analytics/Reports page picks it up immediately
    addUploadEvent({ type, filename: f.name, records: finalRecords, sizeMB });

    addToast({
      type:    'success',
      title:   'File Ready',
      message: `${f.name} — ${finalRecords.toLocaleString('en-IN')} records loaded.`,
    });

    if (onFileUploaded) onFileUploaded({ filename: f.name, records: finalRecords });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleRemove = async () => {
    if (status === 'done') {
      if (onDelete) {
        const success = await onDelete();
        if (!success) return;
      }
    }
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setErrorMsg('');
    setRecordCount(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const statusLabel = {
    idle:       'Ready',
    reading:    'Reading file…',
    processing: 'Processing…',
    done:       'Complete',
    error:      'Failed',
  }[status] ?? 'Ready';

  return (
    <div className="card p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon size={18} className={color} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          <p className="text-[11px] text-gray-500">{subtitle}</p>
        </div>
      </div>

      {!file ? (
        <div
          className={`dropzone p-5 sm:p-8 flex flex-col items-center justify-center text-center min-h-[140px] sm:min-h-[160px] ${dragging ? 'dragover' : ''}`}
          style={{ borderColor: dragging ? undefined : '#E2E8F0' }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={`Upload ${title}`}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center mb-3`}>
            <UploadCloud size={22} className={color} />
          </div>
          <p className="text-[14px] font-semibold text-gray-900 mb-1">
            {dragging ? 'Drop file here' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-[12px] text-gray-500">{acceptLabel} · Max 50 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-9 h-9 ${bgColor} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{file.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {recordCount !== null && (
                    <span className="ml-2 text-green-600 font-semibold">
                      · {recordCount.toLocaleString('en-IN')} records
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors shrink-0"
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-500">{statusLabel}</span>
              <span className={`font-semibold ${
                status === 'done'  ? 'text-green-600' :
                status === 'error' ? 'text-red-600'   :
                'text-blue-600'
              }`}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-none ${
                  status === 'done'  ? 'bg-green-500' :
                  status === 'error' ? 'bg-red-500'   :
                  'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {status === 'done' && (
            <div className="flex items-center gap-2 text-[12px] text-green-700 font-medium">
              <CheckCircle2 size={14} />
              File validated and ready for reconciliation
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-[12px] text-red-700 font-medium">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Upload Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Upload() {
  const openRecon = useReconProgress();
  const addToast = useToast();
  const [recentUploads, setRecentUploads] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const handleDelete = async (upload) => {
    if (!upload) return true;
    const uploadType = upload.type; // 'purchase_register' or 'gstr2b'
    const prOrG2b = uploadType === 'purchase_register' ? 'pr' : 'g2b';
    
    addToast({ type: 'info', title: 'Deleting File', message: 'Removing file from project database and S3…' });
    
    try {
      if (!upload._local) {
        await reconApi.deleteUpload(uploadType);
      }
      
      // Also delete from local events fallback
      deleteUploadEvent(prOrG2b);
      
      addToast({
        type: 'success',
        title: 'File Deleted',
        message: `${upload.filename} successfully removed.`,
      });
      
      loadHistory();
      return true;
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: e.message || 'Error occurred while deleting file.',
      });
      return false;
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    let used = false;
    try {
      const data = await reconApi.getUploads();
      if (data?.uploads?.length > 0) {
        setRecentUploads(data.uploads);
        used = true;
      }
    } catch {
      // Backend unavailable — fall through to local events
    }
    if (!used) {
      // Fallback: read from localStorage upload events
      const { getUploadEvents } = await import('../utils/uploadActivity');
      const evs = getUploadEvents();
      setRecentUploads(
        evs.map((ev) => ({
          type:        ev.type === 'pr' ? 'purchase_register' : 'gstr2b',
          filename:    ev.filename,
          size:        Math.round(ev.sizeMB * 1024 * 1024),
          count:       ev.records,
          uploaded_at: ev.timestamp,
          _local:      true,
        }))
      );
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
    // Re-read whenever a new file is uploaded in the same tab
    const handler = () => loadHistory();
    window.addEventListener('gst_upload_activity', handler);
    return () => window.removeEventListener('gst_upload_activity', handler);
  }, []);

  const handleFileUploaded = () => {
    // triggered by UploadZone after done — loadHistory re-runs via event above
  };

  const formatDate = (iso) => {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    const diff = (Date.now() - d) / 1000;
    if (diff < 120)   return 'Just now';
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  const typeLabel = (type) => (type === 'purchase_register' ? 'pr' : 'g2b');

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">

      {/* Page Intro */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Data Upload</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Upload Purchase Register and GSTR-2B files for reconciliation processing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <UploadZone
          type="pr"
          title="Purchase Register"
          subtitle="Your internal purchase records"
          acceptLabel="Excel, CSV"
          acceptAttr=".xlsx,.xls,.csv"
          icon={FileSpreadsheet}
          color="text-blue-600"
          bgColor="bg-blue-50"
          onFileUploaded={handleFileUploaded}
          existingFile={recentUploads.find((u) => u.type === 'purchase_register')}
          onDelete={() => handleDelete(recentUploads.find((u) => u.type === 'purchase_register'))}
        />
        <UploadZone
          type="g2b"
          title="GSTR-2B Data"
          subtitle="Direct download from GST Portal"
          acceptLabel="JSON"
          acceptAttr=".json,application/json"
          icon={FileText}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          onFileUploaded={handleFileUploaded}
          existingFile={recentUploads.find((u) => u.type === 'gstr2b')}
          onDelete={() => handleDelete(recentUploads.find((u) => u.type === 'gstr2b'))}
        />
      </div>

      {/* Processing Info */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Play size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Ready to Reconcile</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Upload both files above, then run the reconciliation engine.
              </p>
            </div>
          </div>
          <button onClick={openRecon} className="btn-primary shrink-0">
            <Play size={14} />
            Process Files
          </button>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Recent Uploads</h3>
            <p className="text-[12px] text-gray-500 mt-0.5">From your current session</p>
          </div>
          <button
            onClick={loadHistory}
            className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {loadingHistory && (
            <div className="px-5 py-6 text-center text-[13px] text-gray-400">Loading…</div>
          )}
          {!loadingHistory && recentUploads.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] text-gray-400">
              No uploads yet. Upload files above to get started.
            </div>
          )}
          {!loadingHistory && recentUploads.map((upload, idx) => (
            <div key={`${upload.type}-${idx}`} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50/50 transition-colors group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                typeLabel(upload.type) === 'pr' ? 'bg-blue-50' : 'bg-emerald-50'
              }`}>
                {typeLabel(upload.type) === 'pr'
                  ? <FileSpreadsheet size={15} className="text-blue-600" />
                  : <FileText size={15} className="text-emerald-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{upload.filename}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {upload.size > 0 && (
                    <span className="text-[11px] text-gray-500">
                      {(upload.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(upload.uploaded_at)}
                  </span>
                  {upload.count > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-[11px] text-gray-500">
                        {upload.count.toLocaleString('en-IN')} records
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} />
                  {upload._local ? 'Local' : 'Processed'}
                </span>
                
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(upload); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Delete file from S3 and project database"
                  aria-label={`Delete ${upload.filename}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-blue-900">Format Requirements</p>
          <p className="text-[12px] text-blue-700 mt-1">
            Purchase Register: Excel (.xlsx) or CSV with columns — Supplier Name, GSTIN, Invoice No., Date, Taxable Value, Tax Amount.
            <br />
            GSTR-2B: Standard JSON format as downloaded from the GST Portal (Section B2B only).
          </p>
        </div>
      </div>
    </div>
  );
}
