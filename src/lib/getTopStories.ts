/**
 * Fetches today's top wire-service stories by calling the /api/analyze route.
 *
 * Ported from scripts/generate.js — uses the internal API proxy instead of
 * the Anthropic SDK directly.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface TopStory {
  headline: string;
  topic: string;
  summary: string;
  ap_coverage: string;
  reuters_coverage: string;
  significance: string;
}

/**
 * Parse JSON from a Claude response that might contain markdown fences.
 */
function parseJSON(text: string): TopStory[] {
  const clean = text.replace(/```json|```/g, "").trim();
  const arrStart = clean.indexOf("[");
  const objStart = clean.indexOf("{");

  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    return JSON.parse(clean.slice(arrStart, clean.lastIndexOf("]") + 1));
  }
  return JSON.parse(clean.slice(objStart, clean.lastIndexOf("}") + 1));
}

/**
 * Fetch the 5 most significant AP / Reuters stories for today
 * by calling the /api/analyze proxy route.
 */
export async function getTopStories(): Promise<TopStory[]> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const todayISO = new Date().toISOString().split("T")[0];

  const system = `You are a journalism analyst. Today is ${today}.
Search the web for today's top breaking news from AP News and Reuters wire services.
Return ONLY a raw JSON array with no markdown fences, no explanation, no preamble.
Return exactly 5 objects with this shape:
[
  {
    "headline": "Full descriptive headline",
    "topic": "Single keyword category (e.g. immigration, economy, ukraine, healthcare, climate)",
    "summary": "2-3 sentence factual summary of what happened",
    "ap_coverage": "What the AP reported specifically — key facts, quotes, framing",
    "reuters_coverage": "What Reuters reported specifically — any differences in emphasis or detail",
    "significance": "One sentence on why this story matters"
  }
]
Focus on major national/international stories: politics, economy, foreign policy, justice, environment, public health.
Do NOT include sports, celebrity, or entertainment news.`;

  const messages = [
    {
      role: "user" as const,
      content: `Search for "AP News top stories ${todayISO}" and "Reuters breaking news today ${todayISO}".
Find the 5 most significant wire service stories published today and return them as a JSON array.`,
    },
  ];

  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`/api/analyze failed (${res.status}): ${err.error}`);
  }

  const data = await res.json();

  // Extract text blocks from the Anthropic-shaped response
  const text = data.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  return parseJSON(text);
}
