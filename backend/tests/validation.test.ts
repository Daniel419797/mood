import { describe, expect, it } from "vitest";
import { createEatingSchema, createMoodSchema, registerSchema } from "../src/validation.js";

describe("frontend contract validation", () => {
  it("accepts the frontend registration password policy", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Jane",
        email: "jane@example.com",
        password: "StrongPass1!",
      }).success,
    ).toBe(true);
  });

  it("accepts a mood form payload", () => {
    expect(
      createMoodSchema.safeParse({
        moodScore: 4,
        moodLabel: "Calm",
        stressLevel: 2,
        energyLevel: 4,
        sleepHours: 7.5,
        workload: "Medium",
        notes: "Focused day",
      }).success,
    ).toBe(true);
  });

  it("accepts an eating form payload", () => {
    expect(
      createEatingSchema.safeParse({
        mealType: "Lunch",
        foodCategory: "Healthy",
        portionRating: "Normal",
        hungerBefore: 3,
        timeOfDay: "Afternoon",
        description: "Rice and vegetables",
      }).success,
    ).toBe(true);
  });
});
