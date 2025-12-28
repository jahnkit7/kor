-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'employee');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update roles"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id);

-- Add warning flag to clients table for risky clients
ALTER TABLE public.clients
ADD COLUMN is_risky BOOLEAN DEFAULT false;

-- Add app settings columns to profiles
ALTER TABLE public.profiles
ADD COLUMN app_pin TEXT,
ADD COLUMN auto_lock_minutes INTEGER DEFAULT 5,
ADD COLUMN hide_amounts BOOLEAN DEFAULT false,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Create table for employee invites (for future use)
CREATE TABLE public.employee_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL,
    employee_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their invites"
ON public.employee_invites
FOR ALL
USING (auth.uid() = owner_user_id);

-- Create trial/subscription tracking table for future monetization
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free_trial',
    trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
    max_clients INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger to create default owner role and subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create default owner role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
    
    -- Create default subscription
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();