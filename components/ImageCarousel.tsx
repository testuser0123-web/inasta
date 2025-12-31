'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface ImageCarouselProps {
  imageUrls: string[];
}

export function ImageCarousel({ imageUrls }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Use refs for touch tracking to avoid state batching issues during fast swipes
  const touchStartRef = useRef<number | null>(null);
  const touchCurrentRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const resetDrag = () => {
    touchStartRef.current = null;
    touchCurrentRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    touchCurrentRef.current = e.targetTouches[0].clientX;
    setIsDragging(true);
    setDragOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;

    const currentX = e.targetTouches[0].clientX;
    touchCurrentRef.current = currentX;

    // Update visual drag offset
    const diff = currentX - touchStartRef.current;
    setDragOffset(diff);
  };

  const onTouchEnd = () => {
    if (touchStartRef.current === null || touchCurrentRef.current === null) {
        resetDrag();
        return;
    }

    const distance = touchCurrentRef.current - touchStartRef.current; // Negative = Left Swipe (Next), Positive = Right Swipe (Prev)

    // In touch gestures:
    // Dragging finger LEFT (startX > currentX) results in negative distance. This means we want to go NEXT.
    // Dragging finger RIGHT (startX < currentX) results in positive distance. This means we want to go PREV.

    const isNextSwipe = distance < -minSwipeDistance;
    const isPrevSwipe = distance > minSwipeDistance;

    if (isNextSwipe && currentIndex < imageUrls.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else if (isPrevSwipe && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
    }

    resetDrag();
  };

  const onTouchCancel = () => {
      resetDrag();
  };

  const nextSlide = () => {
    if (currentIndex < imageUrls.length - 1) {
        setCurrentIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
    }
  };

  return (
      <div className="w-full relative bg-gray-100 dark:bg-gray-800 min-h-[300px] shrink-0 group overflow-hidden touch-pan-y">
           {/* Slider Container */}
          <div
              ref={containerRef}
              className="flex w-full h-full"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchCancel}
              style={{
                  transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
          >
              {imageUrls.map((url, idx) => {
                  // Treat /api/ paths as external for CORS purposes to satisfy COEP
                  const shouldUseStandardImg = url.startsWith('http') || url.startsWith('/api/');
                  return (
                      <div key={idx} className="w-full flex-shrink-0 relative h-[50vh] min-h-[300px]">
                          {shouldUseStandardImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                  src={url}
                                  alt={`Slide ${idx}`}
                                  className="object-contain w-full h-full"
                                  crossOrigin="anonymous"
                                  draggable={false} // Prevent native drag
                              />
                          ) : (
                              <Image
                                  src={url}
                                  alt={`Slide ${idx}`}
                                  fill
                                  className="object-contain"
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                  priority={idx === 0}
                                  unoptimized={url.startsWith('/api/')}
                                  draggable={false}
                              />
                          )}
                      </div>
                  );
              })}
          </div>

          {/* Navigation Arrows */}
          {imageUrls.length > 1 && (
              <>
                  {currentIndex > 0 && (
                      <button
                          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full transition-opacity hover:bg-black/60 z-10"
                      >
                          <ChevronLeft className="w-6 h-6" />
                      </button>
                  )}
                  {currentIndex < imageUrls.length - 1 && (
                      <button
                          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
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
