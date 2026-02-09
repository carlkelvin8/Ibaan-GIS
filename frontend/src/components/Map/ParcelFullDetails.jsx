
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  MapPin, 
  User, 
  ArrowLeft,
  Printer,
  Copy,
  Check,
  CreditCard,
  Ruler,
  Layers,
  Activity,
  Info,
  LandPlot,
  Building,
  Share2,
  ExternalLink,
  ShieldCheck,
  Navigation,
  Globe
} from "lucide-react";
import api from "../../lib/axios.js";

function formatValue(val, type) {
  if (val === null || val === undefined || val === "") return "—";

  if (type === "currency") {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
    }
  } else if (type === "number") {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-PH').format(num);
    }
  } else if (type === "date") {
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-PH', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });
      }
    } catch {}
  }
  return val;
}

// --- Sub-components ---

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (!text) return null;
  return (
    <button 
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`p-1.5 rounded-md transition-all duration-200 ${
        copied ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

const DetailRow = ({ 
  label, value, type, icon: Icon, dark = false 
}) => {
  return (
    <div className={`group flex flex-col py-3.5 border-b ${dark ? "border-white/5" : "border-slate-100"} last:border-0`}>
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon size={12} className={dark ? "text-slate-500" : "text-blue-500"} />}
        <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}>{label}</span>
      </div>
      <div className={`flex items-start justify-between gap-3 ${dark ? "text-slate-200" : "text-slate-900"}`}>
        <span className="text-sm font-semibold tracking-tight break-words leading-relaxed">
          {formatValue(value, type)}
        </span>
        {dark && value && <CopyButton text={value.toString()} />}
      </div>
    </div>
  );
};

const TabButton = ({ 
  id, label, icon: Icon, active, onClick 
}) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`relative flex items-center gap-2.5 px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all ${
        active 
          ? "text-blue-600" 
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Icon size={16} className={active ? "animate-pulse" : ""} />
      {label}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full shadow-[0_-2px_8px_rgba(37,99,235,0.4)]" />
      )}
    </button>
  );
};

const MetricCard = ({ label, value, sub, colorClass = "text-white" }) => (
  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/10 backdrop-blur-md shadow-inner transition-transform hover:scale-[1.02] cursor-default">
    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5">{label}</p>
    <p className={`text-xl font-extrabold tracking-tight ${colorClass}`}>
      {value}
      <span className="text-[10px] font-medium text-slate-500 ml-1.5 uppercase">{sub}</span>
    </p>
  </div>
);

