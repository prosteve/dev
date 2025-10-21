-- Add accepted metadata to Check
ALTER TABLE "Check" ADD COLUMN IF NOT EXISTS accepted_by text;
ALTER TABLE "Check" ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  tenderId text,
  checkId text,
  action text NOT NULL,
  actorEmail text,
  meta jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
