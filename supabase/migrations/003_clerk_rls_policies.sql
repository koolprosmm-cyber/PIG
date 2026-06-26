-- Migration: Replace Supabase Auth-based RLS policies with Clerk JWT-based policies.
-- Clerk is configured as a third-party auth provider in Supabase.
-- auth.jwt()->>'sub' returns the Clerk user ID (e.g. user_3Fg6Ldk2K5V4VwRU075EjxnKV0r).
-- Run this in Supabase SQL Editor or via: supabase db push

-- ============================================================
-- USERS TABLE
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_users_select" ON users
  FOR SELECT USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "clerk_users_update" ON users
  FOR UPDATE USING (clerk_id = auth.jwt()->>'sub');

-- ============================================================
-- ORGANIZATION_MEMBERS TABLE
-- ============================================================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'organization_members' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', r.policyname); END LOOP;
END $$;

-- Members of the same org can see each other
CREATE POLICY "clerk_org_members_select" ON organization_members
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  );

-- Only admins/owners can insert or update (mutations done via supabaseAdmin in API routes)
-- No client-side insert/update policy needed — API routes use service role key

-- ============================================================
-- INVITATIONS TABLE
-- ============================================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'invitations' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON invitations', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_invitations_select" ON invitations
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================
-- KNOWLEDGE_BASE TABLE
-- ============================================================
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'knowledge_base' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON knowledge_base', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_kb_select" ON knowledge_base
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================
-- ASSESSMENTS TABLE (read-through needed by all dashboard pages)
-- ============================================================
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'assessments' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON assessments', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_assessments_select" ON assessments
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================
-- ASSESSMENT_ANSWERS TABLE
-- ============================================================
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'assessment_answers' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON assessment_answers', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_answers_select" ON assessment_answers
  FOR SELECT USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = (
        SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
      )
    )
  );

-- ============================================================
-- ASSESSMENT_RESULTS TABLE
-- ============================================================
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'assessment_results' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON assessment_results', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_results_select" ON assessment_results
  FOR SELECT USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = (
        SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
      )
    )
  );

-- ============================================================
-- ORGANIZATIONS TABLE
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_organizations_select" ON organizations
  FOR SELECT USING (
    id = (
      SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================
-- PROTOCOL_PROGRESS TABLE
-- ============================================================
ALTER TABLE protocol_progress ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'protocol_progress' AND schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON protocol_progress', r.policyname); END LOOP;
END $$;

CREATE POLICY "clerk_protocol_progress_all" ON protocol_progress
  FOR ALL USING (
    assessment_result_id IN (
      SELECT id FROM assessment_results WHERE assessment_id IN (
        SELECT id FROM assessments WHERE organization_id = (
          SELECT organization_id FROM users WHERE clerk_id = auth.jwt()->>'sub'
        )
      )
    )
  );
