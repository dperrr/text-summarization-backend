
const userLimits = global.userLimits || {};
global.userLimits = userLimits;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { extractiveSummary } = req.body || {};

  if (!extractiveSummary) return res.status(400).json({ error: "extractiveSummary is required" });

  const userId = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  userLimits[userId] = (userLimits[userId] || 0) + 1;
  if (userLimits[userId] > 2) return res.status(429).json({ error: "Limit reached (2 calls per user)" });

  const prompt = `Please create a concise and coherent summary from the following extractive summary.
The sentences were selected using TF-IDF and Aho-Corasick keyword matching algorithms.
Please:
1. Maintain the key information and main ideas
2. Improve flow and coherence between sentences
3. Remove any redundancy while preserving important details
4. Make it readable and well-structured
5. Keep it concise but comprehensive
6. Don't add any text like 'here’s the summary' — just return the summary and nothing else:

Extractive Summary:
${extractiveSummary}

Please provide a refined, coherent summary:`;

  if (process.env.TEST_MODE === "true") {
    return res.status(200).json({ summary: "This is a test summary (no API call)." });
  }


  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);

    // result.response.text() in previous examples — ensure this matches SDK shape
    const text = result?.response?.text ? result.response.text() : (result?.output || "");
    return res.status(200).json({ summary: text });
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ error: "API request failed", details: err.message });
  }
}
