import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import {
  ZoomIn, ZoomOut, Maximize, ShieldAlert, X,
  Download, LayoutTemplate, Activity, AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { graphApi } from '../services/api';

const logoImage = new Image();
logoImage.src = '/logo.png';

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_META = {
  High:   { color:'#991B1B', glow:'#EF4444', border:'#DC2626', label:'HIGH',   min:81, icon:'⚠️' },
  Medium: { color:'#92400E', glow:'#F97316', border:'#EA580C', label:'MEDIUM', min:51, icon:'🔶' },
  Low:    { color:'#713F12', glow:'#EAB308', border:'#CA8A04', label:'LOW',    min:0,  icon:'🟡' },
};

const FRAUD_REL = {
  DUPLICATE:       { color:'#EF4444', width:3, dash:[]     },
  FAKE_GSTIN:      { color:'#4B5563', width:2.5, dash:[3,3]  },
  CIRCULAR_TRADING:{ color:'#8B5CF6', width:3, dash:[7,4]  },
  MISSING_GSTR2B:  { color:'#F97316', width:2.5, dash:[4,3]  },
  MISMATCH:        { color:'#DC2626', width:2.5, dash:[]     },
  SUSPICIOUS:      { color:'#EF4444', width:2, dash:[]     },
  CONNECTED_TO:    { color:'#9CA3AF', width:1, dash:[]     },
};

const NODE_ICON = {
  Taxpayer: '🏢', Company:'🏢', HighRisk:'⚠️', Invoice:'📄',
  Supplier:'📦', Buyer:'🛒', GSTR2B:'📊', PurchaseRegister:'🧾', GSTIN:'🔑',
};

const TIMELINE_STEPS = [
  { key:'created',     label:'Invoice Created',      icon:'📄' },
  { key:'uploaded',    label:'Purchase Uploaded',    icon:'⬆️' },
  { key:'filed',       label:'GSTR2B Filed',         icon:'📊' },
  { key:'mismatch',    label:'Mismatch Found',       icon:'⚡' },
  { key:'detected',    label:'Fraud Detected',       icon:'🚨' },
  { key:'investigated',label:'Investigation Started',icon:'🔍' },
];

// ─── Utility ──────────────────────────────────────────────────────────────────
function getRiskLevel(score) {
  if (score == null) return null;
  if (score > 80) return 'High';
  if (score > 50) return 'Medium';
  return 'Low';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getNodeDescription(node) {
  if (!node) return '';
  const label = node.labelType || node.label || 'Unknown';
  const name = node.name || node.id;
  const gstin = node.gstin || '';
  const state = node.state || '';
  const score = node.riskScore ?? 0;
  const status = node.status || '';
  const amount = node.amount || '';
  const taxDiff = node.taxDiff || '';
  const count = node.invoiceCount || 0;
  const period = node.period || '';
  const fraudType = node.fraudType || '';

  if (label === 'Company' || label === 'Taxpayer') {
    return `Central taxpayer profile for ${name}. It is registered in ${state || 'its home state'} under GSTIN ${gstin || 'N/A'}. For this period, it records ${count || 'zero'} invoices totaling ${node.taxAmount || 'N/A'} in Input Tax Credit (ITC) claims.`;
  }
  
  if (label === 'Supplier') {
    let desc = `Supplier ${name} (GSTIN: ${gstin || 'N/A'}), registered in ${state || 'N/A'}, has transacted ${count} invoice${count !== 1 ? 's' : ''} representing ${node.taxAmount || amount || 'N/A'} in tax value. `;
    if (score > 50) {
      desc += `It has a moderate risk score of ${score}/100. Verification checks recommend reconciling all linked invoices.`;
    } else {
      desc += `It has a low risk score of ${score}/100 and appears to be compliant.`;
    }
    return desc;
  }

  if (label === 'HighRisk' || label === 'Fraud') {
    let desc = `High-risk entity ${name} (GSTIN: ${gstin || 'N/A'}) has a risk score of ${score}/100. `;
    if (fraudType) {
      desc += `It is flagged for potential ${fraudType} behavior. `;
    }
    desc += `It has transacted ${count} invoice${count !== 1 ? 's' : ''} representing ${node.taxAmount || amount || 'N/A'} in tax value, with a tax difference of ${taxDiff || 'N/A'} in disputed filings. Immediate audit recommended.`;
    return desc;
  }

  if (label === 'Invoice') {
    if (status === 'Duplicate') {
      return `Suspicious invoice ${name} issued by GSTIN ${gstin || 'N/A'} for ${amount || 'N/A'}. It is flagged as DUPLICATE, meaning the same invoice number has been reused to claim double ITC.`;
    }
    if (status === 'Missing') {
      return `Unreconciled invoice ${name} of value ${amount || 'N/A'}. It was declared in the purchase register but is MISSING from GSTR-2B filings, indicating the supplier has not paid the tax.`;
    }
    if (status === 'Partial' || status === 'Mismatch') {
      return `Mismatched invoice ${name} of value ${amount || 'N/A'}. There is a tax difference of ${taxDiff || 'N/A'} between the purchase register and the supplier's GSTR-2B filing.`;
    }
    return `Matched invoice ${name} of value ${amount || 'N/A'}, successfully reconciled between GSTR-2B and the purchase register.`;
  }

  if (label === 'GSTIN') {
    const statusText = node.type || 'Unknown';
    return `GSTIN registration ${name} is registered in ${state || 'N/A'}. Current verification status is ${statusText.toUpperCase()} (registered on ${node.regDate || 'N/A'}).`;
  }

  if (label === 'PurchaseRegister') {
    return `Internal Purchase Register statement for the period ${period}. It records ${node.totalInvoices || 0} invoices, with ${node.matched || 0} matched and ${node.unmatched || 0} unmatched entries.`;
  }

  if (label === 'GSTR2B') {
    return `Auto-populated GSTR-2B statement for ${period} generated by the GST portal. It lists eligible ITC of ${node.totalITC || 'N/A'}, against which your company claimed ${node.claimedITC || 'N/A'}.`;
  }

  return `Unclassified network node ${name} (Type: ${label}) with risk score ${score}/100.`;
}


// No mock data — fraud graph is only populated from real API after file upload + reconciliation.


export default function FraudGraph() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode]       = useState(null);
  const [graphData, setGraphData]       = useState({ nodes: [], links: [] });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [layoutMode, setLayoutMode]     = useState('Force');
  const [activeTab, setActiveTab]       = useState('details');

  const fgRef        = useRef();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel]   = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await graphApi.getData({ type: 'fraud', riskScore: 50 });

      // Filter to fraud-only
      const fraudNodes = raw.nodes.filter(n => (n.riskScore ?? 0) >= 50 || n.label === 'HighRisk');
      const fraudIds   = new Set(fraudNodes.map(n => n.id));

      // Collect all invoice IDs that are connected to high-risk suppliers
      const highRiskInvoices = new Set();
      raw.links.forEach(l => {
        const sid = l.source?.id ?? l.source;
        const tid = l.target?.id ?? l.target;
        if (fraudIds.has(sid) && l.type === 'ISSUED') {
          highRiskInvoices.add(tid);
        }
      });

      const links = raw.links.filter(l => {
        const sid = l.source?.id ?? l.source;
        const tid = l.target?.id ?? l.target;
        return fraudIds.has(sid) || fraudIds.has(tid) ||
               highRiskInvoices.has(sid) || highRiskInvoices.has(tid) ||
               ['DUPLICATE','FAKE_GSTIN','CIRCULAR_TRADING','MISMATCH','MISSING_GSTR2B'].includes(l.type);
      });

      const connectedIds = new Set();
      links.forEach(l => {
        connectedIds.add(l.source?.id ?? l.source);
        connectedIds.add(l.target?.id ?? l.target);
      });

      const nodes = raw.nodes
        .filter(n => connectedIds.has(n.id))
        .map(n => {
          const rs  = n.riskScore ?? 0;
          const rl  = getRiskLevel(rs);
          const meta= rl ? RISK_META[rl] : null;
          return {
            ...n,
            riskLevel: rl || 'Low',
            size: rs > 80 ? 18 : rs > 50 ? 13 : 9,
            glowColor: meta?.glow || '#9CA3AF',
            nodeColor: meta?.color || '#6B7280',
            borderColor: meta?.border || '#9CA3AF',
            neighbors: new Set(), links: []
          };
        });

      links.forEach(l => {
        const sid = l.source?.id ?? l.source;
        const tid = l.target?.id ?? l.target;
        const sn  = nodes.find(n => n.id === sid);
        const tn  = nodes.find(n => n.id === tid);
        if (sn && tn) { sn.neighbors.add(tn.id); tn.neighbors.add(sn.id); }
      });

      setGraphData({ nodes, links });
    } catch (e) {
      setError(e.message || 'Failed to load fraud graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ─── D3 forces per layout ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    const fg = fgRef.current;
    fg.d3Force('collide', d3.forceCollide().radius(n => (n.size || 9) + 18).iterations(3));
    if (layoutMode === 'Radial') {
      fg.d3Force('charge').strength(-150);
      fg.d3Force('radial', d3.forceRadial(220, 0, 0).strength(1));
    } else {
      fg.d3Force('charge').strength(-480);
      fg.d3Force('radial', null);
    }
    fg.d3Force('link').distance(140);
    fg.d3ReheatSimulation();
  }, [layoutMode, graphData]);

  // ─── Export PNG ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `fraud-graph-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const renderNode = useCallback((node, ctx, globalScale) => {
    if (node.x == null || node.y == null || !isFinite(node.x) || !isFinite(node.y)) return;
    if (globalScale == null || !isFinite(globalScale) || globalScale === 0) return;

    const isHovered  = hoverNode?.id    === node.id;
    const isSelected = selectedNode?.id === node.id;
    const isNeighbor = hoverNode?.neighbors?.has(node.id);
    const isDimmed   = hoverNode && !isHovered && !isNeighbor;

    const size  = node.size || 9;
    const glow  = node.glowColor || '#EF4444';
    const fill  = node.nodeColor || '#DC2626';
    const borderC = node.borderColor || '#B91C1C';

    ctx.globalAlpha = isDimmed ? 0.12 : 1;

    // ── Glow aura ────────────────────────────────────────────────────────────
    if (!isDimmed) {
      const grad = ctx.createRadialGradient(node.x, node.y, size * 0.5, node.x, node.y, size * 2.5);
      grad.addColorStop(0, glow + '55');
      grad.addColorStop(1, glow + '00');
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Selection ring ────────────────────────────────────────────────────────
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? '#F59E0B' : glow + '99';
      ctx.lineWidth   = isSelected ? 3 : 2;
      ctx.stroke();
    }

    // ── Shape by label type ───────────────────────────────────────────────────
    ctx.beginPath();
    if (node.label === 'Invoice') {
      const h = size * 0.85;
      ctx.rect(node.x - h, node.y - h, h * 2, h * 2);
    } else if (node.label === 'HighRisk' || node.riskLevel === 'High') {
      ctx.moveTo(node.x,        node.y - size);
      ctx.lineTo(node.x + size, node.y);
      ctx.lineTo(node.x,        node.y + size);
      ctx.lineTo(node.x - size, node.y);
      ctx.closePath();
    } else {
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    }

    const isCompanyOrTaxpayer = node.label === 'Company' || node.label === 'Taxpayer';

    if (isCompanyOrTaxpayer && logoImage.complete && logoImage.naturalWidth !== 0) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      const imgSize = size * 1.6;
      ctx.drawImage(logoImage, node.x - imgSize / 2, node.y - imgSize / 2, imgSize, imgSize);
      ctx.restore();
    } else {
      // Gradient fill
      const grad2 = ctx.createRadialGradient(node.x - size*0.3, node.y - size*0.3, 0, node.x, node.y, size);
      grad2.addColorStop(0, fill + 'EE');
      grad2.addColorStop(1, fill);
      ctx.fillStyle = grad2;
      ctx.fill();
    }

    ctx.strokeStyle = borderC;
    ctx.lineWidth   = isSelected ? 3 : 2;
    ctx.stroke();

    // ── Icon (medium zoom) ────────────────────────────────────────────────────
    if (globalScale > 1.2 && !isCompanyOrTaxpayer) {
      const iconSize = Math.max(size * 0.65, 5 / globalScale);
      ctx.font        = `${iconSize}px Arial`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.fillText(NODE_ICON[node.label] || '❓', node.x, node.y);
    }

    let nameHeight = 0;
    let labelY = node.y + size + (4 / globalScale);

    // ── Name label ────────────────────────────────────────────────────────────
    if (globalScale > 0.8) {
      const name   = node.name || node.id;
      const fz     = Math.min(12, 10 / globalScale);
      nameHeight   = fz;
      ctx.font      = `bold ${fz}px Inter,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const tw  = ctx.measureText(name).width;
      const px  = 4 / globalScale, py = 2 / globalScale;
      const lx  = node.x - tw / 2 - px;

      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      roundRect(ctx, lx, labelY, tw + px*2, fz + py*2, 3/globalScale);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(name, node.x, labelY + py);
    }

    // ── Risk score badge ──────────────────────────────────────────────────────
    if (node.riskScore != null && globalScale > 1) {
      const bs   = Math.max(8, 12 / globalScale);
      const bx   = node.x + size - bs/2;
      const by   = node.y - size - bs/2;
      ctx.beginPath();
      ctx.arc(bx, by, bs/2, 0, 2 * Math.PI);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.font        = `bold ${Math.max(4, 7/globalScale)}px sans-serif`;
      ctx.fillStyle   = '#fff';
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.fillText(node.riskScore, bx, by);
    }

    // ── Fraud type label (high zoom) ──────────────────────────────────────────
    if (node.fraudType && globalScale > 2) {
      const ft  = node.fraudType;
      const fz2 = Math.max(5, 9/globalScale);
      ctx.font        = `${fz2}px Inter,sans-serif`;
      ctx.fillStyle   = '#FEE2E2';
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'top';
      
      const fraudY = nameHeight > 0 
        ? labelY + nameHeight + (6 / globalScale)
        : node.y + size + (4 / globalScale);

      ctx.fillText(ft, node.x, fraudY);
    }

    // ── Hover tooltip ─────────────────────────────────────────────────────────
    if (isHovered) {
      const cw = 150 / globalScale, ch = 76 / globalScale;
      const cx = node.x + size + (10/globalScale), cy = node.y - ch/2;

      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = 'rgba(15,23,42,0.94)';
      roundRect(ctx, cx, cy, cw, ch, 6/globalScale);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Left accent stripe
      ctx.fillStyle = glow;
      roundRect(ctx, cx, cy, 3/globalScale, ch, 6/globalScale);
      ctx.fill();

      const cx2 = cx + cw/2 + 2/globalScale;

      ctx.fillStyle   = glow;
      ctx.font        = `bold ${9/globalScale}px Inter,sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.fillText((node.riskLevel||'').toUpperCase() + ' RISK', cx2, cy + 14/globalScale);

      ctx.fillStyle = '#F8FAFC';
      ctx.font      = `bold ${10/globalScale}px Inter,sans-serif`;
      ctx.fillText((node.name||node.id).substring(0,18), cx2, cy + 30/globalScale);

      ctx.fillStyle = '#94A3B8';
      ctx.font      = `${8/globalScale}px monospace`;
      const sub = node.gstin ? node.gstin.substring(0,15) : (node.fraudType || node.period || '');
      ctx.fillText(sub, cx2, cy + 46/globalScale);

      ctx.fillStyle = '#475569';
      ctx.font      = `${7/globalScale}px Inter,sans-serif`;
      ctx.fillText(`Score: ${node.riskScore ?? 'N/A'} · AI: ${node.aiConf ?? '—'}%`, cx2, cy + 62/globalScale);
    }

    ctx.globalAlpha = 1;
  }, [hoverNode, selectedNode]);

  // ─── Link Renderer ────────────────────────────────────────────────────────────
  const renderLink = useCallback((link, ctx, globalScale) => {
    const start = link.source, end = link.target;
    if (!start || !end) return;
    if (start.x == null || start.y == null || !isFinite(start.x) || !isFinite(start.y)) return;
    if (end.x == null || end.y == null || !isFinite(end.x) || !isFinite(end.y)) return;
    if (globalScale == null || !isFinite(globalScale) || globalScale === 0) return;

    const isActive = hoverNode && (start.id === hoverNode.id || end.id === hoverNode.id);
    const isDimmed = hoverNode && !isActive;
    ctx.globalAlpha = isDimmed ? 0.06 : 1;

    const style = FRAUD_REL[link.type] || FRAUD_REL.CONNECTED_TO;
    ctx.strokeStyle = isDimmed ? '#E5E7EB' : style.color;
    ctx.lineWidth   = isActive ? style.width * 2 : style.width;
    if (style.dash.length) ctx.setLineDash(style.dash);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    if (link.type === 'CIRCULAR_TRADING') {
      const mx = (start.x + end.x)/2, my = (start.y + end.y)/2;
      const dx = end.x - start.x, dy = end.y - start.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      ctx.quadraticCurveTo(mx - (dy/len)*50, my + (dx/len)*50, end.x, end.y);
    } else {
      ctx.lineTo(end.x, end.y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow
    if (!isDimmed) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const endR  = end.size || 9;
      const ax    = end.x - Math.cos(angle) * (endR + 5);
      const ay    = end.y - Math.sin(angle) * (endR + 5);
      const al    = 9 / globalScale;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - al*Math.cos(angle-Math.PI/6), ay - al*Math.sin(angle-Math.PI/6));
      ctx.lineTo(ax - al*Math.cos(angle+Math.PI/6), ay - al*Math.sin(angle+Math.PI/6));
      ctx.closePath();
      ctx.fillStyle = style.color;
      ctx.fill();
    }

    // Edge label (LOD)
    if (globalScale > 2.2 && !isDimmed) {
      const mx  = (start.x + end.x)/2, my = (start.y + end.y)/2;
      const fz  = Math.min(10, 8.5 / globalScale);
      const lbl = link.type || '';
      ctx.font        = `bold ${fz}px Inter,sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      const tw = ctx.measureText(lbl).width;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      roundRect(ctx, mx-tw/2-3/globalScale, my-fz/2-2/globalScale, tw+6/globalScale, fz+4/globalScale, 2/globalScale);
      ctx.fill();
      ctx.fillStyle = style.color;
      ctx.fillText(lbl, mx, my);
    }

    ctx.globalAlpha = 1;
  }, [hoverNode]);

  const handleNodeClick = useCallback(node => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    fgRef.current?.centerAt(node.x, node.y, 800);
    fgRef.current?.zoom(4, 800);
  }, []);

  // ─── Metrics ──────────────────────────────────────────────────────────────────
  const highRisk = graphData.nodes.filter(n => (n.riskScore||0) > 80).length;
  const avgRisk  = graphData.nodes.length
    ? Math.round(graphData.nodes.reduce((s,n) => s + (n.riskScore||0), 0) / graphData.nodes.length)
    : 0;

  return (
    <div className="h-[calc(100vh-140px)] w-full flex bg-[#0F172A] border border-gray-800 rounded-[14px] overflow-hidden"
      style={{ boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>

      {/* ── Main Canvas ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col min-w-0">

        {/* Top Bar */}
        <div className="bg-[#1E293B] border-b border-gray-700/50 px-4 py-3 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[12px] font-bold text-white tracking-wide uppercase">Fraud Investigation Graph</span>
            </div>
            {/* Metrics */}
            {[
              { label:'Fraud Nodes', value: graphData.nodes.length, color:'text-red-400' },
              { label:'Connections', value: graphData.links.length, color:'text-orange-400' },
              { label:'High Risk',   value: highRisk,               color:'text-red-300' },
              { label:'Avg Score',   value: avgRisk,                color:'text-yellow-300' },
            ].map(m => (
              <div key={m.label} className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-medium uppercase">{m.label}</span>
                <span className={`text-[16px] font-black leading-tight ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={() => setLayoutMode(v => v === 'Force' ? 'Radial' : 'Force')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-white/5 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors">
              <LayoutTemplate size={13} /> {layoutMode}
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
              <Download size={13} /> Export PNG
            </button>
            <button onClick={loadGraph}
              className="p-2 bg-white/5 border border-gray-600 text-gray-400 rounded-lg hover:bg-white/10 transition-colors" title="Reload">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
              <p className="text-[13px] text-gray-400">Loading fraud entities…</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <ShieldAlert size={30} className="text-red-500" />
              <p className="text-[13px] font-semibold text-gray-300">{error}</p>
              <button onClick={loadGraph} className="px-3 py-1.5 bg-red-600 text-white text-[12px] rounded-lg">Retry</button>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <ShieldAlert size={40} className="text-gray-600" />
              <div className="text-center">
                <p className="text-[15px] font-bold text-gray-300">No fraud data available</p>
                <p className="text-[12px] text-gray-500 mt-1">
                  Upload your Purchase Register &amp; GSTR-2B files,<br />
                  then run Reconciliation to generate fraud insights.
                </p>
              </div>
              <button onClick={loadGraph} className="px-3 py-1.5 bg-red-600/30 border border-red-700 text-red-400 text-[12px] rounded-lg hover:bg-red-600/50 transition-colors">
                Retry
              </button>
            </div>
          ) : (
            <div ref={containerRef} className="absolute inset-0">
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeCanvasObject={renderNode}
                nodeCanvasObjectMode={() => 'replace'}
                linkCanvasObject={renderLink}
                linkCanvasObjectMode={() => 'replace'}
                onNodeClick={handleNodeClick}
                onNodeHover={n => setHoverNode(n)}
                onZoom={({ k }) => setZoomLevel(k)}
                d3AlphaDecay={0.04}
                d3VelocityDecay={0.3}
                cooldownTicks={150}
                backgroundColor="#0F172A"
              />
            </div>
          )}

          {/* Floating controls */}
          <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-20">
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-xl">
              <button onClick={() => fgRef.current?.zoom(zoomLevel*1.4, 300)}
                className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-white/5 border-b border-gray-700 transition-colors"><ZoomIn size={15} /></button>
              <button onClick={() => fgRef.current?.zoom(zoomLevel/1.4, 300)}
                className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-white/5 border-b border-gray-700 transition-colors"><ZoomOut size={15} /></button>
              <button onClick={() => fgRef.current?.zoomToFit(400)}
                className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"><Maximize size={15} /></button>
            </div>
          </div>

          {/* Zoom badge */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-[#1E293B]/90 backdrop-blur border border-gray-700 rounded-full px-3 py-1 text-[11px] font-mono text-gray-400">
            {Math.round(zoomLevel * 100)}%
          </div>

          {/* Risk legend */}
          <div className="absolute top-4 left-4 z-20 bg-[#1E293B]/90 backdrop-blur border border-gray-700 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Risk Levels</p>
            {Object.entries(RISK_META).map(([level, m]) => (
              <div key={level} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: m.glow, boxShadow:`0 0 6px ${m.glow}` }} />
                <span className="text-[11px] text-gray-300 font-medium">{level} (&gt;{m.min})</span>
              </div>
            ))}
          </div>

          {/* Edge legend */}
          <div className="absolute top-4 right-4 z-20 bg-[#1E293B]/90 backdrop-blur border border-gray-700 rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Relationships</p>
            {Object.entries(FRAUD_REL).filter(([k]) => k !== 'CONNECTED_TO').map(([type, s]) => (
              <div key={type} className="flex items-center gap-2">
                <svg width="18" height="6" viewBox="0 0 18 6">
                  <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2"
                    strokeDasharray={s.dash.join(' ')} />
                </svg>
                <span className="text-[10px] text-gray-400">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Side Panel ───────────────────────────────────────────────────────── */}
      {selectedNode && (() => {
        const rl    = selectedNode.riskLevel || 'Low';
        const rmeta = RISK_META[rl] || RISK_META.Low;
        const rs    = selectedNode.riskScore ?? 0;

        return (
          <div className="w-[340px] bg-[#0F172A] border-l border-gray-700/50 flex flex-col shrink-0 z-20">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-700/50 bg-[#1E293B]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] overflow-hidden"
                    style={{ background: rmeta.glow+'22', border:`1.5px solid ${rmeta.glow}44` }}>
                    {selectedNode.label === 'Company' || selectedNode.label === 'Taxpayer' ? (
                      <img src="/logo.png" className="w-full h-full object-cover" alt="Company" />
                    ) : (
                      NODE_ICON[selectedNode.label] || '❓'
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rmeta.glow }}>
                      {rl} Risk · {selectedNode.label}
                    </p>
                    <p className="text-[13px] font-bold text-white leading-tight max-w-[160px] truncate">
                      {selectedNode.name || selectedNode.id}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Risk Score Bar */}
              <div className="bg-[#0F172A] rounded-xl p-3 border border-gray-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Risk Score</span>
                  <span className="text-[20px] font-black" style={{ color: rmeta.glow }}>{rs}<span className="text-[11px] text-gray-500 font-normal">/100</span></span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${rs}%`, background:`linear-gradient(90deg, ${rmeta.glow}99, ${rmeta.glow})` }} />
                </div>
                {selectedNode.aiConf && (
                  <p className="text-[10px] text-gray-500 mt-1">AI Confidence: <span className="text-gray-300 font-bold">{selectedNode.aiConf}%</span></p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700/50 bg-[#1E293B] shrink-0">
              {[
                { id:'details',  label:'Details' },
                { id:'evidence', label:'Evidence' },
                { id:'timeline', label:'Timeline' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${activeTab===tab.id
                    ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ── Details Tab ─────────────────────────────────────────────── */}
              {activeTab === 'details' && (
                <div className="p-4 space-y-4">
                  {/* Node Summary */}
                  <div className="rounded-xl p-3 bg-white/5 border border-gray-800">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Node Summary</p>
                    <p className="text-[12px] text-gray-300 leading-relaxed">{getNodeDescription(selectedNode)}</p>
                  </div>

                  {selectedNode.fraudType && (
                    <div className="rounded-xl border p-3" style={{ background: rmeta.glow+'11', borderColor: rmeta.glow+'33' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: rmeta.glow }}>
                        <Activity size={10} className="inline mr-1" />Fraud Type
                      </p>
                      <p className="text-[14px] font-bold text-white">{selectedNode.fraudType}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Entity Details</p>
                    <div className="space-y-1.5">
                      {[
                        ['ID',          selectedNode.id],
                        ['GSTIN',       selectedNode.gstin],
                        ['Label',       selectedNode.label],
                        ['Risk Level',  rl],
                        ['Period',      selectedNode.period],
                        ['Amount',      selectedNode.amount],
                        ['GST Amount',  selectedNode.gstAmount],
                        ['Date',        selectedNode.date],
                        ['Connections', selectedNode.neighbors?.size],
                      ].filter(([,v]) => v != null).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1.5 border-b border-gray-800">
                          <span className="text-[11px] text-gray-500">{k}</span>
                          <span className="text-[11px] font-semibold text-gray-200 text-right max-w-[160px] truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Evidence Tab ─────────────────────────────────────────────── */}
              {activeTab === 'evidence' && (
                <div className="p-4 space-y-3">
                  <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3">
                    <p className="text-[10px] font-bold text-red-400 uppercase mb-1.5 flex items-center gap-1">
                      <AlertTriangle size={10} /> Detection Rule
                    </p>
                    <p className="text-[12px] text-red-200 leading-relaxed">
                      {selectedNode.fraudType === 'Circular Trading'
                        ? 'Three-party circular transaction detected. ITC claimed multiple times across the same supply chain loop.'
                        : selectedNode.fraudType === 'Duplicate Invoice'
                        ? 'Invoice number reused across multiple filings. Same goods invoiced twice to claim double ITC.'
                        : selectedNode.fraudType === 'Fake GSTIN'
                        ? 'GSTIN not found in GST portal. All transactions linked to this entity are suspect.'
                        : 'Suspicious transaction patterns and missing GSTR2B filings correlated with inflated ITC claims.'
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Metrics</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Tax Difference', selectedNode.taxDiff || '₹—'],
                        ['AI Confidence',  `${selectedNode.aiConf || '—'}%`],
                        ['Connections',    selectedNode.neighbors?.size ?? '—'],
                        ['Risk Score',     `${rs}/100`],
                      ].map(([k,v]) => (
                        <div key={k} className="bg-[#1E293B] rounded-lg border border-gray-700/50 p-2.5">
                          <p className="text-[10px] text-gray-500 uppercase font-medium">{k}</p>
                          <p className="text-[15px] font-bold text-white mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-amber-400 uppercase mb-1.5">Suggested Action</p>
                    <p className="text-[12px] text-amber-200">Issue show-cause notice. Block ITC claims pending investigation. Flag for GST audit.</p>
                  </div>
                </div>
              )}

              {/* ── Timeline Tab ─────────────────────────────────────────────── */}
              {activeTab === 'timeline' && (
                <div className="p-4">
                  <div className="relative pl-6 space-y-5">
                    <div className="absolute left-2.5 top-1 bottom-1 w-px bg-gray-700" />
                    {TIMELINE_STEPS.map((step, i) => {
                      const isLast = i === TIMELINE_STEPS.length - 1;
                      const isPast = i < 4;
                      return (
                        <div key={step.key} className="relative">
                          <div className={`absolute -left-[21px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] ring-4 ${
                            isLast ? 'ring-red-500/30 bg-red-500' :
                            isPast ? 'ring-gray-700 bg-gray-700' : 'ring-gray-800 bg-gray-800'
                          }`}>
                            {step.icon}
                          </div>
                          <p className={`text-[12px] font-semibold ${isLast ? 'text-red-300' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {isLast ? 'Just now' : isPast ? `${(TIMELINE_STEPS.length - 1 - i) * 2} days ago` : 'Pending'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-3 border-t border-gray-700/50 flex gap-2">
              <button className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-[12px] font-bold rounded-lg transition-colors">
                🚩 Flag Entity
              </button>
              <button className="flex-1 py-2 bg-[#1E293B] hover:bg-gray-700 border border-gray-700 text-gray-300 text-[12px] font-medium rounded-lg transition-colors">
                📋 Open Case
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