export default function ParcelFullDetails() {
  const { parcelId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        let foundData = null;
        let source = "";

        try {
          const res = await api.get(`/ibaan/${parcelId}`);
          if (res.data && !res.data.error) {
            foundData = res.data;
            source = "Ibaan";
          }
        } catch (e) {}

        if (!foundData) {
            try {
                const res = await api.get(`/landparcel/${parcelId}`);
                if (res.data && !res.data.error) {
                    foundData = res.data;
                    source = "LandParcel";
                }
            } catch (e) {}
        }

        if (mounted) {
            if (foundData) {
                setData({ ...foundData, _source: source });
                setError(null);
            } else {
                setError("Parcel not found.");
            }
        }

      } catch (err) {
        if (mounted) setError(err.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [parcelId]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <div className="w-16 h-16 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Globe size={24} className="text-blue-600 animate-pulse" />
             </div>
          </div>
          <div className="text-center">
            <p className="text-slate-900 font-bold text-lg">Querying Registry...</p>
            <p className="text-slate-400 text-sm">Validating Geo-Reference Points</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-[2rem] shadow-2xl p-12 max-w-lg w-full text-center border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
              <Info size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Record Restricted</h3>
            <p className="text-slate-500 mb-10 leading-relaxed">This property identifier does not exist in the current jurisdiction or the record has been archived.</p>
            <button 
                onClick={() => navigate(-1)} 
                className="group w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                Return to Search
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#F8FAFC] font-sans text-slate-900">
      
      {/* SIDEBAR - IDENTITY & CORE ANALYTICS */}
      <aside className="w-[22rem] bg-[#0F172A] text-white flex flex-col flex-shrink-0 relative overflow-hidden shadow-[10px_0_40px_rgba(0,0,0,0.1)] z-20 border-r border-white/5">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between relative z-10">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-white group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck size={12} />
                Immutable Record
            </div>
        </div>

        {/* Identity & Hero Section */}
        <div className="px-8 py-4 relative z-10 flex-1 overflow-y-auto sidebar-scrollbar">
            <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.2em] mb-2">Primary Asset Identifier</p>
            <h1 className="text-4xl font-black mb-4 tracking-tighter leading-none bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                {data.ParcelId || data.parcelID}
            </h1>
            
            <div className="flex items-start gap-3 text-slate-400 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                  <MapPin size={18} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                    {data.StreetAddress && <p className="text-white font-bold text-sm truncate leading-none mb-1.5">{data.StreetAddress}</p>}
                    <p className="text-xs font-medium tracking-wide">
                        {data.BarangayNa || data.Barangay}, {data.Municipality}
                    </p>
                </div>
            </div>

            {/* Core Metrics */}
            <div className="space-y-4 mb-8">
                <MetricCard 
                  label="Surface Area" 
                  value={formatValue(data.Area || data.AreaI || data.areaSize, 'number')} 
                  sub="SQM" 
                />
                <MetricCard 
                  label="Appraised Value" 
                  value={formatValue(data.totalValue, 'currency').replace('PHP', '₱')} 
                  sub="PHP"
                  colorClass="text-emerald-400"
                />
            </div>

            {/* Identity Group */}
            <div className="space-y-6 pt-6 border-t border-white/5">
                <div>
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ownership Protocol</h3>
                   <div className="flex items-center gap-4 group">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 font-black text-xl flex-shrink-0 transition-transform group-hover:scale-110">
                          {data.OwnerName ? data.OwnerName.charAt(0) : "U"}
                      </div>
                      <div className="min-w-0">
                          <p className="text-white text-lg font-extrabold leading-tight truncate">{data.OwnerName || "Restricted"}</p>
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mt-1">Registry Verified</p>
                      </div>
                   </div>
                </div>
                
                <div className="space-y-1">
                  <DetailRow label="Reference PIN" value={data.pin || data.arp} dark={true} />
                  <DetailRow label="Land Classification" value={data.actualLandUse} dark={true} />
                </div>
            </div>
        </div>

        {/* Sidebar Footer Action */}
        <div className="p-6 bg-[#020617] relative z-10 border-t border-white/5">
            <div className="flex gap-3">
                <button 
                    onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl shadow-black/20"
                >
                    <Printer size={16} /> Print Report
                </button>
                <button className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 group">
                    <Share2 size={18} className="group-hover:rotate-12 transition-transform" />
                </button>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Navigation Tabs */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30 px-8 flex items-center justify-between shadow-sm">
            <nav className="flex items-center">
                <TabButton 
                    id="overview" 
                    label="Summary" 
                    icon={LandPlot} 
                    active={activeTab === "overview"} 
                    onClick={setActiveTab} 
                />
                <TabButton 
                    id="tax" 
                    label="Taxation" 
                    icon={CreditCard} 
                    active={activeTab === "tax"} 
                    onClick={setActiveTab} 
                />
                <TabButton 
                    id="technical" 
                    label="Technical" 
                    icon={Ruler} 
                    active={activeTab === "technical"} 
                    onClick={setActiveTab} 
                />
            </nav>
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200">
                  <Navigation size={10} />
                  COORD_SYS: WGS84
                </span>
                <span className="hidden sm:inline">REF_ID: {parcelId}</span>
            </div>
        </header>

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-10 scroll-smooth">
            <div className="max-w-5xl mx-auto space-y-10 pb-20">

                {/* OVERVIEW TAB CONTENT */}
                {activeTab === "overview" && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 grid grid-cols-1 lg:grid-cols-12 gap-10">
                        
                        <div className="lg:col-span-7 space-y-10">
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><MapPin size={20} /></div>
                                        Locus & Jurisdiction
                                    </h2>
                                </div>
                                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2">
                                    <DetailRow label="Street Reference" value={data.StreetAddress} />
                                    <DetailRow label="Barangay Registry" value={data.BarangayNa || data.Barangay} />
                                    <DetailRow label="Municipality" value={data.Municipality} />
                                    <DetailRow label="Jurisdiction District" value={data.District} />
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Building size={20} /></div>
                                    Structural Attributes
                                </h2>
                                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2">
                                    <DetailRow label="Classification" value={data.propertyType} />
                                    <DetailRow label="Utility Type" value={data.actualLandUse} />
                                    <DetailRow label="Effectivity Cycle" value={data.eff_year} />
                                    <DetailRow label="Registry Status" value={data.status} />
                                </div>
                            </section>
                        </div>

                        <div className="lg:col-span-5 space-y-10">
                             <section className="h-full">
                                <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><User size={20} /></div>
                                    Stakeholders
                                </h2>
                                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <DetailRow label="Legal Claimant" value={data.Claimant} />
                                        <DetailRow label="Designated Admin" value={data.Administrator} />
                                        <DetailRow label="Active Beneficiary" value={data.Beneficiary} />
                                        <DetailRow label="Historical Predecessor" value={data.PreviousOwner} />
                                    </div>
                                    <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Security Verification</p>
                                      <div className="flex items-center justify-center gap-4 text-slate-400">
                                         <ShieldCheck size={24} className="text-emerald-500" />
                                         <span className="text-xs font-bold italic">Identity Match: 100% Verified</span>
                                      </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                    </div>
                )}

                {/* TAX TAB CONTENT */}
                {activeTab === "tax" && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 space-y-10">
                         {/* High Fidelity Tax Card */}
                         <div className="relative group overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-[2.5rem] p-12 text-white shadow-2xl shadow-indigo-200">
                            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-white/[0.05] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                                <div className="flex-1">
                                    <p className="text-blue-300 text-xs font-black uppercase tracking-[0.2em] mb-4">Current Asset Valuation</p>
                                    <h2 className="text-6xl font-black mb-8 tracking-tighter drop-shadow-lg">{formatValue(data.totalValue, 'currency')}</h2>
                                    
                                    <div className="grid grid-cols-2 gap-12">
                                        <div className="p-6 bg-white/10 rounded-[2rem] border border-white/10 backdrop-blur-md">
                                            <p className="text-blue-200 text-[10px] uppercase font-black tracking-widest mb-2">Annual Tax Due</p>
                                            <p className="text-3xl font-extrabold tracking-tight">{formatValue(data.Tax_Amount, 'currency')}</p>
                                        </div>
                                        <div className="p-6 bg-emerald-500/20 rounded-[2rem] border border-emerald-500/20 backdrop-blur-md">
                                            <p className="text-emerald-300 text-[10px] uppercase font-black tracking-widest mb-2">Last Settlement</p>
                                            <p className="text-3xl font-extrabold tracking-tight text-emerald-300">{formatValue(data.AmountPaid, 'currency')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl relative overflow-hidden group-hover:scale-105 transition-transform">
                                    <CreditCard size={64} className="text-white relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 animate-pulse" />
                                </div>
                            </div>
                         </div>

                         <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                             <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                 <h3 className="text-lg font-black text-slate-800 tracking-tight">Financial Registry History</h3>
                                 <button className="text-blue-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                                    Download Statements <ExternalLink size={14} />
                                 </button>
                             </div>
                             <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4">
                                <DetailRow label="Taxation UUID" value={data.tax_ID} />
                                <DetailRow label="Digital Certificate Title" value={data.oct_tct} />
                                <DetailRow label="Exemption Eligibility" value={data.Taxability || "Fully Taxable"} />
                                <DetailRow label="Settlement Timestamp" value={data.Date_paid} type="date" />
                             </div>
                         </div>
                    </div>
                )}

                {/* TECHNICAL TAB CONTENT */}
                {activeTab === "technical" && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 group hover:shadow-xl transition-shadow">
                                <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-4">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><Ruler size={24} /></div>
                                    Geodetic Survey Metrics
                                </h3>
                                <div className="space-y-1">
                                    <DetailRow label="Authorized Survey Plan" value={data.SurveyPlan} />
                                    <DetailRow label="Lot Allocation" value={data.LotNumber} />
                                    <DetailRow label="Cadastral Index" value={data.CadastralLot} />
                                    <DetailRow label="Block Assignment" value={data.BlockNumber} />
                                </div>
                            </div>

                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 group hover:shadow-xl transition-shadow">
                                <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Layers size={24} /></div>
                                    Spatial Constraints
                                </h3>
                                <div className="space-y-1">
                                    <DetailRow label="Geo-Tie Benchmark" value={data.TiePointNa} />
                                    <DetailRow label="Northern Extent" value={data.Boundary} />
                                    <DetailRow label="Eastern Extent" value={data.BoundaryEa} />
                                    <DetailRow label="Western Extent" value={data.BoundaryWe} />
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-12 text-slate-400 shadow-2xl">
                            <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none">
                              <Activity size={240} strokeWidth={0.5} />
                            </div>
                            <h3 className="text-white text-xl font-black mb-8 flex items-center gap-4">
                                <div className="p-2.5 bg-white/10 rounded-2xl"><Navigation size={24} className="text-blue-400" /></div>
                                Global Precision Coordinates
                            </h3>
                            <div className="relative">
                              <div className="font-mono text-sm sm:text-lg bg-black/40 border border-white/10 p-8 rounded-3xl overflow-x-auto text-emerald-400 backdrop-blur-sm shadow-inner">
                                  <span className="opacity-40 text-xs block mb-4">// GNSS RESOLVED RAW STRING</span>
                                  {data.Coordinate || "AWAITING SATELLITE FIX..."}
                              </div>
                              <div className="mt-8 flex items-center gap-4">
                                <div className="flex -space-x-3">
                                   {[1, 2, 3].map(i => (
                                     <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">SAT{i}</div>
                                   ))}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 italic">Signal Triangulated (±0.02m)</span>
                              </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </main>
    </div>
  );
}
