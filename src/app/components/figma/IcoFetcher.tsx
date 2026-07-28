import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ImageWithFallback } from './ImageWithFallback';

interface IcoFetcherProps {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export function IcoFetcher({ src, alt, className, style }: IcoFetcherProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const res = await fetch(src, { method: 'GET', mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);

        if (mounted) setBlobUrl(objectUrl);
      } catch (e) {
        // fallback will be handled by ImageWithFallback
        console.warn('IcoFetcher failed to fetch', src, e);
        if (mounted) setBlobUrl(null);
      }
    })();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (blobUrl) {
    return <img src={blobUrl} alt={alt} className={className} style={style} />;
  }

  return <ImageWithFallback src={src} alt={alt} className={className} style={style} />;
}
