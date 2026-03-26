import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteContent } from '@/lib/types';

export function useSiteContent(sectionKeys?: string[]) {
  const [content, setContent] = useState<Record<string, SiteContent>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      let query = supabase
        .from('site_content')
        .select('*')
        .eq('is_active', true);
      
      if (sectionKeys && sectionKeys.length > 0) {
        query = query.in('section_key', sectionKeys);
      }

      const { data, error } = await query;

      if (!error && data) {
        const contentMap: Record<string, SiteContent> = {};
        data.forEach((item: any) => {
          contentMap[item.section_key] = item as SiteContent;
        });
        setContent(contentMap);
      }
      setLoading(false);
    };

    fetchContent();
  }, [sectionKeys?.join(',')]);

  return { content, loading };
}

export function useSiteContentUpdate() {
  const [updating, setUpdating] = useState(false);

  const updateContent = async (sectionKey: string, updates: Partial<SiteContent>) => {
    setUpdating(true);
    const { error } = await supabase
      .from('site_content')
      .update(updates)
      .eq('section_key', sectionKey);
    setUpdating(false);
    return { error };
  };

  const uploadImage = async (sectionKey: string, file: File) => {
    setUpdating(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${sectionKey}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('site-content')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      setUpdating(false);
      return { error: uploadError, url: null };
    }

    const { data: urlData } = supabase.storage
      .from('site-content')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('site_content')
      .update({ image_url: urlData.publicUrl })
      .eq('section_key', sectionKey);

    setUpdating(false);
    return { error: updateError, url: urlData.publicUrl };
  };

  return { updateContent, uploadImage, updating };
}
