"use client";

import { useEffect, useState, useCallback } from "react";
import type { TopStory } from "@/lib/getTopStories";
import type { FoxComparison } from "@/lib/getFoxComparison";
import Scorecard, { type DailySummary } from "@/components/Scorecard";
import StoryCard from "@/components/StoryCard";
import ArchiveSidebar from "@/components/ArchiveSidebar";

type StoryWithFox = TopStory & { fox: FoxComparison };

interface AnalysisData {
  generated_at: string | null;
  date_display: string | null;
  date_iso: string | null;
  model_used: string;
  daily_summary: DailySummary | null;
  stories: StoryWithFox[];
}

export default function Home() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadAnalysis = useCallback((date: string | null) => {
    setLoading(true);
    setData(null);
    const url = date ? `/data/archive/${date}.json` : "/data/latest.json";
    fetch(url)
      .then((res) => res.json())
      .then((json: AnalysisData) => {
        if (json.daily_summary && json.stories.length > 0) {
          setData(json);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnalysis(null);
  }, [loadAnalysis]);

  function handleSelectDate(date: string | null) {
    setSelectedDate(date);
    loadAnalysis(date);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      {/* Mobile header bar */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-foreground/10 print:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded hover:bg-foreground/5"
          aria-label="Toggle archive sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-foreground/70"
          >
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="text-sm font-semibold">What Fox Missed</span>
      </div>

      <div className="flex min-h-screen md:min-h-screen">
        {/* Sidebar — always visible on desktop, toggled on mobile */}
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
            fixed top-0 left-0 z-40 h-full w-60 bg-background border-r border-foreground/10
            transform transition-transform duration-200 ease-in-out
            md:relative md:translate-x-0 md:z-auto md:shrink-0
            print:hidden
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar header */}
            <div className="px-4 py-4 border-b border-foreground/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/50">
                Past Reports
              </h2>
            </div>
            <ArchiveSidebar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
            {/* Header */}
            <header className="mb-10 print:hidden">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                What Fox Missed
              </h1>
              <p className="text-sm text-foreground/60">
                Daily media literacy report &mdash; what Fox News reported, what
                they left out, and why it matters.
              </p>
            </header>

            {loading && (
              <p className="text-sm text-foreground/60">
                <span className="inline-block animate-pulse mr-2">●</span>
                Loading analysis&hellip;
              </p>
            )}

            {!loading && !data && (
              <p className="text-sm text-foreground/50">
                No analysis available{selectedDate ? ` for ${selectedDate}` : " yet"}.
                {!selectedDate && " A new report is generated daily at 8 PM ET."}
              </p>
            )}

            {!loading && data && data.daily_summary && (
              <>
                <Scorecard
                  summary={data.daily_summary}
                  dateDisplay={data.date_display ?? ""}
                />
                <div className="space-y-2">
                  {data.stories.map((story, i) => (
                    <StoryCard key={i} story={story} />
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            <footer className="mt-16 pt-6 border-t border-foreground/10 text-xs text-foreground/40 print:hidden">
              Powered by Claude &amp; web search. Stories sourced from major news
              outlets. Updated daily at 8 PM ET.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
