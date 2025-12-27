'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

interface ImageWithSpinnerProps {
    src: string;
    alt: string;
    className?: string;
}

export function ImageWithSpinner({ src, alt, className }: ImageWithSpinnerProps) {
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const cleanSrc = src?.trim() || '';
    const isExternal = cleanSrc.startsWith('http') || cleanSrc.startsWith('//');

    useEffect(() => {
        setLoaded(false);
    }, [src]);

    useEffect(() => {
        if (imgRef.current && imgRef.current.complete) {
            setLoaded(true);
        }
    }, [src]);

    return (
        <div className={`relative w-full h-full ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                    <div className="scale-50">
                        <Spinner />
                    </div>
                </div>
            )}
            {isExternal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    ref={imgRef}
                    src={cleanSrc}
                    alt={alt}
                    className={`object-cover w-full h-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                    crossOrigin="anonymous"
                />
            ) : (
                <Image
                    src={src} // Keep original src for Next.js image if it expects relative path
                    alt={alt}
                    fill
                    sizes="(max-width: 768px) 33vw, 25vw"
                    className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                    unoptimized={src.startsWith('/api/')}
                />
            )}
        </div>
    );
}
