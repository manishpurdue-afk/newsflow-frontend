import RSSParser from "rss-parser";

const parser = new RSSParser({ timeout: 5000, headers: { "User-Agent": "NewsflowDashboard/1.0" } });

const SOURCES = [
  { url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",            source: "ET Markets",    category: "Corporate",   segment: "Large Cap" },
  { url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",        source: "ET Markets",    category: "Earnings",    segment: "Large Cap" },
  { url: "https://www.moneycontrol.com/rss/MCtopnews.xml",                                  source: "Moneycontrol",  category: "Corporate",   segment: "Large Cap" },
  { url: "https://www.moneycontrol.com/rss/marketreports.xml",                              source: "Moneycontrol",  category: "Macro",       segment: "Index"     },
  { url: "https://www.sebi.gov.in/sebirss.xml",                                             source: "SEBI",          category: "Regulatory",  segment: "Index"     },
  { url: "https://www.rbi.org.in/Scripts/rss.aspx",                                         source: "RBI",           category: "Macro",       segment: "Index"     },
  { url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/20425523.cms",         source: "ET Markets",    category: "Macro",       segment: "Index"     },
  { url: "https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1808152121.cms",source: "ET Markets",    category: "Commodities", segment: "Sector"    },
  { url: "https://www.moneycontrol.com/rss/iponews.xml",                                    source: "Moneycontrol",  category: "IPO",         segment: "Mid Cap"   },
  { url: "https://economictimes.indiatimes.com/markets/ipo/rssfeeds/5575287.cms",           source: "ET Markets",    category: "IPO",         segment: "Mid Cap"   },
];

const BULLISH_WORDS = new Set([
  "rise","rises","rose","rising","surge","surges","surged","jump","jumps","jumped",
  "gain","gains","gained","rally","rallies","rallied","beat","beats","record","high",
  "growth","profit","profits","positive","boom","expand","expands","approve","approves","approved",
  "launch","launches","win","wins","raise","raises","raised","recovery","rebound","uptick","boost",
]);
const BEARISH_WORDS = new Set([
  "fall","falls","fell","falling","drop","drops","dropped","slide","slides","slid",
  "decline","declines","declined","plunge","plunges","plunged","tumble","tumbles","tumbled",
  "miss","weak","weakness","loss","losses","cut","cuts","penalty","reject","rejects","rejected",
  "cancel","cancels","delay","slump","slumps","concern","warning","warn","hurt","crisis","crash",
  "selloff","sell-off","fear","fears","conflict","sanction","sanctions","default",
]);

function inferSentiment(headline) {
  const words = headline.toLowerCase().replace(/[^a-z-\s]/g, " ").split(/\s+/);
  let b = 0, r = 0;
  for (const w of words) {
    if (BULLISH_WORDS.has(w)) b++;
    if (BEARISH_WORDS.has(w)) r++;
  }
  if (b > r) return "Bullish";
  if (r > b) return "Bearish";
  return "Neutral";
}

const TICKER_MAP = {
  "reliance":"RELIANCE","tcs":"TCS","infosys":"INFY","hdfc bank":"HDFCBANK",
  "icici bank":"ICICIBANK","sbi":"SBIN","wipro":"WIPRO","bharti airtel":"BHARTIARTL",
  "itc":"ITC","bajaj finance":"BAJFINANCE","axis bank":"AXISBANK","kotak":"KOTAKBANK",
  "adani":"ADANIENT","tata motors":"TATAMOTORS","tata steel":"TATASTEEL",
  "ongc":"ONGC","coal india":"COALINDIA","ntpc":"NTPC","power grid":"POWERGRID",
  "maruti":"MARUTI","hero motocorp":"HEROMOTOCO","sun pharma":"SUNPHARMA",
  "dr reddy":"DRREDDY","cipla":"CIPLA","divis":"DIVISLAB","ultracemco":"ULTRACEMCO",
  "asian paints":"ASIANPAINT","titan":"TITAN","nestle":"NESTLEIND","hindustan unilever":"HINDUNILVR",
  "nifty":"NIFTY","sensex":"SENSEX","nifty bank":"BANKNIFTY","nifty it":"NIFTYIT",
  "sebi":"SEBI","rbi":"RBI","fii":"NIFTY","dii":"NIFTY",
  "zomato":"ZOMATO","paytm":"PAYTM","nykaa":"NYKAA","delhivery":"DELHIVERY",
};

function extractTickers(text) {
  const t = text.toLowerCase();
  const found = [];
  for (const [name, ticker] of Object.entries(TICKER_MAP)) {
    if (t.includes(name) && !found.includes(ticker)) found.push(ticker);
  }
  return found.length ? found.slice(0, 4) : ["NIFTY"];
}

const HIGH_PRIORITY_SOURCES   = ["SEBI", "RBI", "BSE", "NSE"];
const HIGH_PRIORITY_CATEGORIES = ["Regulatory", "Macro"];

function inferPriority(source, category) {
  if (HIGH_PRIORITY_SOURCES.includes(source))    return "high";
  if (HIGH_PRIORITY_CATEGORIES.includes(category)) return "high";
  return "medium";
}

function formatTime(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
}

let _id = 1;

async function fetchFeed(src) {
  try {
    const feed = await parser.parseURL(src.url);
    return feed.items.slice(0, 8).map(item => {
      const headline  = item.title?.trim() || "";
      const sentiment = inferSentiment(headline);
      const tickers   = extractTickers(headline);
      return {
        id:       _id++,
        headline,
        category: src.category,
        sentiment,
        segment:  src.segment,
        source:   src.source,
        tickers,
        time:     formatTime(item.pubDate || item.isoDate),
        priority: inferPriority(src.source, src.category),
        link:     item.link || "",
        pubDate:  item.pubDate || item.isoDate || new Date().toISOString(),
      };
    });
  } catch (e) {
    console.warn(`[RSS] Failed: ${src.url} — ${e.message}`);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const results = await Promise.allSettled(SOURCES.map(fetchFeed));
  const all     = results.flatMap(r => r.status === "fulfilled" ? r.value : []);

  const seen = new Set();
  const deduped = all.filter(item => {
    const key = item.headline.slice(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  res.json({ stories: deduped.slice(0, 80), fetchedAt: new Date().toISOString() });
}
