'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

const FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
    '<rect fill="#F5F5F4" width="400" height="300"/>' +
    '<g fill="none" stroke="#E7E5E4" stroke-width="2">' +
    '<rect x="150" y="110" width="100" height="70" rx="6"/>' +
    '<circle cx="180" cy="135" r="8"/>' +
    '<path d="M150 175 L185 145 L210 165 L240 140 L250 175 Z" fill="#E7E5E4"/>' +
    '</g>' +
    '<text fill="#A8A29E" font-family="sans-serif" font-size="12" text-anchor="middle" x="200" y="220">No image</text>' +
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
