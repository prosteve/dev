-- 0001_seed.sql: seed demo account and user
INSERT INTO public."Account"(id, name, kraPin)
VALUES ('acct-demo-1', 'SmartTenda Demo', 'KRA-DEMO-0001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."User"(id, email, name, accountId)
VALUES ('user-demo-1', 'demo@example.com', 'Demo User', 'acct-demo-1')
ON CONFLICT (id) DO NOTHING;
