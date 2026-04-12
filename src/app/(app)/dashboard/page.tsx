"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
import type { DashboardResponseDTO } from "@/types";
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponseDTO["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    insightsApi
      .getDashboard("30d")
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

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
          Start logging your mood and meals. After 7 days of data, pattern insights will appear here.
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

  const { summary, moodTrend, eatingFrequency, stressFoodCorrelation, topInsights } = data;

  const moodChartData = moodTrend.map((p) => ({
    ...p,
    date: format(parseISO(p.date), "MMM d"),
  }));

  const pieTotals = stressFoodCorrelation.reduce(
    (acc, row) => {
      acc.Healthy += row.Healthy;
      acc.Neutral += row.Neutral;
      acc.Sugary += row.Sugary;
      acc.Junk += row.Junk;
      acc.Skipped += row.Skipped;
      return acc;
    },
    { Healthy: 0, Neutral: 0, Sugary: 0, Junk: 0, Skipped: 0 },
  );

  const pieData = [
    { name: "Healthy", value: pieTotals.Healthy, color: "#ffffff" },
    { name: "Neutral", value: pieTotals.Neutral, color: "#000000" },
    { name: "Sugary", value: pieTotals.Sugary, color: "#ffffff" },
    { name: "Junk", value: pieTotals.Junk, color: "#000000" },
    { name: "Skipped", value: pieTotals.Skipped, color: "#ffffff" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-heading text-4xl">Overview</h1>
          <p className="text-muted-foreground">Analyzing patterns from the last 30 days</p>
        </div>
        <div className="flex items-center gap-2">
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
                    stroke="#ffffff"
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
            {topInsights.length > 0 ? (
              topInsights.slice(0, 2).map((insight) => (
                <div key={insight.correlationId} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{insight.headline}</p>
                    <Badge variant="secondary">{Math.round(insight.strengthScore * 100)}%</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{insight.supportingStat}</p>
                  <p className="mt-4 border-t pt-3 text-sm">{insight.suggestion}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                Insights will appear after sufficient logs are available.
              </div>
            )}
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
            <CardTitle className="text-base">Stress vs Food Category</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No data for this period</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={82}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-muted-foreground">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {topInsights.length === 0 && (
        <Card>
          <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            Keep logging daily to unlock statistically stronger insights.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
