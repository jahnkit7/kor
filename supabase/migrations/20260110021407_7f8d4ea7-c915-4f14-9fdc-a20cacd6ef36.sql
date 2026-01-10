-- Create notifications table for in-app push notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System/triggers can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
  target_user_id UUID,
  notification_title TEXT,
  notification_message TEXT,
  notification_type TEXT DEFAULT 'info',
  notification_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger for new subscription - notify user
CREATE OR REPLACE FUNCTION public.notify_subscription_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER on_subscription_activated
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.notify_subscription_activated();

-- Trigger for referral converted - notify referrer
CREATE OR REPLACE FUNCTION public.notify_referral_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER on_referral_converted
AFTER UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.notify_referral_converted();

-- Trigger for new support ticket response (for admin)
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER on_new_support_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_support_ticket();