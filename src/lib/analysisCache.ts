/**
 * Simple file-based cache for daily analysis results.
 * Cache key is today's date (YYYY-MM-DD) so running analysis twice
 * in the same day returns cached results without burning API credits.
 */

import { promises as fs } from "fs";
import path from "path";

// Vercel serverless functions have a read-only filesystem except /tmp
const CACHE_DIR = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  ".cache"
);

function cachePath(dateISO: string): string {
  return path.join(CACHE_DIR, `${dateISO}.json`);
}

function todayISO(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    .replace(/\//g, "-");
}

export async function getCachedAnalysis(date?: string) {
  const key = date ?? todayISO();
  try {
    const raw = await fs.readFile(cachePath(key), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(data: unknown, date?: string) {
  const key = date ?? todayISO();
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cachePath(key), JSON.stringify(data));
}
