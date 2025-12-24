'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface ImageCarouselProps {
  imageUrls: string[];
}

export function ImageCarousel({ imageUrls }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollTo = (index: number) => {
      if (!scrollContainerRef.current) return;
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
          left: width * index,
          behavior: 'smooth'
      });
      setCurrentIndex(index);
  };

  const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const width = scrollContainerRef.current.clientWidth;
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
      }
  };

  return (
      <div className="w-full relative bg-gray-100 dark:bg-gray-800 min-h-[300px] shrink-0 group">
           {/* Slider */}
          <div
              ref={scrollContainerRef}
              className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={handleScroll}
          >
              {imageUrls.map((url, idx) => (
                  <div key={idx} className="w-full flex-shrink-0 snap-center relative h-[50vh] min-h-[300px]">
                      <Image
                          src={url}
                          alt={`Slide ${idx}`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={idx === 0}
                          unoptimized={url.startsWith('/api/')}
                      />
                  </div>
              ))}
          </div>

          {/* Navigation Arrows */}
          {imageUrls.length > 1 && (
              <>
                  {currentIndex > 0 && (
                      <button
                          onClick={(e) => { e.stopPropagation(); scrollTo(currentIndex - 1); }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full transition-opacity hover:bg-black/60 z-10"
                      >
                          <ChevronLeft className="w-6 h-6" />
                      </button>
                  )}
                  {currentIndex < imageUrls.length - 1 && (
                      <button
                          onClick={(e) => { e.stopPropagation(); scrollTo(currentIndex + 1); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full transition-opacity hover:bg-black/60 z-10"
                      >
                          <ChevronRight className="w-6 h-6" />
                      </button>
                  )}
              </>
          )}

          {/* Dots Indicator */}
          {imageUrls.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {imageUrls.map((_, idx) => (
                      <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                      />
                  ))}
              </div>
          )}
      </div>
  );
}
