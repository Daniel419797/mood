import { describe, expect, it } from "vitest";
import { analyzeAdvancedAnalytics } from "../src/lib/advancedAnalytics.js";

function loggedAt(day: number): Date {
  return new Date(Date.UTC(2026, 7, day, 12, 0, 0));
}

describe("advanced behavioral analytics", () => {
  it("builds continuous, adjusted, lagged, and logistic analyses from sufficient data", () => {
    const moods = [];
    const eating = [];

    const sleepByDay: number[] = [];
    for (let day = 1; day <= 45; day += 1) {
      sleepByDay.push(4 + ((day * 3) % 9) * 0.5);
    }

    for (let day = 1; day <= 45; day += 1) {
      const sleep = sleepByDay[day - 1] ?? 6;
      const priorSleep = sleepByDay[day - 2] ?? sleep;
      const workload = day % 4 === 0 ? "High" : day % 3 === 0 ? "Low" : "Medium";
      const workloadScore = workload === "High" ? 3 : workload === "Low" ? 1 : 2;
      const stress = Math.max(1, Math.min(5, 5.2 - sleep * 0.35 + workloadScore * 0.45));
      const energy = Math.max(1, Math.min(5, 1.3 + sleep * 0.45 - stress * 0.18));
      const mood = Math.max(
        1,
        Math.min(5, 0.7 + priorSleep * 0.5 - stress * 0.22 - workloadScore * 0.08),
      );

      moods.push({
        moodScore: mood,
        moodLabel: mood >= 4 ? "Happy" : mood >= 3 ? "Calm" : "Stressed",
        stressLevel: stress,
        energyLevel: energy,
        sleepHours: sleep,
        workload,
        loggedAt: loggedAt(day),
      });

      const unhealthy = stress >= 3.5 || day % 7 === 0;
      eating.push({
        foodCategory: unhealthy ? "Junk" : "Healthy",
        portionRating: stress >= 4 ? "Large" : "Normal",
        timeOfDay: day % 5 === 0 ? "Night" : "Afternoon",
        hungerBefore: 2 + (day % 4),
        loggedAt: loggedAt(day),
      });
    }

    const report = analyzeAdvancedAnalytics(moods, eating);

    expect(report.continuousCorrelations.length).toBeGreaterThan(5);
    expect(report.continuousCorrelations.some((result) => result.id === "mood-sleep")).toBe(true);
    expect(report.linearModels.length).toBeGreaterThanOrEqual(2);
    expect(report.linearModels.some((result) => result.id === "adjusted-mood")).toBe(true);
    expect(report.laggedEffects.some((result) => result.id === "sleep-next-mood")).toBe(true);
    expect(report.logisticModels.length).toBeGreaterThanOrEqual(1);
    expect(report.quality.trackedDays).toBe(45);
    expect(report.quality.clinicalValidated).toBe(false);
    expect(["exploratory", "research-oriented"]).toContain(report.quality.analysisClass);
  });

  it("does not claim research-oriented readiness for a small dataset", () => {
    const moods = Array.from({ length: 8 }, (_, index) => ({
      moodScore: 3 + (index % 2),
      moodLabel: "Calm",
      stressLevel: 2 + (index % 3),
      energyLevel: 3,
      sleepHours: 6 + (index % 2),
      workload: "Medium",
      loggedAt: loggedAt(index + 1),
    }));

    const eating = Array.from({ length: 8 }, (_, index) => ({
      foodCategory: index % 2 === 0 ? "Healthy" : "Junk",
      portionRating: "Normal",
      timeOfDay: "Afternoon",
      hungerBefore: 3,
      loggedAt: loggedAt(index + 1),
    }));

    const report = analyzeAdvancedAnalytics(moods, eating);
    expect(report.quality.analysisClass).toBe("limited");
    expect(report.quality.clinicalValidated).toBe(false);
  });
});
