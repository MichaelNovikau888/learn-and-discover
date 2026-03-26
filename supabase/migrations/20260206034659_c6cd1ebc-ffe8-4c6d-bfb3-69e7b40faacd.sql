-- Allow managers to manage courses
CREATE POLICY "Managers can manage courses"
ON public.courses FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all courses"
ON public.courses FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to manage teachers
CREATE POLICY "Managers can manage teachers"
ON public.teachers FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to manage schedules
CREATE POLICY "Managers can manage schedules"
ON public.schedules FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to view all schedules including inactive
CREATE POLICY "Managers can view all schedules"
ON public.schedules FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));