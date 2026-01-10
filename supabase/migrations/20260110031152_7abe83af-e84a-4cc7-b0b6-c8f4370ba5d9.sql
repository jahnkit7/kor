-- 1. Ajouter policy pour que les admins puissent gérer toutes les subscriptions
CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Ajouter colonne commission_reduction aux plans d'abonnement
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS commission_reduction numeric DEFAULT 0;
-- 0 = pas de réduction, 50 = -50%, 100 = 0% de commission

-- 3. Créer table pour le solde de commissions par utilisateur
CREATE TABLE IF NOT EXISTS commission_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE commission_balances ENABLE ROW LEVEL SECURITY;

-- Policies pour commission_balances
CREATE POLICY "Users can view their own balance" ON commission_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances" ON commission_balances
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all balances" ON commission_balances
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Créer table pour les paiements de commissions
CREATE TABLE IF NOT EXISTS commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  proof_url text,
  status text DEFAULT 'pending',
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- Policies pour commission_payments
CREATE POLICY "Users can view their own payments" ON commission_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON commission_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON commission_payments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all payments" ON commission_payments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_commission_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commission_balances_updated_at
  BEFORE UPDATE ON commission_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_balance_updated_at();