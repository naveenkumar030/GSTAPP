import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { reconApi } from '../services/api';
import { Outlet } from 'react-router-dom';
import { CheckCircle2, X, AlertTriangle, Info } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import NewAuditModal from './NewAuditModal';
import CommandPalette from './CommandPalette';

/* ── Toast Context ─────────────────────────────────────────── */
export const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-32px)] sm:max-w-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast pointer-events-auto"
          role="alert"
        >
          <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
            t.type === 'success' ? 'bg-green-100 text-green-600' :
            t.type === 'error'   ? 'bg-red-100 text-red-600' :
            t.type === 'warning' ? 'bg-amber-100 text-amber-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {t.type === 'success' ? <CheckCircle2 size={16} /> :
             t.type === 'error'   ? <X size={16} /> :
             t.type === 'warning' ? <AlertTriangle size={16} /> :
             <Info size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            {t.title && <p className="text-[13px] font-semibold text-gray-900">{t.title}</p>}
            <p className="text-[12px] text-gray-600 mt-0.5">{t.message}</p>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Reconciliation Progress Modal ─────────────────────────── */
export const ReconProgressContext = createContext(null);

export function useReconProgress() {
  return useContext(ReconProgressContext);
}

const RECON_STAGES = [
  { id: 'upload',    label: 'Upload Validation',     desc: 'Verifying file integrity and format' },
  { id: 'normalize', label: 'Data Normalization',    desc: 'Standardising GSTIN & invoice formats' },
  { id: 'match',     label: 'Invoice Matching',      desc: 'Comparing PR vs GSTR-2B records' },
  { id: 'duplicate', label: 'Duplicate Detection',   desc: 'Identifying reused invoice numbers' },
  { id: 'fraud',     label: 'Graph Fraud Analysis',  desc: 'Running Neo4j pattern algorithms' },
  { id: 'scoring',   label: 'Risk Scoring',          desc: 'Computing entity risk indicators' },
];

