import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Network,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function Overview() {
  const kpiData = [
    {
      id: 1,
      title: 'Exact Matches',
      value: '12,450',
      subtitle: '₹45.2 Cr total tax',
      trend: '+12%',
      trendUp: true,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderClass: 'border-green-100'
    },
    {
      id: 2,
      title: 'Partial Matches',
      value: '842',
      subtitle: '₹2.1 Cr difference',
      trend: '-5%',
      trendUp: false,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100',
      borderClass: 'border-amber-100'
    },
    {
      id: 3,
      title: 'Missing in GSTR-2B',
      value: '156',
      subtitle: '₹85 L potential ITC risk',
      trend: '+2%',
      trendUp: true,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderClass: 'border-red-100'
    },
    {
      id: 4,
      title: 'Duplicate Invoices',
      value: '24',
      subtitle: 'Requires investigation',
      trend: '0%',
      trendUp: null,
      icon: Network,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
      borderClass: 'border-violet-100'
    }
  ];

  const alerts = [
    { id: 1, supplier: 'TechCorp India Pvt Ltd', severity: 'Critical', score: 92, reason: 'Circular invoice chain detected' },
    { id: 2, supplier: 'Global Supplies Inc.', severity: 'High', score: 85, reason: 'Shared bank account across GSTINs' },
    { id: 3, supplier: 'Apex Manufacturing', severity: 'High', score: 78, reason: 'High-value invoice mismatch' },
    { id: 4, supplier: 'TradeNet Solutions', severity: 'Medium', score: 65, reason: 'Suspicious supplier cluster' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Reconciliation Overview</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Monitor invoice matching, tax discrepancies, missing filings, duplicate invoices, and fraud risk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
            Run Reconciliation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <div 
            key={kpi.id}
            className="bg-white p-5 rounded-[12px] border border-gray-200 shadow-soft hover:shadow-hover transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.bgColor} transition-colors`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <div className={`flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full ${
                kpi.trendUp === true ? 'bg-green-50 text-green-700' : 
                kpi.trendUp === false ? 'bg-red-50 text-red-700' : 
                'bg-gray-100 text-gray-600'
              }`}>
                {kpi.trendUp === true ? <TrendingUp size={12} /> : kpi.trendUp === false ? <TrendingDown size={12} /> : null}
                {kpi.trend}
              </div>
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-gray-500 mb-1">{kpi.title}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] font-bold text-gray-900">{kpi.value}</span>
              </div>
              <p className="text-[12px] text-gray-500 mt-1">{kpi.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fraud Intelligence Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Mismatch Distribution */}
        <div className="bg-white p-5 rounded-[14px] border border-gray-200 shadow-soft flex flex-col">
          <h3 className="text-[16px] font-semibold text-gray-900 mb-6">Mismatch Distribution</h3>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {/* Custom Bar Chart Simulation */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-gray-700">Exact</span>
                  <span className="text-gray-500">92.5%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '92.5%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-gray-700">Partial</span>
                  <span className="text-gray-500">6.2%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '6.2%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-gray-700">Missing</span>
                  <span className="text-gray-500">1.1%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '1.1%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-gray-700">Duplicate</span>
                  <span className="text-gray-500">0.2%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-violet-500 h-2 rounded-full" style={{ width: '0.2%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Panel: Tax Risk Trend */}
        <div className="bg-white p-5 rounded-[14px] border border-gray-200 shadow-soft flex flex-col">
          <h3 className="text-[16px] font-semibold text-gray-900 mb-6">Tax Risk Trend</h3>
          <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 h-40">
            {/* Simple CSS Bar/Line Trend Simulation */}
            {[45, 60, 35, 75, 55, 80, 40, 25, 65, 30].map((h, i) => (
              <div key={i} className="w-full bg-blue-100 hover:bg-blue-600 transition-colors rounded-t-sm group relative cursor-pointer" style={{ height: `${h}%` }}>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded transition-opacity whitespace-nowrap">
                  ₹{h} L
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-2 px-2">
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
          </div>
        </div>

        {/* Right Panel: High-Risk Alerts */}
        <div className="bg-white p-5 rounded-[14px] border border-gray-200 shadow-soft flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" />
              High-Risk Alerts
            </h3>
            <button className="text-[12px] font-medium text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors bg-gray-50/50">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    alert.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    alert.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">Risk: <strong className="text-gray-900">{alert.score}</strong></span>
                </div>
                <h4 className="text-[13px] font-semibold text-gray-900 truncate">{alert.supplier}</h4>
                <p className="text-[12px] text-gray-500 mt-0.5 truncate">{alert.reason}</p>
                <button className="mt-2 text-[12px] font-medium text-blue-600 flex items-center gap-1 hover:text-blue-700 group">
                  Investigate <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
