ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ADD COLUMN "google_sub" VARCHAR(255);

CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");
