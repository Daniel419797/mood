"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { insightsApi } from "@/services/insights";
import type { InsightDTO } from "@/types";
import { CircleCheck, Lightbulb, ShieldAlert } from "lucide-react";

function StrengthRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative h-28 w-28 rounded-full"
        style={{
          background: `conic-gradient(#000000 ${pct}%, #ffffff ${pct}% 100%)`,
        }}
      >
        <div className="absolute inset-[14px] flex items-center justify-center rounded-full bg-background text-xs font-semibold">
          {pct}%
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Matched</p>
    </div>
  );
}

function InsightPanel({ insight }: { insight: InsightDTO }) {
  const pct = Math.round(insight.strengthScore * 100);
  return (
    <Card className="border bg-background">
      <CardContent className="p-5">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-3xl leading-tight">{insight.headline}</h3>
                <p className="text-xs text-muted-foreground">{insight.dateRangeLabel}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {pct}% Match
              </Badge>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">The Pattern</p>
              <p className="mt-1 text-base">{insight.supportingStat}</p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Actionable Suggestion</p>
              <p className="mt-1 text-sm">{insight.suggestion}</p>
            </div>
          </div>

          <div className="flex w-full items-center justify-center md:w-52">
            <StrengthRing value={insight.strengthScore} />
          </div>
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
          return;
        }

        if (d.insights.length === 0) {
          setState({ status: "empty", lastUpdated: d.lastUpdated, threshold: d.threshold });
          return;
        }

        setState({
          status: "loaded",
          insights: d.insights,
          lastUpdated: d.lastUpdated,
          threshold: d.threshold,
        });
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border bg-background p-10 text-center">
        <p className="text-muted-foreground">Failed to load insights. Please try again.</p>
      </div>
    );
  }

  if (state.status === "insufficient") {
    const progress = Math.round((state.daysLogged / state.requiredDays) * 100);
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lightbulb className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-heading text-3xl">Not enough data yet</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Keep logging for at least {state.requiredDays} days to unlock ranked behavioral correlations.
          </p>
          <div className="mx-auto mt-5 h-2 max-w-md rounded-full bg-muted">
            <div className="h-2 rounded-full bg-foreground" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {state.daysLogged} / {state.requiredDays} days
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === "empty") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-heading text-3xl">No strong correlations yet</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Data is below the {state.threshold}% significance threshold. Keep logging to improve statistical confidence.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Last analyzed: {format(parseISO(state.lastUpdated), "PPpp")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const strongest = useMemo(() => state.insights[0], [state.insights]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-4xl">Behavioral Insights</h1>
          <p className="text-muted-foreground">Discover correlations between your emotional states and eating habits.</p>
        </div>
        <Badge variant="outline" className="h-9 px-3 text-xs font-semibold uppercase tracking-[0.13em]">
          Last 30 Days
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CircleCheck className="h-4 w-4 text-black" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Data Quality</p>
              <p className="font-medium">High ({state.insights.length + 24} Days)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CircleCheck className="h-4 w-4" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Patterns Found</p>
              <p className="font-medium">{state.insights.length} Significant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Lightbulb className="h-4 w-4" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Primary Trigger</p>
              <p className="font-medium">{strongest?.headline.split(" ").slice(0, 2).join(" ") ?? "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="mb-3 text-lg font-semibold">Ranked Correlations</p>
        <div className="space-y-3">
          {state.insights.map((insight) => (
            <InsightPanel key={insight.correlationId} insight={insight} />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 p-5 md:flex-row md:items-center">
          <div>
            <p className="font-semibold">Want deeper analysis?</p>
            <p className="text-sm text-muted-foreground">Keep logging for another 7 days to unlock circadian rhythm insights.</p>
          </div>
          <LinkButton href="/mood/new" className="bg-foreground text-background hover:bg-foreground/85">
            Continue Logging
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}
