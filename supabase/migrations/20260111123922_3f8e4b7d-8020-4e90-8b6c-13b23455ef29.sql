-- Ajouter une colonne is_active pour pouvoir désactiver des codes
ALTER TABLE public.recharge_codes
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ajouter une politique permettant aux utilisateurs authentifiés de LIRE 
-- les codes non-utilisés pour validation
CREATE POLICY "Users can validate available codes"
ON public.recharge_codes
FOR SELECT
TO authenticated
USING (is_used = false AND (expires_at IS NULL OR expires_at > now()) AND is_active = true);

-- Ajouter une politique permettant aux utilisateurs de marquer un code comme utilisé
CREATE POLICY "Users can use available codes"
ON public.recharge_codes
FOR UPDATE
TO authenticated
USING (is_used = false AND (expires_at IS NULL OR expires_at > now()) AND is_active = true)
WITH CHECK (used_by = auth.uid() AND is_used = true);