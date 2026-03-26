-- Add more section keys for galleries and videos
INSERT INTO public.site_content (section_key, title, description, content) VALUES
  ('mission_gallery', 'Галерея миссии', 'Фото для раздела миссии', '{"images": []}'::jsonb),
  ('studios_gallery', 'Галерея студий', 'Фото студий школы', '{"images": []}'::jsonb),
  ('events_concerts', 'Квартирники', 'Видео квартирников', '{"videos": []}'::jsonb),
  ('events_reports', 'Отчётные концерты', 'Видео отчётных концертов', '{"videos": []}'::jsonb),
  ('events_outdoor', 'Выездные мероприятия', 'Видео выездных мероприятий', '{"videos": []}'::jsonb),
  ('events_masterclass', 'Мастер-классы', 'Видео мастер-классов', '{"videos": []}'::jsonb),
  ('students_videos', 'Видео учеников', 'Видео выступлений учеников', '{"videos": []}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;