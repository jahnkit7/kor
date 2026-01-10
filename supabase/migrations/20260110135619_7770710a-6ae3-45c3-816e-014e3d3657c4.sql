-- Créer une fonction RPC sécurisée pour valider les codes de parrainage
-- Cette fonction contourne les RLS policies en utilisant SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.validate_referral_code(code TEXT)
RETURNS TABLE(referrer_id UUID, referrer_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.shop_name
  FROM profiles p
  WHERE p.referral_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$;

-- Accorder les permissions d'exécution à tous les utilisateurs authentifiés et anonymes
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon;