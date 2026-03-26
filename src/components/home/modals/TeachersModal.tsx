import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useTeachers } from '@/hooks/useTeachers';
import { Button } from '@/components/ui/button';

interface TeachersModalProps {
  open: boolean;
  onClose: () => void;
}

export function TeachersModal({ open, onClose }: TeachersModalProps) {
  const { teachers, loading } = useTeachers();
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? teachers.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === teachers.length - 1 ? 0 : prev + 1));
  };

  const currentTeacher = teachers[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Наши преподаватели</DialogTitle>
        </VisuallyHidden>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center hover:bg-background transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            Преподаватели пока не добавлены
          </div>
        ) : (
          <div className="relative">
            {/* Navigation Arrows */}
            {teachers.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 hover:bg-background"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 hover:bg-background"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Teacher Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
              {/* Left Side - Info */}
              <div className="flex flex-col justify-center p-8 md:p-12 order-2 md:order-1">
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
                  {currentTeacher?.profile?.first_name} {currentTeacher?.profile?.last_name}
                </h3>
                {currentTeacher?.specialization && (
                  <p className="text-primary font-medium mb-4">
                    {currentTeacher.specialization}
                  </p>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {currentTeacher?.bio || 'Профессиональный преподаватель вокала'}
                </p>

                {/* Dots Indicator */}
                {teachers.length > 1 && (
                  <div className="flex gap-2 mt-6">
                    {teachers.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side - Photo */}
              <div className="aspect-square md:aspect-auto md:h-full order-1 md:order-2">
                {currentTeacher?.avatar_url ? (
                  <img
                    src={currentTeacher.avatar_url}
                    alt={`${currentTeacher?.profile?.first_name} ${currentTeacher?.profile?.last_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-8xl">👩‍🏫</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
