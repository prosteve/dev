-- 0001_init.sql: create tables for SmartTenda

-- Enable pgcrypto for gen_random_uuid (if available)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pgvector if you plan to use embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Accounts
CREATE TABLE IF NOT EXISTS public."Account" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  kraPin text NOT NULL UNIQUE,
  createdAt timestamptz NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS public."User" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email text NOT NULL UNIQUE,
  name text,
  accountId text NOT NULL,
  CONSTRAINT fk_user_account FOREIGN KEY (accountId) REFERENCES public."Account"(id) ON DELETE CASCADE
);

-- Tenders
CREATE TABLE IF NOT EXISTS public."Tender" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  refNo text NOT NULL UNIQUE,
  title text NOT NULL,
  openDate timestamptz NOT NULL,
  closeDate timestamptz NOT NULL,
  category text NOT NULL,
  county text NOT NULL,
  securityAmt integer,
  source text NOT NULL,
  rawPdfUrl text,
  embedding vector(768),
  createdAt timestamptz NOT NULL DEFAULT now(),
  accountId text NOT NULL,
  CONSTRAINT fk_tender_account FOREIGN KEY (accountId) REFERENCES public."Account"(id) ON DELETE CASCADE
);

-- Docs
CREATE TABLE IF NOT EXISTS public."Doc" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL,
  s3Key text NOT NULL UNIQUE,
  issueDate timestamptz NOT NULL,
  expiryDate timestamptz NOT NULL,
  accountId text NOT NULL,
  CONSTRAINT fk_doc_account FOREIGN KEY (accountId) REFERENCES public."Account"(id) ON DELETE CASCADE
);

-- Checks
CREATE TABLE IF NOT EXISTS public."Check" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenderId text NOT NULL,
  CONSTRAINT fk_check_tender FOREIGN KEY (tenderId) REFERENCES public."Tender"(id) ON DELETE CASCADE,
  docType text NOT NULL,
  status text NOT NULL,
  detail jsonb,
  updatedAt timestamptz NOT NULL DEFAULT now()
);
