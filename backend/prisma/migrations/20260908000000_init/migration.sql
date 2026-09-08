CREATE TYPE "MoodLabel" AS ENUM ('Happy', 'Anxious', 'Stressed', 'Sad', 'Calm', 'Bored');
CREATE TYPE "WorkloadLevel" AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE "MealType" AS ENUM ('Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other');
CREATE TYPE "FoodCategory" AS ENUM ('Healthy', 'Neutral', 'Sugary', 'Junk', 'Skipped');
CREATE TYPE "PortionRating" AS ENUM ('Small', 'Normal', 'Large', 'Binge');
CREATE TYPE "TimeOfDay" AS ENUM ('Morning', 'Afternoon', 'Evening', 'Night');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" VARCHAR(32) NOT NULL DEFAULT 'USER',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mood_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "mood_score" INTEGER NOT NULL,
  "mood_label" "MoodLabel" NOT NULL,
  "stress_level" INTEGER NOT NULL,
  "energy_level" INTEGER NOT NULL,
  "sleep_hours" DOUBLE PRECISION NOT NULL,
  "workload" "WorkloadLevel" NOT NULL,
  "notes" TEXT,
  "logged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "mood_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mood_score_range" CHECK ("mood_score" BETWEEN 1 AND 5),
  CONSTRAINT "mood_stress_range" CHECK ("stress_level" BETWEEN 1 AND 5),
  CONSTRAINT "mood_energy_range" CHECK ("energy_level" BETWEEN 1 AND 5),
  CONSTRAINT "sleep_hours_range" CHECK ("sleep_hours" BETWEEN 0 AND 24)
);

CREATE TABLE "eating_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "meal_type" "MealType" NOT NULL,
  "food_category" "FoodCategory" NOT NULL,
  "portion_rating" "PortionRating" NOT NULL,
  "hunger_before" INTEGER NOT NULL,
  "time_of_day" "TimeOfDay" NOT NULL,
  "description" TEXT,
  "logged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "eating_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hunger_before_range" CHECK ("hunger_before" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");
CREATE INDEX "refresh_sessions_user_id_expires_at_idx" ON "refresh_sessions"("user_id", "expires_at");
CREATE INDEX "mood_logs_user_id_logged_at_idx" ON "mood_logs"("user_id", "logged_at");
CREATE INDEX "eating_logs_user_id_logged_at_idx" ON "eating_logs"("user_id", "logged_at");

ALTER TABLE "refresh_sessions"
  ADD CONSTRAINT "refresh_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mood_logs"
  ADD CONSTRAINT "mood_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "eating_logs"
  ADD CONSTRAINT "eating_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