function ReconProgressModal({ onClose, onComplete }) {
  const addToast = useToast();
  const [currentStage, setCurrentStage] = useState(0);
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const [reconError, setReconError] = useState('');
  const [summary, setSummary] = useState(null);
  const apiCalledRef = useRef(false);
  const doneRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (apiCalledRef.current) return;
    apiCalledRef.current = true;

    const total = RECON_STAGES.length;
    let stage = 0;

    // Animate through stages while API runs
    const advance = () => {
      if (doneRef.current) return;
      if (stage >= total - 1) return; // hold at last stage until API finishes
      setCurrentStage(stage);
      setPct(Math.round((stage / total) * 100));
      stage++;
      const delay = 700 + Math.random() * 500;
      timerRef.current = setTimeout(advance, delay);
    };
    timerRef.current = setTimeout(advance, 400);

    // Call the actual Python reconciliation API
    reconApi.runReconciliation()
      .then((result) => {
        doneRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        setSummary(result?.summary || null);
        setCurrentStage(total - 1);
        setPct(100);
        setDone(true);
        window.dispatchEvent(new Event('reconciliation_completed'));

        if (result.neo4j_connected === false) {
          addToast({
            type: 'warning',
            title: 'Neo4j Database Offline',
            message: 'Graph verification bypassed. Cross-checked with S3 / local reference dataset.',
          });
        } else if (result.neo4j_connected) {
          addToast({
            type: 'success',
            title: 'Graph Verified',
            message: 'Checked successfully against Neo4j and S3 databases.',
          });
        }

        if (onComplete) onComplete(result?.summary);
      })
      .catch((err) => {
        doneRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        setReconError(err.message || 'Reconciliation failed.');
        setDone(true);
        setPct(100);
        if (onComplete) onComplete(null);
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (done) setPct(100);
  }, [done]);

  return (
    <div className="overlay" onClick={done ? onClose : undefined}>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[calc(100vw-24px)] sm:max-w-[92vw] bg-white rounded-2xl shadow-modal z-[100] animate-slide-in-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-gray-900">
                {done ? 'Reconciliation Complete' : 'Running Reconciliation…'}
              </h2>
              <p className="text-[12px] text-gray-500 mt-0.5">FY 2024-25 · Q1 Apr–Jun</p>
            </div>
            {done && (
              <button onClick={onClose} className="btn-icon" aria-label="Close">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="font-medium text-gray-700">
                {done ? 'All stages complete' : RECON_STAGES[currentStage]?.label}
              </span>
              <span className="font-bold text-blue-600">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: done
                    ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                    : 'linear-gradient(90deg, #2563EB, #3B82F6)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Stages */}
        <div className="px-6 py-4 space-y-1">
          {RECON_STAGES.map((stage, i) => {
            const isComplete = i < currentStage || done;
            const isCurrent  = i === currentStage && !done;
            const isPending  = i > currentStage && !done;
            return (
              <div key={stage.id} className="flex items-start gap-3 py-1.5">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-all duration-300 ${
                  isComplete ? 'bg-green-100 text-green-600' :
                  isCurrent  ? 'bg-blue-100 text-blue-600 animate-pulse' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isComplete ? <CheckCircle2 size={12} /> :
                   isCurrent  ? <div className="w-2 h-2 rounded-full bg-blue-500" /> :
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium leading-tight ${
                    isComplete ? 'text-gray-900' :
                    isCurrent  ? 'text-blue-700' :
                    'text-gray-400'
                  }`}>{stage.label}</p>
                  {isCurrent && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{stage.desc}</p>
                  )}
                </div>
                {isComplete && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">Done</span>
                )}
                {isPending && (
                  <span className="text-[10px] text-gray-400 shrink-0">Queued</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {done && (
          <div className="px-6 pb-6 pt-2">
            {reconError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                <X size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-red-900">Reconciliation failed</p>
                  <p className="text-[12px] text-red-700 mt-0.5">{reconError}</p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-green-900">Reconciliation successful</p>
                  <p className="text-[12px] text-green-700 mt-0.5">
                    {summary
                      ? `${summary.exact} exact · ${summary.partial} partial · ${summary.missing} missing · ${summary.duplicate} duplicates`
                      : 'Processing complete.'}
                  </p>
                </div>
              </div>
            )}
            <button onClick={onClose} className="btn-primary w-full justify-center">
              View Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Layout ────────────────────────────────────────────────── */
export default function Layout() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [toasts, setToasts]           = useState([]);
  const [showRecon, setShowRecon]     = useState(false);
  const [showNewAudit, setShowNewAudit] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
        setCollapsed(true);
      } else if (window.innerWidth >= 1280) {
        setCollapsed(false);
      }
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type: 'info', ...toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [reconSummary, setReconSummary] = useState(null);

  const handleNewAuditSubmit = useCallback((data) => {
    addToast({ type: 'success', title: 'Audit Created', message: `Created audit: ${data.title}` });
  }, [addToast]);

  const openRecon = useCallback(() => setShowRecon(true), []);
  const handleReconComplete = useCallback((summary) => {
    setReconSummary(summary);
  }, []);
  const closeRecon = useCallback(() => {
    setShowRecon(false);
    if (reconSummary) {
      addToast({
        type: 'success',
        title: 'Reconciliation Complete',
        message: `${reconSummary.exact} exact · ${reconSummary.partial} partial · ${reconSummary.missing} missing`,
      });
    } else {
      addToast({ type: 'info', title: 'Reconciliation', message: 'Process complete.' });
    }
    setReconSummary(null);
  }, [addToast, reconSummary]);

  return (
    <ToastContext.Provider value={addToast}>
      <ReconProgressContext.Provider value={openRecon}>
        <div className="h-screen w-full flex bg-[#F8FAFC] text-[#0F172A] antialiased overflow-hidden">

          {/* Desktop Sidebar */}
          <div className="hidden md:flex shrink-0 h-full z-40">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onNewAudit={() => setShowNewAudit(true)} />
          </div>

          {/* Mobile Drawer Overlay */}
          {mobileOpen && (
            <div
              className="overlay md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Mobile Drawer */}
          <div className={`fixed inset-y-0 left-0 z-50 w-[240px] transform transition-transform duration-250 ease-out md:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <Sidebar collapsed={false} setMobileOpen={setMobileOpen} onNewAudit={() => setShowNewAudit(true)} />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
            <Header
              toggleMobileOpen={() => setMobileOpen(true)}
              onOpenSearch={() => setPaletteOpen(true)}
            />

            <main className="flex-1 overflow-auto bg-[#F8FAFC]">
              <div className="max-w-[1600px] mx-auto px-3 py-4 sm:px-4 sm:py-4 md:p-5 lg:p-6 pb-24">
                <Outlet />
              </div>
            </main>
          </div>

          {/* Global Toasts */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />

          {/* Command Palette */}
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

          {/* Reconciliation Progress Modal */}
          {showRecon && <ReconProgressModal onClose={closeRecon} onComplete={handleReconComplete} />}

          {/* New Audit Modal */}
          {showNewAudit && (
            <NewAuditModal
              onClose={() => setShowNewAudit(false)}
              onSubmit={handleNewAuditSubmit}
            />
          )}
        </div>
      </ReconProgressContext.Provider>
    </ToastContext.Provider>
  );
}
