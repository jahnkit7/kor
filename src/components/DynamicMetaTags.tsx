import { useEffect } from "react";
import { useBranding } from "@/hooks/use-branding";

export function DynamicMetaTags() {
  const { branding } = useBranding();

  useEffect(() => {
    if (!branding) return;

    // Update document title
    if (branding.og_title) {
      document.title = branding.og_title;
    }

    // Update meta tags
    updateMetaTag('name', 'description', branding.og_description);
    updateMetaTag('property', 'og:title', branding.og_title);
    updateMetaTag('property', 'og:description', branding.og_description);
    updateMetaTag('property', 'og:image', branding.og_image);
    updateMetaTag('name', 'twitter:title', branding.og_title);
    updateMetaTag('name', 'twitter:description', branding.og_description);
    updateMetaTag('name', 'twitter:image', branding.og_image);

    // Update favicon
    if (branding.favicon) {
      updateFavicon(branding.favicon);
    }
  }, [branding]);

  return null;
}

function updateMetaTag(attribute: 'name' | 'property', key: string, value?: string) {
  if (!value) return;

  let meta = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', value);
}

function updateFavicon(url: string) {
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  link.href = url;
}
