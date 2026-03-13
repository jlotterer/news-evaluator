/**
 * generate.js — Daily news analysis generator
 *
 * Fetches top stories from AP/Reuters via Claude web search,
 * compares them with Fox News coverage, and writes results to:
 *   public/data/latest.json
 *   public/data/archive/YYYY-MM-DD.json
 *
 * Run via: node scripts/generate.js
 * Scheduled via: GitHub Actions (.github/workflows/daily-analysis.yml)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");

// Ensure data directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";
const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});
const todayISO = new Date().toISOString().split("T")[0];

// ── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stream a Claude response with web search enabled.
 * Returns the final text content from the response.
 */
async function claudeSearch(systemPrompt, userPrompt) {
  log(`  → Calling Claude (web search)...`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract all text blocks from the response
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return text;
}

/**
 * Parse JSON from a Claude response that might contain markdown fences.
 */
function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  // Find outermost [ ] or { }
  const arrStart = clean.indexOf("[");
  const objStart = clean.indexOf("{");

  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    return JSON.parse(clean.slice(arrStart, clean.lastIndexOf("]") + 1));
  } else {
    return JSON.parse(clean.slice(objStart, clean.lastIndexOf("}") + 1));
  }
}

// ── Step 1: Get top wire service stories ──────────────────────────────────

async function getTopStories() {
  log("Step 1: Fetching top stories from AP and Reuters...");

  const systemPrompt = `You are a journalism analyst. Today is ${today}.
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

  const userPrompt = `Search for "AP News top stories ${todayISO}" and "Reuters breaking news today ${todayISO}". 
Find the 5 most significant wire service stories published today and return them as a JSON array.`;

  const text = await claudeSearch(systemPrompt, userPrompt);
  const stories = parseJSON(text);
  log(`  ✓ Found ${stories.length} stories`);
  return stories;
}

// ── Step 2: Get Fox News comparison for each story ─────────────────────────

async function getFoxComparison(story, index) {
  log(
    `Step 2.${index + 1}: Analyzing Fox coverage of "${story.headline.substring(0, 55)}..."`
  );

  const systemPrompt = `You are a media analyst specializing in cable news coverage patterns. Today is ${today}.
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

  const userPrompt = `Search for Fox News coverage of this story: "${story.headline}"
Topic category: ${story.topic}
Wire services reported: ${story.summary}

Search "Fox News ${story.headline.split(" ").slice(0, 5).join(" ")}" and "foxnews.com ${story.topic}".
Compare Fox's coverage to what AP and Reuters reported.`;

  try {
    const text = await claudeSearch(systemPrompt, userPrompt);
    const result = parseJSON(text);
    log(`  ✓ Fox analysis complete — severity: ${result.omission_severity} (${result.severity_score}/100)`);
    return result;
  } catch (err) {
    log(`  ⚠ Fox analysis failed for story ${index + 1}: ${err.message}`);
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

// ── Step 3: Generate daily summary ────────────────────────────────────────

async function getDailySummary(stories, foxResults) {
  log("Step 3: Generating daily summary...");

  const avgScore = Math.round(
    foxResults.reduce((sum, f) => sum + (f.severity_score || 50), 0) /
      foxResults.length
  );

  const criticalCount = foxResults.filter(
    (f) => f.omission_severity === "CRITICAL"
  ).length;
  const highCount = foxResults.filter(
    (f) => f.omission_severity === "HIGH"
  ).length;
  const notCoveredCount = foxResults.filter((f) => !f.fox_covered).length;

  return {
    average_severity_score: avgScore,
    critical_omissions: criticalCount,
    high_omissions: highCount,
    stories_not_covered: notCoveredCount,
    overall_grade: avgScore >= 75 ? "F" : avgScore >= 60 ? "D" : avgScore >= 40 ? "C" : avgScore >= 20 ? "B" : "A",
    summary_text: `Today's analysis found ${criticalCount} critical and ${highCount} high-severity coverage gaps. ${notCoveredCount} major wire service stories received little to no Fox News coverage. Overall omission score: ${avgScore}/100.`,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════════════════════════════════════");
  log("  What Fox Missed — Daily Generator");
  log(`  Date: ${today}`);
  log("═══════════════════════════════════════════");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY environment variable is not set.");
    process.exit(1);
  }

  try {
    // Fetch top stories
    const stories = await getTopStories();
    await sleep(1000);

    // Get Fox comparison for each story
    const foxResults = [];
    for (let i = 0; i < stories.length; i++) {
      const fox = await getFoxComparison(stories[i], i);
      foxResults.push(fox);
      await sleep(1500); // Rate limiting buffer
    }

    // Generate summary
    const dailySummary = await getDailySummary(stories, foxResults);

    // Build final output object
    const output = {
      generated_at: new Date().toISOString(),
      date_display: today,
      date_iso: todayISO,
      model_used: MODEL,
      daily_summary: dailySummary,
      stories: stories.map((story, i) => ({
        ...story,
        fox: foxResults[i],
      })),
    };

    // Write latest.json
    const latestPath = path.join(DATA_DIR, "latest.json");
    fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
    log(`✓ Wrote ${latestPath}`);

    // Write archive
    const archivePath = path.join(ARCHIVE_DIR, `${todayISO}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(output, null, 2));
    log(`✓ Archived to ${archivePath}`);

    log("═══════════════════════════════════════════");
    log(`  Complete! ${stories.length} stories analyzed.`);
    log(`  Average severity: ${dailySummary.average_severity_score}/100`);
    log("═══════════════════════════════════════════");
  } catch (err) {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  }
}

main();
