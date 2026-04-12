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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insightsApi } from "@/services/insights";
import type { DashboardRange, DashboardResponseDTO, InsightDTO } from "@/types";
import {
  ArrowUpRight,
  Brain,
  CalendarDays,
  Lightbulb,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-muted-foreground/10 bg-card/70">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-2xl leading-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: InsightDTO }) {
  const pct = Math.round(insight.strengthScore * 100);
  return (
    <Card className="border-l-4 border-l-primary bg-card/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm">{insight.headline}</p>
          <Badge variant="secondary" className="shrink-0">
            {pct}%
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{insight.supportingStat}</p>
        <p className="mt-2 text-xs italic text-muted-foreground">{insight.suggestion}</p>
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

  const totalFoodLogs = eatingFrequency.reduce((sum, item) => sum + item.count, 0);
  const averageMood = moodTrend.length
    ? (moodTrend.reduce((sum, item) => sum + item.avgMoodScore, 0) / moodTrend.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Analytics Overview</p>
          <h1 className="font-heading text-2xl">Health Behaviour Dashboard</h1>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as DashboardRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mood Logs"
          value={summary.totalMoodLogs}
          hint="Entries captured"
          icon={Brain}
        />
        <StatCard
          label="Meal Logs"
          value={summary.totalEatingLogs}
          hint="Nutrition entries"
          icon={Utensils}
        />
        <StatCard
          label="Days Tracked"
          value={summary.daysTracked}
          hint="Active tracking days"
          icon={CalendarDays}
        />
        <StatCard
          label="Average Mood"
          value={averageMood}
          hint={`Top label: ${summary.topMoodLabel ?? "N/A"}`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mood vs Stress Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {moodChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
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
                    stroke="hsl(var(--primary))"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgStressLevel"
                    name="Stress"
                    stroke="hsl(var(--destructive))"
                    dot={false}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nutrition Mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {eatingFrequency.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={eatingFrequency} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="foodCategory" type="category" tick={{ fontSize: 12 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="rounded-xl border bg-muted/35 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Top category</p>
                  <p className="mt-1 font-semibold">{summary.topFoodCategory ?? "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{totalFoodLogs} meals in selected range</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Stress vs Food Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stressFoodCorrelation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={stressFoodCorrelation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stressLevel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Healthy" stackId="a" fill="#22c55e" />
                  <Bar dataKey="Neutral" stackId="a" fill="#94a3b8" />
                  <Bar dataKey="Sugary" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Junk" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Skipped" stackId="a" fill="#6b7280" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Action Rail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LinkButton href="/mood/new" className="w-full justify-between">
              Log Mood
              <ArrowUpRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/eating/new" className="w-full justify-between" variant="outline">
              Log Meal
              <ArrowUpRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/insights" className="w-full justify-between" variant="secondary">
              Deep Insights
              <ArrowUpRight className="h-4 w-4" />
            </LinkButton>
            <div className="rounded-xl border bg-muted/35 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tracking cadence</p>
              <p className="mt-1 text-sm">
                {summary.daysTracked > 0
                  ? `${summary.daysTracked} active days recorded.`
                  : "No active days yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {topInsights.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pattern Feed</CardTitle>
            <LinkButton href="/insights" variant="ghost" size="sm">View All</LinkButton>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topInsights.slice(0, 3).map((i) => (
                <InsightCard key={i.correlationId} insight={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            Insights will appear after sufficient data is logged.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/mood/new" size="sm">
          <PlusCircle className="mr-1 h-4 w-4" />
          Quick Mood Log
        </LinkButton>
        <LinkButton href="/eating/new" variant="outline" size="sm">
          <PlusCircle className="mr-1 h-4 w-4" />
          Quick Meal Log
        </LinkButton>
      </div>

      {topInsights.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">High Confidence Signals</h2>
            <Badge variant="secondary">{topInsights.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topInsights.slice(0, 6).map((i) => (
              <InsightCard key={i.correlationId} insight={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
