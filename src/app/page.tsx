"use client";

import { useState } from "react";
import { getTopStories, type TopStory } from "@/lib/getTopStories";
import { getFoxComparison, type FoxComparison } from "@/lib/getFoxComparison";
import Scorecard, { type DailySummary } from "@/components/Scorecard";
import StoryCard from "@/components/StoryCard";

type StoryWithFox = TopStory & { fox: FoxComparison };

type Phase = "idle" | "checking-cache" | "fetching-stories" | "analyzing" | "done" | "error";

function computeSummary(stories: StoryWithFox[]): DailySummary {
  const scores = stories.map((s) => s.fox.severity_score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const critical = stories.filter(
    (s) => s.fox.omission_severity === "CRITICAL"
  ).length;
  const high = stories.filter(
    (s) => s.fox.omission_severity === "HIGH"
  ).length;
  const notCovered = stories.filter((s) => !s.fox.fox_covered).length;

  let grade: string;
  if (avg >= 75) grade = "F";
  else if (avg >= 60) grade = "D";
  else if (avg >= 40) grade = "C";
  else if (avg >= 20) grade = "B";
  else grade = "A";

  return {
    average_severity_score: avg,
    critical_omissions: critical,
    high_omissions: high,
    stories_not_covered: notCovered,
    overall_grade: grade,
    summary_text: `Analysis of ${stories.length} top wire-service stories. ${notCovered} not covered by Fox News. ${critical} critical and ${high} high-severity omissions detected.`,
  };
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stories, setStories] = useState<TopStory[]>([]);
  const [completed, setCompleted] = useState<StoryWithFox[]>([]);
  const [analyzingIndex, setAnalyzingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });

  async function runAnalysis() {
    setPhase("checking-cache");
    setStories([]);
    setCompleted([]);
    setAnalyzingIndex(0);
    setError(null);
    setFromCache(false);

    try {
      // Check server-side cache first
      const cacheRes = await fetch(`/api/analysis-cache`);
      if (cacheRes.ok) {
        const cached: StoryWithFox[] = await cacheRes.json();
        if (Array.isArray(cached) && cached.length > 0) {
          setStories(cached);
          setCompleted(cached);
          setFromCache(true);
          setPhase("done");
          return;
        }
      }

      setPhase("fetching-stories");
      const topStories = await getTopStories();
      setStories(topStories);
      setPhase("analyzing");

      const results: StoryWithFox[] = [];
      for (let i = 0; i < topStories.length; i++) {
        setAnalyzingIndex(i);
        const fox = await getFoxComparison(topStories[i]);
        const storyWithFox = { ...topStories[i], fox };
        results.push(storyWithFox);
        setCompleted([...results]);
      }

      // Store results in server-side cache
      await fetch(`/api/analysis-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });

      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setPhase("error");
    }
  }

  const totalStories = stories.length || 5;
  const progress =
    phase === "fetching-stories"
      ? 0
      : phase === "analyzing"
        ? Math.round((completed.length / totalStories) * 100)
        : phase === "done"
          ? 100
          : 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            What Fox Missed
          </h1>
          <p className="text-sm text-foreground/60">
            Daily media literacy report &mdash; comparing wire-service headlines
            to Fox News coverage.
          </p>
        </header>

        {/* Analyze button */}
        {phase === "idle" && (
          <button
            onClick={runAnalysis}
            className="rounded-lg bg-foreground text-background px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Analyze Today&apos;s News
          </button>
        )}

        {/* Progress indicator */}
        {phase === "checking-cache" && (
          <p className="text-sm text-foreground/60 mb-10">
            <span className="inline-block animate-pulse mr-2">●</span>
            Checking for cached results&hellip;
          </p>
        )}
        {(phase === "fetching-stories" || phase === "analyzing") && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-2 flex-1 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/70 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-foreground/50 shrink-0">
                {completed.length}/{stories.length || "?"}
              </span>
            </div>

            <p className="text-sm text-foreground/60">
              {phase === "fetching-stories" && (
                <>
                  <span className="inline-block animate-pulse mr-2">●</span>
                  Fetching top stories from AP &amp; Reuters&hellip;
                </>
              )}
              {phase === "analyzing" && (
                <>
                  <span className="inline-block animate-pulse mr-2">●</span>
                  Analyzing Fox News coverage of story {analyzingIndex + 1} of{" "}
                  {stories.length}&hellip;
                </>
              )}
            </p>

            {/* Per-story loading states */}
            {stories.length > 0 && (
              <ul className="mt-4 space-y-2">
                {stories.map((s, i) => {
                  const isDone = i < completed.length;
                  const isActive =
                    i === analyzingIndex && phase === "analyzing";
                  return (
                    <li
                      key={i}
                      className={`text-sm flex items-center gap-2 ${
                        isDone
                          ? "text-foreground/70"
                          : isActive
                            ? "text-foreground"
                            : "text-foreground/30"
                      }`}
                    >
                      {isDone ? (
                        <span className="text-green-500 shrink-0">✓</span>
                      ) : isActive ? (
                        <span className="animate-spin text-xs shrink-0">
                          ⟳
                        </span>
                      ) : (
                        <span className="text-foreground/20 shrink-0">○</span>
                      )}
                      <span className="truncate">{s.headline}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-6 mb-10">
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">
              Analysis Failed
            </h2>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">
              {error}
            </p>
            <button
              onClick={runAnalysis}
              className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Completed story cards shown progressively during analysis */}
        {phase === "analyzing" && completed.length > 0 && (
          <div className="mt-8 space-y-2">
            {completed.map((story, i) => (
              <StoryCard key={i} story={story} />
            ))}
          </div>
        )}

        {/* Final results */}
        {phase === "done" && completed.length > 0 && (
          <>
            {fromCache && (
              <p className="text-xs text-foreground/40 mb-4">
                Showing cached results from earlier today.
              </p>
            )}
            <Scorecard
              summary={computeSummary(completed)}
              dateDisplay={dateDisplay}
            />
            <div className="space-y-2">
              {completed.map((story, i) => (
                <StoryCard key={i} story={story} />
              ))}
            </div>
            <div className="mt-10 pt-6 border-t border-foreground/10">
              <button
                onClick={runAnalysis}
                className="rounded-lg border border-foreground/20 px-4 py-2 text-sm text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                Run Again
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-foreground/10 text-xs text-foreground/40">
          Powered by Claude &amp; web search. Stories sourced from AP News and
          Reuters wire services.
        </footer>
      </div>
    </div>
  );
}
