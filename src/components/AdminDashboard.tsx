"use client";

import { useEffect, useState } from "react";

interface ArchiveEntry {
  date: string;
  file: string;
}

interface DailySummary {
  average_severity_score: number;
  critical_omissions: number;
  high_omissions: number;
  stories_not_covered: number;
  overall_grade: string;
  summary_text: string;
}

interface AnalysisData {
  generated_at: string | null;
  date_display: string | null;
  date_iso: string | null;
  model_used: string;
  daily_summary: DailySummary | null;
  stories: Array<{
    headline: string;
    topic: string;
    fox: { omission_severity: string; severity_score: number; fox_covered: boolean };
  }>;
}

export default function AdminDashboard() {
  const [latest, setLatest] = useState<AnalysisData | null>(null);
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/data/latest.json").then((r) => r.ok ? r.json() : null),
      fetch("/data/archive-index.json").then((r) => r.ok ? r.json() : []),
    ])
      .then(([latestData, archiveData]) => {
        setLatest(latestData);
        setArchive(archiveData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-foreground/50">What Fox Missed</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm rounded border border-foreground/20 hover:bg-foreground/5"
          >
            Sign out
          </button>
        </header>

        {loading && (
          <p className="text-sm text-foreground/60">
            <span className="inline-block animate-pulse mr-2">&#9679;</span>
            Loading...
          </p>
        )}

        {!loading && (
          <div className="space-y-8">
            {/* Latest Analysis */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Latest Analysis</h2>
              {latest && latest.daily_summary ? (
                <div className="border border-foreground/10 rounded-lg p-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Stat label="Date" value={latest.date_display ?? "—"} />
                    <Stat label="Grade" value={latest.daily_summary.overall_grade} />
                    <Stat label="Avg Severity" value={`${latest.daily_summary.average_severity_score}/100`} />
                    <Stat label="Model" value={latest.model_used} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Stat label="Critical" value={String(latest.daily_summary.critical_omissions)} />
                    <Stat label="High" value={String(latest.daily_summary.high_omissions)} />
                    <Stat label="Not Covered" value={String(latest.daily_summary.stories_not_covered)} />
                  </div>
                  <p className="text-sm text-foreground/60">{latest.daily_summary.summary_text}</p>
                  <div className="text-xs text-foreground/40">
                    Generated: {latest.generated_at ? new Date(latest.generated_at).toLocaleString() : "—"}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/50">No analysis data available.</p>
              )}
            </section>

            {/* Stories */}
            {latest && latest.stories.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4">Stories ({latest.stories.length})</h2>
                <div className="border border-foreground/10 rounded-lg divide-y divide-foreground/10">
                  {latest.stories.map((story, i) => (
                    <div key={i} className="p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{story.headline}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">{story.topic}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <SeverityBadge severity={story.fox.omission_severity} />
                        <span className="text-xs text-foreground/50">{story.fox.severity_score}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Archive */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Archive ({archive.length} reports)</h2>
              {archive.length > 0 ? (
                <div className="border border-foreground/10 rounded-lg divide-y divide-foreground/10 max-h-64 overflow-y-auto">
                  {archive.map((entry) => (
                    <div key={entry.date} className="px-4 py-2.5 text-sm flex items-center justify-between">
                      <span>{entry.date}</span>
                      <span className="text-xs text-foreground/40">{entry.file}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground/50">No archived reports yet.</p>
              )}
            </section>

            {/* Configuration */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Configuration</h2>
              <div className="border border-foreground/10 rounded-lg p-5 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-foreground/60">API Key</span>
                  <span>{process.env.NEXT_PUBLIC_HAS_API_KEY === "true" ? "Configured" : "Check server env"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Schedule</span>
                  <span>Daily at midnight UTC (8 PM ET)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Generator</span>
                  <span>GitHub Actions</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/50 mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/15 text-red-500",
    HIGH: "bg-orange-500/15 text-orange-500",
    MEDIUM: "bg-yellow-500/15 text-yellow-600",
    LOW: "bg-green-500/15 text-green-600",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[severity] ?? "bg-foreground/10 text-foreground/60"}`}>
      {severity}
    </span>
  );
}
