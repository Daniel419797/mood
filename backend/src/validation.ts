import { z } from "zod";

const strongPassword = z
  .string()
  .min(12)
  .max(72)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/\d/)
  .regex(/[^A-Za-z0-9]/);

export const registerSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  email: z.email().max(320),
  password: strongPassword,
});

export const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(72),
});

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).optional(),
    currentPassword: z.string().min(1).max(72).optional(),
    newPassword: strongPassword.optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Current password is required to set a new password.",
    path: ["currentPassword"],
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be supplied.",
  });

export const moodLabelSchema = z.enum(["Happy", "Anxious", "Stressed", "Sad", "Calm", "Bored"]);
export const workloadSchema = z.enum(["Low", "Medium", "High"]);

export const createMoodSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  moodLabel: moodLabelSchema,
  stressLevel: z.number().int().min(1).max(5),
  energyLevel: z.number().int().min(1).max(5),
  sleepHours: z.number().min(0).max(24),
  workload: workloadSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const updateMoodSchema = createMoodSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be supplied." });

export const mealTypeSchema = z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Other"]);
export const foodCategorySchema = z.enum(["Healthy", "Neutral", "Sugary", "Junk", "Skipped"]);
export const portionRatingSchema = z.enum(["Small", "Normal", "Large", "Binge"]);
export const timeOfDaySchema = z.enum(["Morning", "Afternoon", "Evening", "Night"]);

export const createEatingSchema = z.object({
  mealType: mealTypeSchema,
  foodCategory: foodCategorySchema,
  portionRating: portionRatingSchema,
  hungerBefore: z.number().int().min(1).max(5),
  timeOfDay: timeOfDaySchema,
  description: z.string().trim().max(2000).optional(),
});

export const updateEatingSchema = createEatingSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be supplied." });

export const logQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
