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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    linked_owner_id uuid
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


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
-- Name: idx_employee_invites_invite_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_invites_invite_code ON public.employee_invites USING btree (invite_code);


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
-- Name: idx_stock_voice_entries_user_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_voice_entries_user_created_at ON public.stock_voice_entries USING btree (user_id, created_at DESC);


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: regions Admins can manage regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage regions" ON public.regions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: countries Admins can view all countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all countries" ON public.countries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscription_plans Admins can view all plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all plans" ON public.subscription_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regions Admins can view all regions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all regions" ON public.regions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


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
-- Name: subscriptions Users can insert their subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their subscription" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: merchant_messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.merchant_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: product_requests Users can update own or fulfill open requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own or fulfill open requests" ON public.product_requests FOR UPDATE USING (((auth.uid() = user_id) OR ((status = 'open'::text) AND (fulfilled_by IS NULL))));


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
-- Name: subscriptions Users can update their subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their subscription" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: product_requests Users can view open or own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view open or own requests" ON public.product_requests FOR SELECT USING (((status = 'open'::text) OR (auth.uid() = user_id) OR (auth.uid() = fulfilled_by)));


--
-- Name: merchant_messages Users can view their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their messages" ON public.merchant_messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: merchant_negotiations Users can view their negotiations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their negotiations" ON public.merchant_negotiations FOR SELECT USING (((auth.uid() = proposer_id) OR (auth.uid() = responder_id)));


--
-- Name: clients Users can view their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: debts Users can view their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own debts" ON public.debts FOR SELECT USING ((auth.uid() = user_id));


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
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

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
-- Name: recharge_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recharge_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: regions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

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