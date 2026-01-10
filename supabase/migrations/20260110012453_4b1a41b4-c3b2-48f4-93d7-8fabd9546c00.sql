
-- 1. Politiques RLS pour admins (voir toutes les données)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all debts" ON public.debts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Table activity_logs pour activités récentes automatiques
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all activities" ON public.activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert activities" ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- 3. Triggers pour activités automatiques
CREATE OR REPLACE FUNCTION public.log_user_signup() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'user_signup', jsonb_build_object('shop_name', COALESCE(NEW.shop_name, 'Nouvelle boutique')));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_signup();

CREATE OR REPLACE FUNCTION public.log_new_sale() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'new_sale', jsonb_build_object('amount', NEW.amount, 'type', NEW.type));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_sale_created
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.log_new_sale();

CREATE OR REPLACE FUNCTION public.log_subscription_change() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'subscription_change', jsonb_build_object('plan', NEW.plan, 'is_active', NEW.is_active));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_subscription_changed
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

CREATE OR REPLACE FUNCTION public.log_new_client() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'new_client', jsonb_build_object('name', NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_new_client();

-- 4. Table promo_codes
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  applies_to_plan uuid REFERENCES public.subscription_plans(id),
  applies_to_duration text DEFAULT 'first_month' CHECK (applies_to_duration IN ('first_month', 'all')),
  max_uses int,
  used_count int DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read active promo codes" ON public.promo_codes FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()) AND (max_uses IS NULL OR used_count < max_uses));

-- 5. Table payment_history
CREATE TABLE public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  plan_name text NOT NULL,
  amount_original numeric NOT NULL,
  discount_applied numeric DEFAULT 0,
  promo_code_used text,
  amount_paid numeric NOT NULL,
  payment_method text NOT NULL,
  transaction_ref text,
  status text DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed')),
  invoice_number text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their payment history" ON public.payment_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their payments" ON public.payment_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payment_history FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour log des paiements
CREATE OR REPLACE FUNCTION public.log_new_payment() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'new_payment', jsonb_build_object('amount', NEW.amount_paid, 'plan', NEW.plan_name, 'method', NEW.payment_method));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_payment_created
  AFTER INSERT ON public.payment_history
  FOR EACH ROW EXECUTE FUNCTION public.log_new_payment();
