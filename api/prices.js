const SYMBOLS = {
  "NIFTY":     "^NSEI",
  "SENSEX":    "^BSESN",
  "BANKNIFTY": "^NSEBANK",
  "USD/INR":   "USDINR=X",
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "application/json,text/html,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Cache-Control": "no-cache",
};

async function fetchSymbol(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error("No price");
  const price = meta.regularMarketPrice;
  const prev  = meta.previousClose || meta.chartPreviousClose || price;
  const change = price - prev;
  const pct    = prev ? (change / prev) * 100 : 0;
  return { price: price.toFixed(2), change: change.toFixed(2), pct: pct.toFixed(2) };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const settled = await Promise.allSettled(
    Object.entries(SYMBOLS).map(async ([name, sym]) => ({ name, data: await fetchSymbol(sym) }))
  );

  const prices = {};
  for (const r of settled) {
    if (r.status === "fulfilled") prices[r.value.name] = r.value.data;
    else console.warn("[prices] failed:", r.reason?.message);
  }

  // Return empty object if all fail — frontend shows "–" gracefully
  res.json(prices);
}
