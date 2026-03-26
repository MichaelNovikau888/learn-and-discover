-- Таблица для хранения контента секций сайта (фоновые изображения карточек и т.д.)
CREATE TABLE public.site_content (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    section_key TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    image_url TEXT,
    content JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view active content
CREATE POLICY "Anyone can view site content"
ON public.site_content
FOR SELECT
USING (is_active = true);

-- Admins and managers can manage content
CREATE POLICY "Admins and managers can manage site content"
ON public.site_content
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Trigger for updated_at
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content for feature cards
INSERT INTO public.site_content (section_key, title, description, image_url, content) VALUES
('feature_rating', 'Лучшая ШКОЛА в городе по рейтингу на картах', 'Средний рейтинг наших школ 5 из 5 возможных — нас любят за атмосферу и результат', NULL, '{"yandex_url": "https://yandex.by/maps/org/fa_sol/59207148345/?ll=27.580094%2C53.920990&z=15.3"}'),
('feature_method', 'Современная методика преподавания', 'По авторской методике с использованием упражнений Шерил Портер', NULL, '{}'),
('feature_teachers', 'Опытные и заботливые преподаватели', 'В школе работают профессиональные преподаватели, которые прошли серьезный отбор', NULL, '{}'),
('feature_schedule', 'Удобный график проведения занятий', 'Школа работает 7 дней в неделю с 10:00 до 22:00, мы подберем удобное для вас время занятий', NULL, '{}');

-- Create storage bucket for site content images
INSERT INTO storage.buckets (id, name, public) VALUES ('site-content', 'site-content', true);

-- Storage policies for site-content bucket
CREATE POLICY "Anyone can view site content images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-content');

CREATE POLICY "Admins and managers can upload site content images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'site-content' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins and managers can update site content images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'site-content' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins and managers can delete site content images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'site-content' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));