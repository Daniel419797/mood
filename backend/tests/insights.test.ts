import { describe, expect, it } from "vitest";
import { buildDashboard, buildInsights } from "../src/services/insights.js";

describe("insights", () => {
  it("detects repeated stress and sugary/junk overlap", () => {
    const moods = [
      { moodScore: 2, moodLabel: "Stressed" as const, stressLevel: 5, sleepHours: 7, loggedAt: new Date("2026-09-01T10:00:00Z") },
      { moodScore: 3, moodLabel: "Anxious" as const, stressLevel: 4, sleepHours: 7, loggedAt: new Date("2026-09-02T10:00:00Z") },
    ];
    const eating = [
      { foodCategory: "Junk" as const, loggedAt: new Date("2026-09-01T13:00:00Z") },
      { foodCategory: "Sugary" as const, loggedAt: new Date("2026-09-02T13:00:00Z") },
    ];

    const result = buildInsights(moods, eating, 60);
    expect(result.some((item) => item.correlationId === "stress-sugary")).toBe(true);
  });

  it("builds dashboard counts and trend data", () => {
    const moods = [
      { moodScore: 4, moodLabel: "Happy" as const, stressLevel: 2, sleepHours: 8, loggedAt: new Date("2026-09-01T10:00:00Z") },
    ];
    const eating = [
      { foodCategory: "Healthy" as const, loggedAt: new Date("2026-09-01T13:00:00Z") },
    ];

    const dashboard = buildDashboard(moods, eating, 60);
    expect(dashboard.summary.totalMoodLogs).toBe(1);
    expect(dashboard.summary.totalEatingLogs).toBe(1);
    expect(dashboard.summary.daysTracked).toBe(1);
    expect(dashboard.moodTrend).toHaveLength(1);
  });
});
