import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';

const benefits = [
  {
    icon: '🎯',
    title: 'Преподаватели проанализируют ваш голос',
    description: 'по 10 основным критериям',
  },
  {
    icon: '🎵',
    title: 'Подготовим список песен',
    description: 'которые подойдут лично вам',
  },
  {
    icon: '📚',
    title: 'Подарок — методичка',
    description: 'о том, как заботиться и развивать свой голос',
  },
  {
    icon: '🎬',
    title: 'В подарок отправим видеоурок',
    description: '«Как за 5 минут в день улучшить речь и прокачать уверенность»',
  },
];

import * as React from "react";

export function TrialLessonSection() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle form submission later
  };

  return (
    <section id="courses" className="py-20 bg-background scroll-mt-48">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Benefits */}
          <div>
            <h2 className="section-title text-left mb-8">
              Запишитесь на первое занятие <span className="text-primary">бесплатно</span>
            </h2>
            <p className="text-xl md:text-2xl font-bold text-foreground mb-8">
              Проведем диагностический урок на основе методики Российской Академии голоса
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl">
                    {benefit.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Form Card */}
          <div className="bg-card rounded-3xl p-8 shadow-xl border border-border">
            <h3 className="font-display font-bold text-2xl mb-2 text-center">
              Записаться на бесплатный урок
            </h3>
            <p className="text-center text-muted-foreground mb-6">
              Оставьте заявку и мы свяжемся с вами в течение 15 минут
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Ваше имя"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Ваша фамилия"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="trial-phone" className="block text-sm font-medium mb-2">
                  Телефон
                </label>
                <PhoneInput id="trial-phone" />
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="whatsapp" className="mt-1" />
                <label htmlFor="whatsapp" className="text-sm text-muted-foreground">
                  Связаться со мной по WhatsApp
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="privacy" className="mt-1" required />
                <label htmlFor="privacy" className="text-sm text-muted-foreground">
                  Согласен с политикой конфиденциальности
                </label>
              </div>
              <Button type="button" className="w-full btn-primary text-lg py-6">
                Записаться на бесплатный урок
              </Button>
            </form>

            <div className="flex items-center gap-3 mt-6 p-4 bg-accent/10 rounded-xl">
              <Gift className="h-6 w-6 text-accent flex-shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">В подарок</span> отправим видеоурок о развитии голоса
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
