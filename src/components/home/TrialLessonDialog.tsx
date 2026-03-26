import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrialLessonDialogProps {
  children: React.ReactNode;
}

const QUIZ_URL = "https://mrqz.me/63dd1cacb84b68004f7d4711";

export function TrialLessonDialog({ children }: TrialLessonDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState(false);
  const [privacy, setPrivacy] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      toast({ title: "Ошибка", description: "Введите ваше имя", variant: "destructive" });
      return;
    }
    
    if (!phone.trim()) {
      toast({ title: "Ошибка", description: "Введите номер телефона", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Сохраняем заявку в базу данных
      const { error } = await supabase
        .from('trial_requests')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: phone.trim(),
          wants_whatsapp: whatsapp,
          status: 'new',
        });

      if (error) {
        console.error('Error saving trial request:', error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось отправить заявку. Попробуйте позже.", 
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }

      toast({ 
        title: "Заявка отправлена!", 
        description: "Мы свяжемся с вами в течение 15 минут" 
      });

      // Закрываем диалог и сбрасываем форму
      setOpen(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setWhatsapp(false);
      setPrivacy(false);

      // Перенаправляем на квиз
      window.open(QUIZ_URL, "_blank");
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({ 
        title: "Ошибка", 
        description: "Произошла ошибка. Попробуйте позже.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-2xl text-center">
            Записаться на бесплатный урок
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Оставьте заявку и мы свяжемся с вами в течение 15 минут
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Ваше имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Ваша фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={submitting}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="dialog-phone" className="block text-sm font-medium mb-2">
              Телефон
            </label>
            <PhoneInput 
              id="dialog-phone" 
              onChange={(value, fullNumber) => setPhone(fullNumber)}
              disabled={submitting}
            />
          </div>

          <div className="flex items-start gap-2">
            <input 
              type="checkbox" 
              id="dialog-whatsapp" 
              className="mt-1"
              checked={whatsapp}
              onChange={(e) => setWhatsapp(e.target.checked)}
              disabled={submitting}
            />
            <label htmlFor="dialog-whatsapp" className="text-sm text-muted-foreground">
              Связаться со мной по WhatsApp
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input 
              type="checkbox" 
              id="dialog-privacy" 
              className="mt-1" 
              required
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              disabled={submitting}
            />
            <label htmlFor="dialog-privacy" className="text-sm text-muted-foreground">
              Согласен с политикой конфиденциальности
            </label>
          </div>

          <Button type="submit" className="w-full btn-primary text-lg py-6" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Отправляем...
              </>
            ) : (
              "Записаться на бесплатный урок"
            )}
          </Button>
        </form>

        <div className="flex items-center gap-3 mt-2 p-4 bg-accent/10 rounded-xl">
          <Gift className="h-6 w-6 text-accent flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">В подарок</span> отправим видеоурок о развитии голоса
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
