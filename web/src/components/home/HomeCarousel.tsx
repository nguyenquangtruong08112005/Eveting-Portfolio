'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HomeCarouselProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function HomeCarousel({ header, children, className = '' }: HomeCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [children, checkScrollButtons]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">{header}</div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="p-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="p-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={checkScrollButtons}
        className={`flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth relative z-10 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
