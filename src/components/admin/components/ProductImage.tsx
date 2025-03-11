import React, { useState, useEffect, useRef, memo } from 'react';
import { ImageIcon } from 'lucide-react';

interface ProductImageProps {
  productId: string;
  alt?: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  fallbackClassName?: string;
  containerClassName?: string;
  useBase64?: boolean;
  priority?: boolean;
}

// Memory cache to avoid unnecessary requests
const imageStatusCache = new Map<string, 'loading' | 'loaded' | 'error' | 'notExists'>();

const ProductImage: React.FC<ProductImageProps> = ({
  productId,
  alt = 'Product image',
  width = 80,
  height = 80,
  quality = 75, // Reduced default quality
  className = '',
  fallbackClassName = '',
  containerClassName = '',
  useBase64 = false,
  priority = false
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'notExists'>(
    imageStatusCache.get(productId) || 'loading'
  );
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cacheKey = `${productId}-${width}-${height}-${quality}`;
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  
  // Build image URL with cache busting
  const imageUrl = useBase64 
    ? `https://lyme-back.vercel.app/api/producto/${productId}/imagen-base64`
    : `https://lyme-back.vercel.app/api/producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}&v=${timestamp}`;

  useEffect(() => {
    if (!productId) return;

    // Reset if product ID changes
    if (imageStatusCache.has(productId) && imageStatusCache.get(productId) !== 'loading') {
      setLoadState(imageStatusCache.get(productId)!);
      return;
    }

    const loadImage = () => {
      // For Base64 images
      if (useBase64) {
        fetch(imageUrl)
          .then(response => {
            if (!response.ok) {
              if (response.status === 204) {
                imageStatusCache.set(productId, 'notExists');
                setLoadState('notExists');
                return;
              }
              throw new Error('Failed to load image');
            }
            return response.json();
          })
          .then(data => {
            imageStatusCache.set(productId, 'loaded');
            setLoadState('loaded');
          })
          .catch(() => {
            imageStatusCache.set(productId, 'error');
            setLoadState('error');
          });
      } else {
        // For direct image URLs we'll handle the loading in the img element
        setLoadState('loading');
      }
    };

    // Priority images load immediately, others use IntersectionObserver
    if (priority) {
      loadImage();
      return;
    }

    // Lazy loading with IntersectionObserver
    if ('IntersectionObserver' in window && imgRef.current) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadImage();
            observerRef.current?.disconnect();
            observerRef.current = null;
          }
        },
        {
          rootMargin: '200px', // Increased margin to load images earlier
          threshold: 0.01 // Load when even a small part is visible
        }
      );

      observerRef.current.observe(imgRef.current);
    } else {
      // Fallback
      loadImage();
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [productId, imageUrl, priority, useBase64]);

  // Handle image events
  const handleImageLoad = () => {
    imageStatusCache.set(productId, 'loaded');
    setLoadState('loaded');
  };

  const handleImageError = () => {
    // Try refreshing once on error
    if (imageStatusCache.get(productId) !== 'error') {
      imageStatusCache.set(productId, 'error');
      setLoadState('error');
      setTimestamp(Date.now()); // Update timestamp to try loading again
    }
  };

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error' || loadState === 'notExists';

  return (
    <div 
      className={`relative ${containerClassName}`} 
      style={{ width: width, height: height }}
    >
      {/* Placeholder while loading or on error */}
      {(isLoading || hasError) && (
        <div className={`flex items-center justify-center ${fallbackClassName || 'bg-gray-100 rounded-md'}`} 
          style={{ width: width, height: height }}>
          <ImageIcon className="w-6 h-6 text-gray-400" />
        </div>
      )}
      
      {/* Only render if not using base64 or already loaded for base64 */}
      {!useBase64 && (
        <img
          ref={imgRef}
          src={!isLoading ? imageUrl : undefined}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`${className} ${loadState === 'loaded' ? 'opacity-100' : 'opacity-0'} absolute top-0 left-0 transition-opacity duration-300`}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default memo(ProductImage);