"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { insightsApi } from "@/services/insights";
import type { InsightDTO } from "@/types";
import { Lightbulb, Brain, Utensils, TrendingUp } from "lucide-react";

function InsightCard({ insight }: { insight: InsightDTO }) {
  const pct = Math.round(insight.strengthScore * 100);
  const strengthLabel = pct >= 80 ? "Strong" : pct >= 65 ? "Moderate" : "Weak";
  const strengthVariant =
    pct >= 80 ? "destructive" : pct >= 65 ? "default" : "secondary";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">{insight.headline}</CardTitle>
          <Badge variant={strengthVariant} className="shrink-0">
            {strengthLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stat */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">{insight.supportingStat}</p>
        </div>

        {/* Strength bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Correlation strength</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        {/* Date range */}
        <p className="text-xs text-muted-foreground">
          Period: {insight.dateRangeLabel}
        </p>

        {/* Suggestion */}
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">Suggestion: </span>
          {insight.suggestion}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "insufficient"; daysLogged: number; requiredDays: number }
    | { status: "empty"; lastUpdated: string; threshold: number }
    | { status: "loaded"; insights: InsightDTO[]; lastUpdated: string; threshold: number }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    insightsApi
      .getInsights()
      .then((res) => {
        const d = res.data.data;
        if (d.insufficientData) {
          setState({
            status: "insufficient",
            daysLogged: d.daysLogged,
            requiredDays: d.requiredDays,
          });
        } else if (d.insights.length === 0) {
          setState({ status: "empty", lastUpdated: d.lastUpdated, threshold: d.threshold });
        } else {
          setState({
            status: "loaded",
            insights: d.insights,
            lastUpdated: d.lastUpdated,
            threshold: d.threshold,
          });
        }
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "loading") {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load insights. Please try again.</p>
      </div>
    );
  }

  if (state.status === "insufficient") {
    const progress = Math.round((state.daysLogged / state.requiredDays) * 100);
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-semibold">Not enough data yet</h1>
        <p className="text-muted-foreground text-sm">
          Log at least {state.requiredDays} days of mood and eating data to unlock pattern
          insights. You&apos;ve logged data for {state.daysLogged} day
          {state.daysLogged !== 1 ? "s" : ""} so far.
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{state.daysLogged} days</span>
            <span>{state.requiredDays} days required</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
        <div className="flex gap-2 justify-center">
          <LinkButton href="/mood/new" size="sm">
            <Brain className="h-4 w-4 mr-1" /> Log Mood
          </LinkButton>
          <LinkButton href="/eating/new" variant="outline" size="sm">
            <Utensils className="h-4 w-4 mr-1" /> Log Meal
          </LinkButton>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-semibold">No significant patterns found</h1>
        <p className="text-muted-foreground text-sm">
          Your data is below the {state.threshold}% significance threshold. Keep logging daily
          and patterns will emerge.
        </p>
        <p className="text-xs text-muted-foreground">
          Last analysed: {format(parseISO(state.lastUpdated), "PPpp")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" /> Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Patterns ranked by strength · threshold {state.threshold}% · last updated{" "}
            {format(parseISO(state.lastUpdated), "PPp")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {state.insights.map((insight) => (
          <InsightCard key={insight.correlationId} insight={insight} />
        ))}
      </div>
    </div>
  );
}
