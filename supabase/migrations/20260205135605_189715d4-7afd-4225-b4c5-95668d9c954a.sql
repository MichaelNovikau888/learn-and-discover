-- Allow managers to manage user roles (currently only admins can)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can manage roles" ON public.user_roles;

-- Managers and admins can view all roles
CREATE POLICY "Admins and managers can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Managers and admins can insert roles
CREATE POLICY "Admins and managers can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Managers and admins can delete roles
CREATE POLICY "Admins and managers can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));