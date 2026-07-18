import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import { Search, ZoomIn, ZoomOut, Maximize, ShieldAlert, X, RefreshCw, Network, ChevronDown } from 'lucide-react';
import { graphApi } from '../services/api';

const logoImage = new Image();
logoImage.src = '/logo.png';

// ─── Color / Style maps ───────────────────────────────────────────────────────
const NODE_META = {
  Company:         { color: '#2563EB', border: '#1D4ED8', bg: '#EFF6FF', icon: '🏢', shape: 'circle' },
  Supplier:        { color: '#059669', border: '#047857', bg: '#ECFDF5', icon: '📦', shape: 'circle' },
  Buyer:           { color: '#10B981', border: '#059669', bg: '#ECFDF5', icon: '🛒', shape: 'circle' },
  Invoice:         { color: '#EA580C', border: '#C2410C', bg: '#FFF7ED', icon: '📄', shape: 'rect'   },
  PurchaseRegister:{ color: '#9333EA', border: '#7E22CE', bg: '#FAF5FF', icon: '🧾', shape: 'circle' },
  GSTR2B:          { color: '#0891B2', border: '#0E7490', bg: '#ECFEFF', icon: '📊', shape: 'circle' },
  Fraud:           { color: '#DC2626', border: '#B91C1C', bg: '#FEF2F2', icon: '⚠️', shape: 'diamond'},
  GSTIN:           { color: '#D97706', border: '#B45309', bg: '#FFFBEB', icon: '🔑', shape: 'circle' },
  Unknown:         { color: '#6B7280', border: '#4B5563', bg: '#F9FAFB', icon: '❓', shape: 'circle' },
};

const LINK_STYLE = {
  SUPPLIED_TO:       { color: '#059669', width: 1.5, dash: [] },
  PURCHASED_FROM:    { color: '#10B981', width: 1.5, dash: [] },
  FILES:             { color: '#9333EA', width: 1.5, dash: [] },
  HAS_INVOICE:       { color: '#EA580C', width: 1.5, dash: [] },
  MATCHES:           { color: '#16A34A', width: 2.5, dash: [] },
  MISMATCH:          { color: '#DC2626', width: 2,   dash: [4,3] },
  DUPLICATE:         { color: '#F97316', width: 2,   dash: [6,4] },
  FAKE_GSTIN:        { color: '#7C3AED', width: 2,   dash: [2,3] },
  CIRCULAR_TRADING:  { color: '#A855F7', width: 2.5, dash: [8,4] },
  SUSPICIOUS:        { color: '#EF4444', width: 3,   dash: [] },
  CLAIMS_ITC:        { color: '#0891B2', width: 1.5, dash: [] },
  BELONGS_TO:        { color: '#6B7280', width: 1,   dash: [] },
  GENERATED:         { color: '#8B5CF6', width: 1,   dash: [] },
  CONNECTED_TO:      { color: '#CBD5E1', width: 1,   dash: [] },
  MISSING:           { color: '#EF4444', width: 1.5, dash: [2,5] },
};

function getLabelType(label) {
  if (label === 'Taxpayer' || label === 'Company') return 'Company';
  if (label === 'HighRisk') return 'Fraud';
  if (label === 'Invoice') return 'Invoice';
  if (label === 'Supplier') return 'Supplier';
  if (label === 'Buyer') return 'Buyer';
  if (label === 'GSTR2B') return 'GSTR2B';
  if (label === 'PurchaseRegister') return 'PurchaseRegister';
  if (label === 'GSTIN') return 'GSTIN';
  return 'Unknown';
}

function getNodeSize(labelType, riskScore) {
  const base = { Company: 14, Fraud: 16, Invoice: 8, Supplier: 12, Buyer: 12, GSTR2B: 10, PurchaseRegister: 10, GSTIN: 9, Unknown: 7 };
  const s = base[labelType] || 7;
  if (riskScore && riskScore > 75) return s + 4;
  if (riskScore && riskScore > 50) return s + 2;
  return s;
}

// ─── Utility: draw rounded rect ───────────────────────────────────────────────
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

