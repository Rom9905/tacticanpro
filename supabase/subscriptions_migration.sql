-- =============================================
-- Run this in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS)
-- =============================================

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'annual')),
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies (safe if they don't exist)
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON subscriptions;

-- 4. Users can read their own subscription row
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Admin (romfranko99@gmail.com) has full access to all rows
CREATE POLICY "Admin full access to subscriptions"
  ON subscriptions FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'romfranko99@gmail.com'
    )
  );

-- 6. Auto-create inactive subscription when a new user signs up
-- IMPORTANT: must be schema-qualified + SET search_path, because GoTrue
-- (supabase_auth_admin) runs with search_path=auth — an unqualified table
-- name here breaks ALL signups with "Database error saving new user".
-- Exception-safe so a failure here can never block user creation.
CREATE OR REPLACE FUNCTION public.create_subscription_on_signup()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan)
  VALUES (NEW.id, 'inactive', 'monthly')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'create_subscription_on_signup failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_on_signup();

-- 7. Set admin account as active
INSERT INTO subscriptions (user_id, status, plan)
SELECT id, 'active', 'annual'
FROM auth.users
WHERE email = 'romfranko99@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET status = 'active';

-- 8. Create subscription rows for any existing users who don't have one
INSERT INTO subscriptions (user_id, status, plan)
SELECT id, 'inactive', 'monthly'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;
