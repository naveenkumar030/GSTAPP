import re

with open(r'c:\Users\bayya\Desktop\Project\GSTAPP\src\pages\FraudGraph.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { useState, useEffect, useRef, useCallback } from 'react';",
    "import { useState, useEffect, useRef, useCallback, useMemo } from 'react';\nimport { motion, AnimatePresence } from 'framer-motion';\nimport { RISK_META, FRAUD_REL, NODE_ICON, TIMELINE_STEPS, getRiskLevel, getNodeDescription, processFraudGraphData } from '../utils/fraudGraphUtils';"
)

# 2. Remove constants & util functions
start_idx = content.find("const RISK_META = {")
end_idx = content.find("// No mock data")
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# 3. State additions
content = content.replace(
    "const [activeTab, setActiveTab]       = useState('details');",
    "const [activeTab, setActiveTab]       = useState('details');\n  const [searchQuery, setSearchQuery]   = useState('');\n  const [riskFilter, setRiskFilter]     = useState('All');"
)

# 4. loadGraph modifications
loadGraph_old = """  const loadGraph = useCallback(async () => {
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
  }, []);"""

loadGraph_new = """  const loadGraph = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await graphApi.getData({ type: 'fraud', riskScore: 50 });
      const processed = processFraudGraphData(raw);
      setGraphData(processed);
    } catch (e) {
      setError(e.message || 'Failed to load fraud graph');
    } finally {
      setLoading(false);
    }
  }, []);"""

content = content.replace(loadGraph_old, loadGraph_new)

# 5. Filter logic & Use filtered data
memo_logic = """
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(n => {
      const matchesSearch = !searchQuery || (n.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || n.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === 'All' || n.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [graphData.nodes, searchQuery, riskFilter]);

  const filteredLinks = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return graphData.links.filter(l => {
      const sid = l.source?.id ?? l.source;
      const tid = l.target?.id ?? l.target;
      return nodeIds.has(sid) && nodeIds.has(tid);
    });
  }, [graphData.links, filteredNodes]);

  const displayData = { nodes: filteredNodes, links: filteredLinks };

  // ─── D3 forces per layout ─────────────────────────────────────────────────────"""

content = content.replace("  // ─── D3 forces per layout ─────────────────────────────────────────────────────", memo_logic)
content = content.replace("graphData={graphData}", "graphData={displayData}")

# 6. UI controls for search and filter
controls_old = """          <div className="flex gap-2 items-center">
            <button onClick={() => setLayoutMode(v => v === 'Force' ? 'Radial' : 'Force')}"""
controls_new = """          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Search entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-[11px] bg-white/5 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-red-500 transition-colors placeholder:text-gray-500 w-32"
            />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-2 py-1.5 text-[11px] font-semibold bg-white/5 border border-gray-600 text-gray-300 rounded-lg focus:outline-none focus:border-red-500 transition-colors outline-none"
            >
              <option value="All">All Risks</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
            </select>
            <button onClick={() => setLayoutMode(v => v === 'Force' ? 'Radial' : 'Force')}"""
content = content.replace(controls_old, controls_new)

# 7. Side Panel animations
side_panel_old = """      {/* ── Side Panel ───────────────────────────────────────────────────────── */}
      {selectedNode && (() => {"""
side_panel_new = """      {/* ── Side Panel ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
      {selectedNode && (
        <motion.div
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-[340px] bg-[#0F172A] border-l border-gray-700/50 flex flex-col shrink-0 z-20 absolute right-0 top-0 bottom-0 shadow-2xl"
        >
          {(() => {"""
content = content.replace(side_panel_old, side_panel_new)

wrapper_old = """<div className="w-[340px] bg-[#0F172A] border-l border-gray-700/50 flex flex-col shrink-0 z-20">"""
wrapper_new = """<div className="flex-1 flex flex-col overflow-hidden">"""
content = content.replace(wrapper_old, wrapper_new)

footer_old = """      })()}
    </div>
  );
}"""
footer_new = """      })()}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}"""
content = content.replace(footer_old, footer_new)

# Update outer container to relative
content = content.replace('rounded-[14px] overflow-hidden"', 'rounded-[14px] overflow-hidden relative"')

with open(r'c:\Users\bayya\Desktop\Project\GSTAPP\src\pages\FraudGraph.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored FraudGraph.jsx successfully.")
