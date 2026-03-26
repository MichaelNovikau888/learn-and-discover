import { useState, useRef } from 'react';
import { useSiteContent, useSiteContentUpdate } from '@/hooks/useSiteContent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image, Loader2, X, Plus, Trash2, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const featureCards = [
  { key: 'feature_rating', title: 'Рейтинг на картах', description: 'Карточка с рейтингом школы' },
  { key: 'feature_method', title: 'Методика Шерил Портер', description: 'Карточка методики' },
  { key: 'feature_teachers', title: 'Преподаватели', description: 'Карточка преподавателей' },
  { key: 'feature_schedule', title: 'График работы', description: 'Карточка графика работы' },
];

const galleries = [
  { key: 'mission_gallery', title: 'Миссия школы', description: 'Фото для раздела миссии' },
  { key: 'studios_gallery', title: 'Студии', description: 'Фото студий школы' },
];

const videoSections = [
  { key: 'events_concerts', title: 'Квартирники', description: 'Видео квартирников' },
  { key: 'events_reports', title: 'Отчётные концерты', description: 'Видео отчётных концертов' },
  { key: 'events_outdoor', title: 'Выездные мероприятия', description: 'Видео выездных мероприятий' },
  { key: 'events_masterclass', title: 'Мастер-классы', description: 'Видео мастер-классов' },
  { key: 'students_videos', title: 'Видео учеников', description: 'Видео выступлений учеников' },
];

interface VideoItem {
  url: string;
  title?: string;
  name?: string;
}

