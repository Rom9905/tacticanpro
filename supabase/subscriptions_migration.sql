-- Subscriptions table
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

-- RLS: users can only read their own subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin full access (service role bypasses RLS, but also allow via policy for the admin email)
CREATE POLICY "Admin full access to subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt() ->> 'email' = 'romfranko99@gmail.com');

-- Auto-create subscription row on user signup (inactive by default)
CREATE OR REPLACE FUNCTION create_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, status, plan)
  VALUES (NEW.id, 'inactive', 'monthly')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_on_signup();

-- Make your own account active
INSERT INTO subscriptions (user_id, status, plan)
SELECT id, 'active', 'annual'
FROM auth.users
WHERE email = 'romfranko99@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET status = 'active';
