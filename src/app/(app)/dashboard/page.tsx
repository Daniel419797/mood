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
import { Brain, Utensils, CalendarDays, TrendingUp, PlusCircle } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-lg leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: InsightDTO }) {
  const pct = Math.round(insight.strengthScore * 100);
  return (
    <Card className="border-l-4 border-l-primary">
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
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Brain className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Welcome to MoodTracker</h2>
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

  return (
    <div className="space-y-6">
      {/* Range filter */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as DashboardRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Mood Logs" value={summary.totalMoodLogs} icon={Brain} />
        <StatCard label="Eating Logs" value={summary.totalEatingLogs} icon={Utensils} />
        <StatCard label="Days Tracked" value={summary.daysTracked} icon={CalendarDays} />
        <StatCard
          label="Top Mood"
          value={summary.topMoodLabel ?? "—"}
          icon={TrendingUp}
        />
      </div>

      {/* Quick log CTAs */}
      <div className="flex gap-2">
        <LinkButton href="/mood/new" size="sm">
          <PlusCircle className="h-4 w-4 mr-1" />Log Mood
        </LinkButton>
        <LinkButton href="/eating/new" variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-1" />Log Meal
        </LinkButton>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mood trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mood Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {moodChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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

        {/* Eating frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eating by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {eatingFrequency.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eatingFrequency} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="foodCategory" type="category" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stress vs food */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Stress Level vs Food Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stressFoodCorrelation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
      </div>

      {/* Top insights */}
      {topInsights.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Top Patterns</h2>
            <LinkButton href="/insights" variant="ghost" size="sm">View All</LinkButton>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topInsights.slice(0, 3).map((i) => (
              <InsightCard key={i.correlationId} insight={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
