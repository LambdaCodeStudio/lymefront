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
  placeholderText?: string;
}

// Caché de memoria global para optimizar el rendimiento entre componentes
// Evita volver a verificar imágenes que ya sabemos que existen o no
const imageStatusCache = new Map<string, 'loading' | 'loaded' | 'error' | 'notExists'>();

/**
 * Componente optimizado para mostrar imágenes de productos con carga diferida
 * y manejo eficiente de errores y caché.
 */
const OptimizedProductImage: React.FC<ProductImageProps> = ({
  productId,
  alt = 'Product image',
  width = 80,
  height = 80,
  quality = 70, // Calidad reducida por defecto para mejor rendimiento
  className = '',
  fallbackClassName = '',
  containerClassName = '',
  useBase64 = false,
  priority = false,
  placeholderText
}) => {
  // Usar el estado de la caché global si existe, o 'loading' por defecto
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'notExists'>(
    imageStatusCache.get(productId) || 'loading'
  );
  
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  
  // Crear la URL de la imagen con parámetro de versión para evitar cachés obsoletas
  const imageUrl = useBase64 
    ? `https://lyme-back.vercel.app/api/producto/${productId}/imagen-base64`
    : `https://lyme-back.vercel.app/api/producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}&v=${timestamp}`;

  useEffect(() => {
    // Si no hay ID de producto, no hacer nada
    if (!productId) return;

    // Si ya tenemos el estado en caché y no está cargando, simplemente usarlo
    if (imageStatusCache.has(productId) && imageStatusCache.get(productId) !== 'loading') {
      setLoadState(imageStatusCache.get(productId)!);
      return;
    }

    const loadImage = () => {
      // Para imágenes base64, necesitamos hacer un fetch
      if (useBase64) {
        setLoadState('loading');
        fetch(imageUrl)
          .then(response => {
            if (!response.ok) {
              if (response.status === 204) {
                // El producto no tiene imagen
                imageStatusCache.set(productId, 'notExists');
                setLoadState('notExists');
                return;
              }
              throw new Error('Failed to load image');
            }
            return response.json();
          })
          .then(data => {
            if (data && data.image) {
              setImageSrc(data.image);
              imageStatusCache.set(productId, 'loaded');
              setLoadState('loaded');
            } else {
              throw new Error('Invalid image data');
            }
          })
          .catch(err => {
            console.error(`Error loading base64 image for ${productId}:`, err);
            imageStatusCache.set(productId, 'error');
            setLoadState('error');
          });
      } else {
        // Para imágenes directas, establecer la URL
        setImageSrc(imageUrl);
        setLoadState('loading');
      }
    };

    // Si es prioritaria, cargar inmediatamente
    if (priority) {
      loadImage();
      return;
    }

    // Usar IntersectionObserver para carga diferida
    if ('IntersectionObserver' in window && imgRef.current) {
      // Destruir observer anterior si existe
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Crear nuevo observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            // Cargar imagen cuando sea visible
            loadImage();
            // Dejar de observar este elemento
            if (observerRef.current) {
              observerRef.current.disconnect();
              observerRef.current = null;
            }
          }
        },
        {
          rootMargin: '200px', // Precargar cuando esté a 200px de ser visible
          threshold: 0.01 // Cargar cuando apenas sea visible
        }
      );

      // Empezar a observar
      observerRef.current.observe(imgRef.current);
    } else {
      // Fallback para navegadores sin IntersectionObserver
      loadImage();
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [productId, imageUrl, priority, useBase64]);

  // Manejar carga correcta de la imagen
  const handleImageLoad = () => {
    imageStatusCache.set(productId, 'loaded');
    setLoadState('loaded');
    setRetryCount(0); // Resetear contador de reintentos
  };

  // Manejar error de carga con reintento
  const handleImageError = () => {
    if (retryCount < 1) {
      // Reintentar una vez con un nuevo timestamp para evitar caché
      setRetryCount(prev => prev + 1);
      setTimestamp(Date.now());
    } else {
      imageStatusCache.set(productId, 'error');
      setLoadState('error');
    }
  };

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error' || loadState === 'notExists';

  return (
    <div 
      className={`relative ${containerClassName}`} 
      style={{ width: width, height: height }}
      ref={imgRef}
    >
      {/* Placeholder/Fallback mientras carga o si hay error */}
      {(isLoading || hasError) && (
        <div className={`flex items-center justify-center ${fallbackClassName || 'bg-gray-100 rounded-md'}`} 
          style={{ width: width, height: height }}>
          <div className="flex flex-col items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
            {placeholderText && <span className="text-xs text-gray-400 mt-1">{placeholderText}</span>}
          </div>
        </div>
      )}
      
      {/* Imagen real - para base64 */}
      {useBase64 && imageSrc && loadState === 'loaded' && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${className} absolute top-0 left-0 transition-opacity duration-300 opacity-100`}
        />
      )}
      
      {/* Imagen real - para imagen directa */}
      {!useBase64 && (
        <img
          src={loadState === 'loading' ? undefined : imageUrl}
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

// Usar memo para evitar re-renders innecesarios
export default memo(OptimizedProductImage);