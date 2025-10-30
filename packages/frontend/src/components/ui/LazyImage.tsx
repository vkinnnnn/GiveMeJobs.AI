/**
 * Lazy Image Component
 * Progressive image loading with placeholder
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useIsSlowConnection } from '@/hooks/useNetworkStatus';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E',
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isSlowConnection = useIsSlowConnection();

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load image when it enters viewport
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setImageLoaded(true);
            };
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: isSlowConnection ? '50px' : '200px', // Smaller margin for slow connections
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [src, isSlowConnection]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      className={`transition-opacity duration-300 ${
        imageLoaded ? 'opacity-100' : 'opacity-50'
      } ${className}`}
      aria-busy={!imageLoaded}
    />
  );
}
