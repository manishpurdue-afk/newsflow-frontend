import { useState, useEffect, useRef, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

const CATEGORIES = ["All","Corporate","Macro","Regulatory","Earnings","IPO","FII/DII","Commodities"];
const SENTIMENTS = ["All","Bullish","Bearish","Neutral"];
const SEGMENTS   = ["All","Large Cap","Mid Cap","Small Cap","Index","Sector"];
const SOURCES    = ["All","BSE","NSE","SEBI","RBI","PTI","ET Markets","Moneycontrol","Bloomberg India"];

const SENTIMENT_CONFIG = {
  Bullish: { color: "#00d09c", bg: "rgba(0,208,156,0.12)",   icon: "▲" },
  Bearish: { color: "#ff4d6d", bg: "rgba(255,77,109,0.12)",  icon: "▼" },
  Neutral: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "◆" },
};

const CAT_COLORS = {
  Corporate:"#60a5fa", Macro:"#a78bfa", Regulatory:"#f59e0b",
  Earnings:"#34d399",  IPO:"#fb923c",   "FII/DII":"#22d3ee",
  Commodities:"#fbbf24", Sector:"#e879f9",
};

// ── API CALLS ─────────────────────────────────────────────────────────────
async function fetchNews() {
  const res  = await fetch(`${API_BASE}/api/news`);
  if (!res.ok) throw new Error(`News API error ${res.status}`);
  const data = await res.json();
  return data.stories || [];
}

