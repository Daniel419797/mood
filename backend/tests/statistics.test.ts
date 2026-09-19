import { describe, expect, it } from "vitest";
import {
  correlationInference,
  fitLinearRegression,
  pearsonCorrelation,
  rateDifferenceConfidenceInterval,
  spearmanCorrelation,
} from "../src/lib/statistics.js";

describe("statistics toolkit", () => {
  it("computes Pearson and Spearman correlations with a 95% interval", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [2, 4, 6, 8, 10, 12, 14, 16];

    expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 8);
    expect(spearmanCorrelation(x, y)).toBeCloseTo(1, 8);

    const inference = correlationInference(x, y);
    expect(inference).not.toBeNull();
    expect(inference?.estimate).toBeCloseTo(1, 5);
    expect(inference?.confidenceInterval.low).toBeGreaterThan(0.9);
    expect(inference?.pValue).toBeLessThan(0.001);
  });

  it("recovers adjusted coefficients with a confounder in the model", () => {
    const predictors: number[][] = [];
    const outcome: number[] = [];

    for (let index = 0; index < 80; index += 1) {
      const confounder = (index % 10) + 1;
      const exposure = confounder + ((index * 7) % 13) / 10;
      const noise = (((index * 11) % 7) - 3) * 0.04;
      predictors.push([exposure, confounder]);
      outcome.push(3 + 0.05 * exposure + 4 * confounder + noise);
    }

    const model = fitLinearRegression({
      outcomeName: "Outcome",
      predictorNames: ["Exposure", "Confounder"],
      predictors,
      outcome,
    });

    expect(model).not.toBeNull();
    const exposure = model?.coefficients.find((coefficient) => coefficient.name === "Exposure");
    const confounder = model?.coefficients.find((coefficient) => coefficient.name === "Confounder");

    expect(exposure?.estimate).toBeCloseTo(0.05, 1);
    expect(confounder?.estimate).toBeCloseTo(4, 1);
    expect(model?.rSquared).toBeGreaterThan(0.98);
    expect(exposure?.confidenceInterval.low).toBeLessThan(exposure?.estimate ?? 0);
    expect(exposure?.confidenceInterval.high).toBeGreaterThan(exposure?.estimate ?? 0);
  });

  it("returns a bounded confidence interval for a rate difference", () => {
    const interval = rateDifferenceConfidenceInterval(8, 10, 2, 10);
    expect(interval.level).toBe(0.95);
    expect(interval.low).toBeGreaterThan(-1);
    expect(interval.high).toBeLessThanOrEqual(1);
    expect(interval.low).toBeLessThan(0.6);
    expect(interval.high).toBeGreaterThan(0.6);
  });
});
