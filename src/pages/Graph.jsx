import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import neo4j from 'neo4j-driver';
import { 
  Filter, Search, ZoomIn, ZoomOut, Maximize, 
  Map, Settings2, ShieldAlert, AlertTriangle, X,
  Building2, Receipt, MapPin, Landmark
} from 'lucide-react';

const driver = neo4j.driver(
  import.meta.env.VITE_NEO4J_URI || 'neo4j+s://cb1ca217.databases.neo4j.io',
  neo4j.auth.basic(
    import.meta.env.VITE_NEO4J_USERNAME || 'cb1ca217', 
    import.meta.env.VITE_NEO4J_PASSWORD || ''
  )
);

export default function Graph() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const fetchGraphData = async () => {
      const session = driver.session({ database: 'cb1ca217' });
      try {
        const result = await session.run(
          'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 300'
        );
        
        const nodes = new Map();
        const links = [];

        result.records.forEach(record => {
          const n = record.get('n');
          const m = record.get('m');
          const r = record.get('r');

          if (!nodes.has(n.elementId)) {
            nodes.set(n.elementId, { id: n.elementId, label: n.labels[0] || 'Unknown', ...n.properties });
          }
          if (!nodes.has(m.elementId)) {
            nodes.set(m.elementId, { id: m.elementId, label: m.labels[0] || 'Unknown', ...m.properties });
          }

          links.push({
            source: n.elementId,
            target: m.elementId,
            type: r.type,
            ...r.properties
          });
        });

        setGraphData({
          nodes: Array.from(nodes.values()),
          links: links
        });
      } catch (error) {
        console.error('Error fetching graph data:', error);
      } finally {
        await session.close();
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const handleNodeClick = useCallback(node => {
    setSelectedNode(node);
  }, []);

  const handleZoomIn = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom * 1.5, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom / 1.5, 400);
    }
  };

  const handleFitToScreen = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full flex bg-white border border-gray-200 rounded-[14px] overflow-hidden shadow-soft">
      
      {/* Left Filter Panel */}
      <div className="w-[280px] border-r border-gray-200 flex flex-col bg-gray-50/50 hidden md:flex shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[14px] font-bold text-gray-900">Graph Controls</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-700">Search Entity</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="GSTIN, Name, Invoice..." 
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-700">Entity Types</label>
            <div className="space-y-1.5">
              {[
                { name: 'Supplier / Buyer', icon: Building2, color: 'text-blue-500' },
                { name: 'Invoice', icon: Receipt, color: 'text-gray-500' },
                { name: 'Bank Account', icon: Landmark, color: 'text-green-500' },
                { name: 'Address / Location', icon: MapPin, color: 'text-amber-500' },
              ].map((type) => (
                <label key={type.name} className="flex items-center gap-2.5 p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <type.icon size={14} className={type.color} />
                  <span className="text-[12px] text-gray-700">{type.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium text-gray-700">Risk Score &gt;=</label>
              <span className="text-[12px] font-bold text-red-600">75</span>
            </div>
            <input type="range" min="0" max="100" defaultValue="75" className="w-full accent-blue-600" />
          </div>

        </div>
        <div className="p-4 border-t border-gray-200">
          <button className="w-full py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </div>

      {/* Central Canvas */}
      <div className="flex-1 relative bg-[#F8FAFC] overflow-hidden group">
        
        {/* Canvas Background (Mock Grid) */}
        <div className="absolute inset-0 z-0" style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        {/* Force Graph Elements */}
        <div ref={containerRef} className="absolute inset-0 z-10">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel={node => `${node.label} ${node.name ? '- ' + node.name : ''}`}
              nodeColor={node => {
                if (node.label === 'Taxpayer' || node.label === 'Company') return '#3B82F6';
                if (node.label === 'Invoice') return '#9CA3AF';
                if (node.label === 'HighRisk') return '#EF4444';
                return '#8B5CF6'; // default
              }}
              nodeRelSize={6}
              linkColor={() => '#94A3B8'}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              linkWidth={1.5}
            />
          )}
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
          <div className="bg-white rounded-lg shadow-soft border border-gray-200 flex flex-col overflow-hidden">
            <button onClick={handleZoomIn} className="p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-600 border-b border-gray-200 transition-colors" title="Zoom In"><ZoomIn size={18} /></button>
            <button onClick={handleZoomOut} className="p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-600 border-b border-gray-200 transition-colors" title="Zoom Out"><ZoomOut size={18} /></button>
            <button onClick={handleFitToScreen} className="p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-600 border-b border-gray-200 transition-colors" title="Fit to Screen"><Maximize size={18} /></button>
            <button className="p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors" title="Mini Map"><Map size={18} /></button>
          </div>
        </div>

        <div className="absolute top-4 left-4 z-20">
          <div className="bg-white px-3 py-2 rounded-lg shadow-soft border border-gray-200 flex gap-4 text-[11px] font-medium text-gray-600">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Taxpayer / Company</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-400"></div> Invoice</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Risk</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-violet-500"></div> Other</div>
          </div>
        </div>
      </div>

      {/* Right Entity Panel */}
      {selectedNode && (
        <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-20 relative">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="text-[14px] font-bold text-gray-900">Entity Details</h2>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center shrink-0 border border-violet-200">
                <ShieldAlert size={20} className="text-violet-700" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 leading-tight break-words">
                  {selectedNode.name || selectedNode.id || 'Unknown Entity'}
                </h3>
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block border border-blue-100">
                  {selectedNode.label}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Properties</h4>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3">
                  {Object.entries(selectedNode).filter(([k]) => !['id', 'label', 'x', 'y', 'vx', 'vy', 'index', 'color'].includes(k)).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">{key}</p>
                      <p className="text-[12px] text-gray-900 font-medium break-words mt-0.5">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                  {Object.entries(selectedNode).filter(([k]) => !['id', 'label', 'x', 'y', 'vx', 'vy', 'index', 'color'].includes(k)).length === 0 && (
                     <p className="text-[12px] text-gray-500">No additional properties</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-gray-50 grid grid-cols-1 gap-2">
            <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Expand Neighbors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
