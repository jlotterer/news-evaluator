/**
 * Compares a wire-service story against Fox News coverage by calling
 * the /api/analyze route.
 *
 * Ported from scripts/generate.js — uses the internal API proxy instead of
 * the Anthropic SDK directly.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface FoxComparison {
  fox_covered: boolean;
  fox_headline: string | null;
  fox_summary: string;
  missing_context: string[];
  added_spin: string | null;
  analysis: string;
  omission_severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity_score: number;
  severity_rationale: string;
}

interface StoryInput {
  headline: string;
  topic: string;
  summary: string;
}

/**
 * Parse JSON from a Claude response that might contain markdown fences.
 */
function parseJSON(text: string): FoxComparison {
  const clean = text.replace(/```json|```/g, "").trim();
  const arrStart = clean.indexOf("[");
  const objStart = clean.indexOf("{");

  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    return JSON.parse(clean.slice(arrStart, clean.lastIndexOf("]") + 1));
  }
  return JSON.parse(clean.slice(objStart, clean.lastIndexOf("}") + 1));
}

/**
 * Analyze how Fox News covered a specific story compared to wire service
 * reporting, by calling the /api/analyze proxy route.
 */
export async function getFoxComparison(
  story: StoryInput
): Promise<FoxComparison> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });

  const system = `You are a media analyst specializing in cable news coverage patterns. Today is ${today}.
Search for how Fox News covered a specific story and compare it to wire service reporting.
Be factual and evidence-based. Do not editorialize beyond what the evidence shows.
Return ONLY a raw JSON object (no markdown fences, no explanation):
{
  "fox_covered": true or false,
  "fox_headline": "The headline Fox used, or null if not covered",
  "fox_summary": "How Fox framed this story — tone, emphasis, what they highlighted. If not covered, say exactly: 'Not covered or not prominently featured.'",
  "missing_context": [
    "Specific fact or context present in wire reports but absent from Fox coverage",
    "Another specific omission or misleading framing",
    "A third specific omission — statistics, expert voices, historical context, etc."
  ],
  "added_spin": "Any framing, language, or emphasis Fox added that wasn't in wire reports (or null)",
  "analysis": "2-3 sentence analytical summary of the coverage gap and what a viewer would misunderstand",
  "omission_severity": "LOW, MEDIUM, HIGH, or CRITICAL",
  "severity_score": integer from 0 to 100,
  "severity_rationale": "One sentence explaining the severity rating"
}
Severity guide: LOW = minor framing difference, MEDIUM = significant context missing, HIGH = materially misleading, CRITICAL = story ignored or severely distorted.`;

  const messages = [
    {
      role: "user" as const,
      content: `Search for Fox News coverage of this story: "${story.headline}"
Topic category: ${story.topic}
Wire services reported: ${story.summary}

Search "Fox News ${story.headline.split(" ").slice(0, 5).join(" ")}" and "foxnews.com ${story.topic}".
Compare Fox's coverage to what AP and Reuters reported.`,
    },
  ];

  try {
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
  } catch {
    return {
      fox_covered: false,
      fox_headline: null,
      fox_summary: "Analysis unavailable — could not retrieve Fox News data.",
      missing_context: ["Unable to retrieve Fox coverage for this story."],
      added_spin: null,
      analysis: "Fox News coverage data was unavailable for analysis.",
      omission_severity: "MEDIUM",
      severity_score: 50,
      severity_rationale: "Default score — analysis was unavailable.",
    };
  }
}
