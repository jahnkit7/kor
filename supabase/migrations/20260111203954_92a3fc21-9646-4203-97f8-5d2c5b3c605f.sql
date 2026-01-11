-- Supprimer la politique ALL existante pour la remplacer par des politiques spécifiques
DROP POLICY IF EXISTS "Admins can manage codes" ON recharge_codes;

-- Politique SELECT pour admins : voir TOUS les codes (y compris utilisés)
CREATE POLICY "Admins can view all codes" ON recharge_codes
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique INSERT pour admins
CREATE POLICY "Admins can insert codes" ON recharge_codes
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Politique UPDATE pour admins
CREATE POLICY "Admins can update codes" ON recharge_codes
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Politique DELETE pour admins
CREATE POLICY "Admins can delete codes" ON recharge_codes
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Activer Realtime sur activity_logs pour le dashboard admin
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;