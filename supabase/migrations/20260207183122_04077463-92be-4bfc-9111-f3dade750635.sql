-- 1. Изменяем структуру курсов: убираем course_type, добавляем количество индивидуальных и групповых занятий
ALTER TABLE public.courses 
  DROP COLUMN IF EXISTS course_type,
  ADD COLUMN IF NOT EXISTS individual_lessons integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_lessons integer NOT NULL DEFAULT 0;

-- 2. Убираем ограничение max_participants из курсов (оно будет в расписании)
-- max_participants остается как общее ограничение курса

-- 3. Добавляем тип занятия в расписание (индивидуальное или групповое)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'individual' CHECK (lesson_type IN ('individual', 'group')),
  ADD COLUMN IF NOT EXISTS max_participants integer NOT NULL DEFAULT 1;

-- 4. Обновляем student_courses для отслеживания остатка индивидуальных и групповых занятий
ALTER TABLE public.student_courses
  ADD COLUMN IF NOT EXISTS individual_lessons_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_lessons_remaining integer NOT NULL DEFAULT 0;

-- 5. Создаем таблицу для заявок на пробное занятие
CREATE TABLE IF NOT EXISTS public.trial_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text,
  phone text NOT NULL,
  wants_whatsapp boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS для trial_requests
ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;

-- Любой может создать заявку (без авторизации)
CREATE POLICY "Anyone can create trial request"
  ON public.trial_requests
  FOR INSERT
  WITH CHECK (true);

-- Менеджеры и админы могут видеть и управлять заявками
CREATE POLICY "Admins and managers can manage trial requests"
  ON public.trial_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Триггер для updated_at
CREATE TRIGGER update_trial_requests_updated_at
  BEFORE UPDATE ON public.trial_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Удаляем enum course_type если больше не нужен
DROP TYPE IF EXISTS public.course_type CASCADE;