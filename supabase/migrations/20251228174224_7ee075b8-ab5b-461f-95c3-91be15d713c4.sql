-- Ajouter une colonne pour lier un employé à un propriétaire
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linked_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Mettre à jour la table employee_invites pour stocker le code d'invitation
ALTER TABLE public.employee_invites 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- Créer un index pour chercher par code d'invitation
CREATE INDEX IF NOT EXISTS idx_employee_invites_invite_code ON public.employee_invites(invite_code);

-- Politique pour permettre aux employés potentiels de voir les invites par code
CREATE POLICY "Anyone can view invites by code" 
ON public.employee_invites 
FOR SELECT 
USING (true);

-- Politique pour permettre aux utilisateurs authentifiés de mettre à jour le statut de leur invite
CREATE POLICY "Authenticated users can accept invites" 
ON public.employee_invites 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);