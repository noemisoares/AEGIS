-- AEGIS Security Hardening: Enable RLS on all public tables and revoke anon/authenticated grants
-- Prisma connects as `postgres` (table owner with BYPASSRLS), so Prisma, migrations, and seed are unaffected.
-- Do NOT use FORCE ROW LEVEL SECURITY and do NOT modify `postgres` role privileges.

-- 1. Enable Row Level Security (RLS) on all 18 tables in schema `public`
-- Without permissive policies, `anon` and `authenticated` are denied by default.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CampaignTarget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EducationalPill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EventLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."HriHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."HriScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PhishingTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PillCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PointTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SimulationResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ThreatReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserPoints" ENABLE ROW LEVEL SECURITY;

-- 2. Revoke existing privileges from `anon` and `authenticated` in schema `public`
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM "anon", "authenticated";

-- 3. Update default privileges for `postgres` in schema `public` so future Prisma migrations
--    do not automatically grant table, sequence, or function access to `anon` or `authenticated`.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";
