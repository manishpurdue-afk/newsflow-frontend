export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const symbols = "^NSEI,^BSESN,^NSEBANK,USDINR=X";
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!r.ok) return res.status(502).json({ error: "Yahoo Finance unavailable" });

    const data = await r.json();
    const results = data?.quoteResponse?.result || [];

    const prices = {};
    for (const q of results) {
      const price  = q.regularMarketPrice;
      const change = q.regularMarketChange;
      const pct    = q.regularMarketChangePercent;
      const entry  = { price: price?.toFixed(2), change: change?.toFixed(2), pct: pct?.toFixed(2) };

      if (q.symbol === "^NSEI")    prices["NIFTY"]     = entry;
      if (q.symbol === "^BSESN")   prices["SENSEX"]    = entry;
      if (q.symbol === "^NSEBANK") prices["BANKNIFTY"]  = entry;
      if (q.symbol === "USDINR=X") prices["USD/INR"]   = entry;
    }

    res.json(prices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
