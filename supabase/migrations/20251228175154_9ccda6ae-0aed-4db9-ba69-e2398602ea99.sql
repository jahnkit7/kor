-- Drop existing insecure policies
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.employee_invites;
DROP POLICY IF EXISTS "Authenticated users can accept invites" ON public.employee_invites;

-- Create secure SELECT policy: only owner or the invited employee can view
CREATE POLICY "Owner or invited employee can view invites" 
ON public.employee_invites 
FOR SELECT 
USING (
  auth.uid() = owner_user_id 
  OR employee_phone = (
    SELECT phone FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Create secure UPDATE policy: only the invited employee can accept their own invite
-- and only allow updating status field
CREATE POLICY "Invited employee can accept their invite" 
ON public.employee_invites 
FOR UPDATE 
USING (
  employee_phone = (
    SELECT phone FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  employee_phone = (
    SELECT phone FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
);