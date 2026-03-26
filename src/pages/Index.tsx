import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { MissionSection } from '@/components/home/MissionSection';
import { TrialLessonSection } from '@/components/home/TrialLessonSection';
import { StudiosSection } from '@/components/home/StudiosSection';
import { EventsSection } from '@/components/home/EventsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { CTASection } from '@/components/home/CTASection';
import { ContactsSection } from '@/components/home/ContactsSection';

export default function Index() {
  return (
    <Layout>
      <HeroSection />
      <FeaturesSection />
      <MissionSection />
      <TrialLessonSection />
      <StudiosSection />
      <EventsSection />
      <TestimonialsSection />
      <CTASection />
      <ContactsSection />
    </Layout>
  );
}
