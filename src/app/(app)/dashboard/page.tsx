"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { insightsApi } from "@/services/insights";
import type { ContinuousCorrelationDTO, DashboardRange, DashboardResponseDTO, InsightDTO } from "@/types";
import {
  Brain,
  Lightbulb,
  Plus,
  Sparkles,
  X,
  Utensils,
} from "lucide-react";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-4xl leading-none">{value}</p>
      </CardContent>
    </Card>
  );
}

function dashboardRangeLabel(range: DashboardRange): string {
  if (range === "7d") return "last 7 days";
  if (range === "30d") return "last 30 days";
  return "all time";
}

function KeyInsightCard({ insight }: Readonly<{ insight: InsightDTO }>) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{insight.headline}</p>
        <Badge variant="secondary">{Math.round(insight.patternConsistency * 100)}% consistency</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{insight.supportingStat}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {insight.evidence === "strong" ? "Strong evidence" : "Emerging pattern"} · Association {Math.round(insight.strengthScore * 100)}%
      </p>
      <p className="mt-4 border-t pt-3 text-sm">{insight.suggestion}</p>
    </div>
  );
}

function EarlySignalCard({ signal }: Readonly<{ signal: ContinuousCorrelationDTO }>) {
  const evidenceLabel = signal.evidence === "weak" ? "Early signal" : signal.evidence;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{signal.xLabel} ↔ {signal.yLabel}</p>
        <Badge variant="outline">{evidenceLabel}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pearson r={signal.pearson.toFixed(2)} · Spearman ρ={signal.spearman.toFixed(2)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {signal.n} paired days · 95% CI {signal.confidenceInterval.low.toFixed(2)} to {signal.confidenceInterval.high.toFixed(2)} · preliminary, not causal
      </p>
    </div>
  );
}

function KeyInsightsContent({
  topInsights,
  earlySignals,
  daysTracked,
}: Readonly<{
  topInsights: InsightDTO[];
  earlySignals: ContinuousCorrelationDTO[];
  daysTracked: number;
}>) {
  if (topInsights.length > 0) {
    return topInsights.slice(0, 2).map((insight) => (
      <KeyInsightCard key={insight.correlationId} insight={insight} />
    ));
  }

  if (daysTracked >= 7 && earlySignals.length > 0) {
    return earlySignals.slice(0, 2).map((signal) => (
      <EarlySignalCard key={signal.id} signal={signal} />
    ));
  }

  const message =
    daysTracked < 7
      ? `Early signals unlock after 7 distinct tracked days. You have ${daysTracked}/7.`
      : "Analysis is running, but the recorded values do not vary enough to estimate a relationship yet.";

  return <div className="rounded-xl border p-6 text-sm text-muted-foreground">{message}</div>;
}

function InsightProgressNote({ daysTracked }: Readonly<{ daysTracked: number }>) {
  const message =
    daysTracked < 7
      ? "Track on 7 distinct days to unlock early behavioral signals."
      : "Early signals are preliminary. Keep logging to strengthen estimates and unlock adjusted models.";

  return (
    <Card>
      <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        {message}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponseDTO["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<DashboardRange>("30d");

  useEffect(() => {
    setIsLoading(true);
    insightsApi
      .getDashboard(range)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [range]);

  const rangeLabel = dashboardRangeLabel(range);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 xl:col-span-2" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-heading text-2xl">Your dashboard will populate after your first logs</h2>
        <p className="text-muted-foreground max-w-sm">
          Start logging your mood and meals. Early signals become available after 7 distinct tracked days; stronger patterns need repeated variation.
        </p>
        <div className="flex gap-2">
          <LinkButton href="/mood/new">
            <Brain className="h-4 w-4 mr-1" /> Log Mood
          </LinkButton>
          <LinkButton href="/eating/new" variant="outline">
            <Utensils className="h-4 w-4 mr-1" /> Log Meal
          </LinkButton>
        </div>
      </div>
    );
  }

  const { summary, moodTrend, eatingFrequency, stressFoodCorrelation, topInsights, earlySignals = [] } = data;

  const moodChartData = moodTrend.map((p) => ({
    ...p,
    date: format(parseISO(p.date), "MMM d"),
  }));


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-heading text-4xl">Overview</h1>
          <p className="text-muted-foreground">Analyzing patterns from {rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-background p-1">
            {([
              { key: "7d", label: "7 Days" },
              { key: "30d", label: "30 Days" },
              { key: "all", label: "All Time" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={
                  "h-7 rounded-md px-2.5 text-xs font-medium transition-colors " +
                  (range === opt.key ? "bg-foreground text-background" : "text-foreground hover:bg-muted")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <LinkButton href="/mood/new" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Log Mood
          </LinkButton>
          <LinkButton href="/eating/new" className="gap-1.5 bg-foreground text-background hover:bg-foreground/85">
            <X className="h-4 w-4" />
            Log Meal
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Logs" value={summary.totalMoodLogs + summary.totalEatingLogs} />
        <StatCard label="Days Tracked" value={summary.daysTracked} />
        <StatCard label="Top Mood" value={summary.topMoodLabel ?? "N/A"} />
        <StatCard label="Top Category" value={summary.topFoodCategory ?? "N/A"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">Mood Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {moodChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={moodChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgMoodScore"
                    name="Mood"
                    stroke="#000000"
                    dot
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgStressLevel"
                    name="Stress"
                    stroke="hsl(var(--muted-foreground))"
                    dot={false}
                    strokeWidth={2.2}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KeyInsightsContent
              topInsights={topInsights}
              earlySignals={earlySignals}
              daysTracked={summary.daysTracked}
            />
            <div className="text-right">
              <LinkButton href="/insights" variant="ghost" size="sm">View All</LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">Eating Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            {eatingFrequency.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eatingFrequency}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="foodCategory" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meal Categories by Stress Level</CardTitle>
            <p className="text-xs text-muted-foreground">
              Stress score: 1 = low, 5 = high. Each stacked bar counts meals logged on days with that average stress level.
            </p>
          </CardHeader>
          <CardContent>
            {stressFoodCorrelation.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No paired mood and meal data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stressFoodCorrelation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stressLevel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Healthy" stackId="food" fill="#111827" />
                  <Bar dataKey="Neutral" stackId="food" fill="#4b5563" />
                  <Bar dataKey="Junk" stackId="food" fill="#9ca3af" />
                  <Bar dataKey="Skipped" stackId="food" fill="#d1d5db" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {topInsights.length === 0 && <InsightProgressNote daysTracked={summary.daysTracked} />}
    </div>
  );
}
