"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
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
          background: "conic-gradient(#000000 " + pct + "%, #e5e7eb " + pct + "% 100%)",
        }}
      >
        <div className="absolute inset-[14px] flex items-center justify-center rounded-full bg-background text-xs font-semibold">
          {pct}%
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Association
      </p>
    </div>
  );
}

function pValueLabel(value: number): string {
  if (value < 0.001) return "<0.001";
  return value.toFixed(3);
}

function InsightPanel({ insight }: { insight: InsightDTO }) {
  const consistency = Math.round(insight.patternConsistency * 100);
  return (
    <Card className="border bg-background">
      <CardContent className="p-5">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-heading text-3xl leading-tight">{insight.headline}</h3>
                <p className="text-xs text-muted-foreground">{insight.dateRangeLabel}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge variant={insight.evidence === "strong" ? "default" : "secondary"}>
                  {insight.evidence === "strong" ? "Strong evidence" : "Emerging"}
                </Badge>
                <Badge variant="outline">{consistency}% consistency</Badge>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Observed pattern
              </p>
              <p className="mt-1 text-base">{insight.supportingStat}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Association strength {Math.round(insight.strengthScore * 100)}% · {insight.totalDays} comparable days · Fisher p={pValueLabel(insight.pValue)}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                What to test next
              </p>
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
    | {
        status: "loaded";
        insights: InsightDTO[];
        emergingInsights: InsightDTO[];
        lastUpdated: string;
        patternThreshold: number;
        analyzedDays: number;
      }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    insightsApi
      .getInsights()
      .then((res) => {
        const data = res.data.data;
        if (data.insufficientData) {
          setState({
            status: "insufficient",
            daysLogged: data.daysLogged,
            requiredDays: data.requiredDays,
          });
          return;
        }

        setState({
          status: "loaded",
          insights: data.insights,
          emergingInsights: data.emergingInsights,
          lastUpdated: data.lastUpdated,
          patternThreshold: data.patternThreshold,
          analyzedDays: data.analyzedDays,
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
    const progress = Math.min(100, Math.round((state.daysLogged / state.requiredDays) * 100));
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lightbulb className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-heading text-3xl">Not enough data yet</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Log mood or meals on at least {state.requiredDays} distinct days in the last 30 days before pattern analysis starts.
          </p>
          <div className="mx-auto mt-5 h-2 max-w-md rounded-full bg-muted">
            <div className="h-2 rounded-full bg-foreground" style={{ width: progress + "%" }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {state.daysLogged} / {state.requiredDays} days
          </p>
        </CardContent>
      </Card>
    );
  }

  const strongest = state.insights[0] ?? state.emergingInsights[0];
  const strongCount = state.insights.filter((insight) => insight.evidence === "strong").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-4xl">Behavioral Insights</h1>
          <p className="text-muted-foreground">
            Explore repeated associations between mood, sleep, stress, workload, energy, and eating habits.
          </p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Coverage
              </p>
              <p className="font-medium">{state.analyzedDays} tracked days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CircleCheck className="h-4 w-4" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Patterns meeting filter
              </p>
              <p className="font-medium">{state.insights.length} found</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Lightbulb className="h-4 w-4" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Evidence
              </p>
              <p className="font-medium">
                {strongCount > 0 ? strongCount + " strong" : strongest ? "Emerging" : "Not enough variation"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {state.insights.length > 0 ? (
        <div>
          <p className="mb-3 text-lg font-semibold">Ranked patterns</p>
          <div className="space-y-3">
            {state.insights.map((insight) => (
              <InsightPanel key={insight.correlationId} insight={insight} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-heading text-3xl">No patterns meet your filter yet</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              No repeated association passed your {state.patternThreshold}% consistency filter together with the minimum comparison checks. This does not mean there are no patterns in your data.
            </p>
          </CardContent>
        </Card>
      )}

      {state.emergingInsights.length > 0 && (
        <div>
          <div className="mb-3">
            <p className="text-lg font-semibold">Emerging patterns</p>
            <p className="text-sm text-muted-foreground">
              These relationships are worth watching but do not yet meet your consistency filter.
            </p>
          </div>
          <div className="space-y-3">
            {state.emergingInsights.map((insight) => (
              <InsightPanel key={insight.correlationId} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {state.insights.length === 0 && state.emergingInsights.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            There is enough tracking history to run the analysis, but not enough variation between trigger and comparison days to estimate a useful association yet. Continue logging normally rather than trying to create a pattern.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 p-5 md:flex-row md:items-center">
          <div>
            <p className="font-semibold">Keep building the sample</p>
            <p className="text-sm text-muted-foreground">
              These are observational associations, not proof that one behavior caused another. Last analyzed {format(parseISO(state.lastUpdated), "PPpp")}.
            </p>
          </div>
          <LinkButton href="/mood/new" className="bg-foreground text-background hover:bg-foreground/85">
            Continue Logging
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}
