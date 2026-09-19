import { describe, expect, it } from "vitest";
import { analyzeBehavioralInsights } from "../src/lib/analytics.js";

function loggedAt(day: number): Date {
  return new Date(Date.UTC(2026, 8, day, 12, 0, 0));
}

function mood(day: number, overrides: Partial<{
  moodScore: number;
  stressLevel: number;
  energyLevel: number;
  sleepHours: number;
  workload: string;
}> = {}) {
  return {
    moodScore: overrides.moodScore ?? 4,
    moodLabel: "Calm",
    stressLevel: overrides.stressLevel ?? 2,
    energyLevel: overrides.energyLevel ?? 4,
    sleepHours: overrides.sleepHours ?? 7,
    workload: overrides.workload ?? "Medium",
    loggedAt: loggedAt(day),
  };
}

function meal(day: number, foodCategory: string) {
  return {
    foodCategory,
    portionRating: "Normal",
    timeOfDay: "Afternoon",
    loggedAt: loggedAt(day),
  };
}

describe("behavioral analytics", () => {
  it("identifies a statistically strong repeated association", () => {
    const moods = Array.from({ length: 20 }, (_, index) =>
      mood(index + 1, { stressLevel: index < 10 ? 5 : 2 }),
    );
    const eating = Array.from({ length: 20 }, (_, index) =>
      meal(index + 1, index < 10 ? "Junk" : "Healthy"),
    );

    const result = analyzeBehavioralInsights(moods, eating, 60, "Test period");
    const insight = result.insights.find((item) => item.correlationId === "stress-sugary");

    expect(insight).toBeDefined();
    expect(insight?.evidence).toBe("strong");
    expect(insight?.direction).toBe("positive");
    expect(insight?.patternConsistency).toBe(1);
    expect(insight?.strengthScore).toBe(1);
    expect(insight?.pValue).toBeLessThan(0.05);
  });

  it("surfaces useful below-threshold relationships as emerging instead of hiding them", () => {
    const moods = Array.from({ length: 10 }, (_, index) =>
      mood(index + 1, { stressLevel: index < 4 ? 5 : 2 }),
    );
    const eating = Array.from({ length: 10 }, (_, index) =>
      meal(index + 1, index === 0 || index === 1 || index === 4 ? "Junk" : "Healthy"),
    );

    const result = analyzeBehavioralInsights(moods, eating, 60, "Test period");
    const emerging = result.emergingInsights.find((item) => item.correlationId === "stress-sugary");

    expect(emerging).toBeDefined();
    expect(emerging?.evidence).toBe("emerging");
    expect(emerging?.patternConsistency).toBe(0.5);
    expect(emerging?.triggerOutcomeRate).toBe(0.5);
    expect(emerging?.baselineOutcomeRate).toBeCloseTo(1 / 6, 4);
  });

  it("does not manufacture an association when trigger and outcome rates are the same", () => {
    const moods = Array.from({ length: 12 }, (_, index) =>
      mood(index + 1, { stressLevel: index < 6 ? 5 : 2 }),
    );
    const eating = Array.from({ length: 12 }, (_, index) =>
      meal(index + 1, index % 2 === 0 ? "Junk" : "Healthy"),
    );

    const result = analyzeBehavioralInsights(moods, eating, 40, "Test period");
    const falsePositive = [...result.insights, ...result.emergingInsights].find(
      (item) => item.correlationId === "stress-sugary",
    );

    expect(falsePositive).toBeUndefined();
  });
});
