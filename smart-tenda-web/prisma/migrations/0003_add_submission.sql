-- migration: add Submission table

CREATE TABLE IF NOT EXISTS "Submission" (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenderId" text,
  "accountId" text,
  key text UNIQUE NOT NULL,
  filename text NOT NULL,
  meta jsonb,
  "createdAt" timestamptz DEFAULT now()
);

-- foreign keys (optional, depends on existing constraint names)
ALTER TABLE "Submission" ADD CONSTRAINT fk_submission_tender FOREIGN KEY ("tenderId") REFERENCES "Tender" (id) ON DELETE SET NULL;
ALTER TABLE "Submission" ADD CONSTRAINT fk_submission_account FOREIGN KEY ("accountId") REFERENCES "Account" (id) ON DELETE SET NULL;