async function fetchAnalysis(item) {
  const res = await fetch(`${API_BASE}/api/analysis`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      headline:  item.headline,
      category:  item.category,
      sentiment: item.sentiment,
      tickers:   item.tickers,
    }),
  });
  if (!res.ok) throw new Error(`Analysis API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.analysis;
}

// ── NewsCard ──────────────────────────────────────────────────────────────
function NewsCard({ item, flashId }) {
  const [open,     setOpen]     = useState(false);
  const [analysis, setAnalysis] = useState(null);

  function handleReadMore() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (analysis) return;
    setAnalysis({ loading: true });
    fetchAnalysis(item)
      .then(text => setAnalysis({ text }))
      .catch(e   => setAnalysis({ error: "Could not generate analysis. " + e.message }));
  }

  const sent     = SENTIMENT_CONFIG[item.sentiment] || SENTIMENT_CONFIG.Neutral;
  const catColor = CAT_COLORS[item.category] || "#64748b";
  const isFlash  = item.id === flashId;
  const isPrio   = item.priority === "high";

  return (
    <div
      className={`ncard${open?" open":""}${isPrio&&!open?" prio":""}${isFlash?" flash":""}`}
      style={{ padding:"12px 20px", borderBottom:"1px solid #0b1525" }}
    >
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ minWidth:40, fontSize:10, color:"#2d4a6e", paddingTop:2, fontVariantNumeric:"tabular-nums" }}>{item.time}</div>
        <div style={{ paddingTop:7, minWidth:6 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:catColor }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          {/* tags */}
          <div style={{ display:"flex", gap:6, marginBottom:5, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:9, padding:"1px 6px", borderRadius:2, background:`${catColor}16`, color:catColor, border:`1px solid ${catColor}35`, letterSpacing:.4 }}>{item.category.toUpperCase()}</span>
            <span style={{ fontSize:9, padding:"1px 6px", borderRadius:2, background:sent.bg, color:sent.color, border:`1px solid ${sent.color}40` }}>{sent.icon} {item.sentiment.toUpperCase()}</span>
            {isPrio && <span style={{ fontSize:9, padding:"1px 5px", borderRadius:2, background:"rgba(217,119,6,0.1)", color:"#d97706", border:"1px solid rgba(217,119,6,0.28)" }}>★ PRIORITY</span>}
            <span style={{ marginLeft:"auto", fontSize:9, color:"#2d4a6e" }}>{item.source}</span>
          </div>
          {/* headline */}
          <div style={{ fontSize:13, color: open ? "#e2e8f0" : "#8fadc8", lineHeight:1.55, fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:500 }}>
            {item.link
              ? <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color:"inherit", textDecoration:"none" }}>{item.headline}</a>
              : item.headline
            }
          </div>

          {/* analysis panel */}
          {open && (
            <div style={{ marginTop:10, padding:"12px 14px", background:"rgba(8,18,36,0.85)", borderRadius:4, borderLeft:"3px solid #1d4ed8", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:12, lineHeight:1.8, color:"#94a3b8" }}>
              {analysis?.loading && (
                <div style={{ display:"flex", alignItems:"center", gap:8, color:"#2d4a6e" }}>
                  <span style={{ display:"inline-block", animation:"sp 0.7s linear infinite" }}>⟳</span>
                  <span>Generating market analysis via Claude…</span>
                </div>
              )}
              {analysis?.error && <span style={{ color:"#ff4d6d" }}>{analysis.error}</span>}
              {analysis?.text  && <span style={{ color:"#94a3b8" }}>{analysis.text}</span>}
            </div>
          )}

          {/* tickers + button */}
          <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
            {item.tickers.map(t => (
              <span key={t} style={{ fontSize:10, padding:"1px 6px", borderRadius:2, background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.22)", color:"#60a5fa", letterSpacing:.4 }}>{t}</span>
            ))}
            <button
              onClick={handleReadMore}
              style={{
                marginLeft:"auto", cursor:"pointer",
                background: open ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${open?"#3b82f6":"#1e3a5f"}`,
                color: open ? "#60a5fa" : "#475569",
                padding:"3px 11px", borderRadius:3, fontSize:10, fontFamily:"inherit", letterSpacing:.3,
                transition:"all 0.12s",
              }}
            >
              {open ? "▲ CLOSE" : "▼ READ MORE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Newsflow() {
  const [news,        setNews]       = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState(null);
  const [lastRefresh, setLastRefresh]= useState(null);
  const [filters,     setFilters]    = useState({ category:"All", sentiment:"All", segment:"All", source:"All", search:"" });
  const [flashId,     setFlashId]    = useState(null);
  const [showFilter,  setShowFilter] = useState(true);
  const prevIdsRef = useRef(new Set());

  // ── Load news from backend ──────────────────────────────────────────────
  const loadNews = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const stories = await fetchNews();

      // detect genuinely new items (not on first load)
      if (prevIdsRef.current.size > 0) {
        const newItems = stories.filter(s => !prevIdsRef.current.has(s.id));
        if (newItems.length > 0) {
          setFlashId(newItems[0].id);
          setTimeout(() => setFlashId(null), 2200);
        }
      }
      prevIdsRef.current = new Set(stories.map(s => s.id));

      setNews(stories);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadNews(); }, [loadNews]);

  // Auto-refresh every 5 minutes (aligned with backend cache TTL)
  useEffect(() => {
    const t = setInterval(() => loadNews(true), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadNews]);

  const filtered = news.filter(n => {
    const q = filters.search.toLowerCase();
    return (
      (filters.category === "All" || n.category === filters.category) &&
      (filters.sentiment === "All" || n.sentiment === filters.sentiment) &&
      (filters.segment   === "All" || n.segment   === filters.segment)  &&
      (filters.source    === "All" || n.source    === filters.source)   &&
      (!q || n.headline.toLowerCase().includes(q) || n.tickers.some(t => t.toLowerCase().includes(q)))
    );
  });

  function toggleFilter(key, val) {
    setFilters(f => ({ ...f, [key]: f[key] === val ? "All" : val }));
  }

  const refreshLabel = lastRefresh
    ? `REFRESHED ${lastRefresh.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`
    : "LOADING…";

  return (
    <div style={{ minHeight:"100vh", background:"#080c14", color:"#e2e8f0", fontFamily:"'IBM Plex Mono','Courier New',monospace", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#060e1a}::-webkit-scrollbar-thumb{background:#1a3050;border-radius:2px}
        .ncard{border-left:3px solid transparent;transition:border-color 0.15s,background 0.15s}
        .ncard:hover{background:rgba(255,255,255,0.025)!important}
        .ncard.open{border-left-color:#3b82f6!important;background:rgba(22,40,70,0.2)!important}
        .ncard.prio{border-left-color:#92400e}
        .ncard.flash{animation:flashIn 2.2s ease-out}
        @keyframes flashIn{0%{background:rgba(0,208,156,0.15)}100%{background:transparent}}
        .fpill{cursor:pointer;border:1px solid #111f35;background:transparent;color:#34475d;padding:3px 10px;border-radius:3px;font-size:10px;font-family:inherit;transition:all 0.12s;white-space:nowrap}
        .fpill:hover,.fpill.on{border-color:#2563eb;background:rgba(37,99,235,0.1);color:#7eb3f5}
        .srch{background:rgba(255,255,255,0.03);border:1px solid #111f35;color:#c7d8ef;padding:6px 12px;border-radius:3px;font-family:inherit;font-size:11px;width:200px;outline:none}
        .srch:focus{border-color:#2563eb}.srch::placeholder{color:#1e3a5f}
        .ldot{width:6px;height:6px;border-radius:50%;background:#00d09c;display:inline-block;animation:pu 1.6s infinite}
        @keyframes pu{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.6)}}
        @keyframes sp{to{transform:rotate(360deg)}}
        .refreshbtn{cursor:pointer;background:transparent;border:1px solid #111f35;color:#2d4a6e;padding:3px 10px;border-radius:3px;font-size:9px;font-family:inherit;letter-spacing:.5px;transition:all 0.12s}
        .refreshbtn:hover{border-color:#2563eb;color:#60a5fa}
      `}</style>

      {/* Top bar */}
      <div style={{ background:"#050910", borderBottom:"1px solid #0d1d30", padding:"0 20px", display:"flex", alignItems:"center", gap:20, height:44, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:26, height:26, background:"linear-gradient(135deg,#1d4ed8,#06b6d4)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff" }}>N</div>
          <span style={{ fontSize:12, fontWeight:600, letterSpacing:3, color:"#adc5e0" }}>NEWSFLOW</span>
          <span style={{ fontSize:9, color:"#162840", letterSpacing:2 }}>INDIA</span>
        </div>
        <div style={{ flex:1, display:"flex", gap:20, fontSize:10, color:"#243d56" }}>
          {[["NIFTY","–","–","–"],["SENSEX","–","–","–"],["BANKNIFTY","–","–","–"],["USD/INR","–","–","–"]].map(([n,v,d,c])=>(
            <span key={n}><span style={{color:"#1e3a5f"}}>{n} </span><span style={{color:"#3d6080"}}>{v}</span></span>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:10 }}>
          {loading
            ? <span style={{color:"#2d4a6e",fontSize:10}}>⟳ FETCHING…</span>
            : <><span className="ldot"/><span style={{color:"#00d09c",fontSize:10}}>LIVE</span></>
          }
          <span style={{color:"#0d1d30",fontSize:12}}>│</span>
          <span style={{color:"#1e3a5f"}}>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background:"#050910", borderBottom:"1px solid #0d1d30", padding:"6px 20px", display:"flex", gap:8, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
        {[
          {l:"STORIES", v:filtered.length,                                    c:"#4d8bc0"},
          {l:"BULLISH", v:filtered.filter(n=>n.sentiment==="Bullish").length, c:"#00d09c"},
          {l:"BEARISH", v:filtered.filter(n=>n.sentiment==="Bearish").length, c:"#ff4d6d"},
          {l:"PRIORITY",v:filtered.filter(n=>n.priority==="high").length,    c:"#d97706"},
          {l:"SOURCES", v:new Set(filtered.map(n=>n.source)).size,            c:"#22d3ee"},
        ].map(s=>(
          <div key={s.l} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #0d1d30",padding:"4px 14px",borderRadius:3,textAlign:"center",minWidth:60}}>
            <div style={{fontSize:15,fontWeight:600,color:s.c,lineHeight:1.2}}>{s.v}</div>
            <div style={{fontSize:8,color:"#1e3a5f",letterSpacing:.8}}>{s.l}</div>
          </div>
        ))}
        <div style={{flex:1}}/>
        <input className="srch" placeholder="Search ticker or keyword…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))}/>
        <button className="refreshbtn" onClick={() => loadNews(false)}>↺ REFRESH</button>
        <button className={`fpill${showFilter?" on":""}`} onClick={()=>setShowFilter(v=>!v)}>{showFilter?"▲ HIDE":"▼ FILTER"}</button>
      </div>

      {/* Filters */}
      {showFilter && (
        <div style={{background:"#060b18",borderBottom:"1px solid #0d1d30",padding:"8px 20px",display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
          {[
            {label:"CATEGORY",key:"category",opts:CATEGORIES.slice(1)},
            {label:"SENTIMENT",key:"sentiment",opts:SENTIMENTS.slice(1)},
            {label:"SEGMENT",key:"segment",opts:SEGMENTS.slice(1)},
            {label:"SOURCE",key:"source",opts:SOURCES.slice(1)},
          ].map(row=>(
            <div key={row.key} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:8,color:"#1e3a5f",letterSpacing:.8,width:62,flexShrink:0}}>{row.label}</span>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <button className={`fpill${filters[row.key]==="All"?" on":""}`} onClick={()=>setFilters(f=>({...f,[row.key]:"All"}))}>ALL</button>
                {row.opts.map(opt=>(
                  <button key={opt} className={`fpill${filters[row.key]===opt?" on":""}`} onClick={()=>toggleFilter(row.key,opt)}>
                    {opt.toUpperCase()}{row.key==="sentiment"&&SENTIMENT_CONFIG[opt]?" "+SENTIMENT_CONFIG[opt].icon:""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feed */}
      <div style={{flex:1,overflowY:"auto"}}>
        {loading && (
          <div style={{textAlign:"center",color:"#2d4a6e",fontSize:12,padding:60}}>
            <div style={{display:"inline-block",animation:"sp 0.7s linear infinite",fontSize:20,marginBottom:12}}>⟳</div>
            <div>Fetching live news from sources…</div>
          </div>
        )}
        {!loading && error && (
          <div style={{textAlign:"center",padding:60}}>
            <div style={{color:"#ff4d6d",fontSize:12,marginBottom:8}}>⚠ Could not connect to backend</div>
            <div style={{color:"#2d4a6e",fontSize:10,marginBottom:16}}>{error}</div>
            <div style={{color:"#1e3a5f",fontSize:10}}>Make sure the backend is running:<br/><code style={{color:"#4d8bc0"}}>cd newsflow-backend && npm start</code></div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{textAlign:"center",color:"#1e3a5f",fontSize:12,padding:60}}>No stories match current filters.</div>
        )}
        {!loading && !error && filtered.map(item => <NewsCard key={item.id} item={item} flashId={flashId}/>)}
      </div>

      {/* Status bar */}
      <div style={{background:"#050910",borderTop:"1px solid #0d1d30",padding:"5px 20px",display:"flex",alignItems:"center",gap:12,fontSize:9,color:"#162840",flexShrink:0,letterSpacing:.5}}>
        <span className="ldot"/>
        <span style={{color:"#1e3a5f"}}>AUTO-REFRESH 5MIN</span>
        <span>│</span>
        <span>{filtered.length}/{news.length} STORIES</span>
        <span>│</span>
        <span style={{color:"#1e3a5f"}}>{refreshLabel}</span>
        <span>│</span>
        <span style={{color:"#1e3a5f"}}>AI ANALYSIS BY CLAUDE</span>
        <div style={{flex:1}}/>
        <span>NOT FINANCIAL ADVICE</span>
      </div>
    </div>
  );
}