export function ContentManagement() {
  const allKeys = [
    ...featureCards.map(c => c.key),
    ...galleries.map(g => g.key),
    ...videoSections.map(v => v.key),
  ];
  
  const { content, loading } = useSiteContent(allKeys);
  const { uploadImage, updateContent, updating } = useSiteContentUpdate();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoName, setNewVideoName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const handleImageUpload = async (sectionKey: string, file: File) => {
    setUploadingKey(sectionKey);
    const { error } = await uploadImage(sectionKey, file);
    setUploadingKey(null);

    if (error) {
      toast({
        title: 'Ошибка загрузки',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Изображение обновлено',
      });
    }
  };

  const handleFileChange = (sectionKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(sectionKey, file);
    }
  };

  const handleGalleryImageUpload = async (sectionKey: string, file: File) => {
    setUploadingKey(sectionKey);
    const fileExt = file.name.split('.').pop();
    const fileName = `${sectionKey}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('site-content')
      .upload(fileName, file);

    if (uploadError) {
      setUploadingKey(null);
      toast({
        title: 'Ошибка загрузки',
        description: uploadError.message,
        variant: 'destructive',
      });
      return;
    }

    const { data: urlData } = supabase.storage
      .from('site-content')
      .getPublicUrl(fileName);

    const currentContent = content[sectionKey];
    const currentImages: string[] = (currentContent?.content as any)?.images || [];
    const newImages = [...currentImages, urlData.publicUrl];

    const { error } = await updateContent(sectionKey, {
      content: { images: newImages }
    });

    setUploadingKey(null);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить галерею',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Фото добавлено в галерею',
      });
      window.location.reload();
    }
  };

  const handleRemoveGalleryImage = async (sectionKey: string, imageUrl: string) => {
    const currentContent = content[sectionKey];
    const currentImages: string[] = (currentContent?.content as any)?.images || [];
    const newImages = currentImages.filter(img => img !== imageUrl);

    const { error } = await updateContent(sectionKey, {
      content: { images: newImages }
    });

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить изображение',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Изображение удалено',
      });
      window.location.reload();
    }
  };

  const handleAddVideo = async (sectionKey: string) => {
    if (!newVideoUrl.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите URL видео',
        variant: 'destructive',
      });
      return;
    }

    const currentContent = content[sectionKey];
    const currentVideos: VideoItem[] = (currentContent?.content as any)?.videos || [];
    
    const newVideo: VideoItem = {
      url: newVideoUrl.trim(),
      title: newVideoTitle.trim() || undefined,
      name: newVideoName.trim() || undefined,
    };

    const newVideos = [...currentVideos, newVideo];

    const { error } = await updateContent(sectionKey, {
      content: { videos: newVideos }
    });

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить видео',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Видео добавлено',
      });
      setNewVideoUrl('');
      setNewVideoTitle('');
      setNewVideoName('');
      setSelectedSection('');
      window.location.reload();
    }
  };

  const handleRemoveVideo = async (sectionKey: string, videoUrl: string) => {
    const currentContent = content[sectionKey];
    const currentVideos: VideoItem[] = (currentContent?.content as any)?.videos || [];
    const newVideos = currentVideos.filter(v => v.url !== videoUrl);

    const { error } = await updateContent(sectionKey, {
      content: { videos: newVideos }
    });

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить видео',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Видео удалено',
      });
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">Управление контентом</h2>
        <p className="text-muted-foreground">Управляйте изображениями и видео на сайте</p>
      </div>

      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="features">Карточки</TabsTrigger>
          <TabsTrigger value="galleries">Галереи</TabsTrigger>
          <TabsTrigger value="videos">Видео</TabsTrigger>
        </TabsList>

        {/* Feature Cards Tab */}
        <TabsContent value="features" className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Загрузите фоновые изображения для интерактивных карточек в разделе преимуществ
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureCards.map((card) => {
              const item = content[card.key];
              const isUploading = uploadingKey === card.key;

              return (
                <Card key={card.key} className="shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted relative">
                      {item?.image_url ? (
                        <img
                          src={item.image_url}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Image className="h-12 w-12 opacity-30" />
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => (fileInputRefs.current[card.key] = el)}
                        onChange={handleFileChange(card.key)}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRefs.current[card.key]?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {item?.image_url ? 'Заменить' : 'Загрузить'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Galleries Tab */}
        <TabsContent value="galleries" className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Добавляйте фотографии в галереи разделов «Миссия» и «Студии»
          </p>
          {galleries.map((gallery) => {
            const galleryContent = content[gallery.key];
            const images: string[] = (galleryContent?.content as any)?.images || [];
            const isUploading = uploadingKey === gallery.key;
            
            return (
              <Card key={gallery.key}>
                <CardHeader>
                  <CardTitle>{gallery.title}</CardTitle>
                  <CardDescription>{gallery.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {images.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img 
                          src={imageUrl} 
                          alt={`Фото ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveGalleryImage(gallery.key, imageUrl)}
                          className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border-2 border-dashed border-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors relative">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <div className="text-center">
                          <Plus className="h-8 w-8 mx-auto mb-1 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Добавить</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleGalleryImageUpload(gallery.key, file);
                        }}
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Добавляйте ссылки на YouTube видео для разделов мероприятий и учеников
          </p>
          {videoSections.map((section) => {
            const sectionContent = content[section.key];
            const videos: VideoItem[] = (sectionContent?.content as any)?.videos || [];
            
            return (
              <Card key={section.key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {videos.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {videos.map((video, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.name || video.title || `Видео ${index + 1}`}</p>
                            <p className="text-xs text-muted-foreground truncate">{video.url}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVideo(section.key, video.url)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSection === section.key ? (
                    <div className="space-y-3 p-4 border rounded-lg">
                      <div>
                        <Label htmlFor={`url-${section.key}`}>Ссылка на YouTube</Label>
                        <Input
                          id={`url-${section.key}`}
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                        />
                      </div>
                      {section.key === 'students_videos' && (
                        <div>
                          <Label htmlFor={`name-${section.key}`}>Имя ученика</Label>
                          <Input
                            id={`name-${section.key}`}
                            placeholder="Анна"
                            value={newVideoName}
                            onChange={(e) => setNewVideoName(e.target.value)}
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor={`title-${section.key}`}>Описание (опционально)</Label>
                        <Input
                          id={`title-${section.key}`}
                          placeholder="Выступление на концерте"
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAddVideo(section.key)} disabled={updating}>
                          Добавить
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedSection('')}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedSection(section.key)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить видео
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
