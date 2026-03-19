export interface DailySummary {
  average_severity_score: number;
  critical_omissions: number;
  high_omissions: number;
  stories_not_covered: number;
  overall_grade: string;
  summary_text: string;
}

export interface ScorecardProps {
  summary: DailySummary;
  dateDisplay: string;
}

const GRADE_STYLES: Record<string, { text: string; bg: string }> = {
  A: {
    text: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 dark:bg-green-900/40",
  },
  B: {
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/30",
  },
  C: {
    text: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
  },
  D: {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-100 dark:bg-orange-900/40",
  },
  F: {
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-900/40",
  },
};

function gradeLabel(grade: string): string {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Good";
    case "C":
      return "Fair";
    case "D":
      return "Poor";
    case "F":
      return "Failing";
    default:
      return "";
  }
}

function severityColor(score: number): string {
  if (score >= 75) return "bg-red-600";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 20) return "bg-green-400";
  return "bg-green-500";
}

export default function Scorecard({ summary, dateDisplay }: ScorecardProps) {
  const grade = GRADE_STYLES[summary.overall_grade] ?? GRADE_STYLES.C;

  return (
    <section className="border-2 border-foreground/20 rounded-lg p-6 sm:p-8 mb-10 print:border-0 print:rounded-none print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-1">
            Daily Scorecard
          </h2>
          <p className="text-sm text-foreground/60">{dateDisplay}</p>
        </div>
        <div
          className={`flex items-center gap-3 rounded-lg px-4 py-3 ${grade.bg}`}
        >
          <span className={`text-4xl font-bold leading-none ${grade.text}`}>
            {summary.overall_grade}
          </span>
          <div>
            <div className={`text-sm font-semibold ${grade.text}`}>
              {gradeLabel(summary.overall_grade)}
            </div>
            <div className="text-xs text-foreground/50">Fox Coverage Grade</div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* Average severity */}
        <div className="bg-foreground/[.03] dark:bg-foreground/[.06] rounded-md p-4">
          <div className="text-2xl font-bold leading-none">
            {summary.average_severity_score}
            <span className="text-sm font-normal text-foreground/40">/100</span>
          </div>
          <div
            className="mt-2 h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden"
          >
            <div
              className={`h-full rounded-full ${severityColor(summary.average_severity_score)}`}
              style={{ width: `${summary.average_severity_score}%` }}
            />
          </div>
          <div className="text-xs text-foreground/50 mt-2">
            Avg Severity Score
          </div>
        </div>

        {/* Critical omissions */}
        <div className="bg-foreground/[.03] dark:bg-foreground/[.06] rounded-md p-4">
          <div className="text-2xl font-bold leading-none">
            {summary.critical_omissions}
          </div>
          <div className="text-xs text-foreground/50 mt-2">
            Critical Omissions
          </div>
        </div>

        {/* Stories not covered */}
        <div className="bg-foreground/[.03] dark:bg-foreground/[.06] rounded-md p-4">
          <div className="text-2xl font-bold leading-none">
            {summary.stories_not_covered}
          </div>
          <div className="text-xs text-foreground/50 mt-2">
            Stories Not Covered
          </div>
        </div>

        {/* High omissions */}
        <div className="bg-foreground/[.03] dark:bg-foreground/[.06] rounded-md p-4">
          <div className="text-2xl font-bold leading-none">
            {summary.high_omissions}
          </div>
          <div className="text-xs text-foreground/50 mt-2">
            High Omissions
          </div>
        </div>
      </div>

      {/* Summary text */}
      <p className="text-sm leading-relaxed text-foreground/70">
        {summary.summary_text}
      </p>
    </section>
  );
}
