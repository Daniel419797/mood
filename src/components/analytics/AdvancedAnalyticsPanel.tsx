"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AdvancedAnalyticsDTO,
  ContinuousCorrelationDTO,
  LogisticModelReportDTO,
  RegressionModelReportDTO,
} from "@/types";
import { Activity, FlaskConical, GitBranch, Sigma } from "lucide-react";

function pct(value: number): string {
  return (value * 100).toFixed(0) + "%";
}

function signed(value: number, digits = 2): string {
  const rendered = value.toFixed(digits);
  return value > 0 ? "+" + rendered : rendered;
}

function probability(value: number): string {
  if (value < 0.001) return "<0.001";
  return value.toFixed(3);
}

function evidenceVariant(
  evidence: ContinuousCorrelationDTO["evidence"],
): "default" | "secondary" | "outline" {
  if (evidence === "strong") return "default";
  if (evidence === "emerging") return "secondary";
  return "outline";
}

function CorrelationCard({
  result,
  title,
  subtitle,
}: Readonly<{
  result: ContinuousCorrelationDTO;
  title?: string;
  subtitle?: string;
}>) {
  const heading = title ?? result.xLabel + " ↔ " + result.yLabel;
  const detail = subtitle ?? result.n + " paired days";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{heading}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
          <Badge variant={evidenceVariant(result.evidence)}>{result.evidence}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pearson r</p>
            <p className="font-semibold">{signed(result.pearson)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Spearman ρ</p>
            <p className="font-semibold">{signed(result.spearman)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          95% CI {signed(result.confidenceInterval.low)} to {signed(result.confidenceInterval.high)}
          {" · "}FDR-adjusted p={probability(result.adjustedPValue)}
        </p>
      </CardContent>
    </Card>
  );
}

function LinearModelCard({ report }: Readonly<{ report: RegressionModelReportDTO }>) {
  const predictors = report.model.coefficients.filter((coefficient) => coefficient.name !== "Intercept");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{report.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{report.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">n={report.model.n}</Badge>
          <Badge variant="outline">Adjusted R² {report.model.adjustedRSquared.toFixed(2)}</Badge>
          <Badge variant="outline">HC3 robust SE</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Predictor</th>
                <th className="py-2 pr-4 font-medium">Estimate</th>
                <th className="py-2 pr-4 font-medium">Std. β</th>
                <th className="py-2 pr-4 font-medium">95% CI</th>
                <th className="py-2 pr-4 font-medium">FDR p</th>
                <th className="py-2 font-medium">VIF</th>
              </tr>
            </thead>
            <tbody>
              {predictors.map((coefficient) => (
                <tr key={coefficient.name} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{coefficient.name}</td>
                  <td className="py-3 pr-4">{signed(coefficient.estimate)}</td>
                  <td className="py-3 pr-4">
                    {coefficient.standardizedEstimate === null
                      ? "—"
                      : signed(coefficient.standardizedEstimate)}
                  </td>
                  <td className="py-3 pr-4">
                    {signed(coefficient.confidenceInterval.low)} to{" "}
                    {signed(coefficient.confidenceInterval.high)}
                  </td>
                  <td className="py-3 pr-4">{probability(coefficient.adjustedPValue)}</td>
                  <td className="py-3">
                    {coefficient.vif === null ? "—" : coefficient.vif.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {report.model.warnings.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            {report.model.warnings.join(" ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LogisticModelCard({ report }: Readonly<{ report: LogisticModelReportDTO }>) {
  const predictors = report.model.coefficients.filter((coefficient) => coefficient.name !== "Intercept");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{report.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{report.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">n={report.model.n}</Badge>
          <Badge variant="outline">{report.model.eventCount} event days</Badge>
          <Badge variant="outline">Pseudo-R² {report.model.pseudoRSquared.toFixed(2)}</Badge>
          <Badge variant={report.model.converged ? "secondary" : "outline"}>
            {report.model.converged ? "Converged" : "Convergence warning"}
          </Badge>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {predictors.map((coefficient) => (
            <div key={coefficient.name} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{coefficient.name}</p>
                <Badge variant="outline">OR {coefficient.oddsRatio.toFixed(2)}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                95% OR CI {coefficient.oddsRatioConfidenceInterval.low.toFixed(2)} to{" "}
                {coefficient.oddsRatioConfidenceInterval.high.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                FDR p={probability(coefficient.adjustedPValue)} · VIF{" "}
                {coefficient.vif === null ? "—" : coefficient.vif.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {report.model.warnings.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            {report.model.warnings.join(" ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContinuousRelationshipsContent({
  meaningful,
  early,
}: Readonly<{
  meaningful: ContinuousCorrelationDTO[];
  early: ContinuousCorrelationDTO[];
}>) {
  if (meaningful.length > 0) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {meaningful.map((result) => (
          <CorrelationCard key={result.id} result={result} />
        ))}
      </div>
    );
  }

  if (early.length > 0) {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Your first seven tracked days are enough to show early signals, but not enough to call them stable. These are shown for transparency and should be treated as preliminary.
          </CardContent>
        </Card>
        <div className="grid gap-3 lg:grid-cols-2">
          {early.map((result) => (
            <CorrelationCard
              key={result.id}
              result={result}
              title={"Early signal: " + result.xLabel + " ↔ " + result.yLabel}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 text-sm text-muted-foreground">
        Seven tracked days are available, but the recorded values do not vary enough to estimate a correlation yet. Continue logging normally so the model has contrast to analyze.
      </CardContent>
    </Card>
  );
}

function LaggedRelationshipsContent({
  meaningful,
  early,
}: Readonly<{
  meaningful: ContinuousCorrelationDTO[];
  early: ContinuousCorrelationDTO[];
}>) {
  if (meaningful.length > 0) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {meaningful.map((result) => {
          const direction = "directionLabel" in result ? String(result.directionLabel) : result.xLabel + " → next-day " + result.yLabel;
          return (
            <CorrelationCard
              key={result.id}
              result={result}
              title={direction}
              subtitle={result.n + " consecutive-day pairs"}
            />
          );
        })}
      </div>
    );
  }

  if (early.length > 0) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {early.map((result) => {
          const direction = "directionLabel" in result ? String(result.directionLabel) : result.xLabel + " → next-day " + result.yLabel;
          return (
            <CorrelationCard
              key={result.id}
              result={result}
              title={"Early signal: " + direction}
              subtitle={result.n + " consecutive-day pairs · preliminary"}
            />
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 text-sm text-muted-foreground">
        Lagged relationships need enough consecutive tracking days and variation in both variables. Continue logging on consecutive days to improve this analysis.
      </CardContent>
    </Card>
  );
}

export function AdvancedAnalyticsPanel({ data }: Readonly<{ data: AdvancedAnalyticsDTO }>) {
  const meaningfulContinuous = data.continuousCorrelations.filter(
    (result) => result.evidence !== "weak",
  );
  const earlyContinuous = data.continuousCorrelations.filter((result) => result.evidence === "weak").slice(0, 3);
  const meaningfulLagged = data.laggedEffects.filter((result) => result.evidence !== "weak");
  const earlyLagged = data.laggedEffects.filter((result) => result.evidence === "weak").slice(0, 2);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Inference quality</p>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  The engine uses continuous correlations, confidence intervals, adjusted regression,
                  lagged analysis, and false-discovery-rate control. It remains observational and is not
                  clinically validated.
                </p>
              </div>
            </div>
            <Badge variant={data.quality.analysisClass === "research-oriented" ? "default" : "secondary"}>
              {data.quality.analysisClass}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Tracked days</p>
              <p className="text-xl font-semibold">{data.quality.trackedDays}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Continuous tests</p>
              <p className="text-xl font-semibold">{data.quality.continuousTests}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Lagged tests</p>
              <p className="text-xl font-semibold">{data.quality.laggedTests}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Adjusted models</p>
              <p className="text-xl font-semibold">
                {data.quality.linearModels + data.quality.logisticModels}
              </p>
            </div>
          </div>

          {data.quality.warnings.length > 0 && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              {data.quality.warnings.join(" ")}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sigma className="h-4 w-4" />
          <div>
            <h2 className="text-lg font-semibold">Continuous-variable relationships</h2>
            <p className="text-sm text-muted-foreground">
              Pearson captures linear association; Spearman checks whether the relationship remains
              monotonic when exact spacing is ignored.
            </p>
          </div>
        </div>

        <ContinuousRelationshipsContent meaningful={meaningfulContinuous} early={earlyContinuous} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <div>
            <h2 className="text-lg font-semibold">Confounder-adjusted models</h2>
            <p className="text-sm text-muted-foreground">
              Multiple regression estimates each association while holding the other recorded
              predictors constant. Linear-model intervals use HC3 robust standard errors.
            </p>
          </div>
        </div>

        {data.linearModels.length === 0 && data.logisticModels.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              More complete paired days are required before adjusted models can be estimated safely.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.linearModels.map((report) => (
              <LinearModelCard key={report.id} report={report} />
            ))}
            {data.logisticModels.map((report) => (
              <LogisticModelCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <div>
            <h2 className="text-lg font-semibold">One-day lagged effects</h2>
            <p className="text-sm text-muted-foreground">
              These compare a recorded factor with the following calendar day. Temporal ordering is
              useful evidence, but it still does not prove causation.
            </p>
          </div>
        </div>

        <LaggedRelationshipsContent meaningful={meaningfulLagged} early={earlyLagged} />
      </section>

      <Card>
        <CardContent className="p-5">
          <p className="font-semibold">Methodological limits</p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {data.quality.limitations.map((limitation) => (
              <p key={limitation}>• {limitation}</p>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Multiplicity: {data.quality.multiplicityMethod}. Confidence level:{" "}
            {pct(data.quality.confidenceLevel)}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
