import { useState } from 'react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { FeatureCard } from './FeatureCard';
import { RatingModal } from './modals/RatingModal';
import { MethodModal } from './modals/MethodModal';
import { TeachersModal } from './modals/TeachersModal';
import { ScheduleModal } from './modals/ScheduleModal';

const FEATURE_KEYS = ['feature_rating', 'feature_method', 'feature_teachers', 'feature_schedule'];

const fallbackData = {
  feature_rating: {
    title: 'Лучшая ШКОЛА в городе по рейтингу на картах',
    description: 'Средний рейтинг наших школ 5 из 5 возможных — нас любят за атмосферу и результат',
    gradient: 'bg-gradient-to-br from-accent/40 to-accent/20',
    emoji: '⭐',
  },
  feature_method: {
    title: 'Современная методика преподавания',
    description: 'По авторской методике с использованием упражнений Шерил Портер',
    gradient: 'bg-gradient-to-br from-success/40 to-success/20',
    emoji: '🎵',
  },
  feature_teachers: {
    title: 'Опытные и заботливые преподаватели',
    description: 'В школе работают профессиональные преподаватели, которые прошли серьезный отбор',
    gradient: 'bg-gradient-to-br from-primary/40 to-primary/20',
    emoji: '👩‍🏫',
  },
  feature_schedule: {
    title: 'Удобный график проведения занятий',
    description: 'Школа работает 7 дней в неделю с 10:00 до 22:00, мы подберем удобное для вас время занятий',
    gradient: 'bg-gradient-to-br from-warning/40 to-warning/20',
    emoji: '🕐',
  },
};

type ModalType = 'rating' | 'method' | 'teachers' | 'schedule' | null;

export function FeaturesSection() {
  const { content } = useSiteContent(FEATURE_KEYS);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  return (
    <section id="about" className="py-20 bg-background scroll-mt-48">
      <div className="container">
        <h2 className="section-title mb-4">
          <span className="text-primary">«Фа Соль»</span> — крупнейшая школа вокала в Минске
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
          Мы создаём комфортную атмосферу для раскрытия вашего таланта
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            content={content['feature_rating']}
            fallbackTitle={fallbackData.feature_rating.title}
            fallbackDescription={fallbackData.feature_rating.description}
            fallbackGradient={fallbackData.feature_rating.gradient}
            fallbackEmoji={fallbackData.feature_rating.emoji}
            onClick={() => setActiveModal('rating')}
          />
          <FeatureCard
            content={content['feature_method']}
            fallbackTitle={fallbackData.feature_method.title}
            fallbackDescription={fallbackData.feature_method.description}
            fallbackGradient={fallbackData.feature_method.gradient}
            fallbackEmoji={fallbackData.feature_method.emoji}
            onClick={() => setActiveModal('method')}
          />
          <FeatureCard
            content={content['feature_teachers']}
            fallbackTitle={fallbackData.feature_teachers.title}
            fallbackDescription={fallbackData.feature_teachers.description}
            fallbackGradient={fallbackData.feature_teachers.gradient}
            fallbackEmoji={fallbackData.feature_teachers.emoji}
            onClick={() => setActiveModal('teachers')}
          />
          <FeatureCard
            content={content['feature_schedule']}
            fallbackTitle={fallbackData.feature_schedule.title}
            fallbackDescription={fallbackData.feature_schedule.description}
            fallbackGradient={fallbackData.feature_schedule.gradient}
            fallbackEmoji={fallbackData.feature_schedule.emoji}
            onClick={() => setActiveModal('schedule')}
          />
        </div>
      </div>

      {/* Modals */}
      <RatingModal
        open={activeModal === 'rating'}
        onClose={() => setActiveModal(null)}
        yandexUrl={content['feature_rating']?.content?.yandex_url}
      />
      <MethodModal
        open={activeModal === 'method'}
        onClose={() => setActiveModal(null)}
      />
      <TeachersModal
        open={activeModal === 'teachers'}
        onClose={() => setActiveModal(null)}
      />
      <ScheduleModal
        open={activeModal === 'schedule'}
        onClose={() => setActiveModal(null)}
      />
    </section>
  );
}
