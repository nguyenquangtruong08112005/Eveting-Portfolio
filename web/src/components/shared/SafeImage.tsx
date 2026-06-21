'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

const FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
    '<rect fill="#1e1e2e" width="400" height="300"/>' +
    '<text fill="#555" font-family="sans-serif" font-size="16" text-anchor="middle" x="200" y="150">Image not available</text>' +
    '</svg>'
  );

type SafeImageProps = Omit<ImageProps, 'onError'> & {
  fallbackSrc?: string;
  sizes?: string;
};

export function SafeImage({ src, fallbackSrc = FALLBACK, alt, ...rest }: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
}
