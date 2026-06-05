-- Create tables

CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo TEXT,
  mobile TEXT NOT NULL,
  nid TEXT NOT NULL,
  flat_or_shop_name TEXT NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  due_date INTEGER NOT NULL,
  deposit_amount NUMERIC NOT NULL,
  deposit_returned BOOLEAN DEFAULT FALSE,
  joining_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date BIGINT NOT NULL,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We are using a simple big integer for payment_date here but typical standard is timestamptz.
-- Since the frontend uses Date.now(), bigint or numeric is appropriate.

-- Set up Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for tenants
CREATE POLICY "Users can only view their own tenants" ON tenants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tenants" ON tenants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenants" ON tenants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenants" ON tenants
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for payments
CREATE POLICY "Users can only view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" ON payments
  FOR DELETE USING (auth.uid() = user_id);
