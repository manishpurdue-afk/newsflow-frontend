export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { headline, category, sentiment, tickers } = req.body;
  if (!headline) return res.status(400).json({ error: "headline required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not set in environment" });

  const prompt = `You are a sharp Indian equity market analyst writing for a professional trading terminal. Given this headline, write exactly 3 sentences covering: (1) what happened and why it matters, (2) immediate market/stock price impact expected, (3) key levels or events to watch. Be specific to Indian markets. No bullet points, no headers — flowing sentences only.

Headline: "${headline}"
Category: ${category} | Sentiment: ${sentiment} | Tickers: ${tickers?.join(", ")}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      "llama-3.3-70b-versatile",
        max_tokens: 300,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Groq API error: ${err}` });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return res.status(502).json({ error: "Empty response from Groq" });

    res.json({ analysis: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