// No mock data — graph is only populated from real API after file upload + reconciliation.

export default function NetworkGraph() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode]       = useState(null);
  const [graphData, setGraphData]       = useState({ nodes: [], links: [] });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterType, setFilterType]     = useState('All');
  const [showLegend, setShowLegend]     = useState(true);

  const fgRef        = useRef();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel]   = useState(1);

  // ─── Resize observer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ─── Fetch / build graph data ─────────────────────────────────────────────────
  const loadGraph = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await graphApi.getData({ type: 'network' });
      const nodes = raw.nodes.map(n => {
        const lt = getLabelType(n.label);
        return {
          ...n, labelType: lt,
          size: getNodeSize(lt, n.riskScore),
          neighbors: new Set(), links: []
        };
      });
      const links = raw.links.map(l => ({ ...l, relType: l.type || 'CONNECTED_TO' }));

      // Pre-compute neighbor sets
      links.forEach(l => {
        const sid = l.source?.id ?? l.source;
        const tid = l.target?.id ?? l.target;
        const sn = nodes.find(n => n.id === sid);
        const tn = nodes.find(n => n.id === tid);
        if (sn && tn) { sn.neighbors.add(tn.id); tn.neighbors.add(sn.id); }
      });

      setGraphData({ nodes, links });
    } catch (e) {
      setError(e.message || 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ─── D3 forces ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    const fg = fgRef.current;
    fg.d3Force('collide', d3.forceCollide().radius(n => (n.size || 8) + 18).iterations(3));
    fg.d3Force('charge').strength(-450);
    fg.d3Force('link').distance(145);
  }, [graphData]);

  // ─── Filtered data ────────────────────────────────────────────────────────────
  const filteredData = useCallback(() => {
    let nodes = graphData.nodes;
    if (filterType !== 'All') nodes = nodes.filter(n => n.labelType === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n =>
        (n.name || '').toLowerCase().includes(q) ||
        (n.gstin || '').toLowerCase().includes(q) ||
        (n.id || '').toLowerCase().includes(q)
      );
    }
    const ids = new Set(nodes.map(n => n.id));
    const links = graphData.links.filter(l => {
      const sid = l.source?.id ?? l.source;
      const tid = l.target?.id ?? l.target;
      return ids.has(sid) && ids.has(tid);
    });
    return { nodes, links };
  }, [graphData, filterType, searchQuery]);

  // ─── Node Canvas Object ───────────────────────────────────────────────────────
  const renderNode = useCallback((node, ctx, globalScale) => {
    const meta      = NODE_META[node.labelType] || NODE_META.Unknown;
    const isHovered = hoverNode?.id   === node.id;
    const isSelected= selectedNode?.id === node.id;
    const isNeighbor= hoverNode?.neighbors?.has(node.id);
    const isDimmed  = hoverNode && !isHovered && !isNeighbor;

    const size = node.size || 8;
    ctx.globalAlpha = isDimmed ? 0.15 : 1;

    // ── Outer selection ring ──
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? '#F59E0B' : meta.color + '66';
      ctx.lineWidth   = isSelected ? 2.5 : 1.5;
      ctx.stroke();
    }

    // ── Main node shape ──
    ctx.beginPath();
    if (node.labelType === 'Invoice') {
      // Square for invoices
      const half = size * 0.85;
      ctx.rect(node.x - half, node.y - half, half * 2, half * 2);
    } else if (node.labelType === 'Fraud') {
      // Diamond for fraud
      ctx.moveTo(node.x,        node.y - size);
      ctx.lineTo(node.x + size, node.y);
      ctx.lineTo(node.x,        node.y + size);
      ctx.lineTo(node.x - size, node.y);
      ctx.closePath();
    } else {
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    }

    if (node.labelType === 'Company' && logoImage.complete && logoImage.naturalWidth !== 0) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      const imgSize = size * 1.6;
      ctx.drawImage(logoImage, node.x - imgSize / 2, node.y - imgSize / 2, imgSize, imgSize);
      ctx.restore();
    } else {
      // Fill with gradient-like effect
      ctx.fillStyle = meta.color;
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = meta.border;
    ctx.lineWidth   = isSelected ? 2.5 : isHovered ? 2 : 1.5;
    ctx.stroke();

    // ── LOD: Icon at medium zoom ──────────────────────────────────────────────
    if (globalScale > 1.5 && node.labelType !== 'Company') {
      const iconSize = Math.max(size * 0.7, 6 / globalScale);
      ctx.font        = `${iconSize}px Arial`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.fillStyle   = '#fff';
      ctx.fillText(meta.icon, node.x, node.y);
    }

    let nameHeight = 0;
    let labelY = node.y + size + (3 / globalScale);

    // ── LOD: Name label below node ────────────────────────────────────────────
    if (globalScale > 1) {
      const label    = node.name || node.id;
      const fontSize = Math.min(13, 11 / globalScale);
      nameHeight     = fontSize;
      ctx.font        = `${isSelected ? 'bold ' : ''}${fontSize}px Inter,sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'top';

      // Label background pill
      const textW = ctx.measureText(label).width;
      const padX  = 4 / globalScale, padY = 2 / globalScale;
      const lx    = node.x - textW / 2 - padX;

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      roundRect(ctx, lx, labelY, textW + padX * 2, fontSize + padY * 2, 3 / globalScale);
      ctx.fill();

      ctx.fillStyle = isDimmed ? '#9CA3AF' : (isSelected ? meta.color : '#1F2937');
      ctx.fillText(label, node.x, labelY + padY);
    }

    // ── LOD: GSTIN below name at high zoom ────────────────────────────────────
    if (globalScale > 2.5 && node.gstin) {
      const subFont = Math.max(6, 9 / globalScale);
      ctx.font        = `${subFont}px monospace`;
      ctx.fillStyle   = '#6B7280';
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'top';
      
      const gstinY = nameHeight > 0 
        ? labelY + nameHeight + (6 / globalScale) 
        : node.y + size + (3 / globalScale);
        
      ctx.fillText(node.gstin.substring(0, 15), node.x, gstinY);
    }

    // ── LOD: Risk badge ───────────────────────────────────────────────────────
    if (node.riskScore != null && globalScale > 1.5) {
      const rs  = node.riskScore;
      const bColor = rs > 75 ? '#DC2626' : rs > 50 ? '#D97706' : '#16A34A';
      const bSize  = Math.max(7, 10 / globalScale);
      const bx = node.x + size - bSize / 2;
      const by = node.y - size - bSize / 2;
      ctx.beginPath();
      ctx.arc(bx, by, bSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = bColor;
      ctx.fill();
      ctx.font       = `bold ${Math.max(4, 7 / globalScale)}px sans-serif`;
      ctx.fillStyle  = '#fff';
      ctx.textAlign  = 'center';
      ctx.textBaseline='middle';
      ctx.fillText(rs, bx, by);
    }

    // ── Hover tooltip card ────────────────────────────────────────────────────
    if (isHovered && globalScale > 0.5) {
      const cardW  = 140 / globalScale;
      const cardH  = 62 / globalScale;
      const cardX  = node.x + size + (8 / globalScale);
      const cardY  = node.y - cardH / 2;

      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = 'rgba(255,255,255,0.97)';
      roundRect(ctx, cardX, cardY, cardW, cardH, 5 / globalScale);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Type pill
      ctx.fillStyle = meta.color + '22';
      roundRect(ctx, cardX + 4/globalScale, cardY + 4/globalScale, cardW - 8/globalScale, 14/globalScale, 3/globalScale);
      ctx.fill();
      ctx.fillStyle   = meta.color;
      ctx.font        = `bold ${9/globalScale}px Inter,sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.fillText(node.labelType.toUpperCase(), cardX + cardW/2, cardY + 11/globalScale);

      // Node name
      const name = (node.name || node.id).substring(0, 18);
      ctx.fillStyle   = '#111827';
      ctx.font        = `bold ${10/globalScale}px Inter,sans-serif`;
      ctx.fillText(name, cardX + cardW/2, cardY + 30/globalScale);

      // Subtitle
      const sub = node.gstin ? node.gstin.substring(0,15) : (node.status || node.period || '');
      ctx.fillStyle   = '#6B7280';
      ctx.font        = `${8/globalScale}px monospace`;
      ctx.fillText(sub, cardX + cardW/2, cardY + 52/globalScale);
    }

    ctx.globalAlpha = 1;
  }, [hoverNode, selectedNode]);

  // ─── Link Canvas Object ───────────────────────────────────────────────────────
  const renderLink = useCallback((link, ctx, globalScale) => {
    const start = link.source, end = link.target;
    if (!start || !end || typeof start.x !== 'number') return;

    const isActive = hoverNode && (start.id === hoverNode.id || end.id === hoverNode.id);
    const isDimmed = hoverNode && !isActive;

    ctx.globalAlpha = isDimmed ? 0.08 : 1;

    const style = LINK_STYLE[link.relType] || LINK_STYLE.CONNECTED_TO;
    ctx.strokeStyle = isDimmed ? '#E5E7EB' : style.color;
    ctx.lineWidth   = isActive ? style.width * 1.8 : style.width;

    if (style.dash.length) ctx.setLineDash(style.dash);

    const isCurved = link.relType === 'CIRCULAR_TRADING';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    if (isCurved) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const dx = end.x - start.x, dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cp  = 40;
      ctx.quadraticCurveTo(mx - (dy / len) * cp, my + (dx / len) * cp, end.x, end.y);
    } else {
      ctx.lineTo(end.x, end.y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // ── Arrow ──────────────────────────────────────────────────────────────────
    if (!isDimmed) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const endSize = end.size || 8;
      const ax = end.x - Math.cos(angle) * (endSize + 4);
      const ay = end.y - Math.sin(angle) * (endSize + 4);
      const arrowLen = 7 / globalScale;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - arrowLen * Math.cos(angle - Math.PI / 6), ay - arrowLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ax - arrowLen * Math.cos(angle + Math.PI / 6), ay - arrowLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = style.color;
      ctx.fill();
    }

    // ── Edge label (LOD) ──────────────────────────────────────────────────────
    if (globalScale > 2.2 && !isDimmed) {
      const mx  = (start.x + end.x) / 2;
      const my  = (start.y + end.y) / 2;
      const lbl = link.relType || '';
      const fz  = Math.min(10, 8.5 / globalScale);
      ctx.font        = `bold ${fz}px Inter,sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';

      const tw = ctx.measureText(lbl).width;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      roundRect(ctx, mx - tw/2 - 3/globalScale, my - fz/2 - 2/globalScale, tw + 6/globalScale, fz + 4/globalScale, 2/globalScale);
      ctx.fill();

      ctx.fillStyle = style.color;
      ctx.fillText(lbl, mx, my);
    }

    ctx.globalAlpha = 1;
  }, [hoverNode]);

  const handleNodeClick  = useCallback(node => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    fgRef.current?.centerAt(node.x, node.y, 800);
    fgRef.current?.zoom(3.5, 800);
  }, []);

  const handleNodeHover  = useCallback(node => setHoverNode(node), []);

  const activeData = filteredData();

  // ─── Legend items ─────────────────────────────────────────────────────────────
  const legendItems = Object.entries(NODE_META).map(([type, m]) => ({ type, ...m }));

  return (
    <div className="h-[calc(100vh-140px)] w-full flex bg-white border border-gray-200 rounded-[14px] overflow-hidden"
         style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.07)' }}>

      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <div className="w-[260px] border-r border-gray-200 flex flex-col bg-slate-50 shrink-0">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
              <Network size={15} className="text-blue-600" /> Network Graph
            </h2>
            <button onClick={loadGraph} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Reload">
              <RefreshCw size={13} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search GSTIN, name, ID..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
          </div>
        </div>

        <div className="p-3 border-b border-gray-200 bg-white">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Filter by Type</label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...Object.keys(NODE_META)].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${filterType === t
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
              <p className="text-[10px] text-blue-600 font-semibold uppercase">Nodes</p>
              <p className="text-[18px] font-bold text-blue-700">{activeData.nodes.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Links</p>
              <p className="text-[18px] font-bold text-emerald-700">{activeData.links.length}</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-3 flex-1 overflow-y-auto">
          <button className="flex items-center justify-between w-full mb-2" onClick={() => setShowLegend(v=>!v)}>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Legend</span>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${showLegend ? '' : '-rotate-90'}`} />
          </button>
          {showLegend && (
            <div className="space-y-1.5">
              {legendItems.map(l => (
                <div key={l.type} className="flex items-center gap-2">
                  {l.type === 'Company' ? (
                    <img src="/logo.png" className="w-[14px] h-[14px] rounded object-cover shrink-0 shadow-sm" alt="Company" />
                  ) : (
                    <span className="text-[13px]">{l.icon}</span>
                  )}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-[11px] text-gray-600 font-medium">{l.type}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase">Edges</p>
                {[
                  { label:'Matched',          color:'#16A34A', dash:false },
                  { label:'Duplicate',        color:'#F97316', dash:true  },
                  { label:'Circular Trading', color:'#A855F7', dash:true  },
                  { label:'Suspicious',       color:'#EF4444', dash:false },
                  { label:'Missing',          color:'#EF4444', dash:true  },
                ].map(e => (
                  <div key={e.label} className="flex items-center gap-2">
                    <svg width="20" height="6" viewBox="0 0 20 6">
                      <line x1="0" y1="3" x2="20" y2="3" stroke={e.color} strokeWidth="2"
                        strokeDasharray={e.dash ? '4 3' : 'none'} />
                    </svg>
                    <span className="text-[11px] text-gray-600">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Canvas ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative bg-[#F1F5F9]">
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage:'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize:'28px 28px', opacity:0.6 }} />

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-[13px] text-gray-500 font-medium">Loading graph…</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <ShieldAlert size={28} className="text-red-400" />
            <p className="text-[13px] font-semibold text-gray-700">Failed to load graph</p>
            <p className="text-[11px] text-gray-500 max-w-xs text-center">{error}</p>
            <button onClick={loadGraph} className="mt-1 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded-lg hover:bg-blue-700">
              Retry
            </button>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <Network size={40} className="text-gray-300" />
            <div className="text-center">
              <p className="text-[15px] font-bold text-gray-600">No graph data available</p>
              <p className="text-[12px] text-gray-400 mt-1">
                Upload your Purchase Register &amp; GSTR-2B files,<br />
                then run Reconciliation to build the network graph.
              </p>
            </div>
            <button onClick={loadGraph} className="px-3 py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded-lg hover:bg-blue-700">
              Retry
            </button>
          </div>
        ) : (
          <div ref={containerRef} className="absolute inset-0 z-10">
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={activeData}
              nodeCanvasObject={renderNode}
              nodeCanvasObjectMode={() => 'replace'}
              linkCanvasObject={renderLink}
              linkCanvasObjectMode={() => 'replace'}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              onZoom={({ k }) => setZoomLevel(k)}
              cooldownTicks={120}
              backgroundColor="transparent"
            />
          </div>
        )}

        {/* ── Zoom Controls ─────────────────────────────────────────────────── */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-20">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
            <button onClick={() => fgRef.current?.zoom(zoomLevel * 1.4, 300)}
              className="p-2.5 hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors border-b border-gray-100"
              title="Zoom In"><ZoomIn size={15} /></button>
            <button onClick={() => fgRef.current?.zoom(zoomLevel / 1.4, 300)}
              className="p-2.5 hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors border-b border-gray-100"
              title="Zoom Out"><ZoomOut size={15} /></button>
            <button onClick={() => fgRef.current?.zoomToFit(400)}
              className="p-2.5 hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors"
              title="Fit to Screen"><Maximize size={15} /></button>
          </div>
        </div>

        {/* ── Zoom Level Badge ──────────────────────────────────────────────── */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1 text-[11px] font-mono text-gray-500">
          {Math.round(zoomLevel * 100)}%
        </div>
      </div>

      {/* ── Right Detail Panel ───────────────────────────────────────────────── */}
      {selectedNode && (() => {
        const meta = NODE_META[selectedNode.labelType] || NODE_META.Unknown;
        const rs   = selectedNode.riskScore;
        const riskColor = rs > 75 ? '#DC2626' : rs > 50 ? '#D97706' : '#16A34A';
        const riskLabel = rs > 75 ? 'High Risk' : rs > 50 ? 'Medium Risk' : 'Low Risk';

        // ── Per-type description & field definitions ──────────────────────────
        const TYPE_DESCRIPTIONS = {
          Company: {
            what: 'A registered GST taxpayer entity that files returns, claims Input Tax Credit (ITC), and appears in the purchase or sales register.',
            fields: [
              { label:'GSTIN',         value: selectedNode.gstin,        hint:'Goods & Services Tax Identification Number' },
              { label:'State',         value: selectedNode.state,        hint:'State of registration' },
              { label:'Invoice Count', value: selectedNode.invoiceCount, hint:'Total invoices filed this period' },
              { label:'Tax Amount',    value: selectedNode.taxAmount,    hint:'Total GST liability raised' },
              { label:'ITC Claimed',   value: selectedNode.itcClaimed,   hint:'Input Tax Credit claimed against purchase invoices' },
            ],
            alerts: rs > 75 ? ['High-risk entity flagged for investigation', 'ITC claims may be inflated'] : rs > 50 ? ['Moderate risk — verify GSTR-2B matching'] : [],
          },
          Fraud: {
            what: 'A high-risk entity detected through graph pattern analysis. This node exhibits one or more fraud indicators such as circular trading, duplicate invoices, or fake GSTIN registrations.',
            fields: [
              { label:'GSTIN',         value: selectedNode.gstin,        hint:'Potentially fake or unregistered GSTIN' },
              { label:'State',         value: selectedNode.state,        hint:'Claimed registration state' },
              { label:'Invoice Count', value: selectedNode.invoiceCount, hint:'Number of suspicious invoices linked' },
              { label:'Tax Amount',    value: selectedNode.taxAmount,    hint:'Tax amount under dispute' },
              { label:'ITC Claimed',   value: selectedNode.itcClaimed,   hint:'Fraudulent ITC claimed' },
            ],
            alerts: ['Flagged as HIGH RISK by fraud detection engine', 'All connected transactions under scrutiny', 'Do not process ITC claims from this entity'],
          },
          Supplier: {
            what: 'A supplier entity that has raised invoices to one or more buyer companies. Suppliers are cross-checked against the GSTR-2B to verify that declared purchases match actual tax deposits.',
            fields: [
              { label:'GSTIN',         value: selectedNode.gstin,        hint:'Supplier GSTIN from purchase register' },
              { label:'State',         value: selectedNode.state,        hint:'Supplier\'s registered state' },
              { label:'Invoice Count', value: selectedNode.invoiceCount, hint:'Invoices raised to buyers in this period' },
              { label:'Tax Amount',    value: selectedNode.taxAmount,    hint:'Total GST charged on invoices' },
              { label:'ITC Claimed',   value: selectedNode.itcClaimed,   hint:'ITC passed on to buyer' },
            ],
            alerts: rs > 75 ? ['Supplier has suspicious invoice patterns — possible shell entity'] : rs > 50 ? ['Some invoices unmatched in GSTR-2B'] : ['Supplier appears clean — invoices matched'],
          },
          Buyer: {
            what: 'A buyer entity that has received goods or services and is claiming Input Tax Credit based on supplier invoices uploaded in the Purchase Register.',
            fields: [
              { label:'GSTIN',         value: selectedNode.gstin,        hint:'Buyer GSTIN' },
              { label:'State',         value: selectedNode.state,        hint:'State of buyer registration' },
              { label:'Invoice Count', value: selectedNode.invoiceCount, hint:'Invoices received from suppliers' },
              { label:'ITC Claimed',   value: selectedNode.itcClaimed,   hint:'ITC availed based on purchase invoices' },
            ],
            alerts: [],
          },
          Invoice: {
            what: 'An individual tax invoice raised by a supplier to a buyer. Each invoice is matched against GSTR-2B data to verify that tax has been deposited by the supplier before the buyer claims ITC.',
            fields: [
              { label:'Invoice No.',   value: selectedNode.name,         hint:'Unique invoice identifier' },
              { label:'Amount',        value: selectedNode.amount,       hint:'Total invoice value (incl. GST)' },
              { label:'GST Amount',    value: selectedNode.gstAmount,    hint:'GST component of this invoice' },
              { label:'Date',          value: selectedNode.date,         hint:'Invoice date' },
              { label:'Status',        value: selectedNode.status,       hint:'Reconciliation status against GSTR-2B' },
            ],
            alerts: selectedNode.status === 'Duplicate' ? ['⚠ Duplicate invoice — same number used more than once', 'ITC claim may be invalid'] :
                    selectedNode.status === 'Missing'   ? ['⚠ Missing in GSTR-2B — supplier may not have filed', 'ITC reversal required'] : [],
          },
          PurchaseRegister: {
            what: 'The Purchase Register is your company\'s internal record of all inward supply invoices. It is uploaded and reconciled against GSTR-2B to identify matched, unmatched, and duplicate entries.',
            fields: [
              { label:'Period',         value: selectedNode.period,        hint:'Financial period this register covers' },
              { label:'Total Invoices', value: selectedNode.totalInvoices, hint:'Total invoices in this register' },
              { label:'Matched',        value: selectedNode.matched,       hint:'Invoices successfully matched in GSTR-2B' },
              { label:'Unmatched',      value: selectedNode.unmatched,     hint:'Invoices not found in GSTR-2B' },
            ],
            alerts: (selectedNode.unmatched > 0) ? [`${selectedNode.unmatched} invoices unmatched — ITC reversal may be needed`] : ['All invoices matched — no action required'],
          },
          GSTR2B: {
            what: 'GSTR-2B is an auto-populated Input Tax Credit statement generated by the GST portal, summarising ITC available from supplier filings. It is the authoritative source for ITC eligibility verification.',
            fields: [
              { label:'Period',      value: selectedNode.period,      hint:'Month and year of GSTR-2B statement' },
              { label:'Total ITC',   value: selectedNode.totalITC,    hint:'Total ITC available as per GSTR-2B' },
              { label:'Claimed ITC', value: selectedNode.claimedITC,  hint:'ITC claimed by the entity against this statement' },
            ],
            alerts: [],
          },
          GSTIN: {
            what: 'A GSTIN (Goods and Services Tax Identification Number) node represents a unique tax registration number. Fake or cancelled GSTINs are a primary indicator of invoice fraud.',
            fields: [
              { label:'GSTIN',    value: selectedNode.name,    hint:'The full 15-digit GSTIN' },
              { label:'Type',     value: selectedNode.type,    hint:'Valid, Cancelled, or Suspect' },
              { label:'State',    value: selectedNode.state,   hint:'State code encoded in GSTIN' },
              { label:'Reg Date', value: selectedNode.regDate, hint:'Date of GST registration' },
            ],
            alerts: selectedNode.type === 'Suspect' ? ['⚠ GSTIN not found in GST portal database', 'All linked invoices are suspect', 'ITC claims must be reversed immediately'] : ['GSTIN is active and valid'],
          },
          Unknown: {
            what: 'An unclassified entity in the GST network. This node may represent a transaction endpoint that does not match any known node type in the current dataset.',
            fields: [],
            alerts: ['Node type unrecognised — data may be incomplete'],
          },
        };

        const typeDef = TYPE_DESCRIPTIONS[selectedNode.labelType] || TYPE_DESCRIPTIONS.Unknown;

        return (
          <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-20">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="p-4 border-b flex items-start gap-3" style={{ background: meta.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0 shadow-sm overflow-hidden"
                style={{ background: meta.color + '20', border: `1.5px solid ${meta.color}30` }}>
                {selectedNode.labelType === 'Company' ? (
                  <img src="/logo.png" className="w-full h-full object-cover" alt="Company" />
                ) : (
                  meta.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{selectedNode.labelType}</p>
                <p className="text-[14px] font-bold text-gray-900 leading-tight truncate">
                  {selectedNode.name || selectedNode.id}
                </p>
                {selectedNode.gstin && (
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5 truncate">{selectedNode.gstin}</p>
                )}
              </div>
              <button onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

              {/* ── Node Summary ─────────────────────────────────────────── */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-slate-50/50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Node Summary</p>
                <p className="text-[12px] text-gray-700 font-medium leading-relaxed">{getNodeDescription(selectedNode)}</p>
              </div>

              {/* ── What is this? ────────────────────────────────────────── */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">What is this node?</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{typeDef.what}</p>
              </div>

              {/* ── Risk Score ───────────────────────────────────────────── */}
              {rs != null && (
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Risk Score</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: riskColor }}>{riskLabel}</span>
                    <span className="text-[22px] font-black" style={{ color: riskColor }}>
                      {rs}<span className="text-[12px] font-normal text-gray-400">/100</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${rs}%`, background: `linear-gradient(90deg, ${riskColor}99, ${riskColor})` }} />
                  </div>
                </div>
              )}

              {/* ── Alerts / Flags ───────────────────────────────────────── */}
              {typeDef.alerts.length > 0 && (
                <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Flags & Alerts</p>
                  {typeDef.alerts.map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium leading-relaxed ${
                      a.startsWith('⚠') || a.includes('HIGH') || a.includes('invalid') || a.includes('reversal')
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : a.includes('Moderate') || a.includes('verify') || a.includes('unmatched')
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      <span className="mt-0.5 shrink-0">
                        {a.startsWith('⚠') || a.includes('HIGH') || a.includes('invalid') || a.includes('reversal') ? '🚨' :
                         a.includes('Moderate') || a.includes('verify') || a.includes('unmatched') ? '⚠️' : '✅'}
                      </span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Key Fields ───────────────────────────────────────────── */}
              {typeDef.fields.filter(f => f.value != null).length > 0 && (
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Details</p>
                  <div className="space-y-3">
                    {typeDef.fields.filter(f => f.value != null).map(f => (
                      <div key={f.label}>
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-semibold text-gray-500">{f.label}</span>
                          <span className={`text-[12px] font-bold text-right max-w-[150px] ${
                            f.label === 'Status' && f.value === 'Duplicate' ? 'text-orange-600' :
                            f.label === 'Status' && f.value === 'Matched'   ? 'text-green-600' :
                            f.label === 'Status' && f.value === 'Missing'   ? 'text-red-600'   :
                            f.label === 'Type'   && f.value === 'Suspect'   ? 'text-red-600'   :
                            f.label === 'Type'   && f.value === 'Valid'     ? 'text-green-600' :
                            'text-gray-800'
                          }`}>{String(f.value)}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{f.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Connections ──────────────────────────────────────────── */}
              {selectedNode.neighbors?.size > 0 && (
                <div className="px-4 pt-4 pb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Network Position</p>
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-blue-600 font-medium">Direct Connections</p>
                      <p className="text-[10px] text-blue-400">Nodes directly linked to this entity</p>
                    </div>
                    <span className="text-[28px] font-black text-blue-700">{selectedNode.neighbors.size}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer Actions ───────────────────────────────────────────── */}
            <div className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                onClick={() => { fgRef.current?.centerAt(selectedNode.x, selectedNode.y, 600); fgRef.current?.zoom(4.5, 600); }}
                className="flex-1 py-2 text-[12px] font-bold text-white rounded-lg transition-colors"
                style={{ background: meta.color }}>
                🔍 Focus Node
              </button>
              <button onClick={() => setSelectedNode(null)}
                className="px-3 py-2 bg-gray-100 text-gray-600 text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

