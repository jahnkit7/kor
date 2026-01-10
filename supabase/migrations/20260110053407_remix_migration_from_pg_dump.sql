CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'employee',
    'admin'
);


--
-- Name: check_and_notify_high_debt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_notify_high_debt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_profile RECORD;
  total_debt INTEGER;
  debt_threshold INTEGER;
BEGIN
  -- Calculer le total des dettes non payées pour cet utilisateur
  SELECT COALESCE(SUM(amount - paid), 0) INTO total_debt
  FROM public.debts
  WHERE user_id = NEW.user_id AND paid < amount;

  -- Récupérer les paramètres de notification de l'utilisateur
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_profile.notification_settings IS NOT NULL 
     AND (user_profile.notification_settings->>'notify_high_debt')::boolean = true THEN
    
    debt_threshold := COALESCE((user_profile.notification_settings->>'debt_threshold')::integer, 50000);
    
    -- Vérifier si le seuil est dépassé
    IF total_debt >= debt_threshold THEN
      -- Ne pas spammer - vérifier si une notification récente existe
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'warning'
          AND title = 'Alerte dettes élevées'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.send_notification(
          NEW.user_id,
          'Alerte dettes élevées',
          'Vos dettes totales (' || total_debt || ' CFA) dépassent votre seuil de ' || debt_threshold || ' CFA.',
          'warning',
          '/debts'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: check_and_notify_low_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_notify_low_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_profile RECORD;
  stock_threshold INTEGER;
BEGIN
  -- Récupérer les paramètres de notification de l'utilisateur
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_profile.notification_settings IS NOT NULL 
     AND (user_profile.notification_settings->>'notify_low_stock')::boolean = true THEN
    
    stock_threshold := COALESCE((user_profile.notification_settings->>'low_stock_threshold')::integer, 5);
    
    -- Vérifier si la quantité est en dessous du seuil
    IF NEW.quantity <= stock_threshold AND NEW.quantity > 0 THEN
      -- Ne pas spammer - vérifier si une notification récente existe pour ce produit
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'warning'
          AND message LIKE '%' || NEW.name || '%'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.send_notification(
          NEW.user_id,
          'Stock bas : ' || NEW.name,
          'Le produit "' || NEW.name || '" n''a plus que ' || NEW.quantity || ' unités en stock.',
          'warning',
          '/stock'
        );
      END IF;
    END IF;
    
    -- Alerte rupture de stock
    IF NEW.quantity = 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'error'
          AND title = 'Rupture de stock : ' || NEW.name
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.send_notification(
          NEW.user_id,
          'Rupture de stock : ' || NEW.name,
          'Le produit "' || NEW.name || '" est en rupture de stock!',
          'error',
          '/stock'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: deduct_stock_on_sale_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_stock_on_sale_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  should_deduct BOOLEAN;
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Si pas de stock_item_id, ne rien faire
  IF NEW.stock_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Vérifier la préférence utilisateur
  SELECT COALESCE(auto_deduct_stock, true) INTO should_deduct
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Si déduction désactivée, ne rien faire
  IF NOT should_deduct THEN
    RETURN NEW;
  END IF;

  -- Récupérer le stock actuel
  SELECT quantity INTO current_stock
  FROM public.stock_items
  WHERE id = NEW.stock_item_id;

  -- Si le produit n'existe plus, ne rien faire
  IF current_stock IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculer le nouveau stock
  new_stock := current_stock - NEW.quantity;

  -- Déduire le stock (même si ça devient négatif)
  UPDATE public.stock_items
  SET quantity = new_stock,
      updated_at = now()
  WHERE id = NEW.stock_item_id;

  -- Si le stock devient négatif, créer une alerte
  IF new_stock < 0 THEN
    INSERT INTO public.stock_alerts (
      user_id, 
      stock_item_id, 
      sale_id, 
      product_name, 
      quantity_sold, 
      stock_after, 
      alert_type
    )
    VALUES (
      NEW.user_id, 
      NEW.stock_item_id, 
      NEW.sale_id, 
      NEW.product_name, 
      NEW.quantity, 
      new_stock,
      'negative_stock'
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: get_trust_score_data(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_trust_score_data(target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_debts', COALESCE((
      SELECT COUNT(*) FROM debts WHERE user_id = target_user_id
    ), 0),
    'paid_debts', COALESCE((
      SELECT COUNT(*) FROM debts WHERE user_id = target_user_id AND paid >= amount
    ), 0),
    'total_sales_amount', COALESCE((
      SELECT SUM(amount) FROM sales WHERE user_id = target_user_id
    ), 0),
    'total_sales_count', COALESCE((
      SELECT COUNT(*) FROM sales WHERE user_id = target_user_id
    ), 0),
    'account_age_days', COALESCE((
      SELECT EXTRACT(DAY FROM (NOW() - created_at))::INTEGER 
      FROM profiles WHERE user_id = target_user_id
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_setup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_setup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Create default owner role (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create default subscription (ignore if already exists)
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;


--
-- Name: log_new_client(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_new_client() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'new_client', jsonb_build_object('name', NEW.name));
  RETURN NEW;
END;
$$;


--
-- Name: log_new_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_new_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'new_payment', jsonb_build_object('amount', NEW.amount_paid, 'plan', NEW.plan_name, 'method', NEW.payment_method));
  RETURN NEW;
END;
$$;


--
-- Name: log_new_sale(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_new_sale() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'new_sale', jsonb_build_object('amount', NEW.amount, 'type', NEW.type));
  RETURN NEW;
END;
$$;


--
-- Name: log_subscription_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_subscription_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'subscription_change', jsonb_build_object('plan', NEW.plan, 'is_active', NEW.is_active));
  RETURN NEW;
END;
$$;


--
-- Name: log_user_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_user_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, action_data)
  VALUES (NEW.user_id, 'user_signup', jsonb_build_object('shop_name', COALESCE(NEW.shop_name, 'Nouvelle boutique')));
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_support_ticket(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_support_ticket() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins about new support ticket
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    PERFORM public.send_notification(
      admin_record.user_id,
      'Nouveau ticket support',
      'Un nouveau ticket support a été créé: ' || NEW.subject,
      'info',
      '/admin/support'
    );
  END LOOP;
  RETURN NEW;
END;
$$;


--
-- Name: notify_referral_converted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_referral_converted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'converted' AND OLD.status = 'pending' THEN
    PERFORM public.send_notification(
      NEW.referrer_id,
      'Parrainage converti!',
      'Félicitations! Un de vos filleuls a souscrit à un abonnement. Votre récompense de ' || NEW.reward_value || ' FCFA est disponible.',
      'success',
      '/settings'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_subscription_activated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_subscription_activated() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    PERFORM public.send_notification(
      NEW.user_id,
      'Abonnement activé',
      'Votre abonnement ' || NEW.plan || ' est maintenant actif. Profitez de toutes les fonctionnalités!',
      'success',
      '/settings'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: process_referral_reward(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_referral_reward() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  referrer_user_id UUID;
  referral_record RECORD;
BEGIN
  -- Only process if subscription is being activated with a paid plan
  IF NEW.plan != 'free_trial' AND NEW.is_active = true THEN
    -- Check if user was referred
    SELECT referred_by INTO referrer_user_id FROM public.profiles WHERE user_id = NEW.user_id;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Find pending referral
      SELECT * INTO referral_record FROM public.referrals 
      WHERE referrer_id = referrer_user_id 
        AND referred_id = NEW.user_id 
        AND status = 'pending'
      LIMIT 1;
      
      IF referral_record.id IS NOT NULL THEN
        -- Mark referral as converted
        UPDATE public.referrals 
        SET status = 'converted', converted_at = now()
        WHERE id = referral_record.id;
        
        -- Log the conversion
        INSERT INTO public.activity_logs (user_id, action_type, action_data)
        VALUES (referrer_user_id, 'referral_converted', jsonb_build_object(
          'referred_user_id', NEW.user_id,
          'plan', NEW.plan,
          'reward_value', referral_record.reward_value
        ));
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: recalculate_all_commissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_all_commissions() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_record RECORD;
  v_sale_record RECORD;
  v_commission_total NUMERIC;
  v_rules RECORD;
  v_rule_commission NUMERIC;
  v_users_processed INTEGER := 0;
  v_sales_processed INTEGER := 0;
  v_total_commissions NUMERIC := 0;
BEGIN
  -- Reset all commission balances to 0 (but keep total_paid) - FIXED: Added WHERE true
  UPDATE commission_balances
  SET 
    total_earned = 0,
    balance = -total_paid,
    updated_at = now()
  WHERE true;

  -- For each user with sales
  FOR v_user_record IN 
    SELECT DISTINCT user_id 
    FROM sales 
    WHERE user_id IS NOT NULL
  LOOP
    v_commission_total := 0;

    -- For each sale of this user
    FOR v_sale_record IN 
      SELECT id, amount, type, created_at
      FROM sales 
      WHERE user_id = v_user_record.user_id
    LOOP
      -- For each active commission rule
      FOR v_rules IN 
        SELECT id, name, type AS rule_type, value, applies_to
        FROM commissions 
        WHERE is_active = true
      LOOP
        -- Check if rule applies to this sale type
        IF v_rules.applies_to = 'all_sales' 
           OR (v_rules.applies_to = 'cash_only' AND v_sale_record.type = 'cash')
           OR (v_rules.applies_to = 'credit_only' AND v_sale_record.type = 'credit') THEN
          
          -- Calculate commission for this rule
          IF v_rules.rule_type = 'percentage' THEN
            v_rule_commission := v_sale_record.amount * v_rules.value / 100;
          ELSE
            v_rule_commission := v_rules.value;
          END IF;
          
          v_commission_total := v_commission_total + v_rule_commission;
        END IF;
      END LOOP;

      v_sales_processed := v_sales_processed + 1;
    END LOOP;

    -- Update or insert commission balance for this user
    INSERT INTO commission_balances (user_id, total_earned, balance, updated_at)
    VALUES (v_user_record.user_id, v_commission_total, v_commission_total, now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_earned = v_commission_total,
      balance = v_commission_total - commission_balances.total_paid,
      updated_at = now();

    v_users_processed := v_users_processed + 1;
    v_total_commissions := v_total_commissions + v_commission_total;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'users_processed', v_users_processed,
    'sales_processed', v_sales_processed,
    'total_commissions', v_total_commissions
  );
END;
$$;


--
-- Name: send_notification(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_notification(target_user_id uuid, notification_title text, notification_message text, notification_type text DEFAULT 'info'::text, notification_action_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (target_user_id, notification_title, notification_message, notification_type, notification_action_url)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;


--
-- Name: set_profile_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_profile_referral_code() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_commission_balance_on_sale(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_commission_balance_on_sale() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  commission_amount NUMERIC := 0;
  rule RECORD;
BEGIN
  -- Calculer la commission en fonction des règles actives
  FOR rule IN 
    SELECT * FROM public.commissions 
    WHERE is_active = true
  LOOP
    -- Vérifier si la règle s'applique à ce type de vente
    IF rule.applies_to = 'all_sales' OR 
       (rule.applies_to = 'cash_only' AND NEW.type = 'cash') OR
       (rule.applies_to = 'credit_only' AND NEW.type = 'credit') THEN
      -- Calculer selon le type de commission
      IF rule.type = 'percentage' THEN
        commission_amount := commission_amount + (NEW.amount * rule.value / 100);
      ELSE
        commission_amount := commission_amount + rule.value;
      END IF;
    END IF;
  END LOOP;
  
  -- Si une commission est calculée, mettre à jour le solde
  IF commission_amount > 0 THEN
    INSERT INTO public.commission_balances (user_id, balance, total_earned, total_paid)
    VALUES (NEW.user_id, commission_amount, commission_amount, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = public.commission_balances.balance + commission_amount,
      total_earned = public.commission_balances.total_earned + commission_amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_commission_balance_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_commission_balance_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action_type text NOT NULL,
    action_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    photo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_risky boolean DEFAULT false
);


--
-- Name: commission_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric DEFAULT 0,
    total_earned numeric DEFAULT 0,
    total_paid numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: commission_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    payment_method text,
    proof_url text,
    status text DEFAULT 'pending'::text,
    verified_by uuid,
    verified_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    value numeric NOT NULL,
    applies_to text NOT NULL,
    country_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commissions_type_check CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    phone_prefix text NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    paid integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    employee_phone text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    invite_code text DEFAULT encode(extensions.gen_random_bytes(6), 'hex'::text)
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_key text NOT NULL,
    name text NOT NULL,
    description text,
    is_globally_enabled boolean DEFAULT true NOT NULL,
    min_plan_required text,
    enabled_for_users uuid[] DEFAULT '{}'::uuid[],
    disabled_countries text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    depends_on text[] DEFAULT '{}'::text[]
);


--
-- Name: feature_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    feature_key text NOT NULL,
    action text DEFAULT 'access'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: merchant_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    request_id uuid,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_negotiations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_negotiations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    offer_id uuid,
    proposer_id uuid NOT NULL,
    responder_id uuid NOT NULL,
    product_name text NOT NULL,
    proposed_quantity integer,
    proposed_unit text DEFAULT 'pièces'::text,
    proposed_price integer,
    proposed_total integer,
    notes text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_negotiations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'counter'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: merchant_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_name text NOT NULL,
    description text,
    quantity integer,
    unit text DEFAULT 'pièces'::text,
    price integer,
    is_promo boolean DEFAULT false,
    promo_label text,
    status text DEFAULT 'active'::text,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: merchant_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    merchant_type text DEFAULT 'détaillant'::text NOT NULL,
    specialties text[] DEFAULT '{}'::text[],
    location_name text,
    location_lat numeric(10,7),
    location_lng numeric(10,7),
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    market_address text
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    plan_name text NOT NULL,
    amount_original numeric NOT NULL,
    discount_applied numeric DEFAULT 0,
    promo_code_used text,
    amount_paid numeric NOT NULL,
    payment_method text NOT NULL,
    transaction_ref text,
    status text DEFAULT 'success'::text,
    invoice_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_history_status_check CHECK ((status = ANY (ARRAY['success'::text, 'pending'::text, 'failed'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    debt_id uuid NOT NULL,
    client_id uuid NOT NULL,
    amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    raw_transcript text,
    product_name text NOT NULL,
    quantity integer,
    unit text,
    max_price integer,
    notes text,
    status text DEFAULT 'open'::text NOT NULL,
    fulfilled_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shop_name text DEFAULT 'Ma Boutique'::text NOT NULL,
    owner_name text,
    phone text,
    currency text DEFAULT 'CFA'::text NOT NULL,
    language text DEFAULT 'fr'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    app_pin text,
    auto_lock_minutes integer DEFAULT 5,
    hide_amounts boolean DEFAULT false,
    onboarding_completed boolean DEFAULT false,
    linked_owner_id uuid,
    referral_code text,
    referred_by uuid,
    notification_settings jsonb DEFAULT '{"debt_threshold": 50000, "notify_high_debt": true, "notify_low_stock": true, "low_stock_threshold": 5}'::jsonb,
    auto_deduct_stock boolean DEFAULT true
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    applies_to_plan uuid,
    applies_to_duration text DEFAULT 'first_month'::text,
    max_uses integer,
    used_count integer DEFAULT 0,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promo_codes_applies_to_duration_check CHECK ((applies_to_duration = ANY (ARRAY['first_month'::text, 'all'::text]))),
    CONSTRAINT promo_codes_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))),
    CONSTRAINT promo_codes_discount_value_check CHECK ((discount_value > (0)::numeric))
);


--
-- Name: recharge_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recharge_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    plan_id uuid NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_by uuid,
    used_at timestamp with time zone,
    created_by uuid NOT NULL,
    expires_at timestamp with time zone,
    batch_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid,
    referral_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reward_type text DEFAULT 'discount_percent'::text,
    reward_value numeric DEFAULT 10,
    reward_applied boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    converted_at timestamp with time zone,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'converted'::text, 'rewarded'::text, 'expired'::text])))
);


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    launch_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roadmap_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'backlog'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    category text DEFAULT 'feature'::text NOT NULL,
    target_version text,
    estimated_effort text,
    created_by uuid,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT roadmap_items_category_check CHECK ((category = ANY (ARRAY['feature'::text, 'bug'::text, 'improvement'::text, 'security'::text, 'performance'::text]))),
    CONSTRAINT roadmap_items_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT roadmap_items_status_check CHECK ((status = ANY (ARRAY['backlog'::text, 'in_progress'::text, 'testing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    stock_item_id uuid,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price integer NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount integer NOT NULL,
    note text,
    client_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sales_type_check CHECK ((type = ANY (ARRAY['cash'::text, 'credit'::text])))
);


--
-- Name: stock_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stock_item_id uuid,
    sale_id uuid,
    product_name text NOT NULL,
    quantity_sold integer NOT NULL,
    stock_after integer NOT NULL,
    alert_type text DEFAULT 'negative_stock'::text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    unit_price integer DEFAULT 0 NOT NULL,
    model text,
    source text DEFAULT 'manual'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_voice_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_voice_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    raw_transcript text NOT NULL,
    status text DEFAULT 'pending_parse'::text NOT NULL,
    parsed_items jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    duration_days integer NOT NULL,
    price integer NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    max_clients integer,
    max_sales_per_day integer,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    country_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    commission_reduction numeric DEFAULT 0
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan text DEFAULT 'free_trial'::text NOT NULL,
    trial_started_at timestamp with time zone DEFAULT now() NOT NULL,
    trial_ends_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    max_clients integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'owner'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: commission_balances commission_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_balances
    ADD CONSTRAINT commission_balances_pkey PRIMARY KEY (id);


--
-- Name: commission_balances commission_balances_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_balances
    ADD CONSTRAINT commission_balances_user_id_key UNIQUE (user_id);


--
-- Name: commission_balances commission_balances_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_balances
    ADD CONSTRAINT commission_balances_user_id_unique UNIQUE (user_id);


--
-- Name: commission_payments commission_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payments
    ADD CONSTRAINT commission_payments_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: debts debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_pkey PRIMARY KEY (id);


--
-- Name: employee_invites employee_invites_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_invites
    ADD CONSTRAINT employee_invites_invite_code_key UNIQUE (invite_code);


--
-- Name: employee_invites employee_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_invites
    ADD CONSTRAINT employee_invites_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_feature_key_key UNIQUE (feature_key);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: feature_usage feature_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage
    ADD CONSTRAINT feature_usage_pkey PRIMARY KEY (id);


--
-- Name: merchant_messages merchant_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_messages
    ADD CONSTRAINT merchant_messages_pkey PRIMARY KEY (id);


--
-- Name: merchant_negotiations merchant_negotiations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_negotiations
    ADD CONSTRAINT merchant_negotiations_pkey PRIMARY KEY (id);


--
-- Name: merchant_offers merchant_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_offers
    ADD CONSTRAINT merchant_offers_pkey PRIMARY KEY (id);


--
-- Name: merchant_profiles merchant_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_profiles
    ADD CONSTRAINT merchant_profiles_pkey PRIMARY KEY (id);


--
-- Name: merchant_profiles merchant_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_profiles
    ADD CONSTRAINT merchant_profiles_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_history payment_history_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: product_requests product_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_requests
    ADD CONSTRAINT product_requests_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: recharge_codes recharge_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_code_key UNIQUE (code);


--
-- Name: recharge_codes recharge_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: roadmap_items roadmap_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: stock_alerts stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_voice_entries stock_voice_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_voice_entries
    ADD CONSTRAINT stock_voice_entries_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_activity_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_employee_invites_invite_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_invites_invite_code ON public.employee_invites USING btree (invite_code);


--
-- Name: idx_feature_usage_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_usage_created_at ON public.feature_usage USING btree (created_at);


--
-- Name: idx_feature_usage_feature_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_usage_feature_key ON public.feature_usage USING btree (feature_key);


--
-- Name: idx_feature_usage_user_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_usage_user_feature ON public.feature_usage USING btree (user_id, feature_key);


--
-- Name: idx_merchant_messages_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_messages_receiver ON public.merchant_messages USING btree (receiver_id);


--
-- Name: idx_merchant_messages_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_messages_request ON public.merchant_messages USING btree (request_id);


--
-- Name: idx_merchant_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_messages_sender ON public.merchant_messages USING btree (sender_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);


--
-- Name: idx_roadmap_items_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_items_priority ON public.roadmap_items USING btree (priority);


--
-- Name: idx_roadmap_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roadmap_items_status ON public.roadmap_items USING btree (status);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sale_items_stock_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_stock_item_id ON public.sale_items USING btree (stock_item_id);


--
-- Name: idx_sale_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_user_id ON public.sale_items USING btree (user_id);


--
-- Name: idx_stock_alerts_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_alerts_user_unread ON public.stock_alerts USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_stock_voice_entries_user_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_voice_entries_user_created_at ON public.stock_voice_entries USING btree (user_id, created_at DESC);


--
-- Name: debts check_debt_threshold; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_debt_threshold AFTER INSERT OR UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.check_and_notify_high_debt();


--
-- Name: stock_items check_stock_threshold; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_stock_threshold AFTER INSERT OR UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.check_and_notify_low_stock();


--
-- Name: clients on_client_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_client_created AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_new_client();


--
-- Name: support_tickets on_new_support_ticket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_support_ticket AFTER INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.notify_new_support_ticket();


--
-- Name: payment_history on_payment_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_payment_created AFTER INSERT ON public.payment_history FOR EACH ROW EXECUTE FUNCTION public.log_new_payment();


--
-- Name: profiles on_profile_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_user_signup();


--
-- Name: referrals on_referral_converted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_referral_converted AFTER UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.notify_referral_converted();


--
-- Name: sales on_sale_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_sale_created AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_new_sale();


--
-- Name: subscriptions on_subscription_activated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_subscription_activated AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.notify_subscription_activated();


--
-- Name: subscriptions on_subscription_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_subscription_changed AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();


--
-- Name: sale_items trigger_deduct_stock_on_sale; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_deduct_stock_on_sale AFTER INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_sale_item();


--
-- Name: subscriptions trigger_process_referral; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_process_referral AFTER UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.process_referral_reward();


--
-- Name: profiles trigger_set_profile_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_profile_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_profile_referral_code();


--
-- Name: sales trigger_update_commission_on_sale; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_commission_on_sale AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_commission_balance_on_sale();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commission_balances update_commission_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commission_balances_updated_at BEFORE UPDATE ON public.commission_balances FOR EACH ROW EXECUTE FUNCTION public.update_commission_balance_updated_at();


--
-- Name: commissions update_commissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: countries update_countries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: debts update_debts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_flags update_feature_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: merchant_negotiations update_merchant_negotiations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_merchant_negotiations_updated_at BEFORE UPDATE ON public.merchant_negotiations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: merchant_offers update_merchant_offers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_merchant_offers_updated_at BEFORE UPDATE ON public.merchant_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: merchant_profiles update_merchant_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_merchant_profiles_updated_at BEFORE UPDATE ON public.merchant_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_requests update_product_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_requests_updated_at BEFORE UPDATE ON public.product_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: regions update_regions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roadmap_items update_roadmap_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON public.roadmap_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_items update_stock_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_voice_entries update_stock_voice_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_voice_entries_updated_at BEFORE UPDATE ON public.stock_voice_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription_plans update_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: commissions commissions_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;


--
-- Name: debts debts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: debts debts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: merchant_messages merchant_messages_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_messages
    ADD CONSTRAINT merchant_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.product_requests(id) ON DELETE CASCADE;


--
-- Name: merchant_negotiations merchant_negotiations_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_negotiations
    ADD CONSTRAINT merchant_negotiations_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.merchant_offers(id) ON DELETE SET NULL;


--
-- Name: merchant_negotiations merchant_negotiations_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_negotiations
    ADD CONSTRAINT merchant_negotiations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.product_requests(id) ON DELETE SET NULL;


--
-- Name: payment_history payment_history_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: payments payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: payments payments_debt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.debts(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_linked_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_linked_owner_id_fkey FOREIGN KEY (linked_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_codes promo_codes_applies_to_plan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_applies_to_plan_fkey FOREIGN KEY (applies_to_plan) REFERENCES public.subscription_plans(id);


--
-- Name: recharge_codes recharge_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recharge_codes recharge_codes_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;


--
-- Name: recharge_codes recharge_codes_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: regions regions_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;


--
-- Name: roadmap_items roadmap_items_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: roadmap_items roadmap_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sales sales_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: sales sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stock_alerts stock_alerts_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: stock_alerts stock_alerts_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;


--
-- Name: subscription_plans subscription_plans_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_logs Admins can create logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: roadmap_items Admins can create roadmap items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create roadmap items" ON public.roadmap_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: roadmap_items Admins can delete roadmap items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roadmap items" ON public.roadmap_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: commission_balances Admins can manage all balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all balances" ON public.commission_balances USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_payments Admins can manage all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all payments" ON public.commission_payments USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscriptions Admins can manage all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_tickets Admins can manage all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: recharge_codes Admins can manage codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage codes" ON public.recharge_codes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commissions Admins can manage commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage commissions" ON public.commissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: countries Admins can manage countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage countries" ON public.countries TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_flags Admins can manage feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscription_plans Admins can manage plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage plans" ON public.subscription_plans TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promo_codes Admins can manage promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admins can manage referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage referrals" ON public.referrals USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regions Admins can manage regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage regions" ON public.regions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: roadmap_items Admins can update roadmap items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roadmap items" ON public.roadmap_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: activity_logs Admins can view all activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activities" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_balances Admins can view all balances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all balances" ON public.commission_balances FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Admins can view all clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: countries Admins can view all countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all countries" ON public.countries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: debts Admins can view all debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all debts" ON public.debts FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_payments Admins can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payments" ON public.commission_payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_history Admins can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payments" ON public.payment_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscription_plans Admins can view all plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all plans" ON public.subscription_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admins can view all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all referrals" ON public.referrals FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regions Admins can view all regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all regions" ON public.regions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: roadmap_items Admins can view all roadmap items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roadmap items" ON public.roadmap_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: sales Admins can view all sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_usage Admins can view all usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all usage" ON public.feature_usage FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_logs Admins can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view logs" ON public.admin_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: countries Anyone can view active countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active countries" ON public.countries FOR SELECT USING ((is_active = true));


--
-- Name: merchant_offers Anyone can view active offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active offers" ON public.merchant_offers FOR SELECT USING (((status = 'active'::text) OR (auth.uid() = user_id)));


--
-- Name: subscription_plans Anyone can view active plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING ((is_active = true));


--
-- Name: regions Anyone can view active regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active regions" ON public.regions FOR SELECT USING ((is_active = true));


--
-- Name: feature_flags Anyone can view feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view feature flags" ON public.feature_flags FOR SELECT TO authenticated USING (true);


--
-- Name: merchant_profiles Anyone can view visible merchants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view visible merchants" ON public.merchant_profiles FOR SELECT USING (((is_visible = true) OR (auth.uid() = user_id)));


--
-- Name: merchant_negotiations Authenticated users can create negotiations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create negotiations" ON public.merchant_negotiations FOR INSERT WITH CHECK ((auth.uid() = proposer_id));


--
-- Name: employee_invites Invited employee can accept their invite; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invited employee can accept their invite" ON public.employee_invites FOR UPDATE USING ((employee_phone = ( SELECT profiles.phone
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())
 LIMIT 1))) WITH CHECK ((employee_phone = ( SELECT profiles.phone
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: employee_invites Owner or invited employee can view invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner or invited employee can view invites" ON public.employee_invites FOR SELECT USING (((auth.uid() = owner_user_id) OR (employee_phone = ( SELECT profiles.phone
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())
 LIMIT 1))));


--
-- Name: user_roles Owners can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can insert roles" ON public.user_roles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: employee_invites Owners can manage their invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their invites" ON public.employee_invites USING ((auth.uid() = owner_user_id));


--
-- Name: user_roles Owners can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update roles" ON public.user_roles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: stock_alerts System can insert stock alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert stock alerts" ON public.stock_alerts FOR INSERT WITH CHECK (true);


--
-- Name: referrals Users can create referral invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create referral invites" ON public.referrals FOR INSERT WITH CHECK ((auth.uid() = referrer_id));


--
-- Name: clients Users can create their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: debts Users can create their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own debts" ON public.debts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: merchant_profiles Users can create their own merchant profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own merchant profile" ON public.merchant_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: merchant_offers Users can create their own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own offers" ON public.merchant_offers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: commission_payments Users can create their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own payments" ON public.commission_payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payments Users can create their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can create their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: product_requests Users can create their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own requests" ON public.product_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sale_items Users can create their own sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own sale items" ON public.sale_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sales Users can create their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own sales" ON public.sales FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stock_items Users can create their own stock items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own stock items" ON public.stock_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stock_voice_entries Users can create their own stock voice entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own stock voice entries" ON public.stock_voice_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets Users can create tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: clients Users can delete their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: debts Users can delete their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own debts" ON public.debts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: merchant_profiles Users can delete their own merchant profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own merchant profile" ON public.merchant_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: merchant_offers Users can delete their own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own offers" ON public.merchant_offers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: payments Users can delete their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own payments" ON public.payments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: product_requests Users can delete their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own requests" ON public.product_requests FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sale_items Users can delete their own sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own sale items" ON public.sale_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sales Users can delete their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own sales" ON public.sales FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: stock_items Users can delete their own stock items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own stock items" ON public.stock_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: stock_voice_entries Users can delete their own stock voice entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own stock voice entries" ON public.stock_voice_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: merchant_messages Users can delete their sent messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their sent messages" ON public.merchant_messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: payment_history Users can insert their payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their payments" ON public.payment_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can insert their subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their subscription" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feature_usage Users can log their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can log their own usage" ON public.feature_usage FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: promo_codes Users can read active promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read active promo codes" ON public.promo_codes FOR SELECT USING (((is_active = true) AND ((valid_until IS NULL) OR (valid_until > now())) AND ((max_uses IS NULL) OR (used_count < max_uses))));


--
-- Name: merchant_messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.merchant_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: product_requests Users can update own or fulfill open requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own or fulfill open requests" ON public.product_requests FOR UPDATE USING (((auth.uid() = user_id) OR ((status = 'open'::text) AND (fulfilled_by IS NULL))));


--
-- Name: stock_alerts Users can update own stock alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own stock alerts" ON public.stock_alerts FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: merchant_messages Users can update received messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update received messages" ON public.merchant_messages FOR UPDATE USING ((auth.uid() = receiver_id));


--
-- Name: merchant_negotiations Users can update their negotiations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their negotiations" ON public.merchant_negotiations FOR UPDATE USING (((auth.uid() = proposer_id) OR (auth.uid() = responder_id)));


--
-- Name: clients Users can update their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: debts Users can update their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own debts" ON public.debts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: merchant_profiles Users can update their own merchant profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own merchant profile" ON public.merchant_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: merchant_offers Users can update their own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own offers" ON public.merchant_offers FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: payments Users can update their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sale_items Users can update their own sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sale items" ON public.sale_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sales Users can update their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sales" ON public.sales FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: stock_items Users can update their own stock items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own stock items" ON public.stock_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: stock_voice_entries Users can update their own stock voice entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own stock voice entries" ON public.stock_voice_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: referrals Users can update their referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their referrals" ON public.referrals FOR UPDATE USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: subscriptions Users can update their subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their subscription" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: product_requests Users can view open or own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view open or own requests" ON public.product_requests FOR SELECT USING (((status = 'open'::text) OR (auth.uid() = user_id) OR (auth.uid() = fulfilled_by)));


--
-- Name: stock_alerts Users can view own stock alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own stock alerts" ON public.stock_alerts FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: merchant_messages Users can view their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their messages" ON public.merchant_messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: merchant_negotiations Users can view their negotiations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their negotiations" ON public.merchant_negotiations FOR SELECT USING (((auth.uid() = proposer_id) OR (auth.uid() = responder_id)));


--
-- Name: commission_balances Users can view their own balance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own balance" ON public.commission_balances FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: clients Users can view their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: debts Users can view their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own debts" ON public.debts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: commission_payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON public.commission_payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sale_items Users can view their own sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sale items" ON public.sale_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sales Users can view their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sales" ON public.sales FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: stock_items Users can view their own stock items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own stock items" ON public.stock_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: stock_voice_entries Users can view their own stock voice entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own stock voice entries" ON public.stock_voice_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payment_history Users can view their payment history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their payment history" ON public.payment_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view their referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their referrals" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: subscriptions Users can view their subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their subscription" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_tickets Users can view their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tickets" ON public.support_tickets FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: recharge_codes Users can view their used codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their used codes" ON public.recharge_codes FOR SELECT TO authenticated USING ((used_by = auth.uid()));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: commissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

--
-- Name: countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

--
-- Name: debts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_negotiations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_negotiations ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_offers ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: product_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: recharge_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recharge_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: regions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

--
-- Name: roadmap_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_voice_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_voice_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;