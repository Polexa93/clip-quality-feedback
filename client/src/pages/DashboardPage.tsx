import { useEffect, useState } from "react";
import type { AnalyticsSummary, ClipTypeBreakdown, TagFrequency } from "@cqf/shared";
import { api } from "../api";

export function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [issues, setIssues] = useState<TagFrequency[]>([]);
  const [byType, setByType] = useState<ClipTypeBreakdown[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getSummary(), api.getIssues(), api.getByType()])
      .then(([s, i, t]) => {
        setSummary(s);
        setIssues(i);
        setByType(t.filter((row) => row.reviewCount > 0));
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="page error">{error}</div>;
  if (!summary) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <h1>Analytics</h1>

      <div className="stat-row">
        <Stat label="Total clips" value={summary.totalClips} />
        <Stat label="Reviewed" value={summary.reviewedClips} />
        <Stat label="Total reviews" value={summary.totalReviews} />
        <Stat
          label="Average quality"
          value={summary.averageRating !== null ? `${summary.averageRating.toFixed(1)} ★` : "—"}
        />
      </div>

      <section>
        <h2>Most common problems</h2>
        {issues.length === 0 && <p className="empty">No negative tags recorded yet.</p>}
        <ul className="bar-list">
          {issues.map((issue) => (
            <li key={issue.tag.id} className="bar-row">
              <span className="bar-row__label">{issue.tag.label}</span>
              <div className="bar-row__track">
                <div className="bar-row__fill bar-row__fill--negative" style={{ width: `${issue.percentOfReviews}%` }} />
              </div>
              <span className="bar-row__value">{issue.percentOfReviews}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Quality by clip type</h2>
        {byType.length === 0 && <p className="empty">No reviewed clips yet.</p>}
        <ul className="bar-list">
          {byType.map((row) => (
            <li key={row.clipType} className="bar-row">
              <span className="bar-row__label">{row.clipType}</span>
              <div className="bar-row__track">
                <div
                  className="bar-row__fill bar-row__fill--positive"
                  style={{ width: `${((row.averageRating ?? 0) / 5) * 100}%` }}
                />
              </div>
              <span className="bar-row__value">
                {row.averageRating?.toFixed(1)} ★ ({row.reviewCount})
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
    </div>
  );
}
