import React, { useState, useEffect, useRef, memo } from 'react';
import { ImageIcon } from 'lucide-react';
import { getAuthToken } from '@/utils/inventoryUtils';

interface ProductImageProps {
  productId: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
  containerClassName?: string;
  priority?: boolean;
  placeholderText?: string;
}

// Caché de memoria global para optimizar el rendimiento
const imageStatusCache = new Map<string, 'loading' | 'loaded' | 'error' | 'notExists'>();

// Rutas de imágenes
const IMAGES_URL_PREFIX = '/images/products';
const API_URL = "/api/";

/**
 * Componente optimizado para mostrar imágenes de productos con soporte para
 * las imágenes servidas desde el sistema de archivos mediante enlace simbólico
 */
const OptimizedProductImage: React.FC<ProductImageProps> = ({
  productId,
  alt = 'Product image',
  width = 80,
  height = 80,
  className = '',
  fallbackClassName = '',
  containerClassName = '',
  priority = false,
  placeholderText,
}) => {
  // Usar el estado de la caché global si existe, o 'loading' por defecto
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'notExists'>(
    imageStatusCache.get(productId) || 'loading'
  );
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  
  // URL para imágenes servidas desde el sistema de archivos (ruta simbólica)
  const staticImageUrl = `${IMAGES_URL_PREFIX}/${productId}.webp?v=${timestamp}`;
  
  // URL de fallback a través de la API (ya no debería ser necesaria pero la mantenemos como backup)
  const fallbackApiUrl = `${API_URL}producto/${productId}/imagen?v=${timestamp}`;

  useEffect(() => {
    // Si no hay ID de producto, no hacer nada
    if (!productId) return;

    // Si ya tenemos el estado en caché y no está cargando, simplemente usarlo
    if (imageStatusCache.has(productId) && imageStatusCache.get(productId) !== 'loading') {
      setLoadState(imageStatusCache.get(productId)!);
      return;
    }

    const loadImage = () => {
      // Intentar cargar desde la URL estática (enlace simbólico)
      setLoadState('loading');
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
  }, [productId, staticImageUrl, priority]);

  // Manejar carga correcta de la imagen
  const handleImageLoad = () => {
    imageStatusCache.set(productId, 'loaded');
    setLoadState('loaded');
  };

  // Manejar error de carga con reintento usando la API
  const handleImageError = () => {
    // En caso de error con la imagen estática, intentamos obtenerla a través de la API
    fetch(`${API_URL}producto/${productId}/imagen`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken() || ''}`,
        'Cache-Control': 'no-cache'
      }
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 204) {
          imageStatusCache.set(productId, 'notExists');
          setLoadState('notExists');
          return;
        }
        throw new Error('Failed to load image');
      }
      
      // Si la API responde correctamente, volver a intentar con la URL estática
      // (posiblemente la imagen acaba de ser creada/actualizada)
      setTimestamp(Date.now()); // Forzar recarga rompiendo la caché
      
      // La API redirecciona a la imagen estática, así que eventualmente debería cargar
      imageStatusCache.set(productId, 'loaded');
      setLoadState('loaded');
    })
    .catch(error => {
      console.error(`Error loading image for ${productId}:`, error);
      imageStatusCache.set(productId, 'error');
      setLoadState('error');
    });
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
      
      {/* Imagen real - siempre usar la URL estática */}
      <img
        src={isLoading ? undefined : staticImageUrl}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`${className} ${loadState === 'loaded' ? 'opacity-100' : 'opacity-0'} absolute top-0 left-0 transition-opacity duration-300`}
        loading="lazy"
      />
    </div>
  );
};

// Usar memo para evitar re-renders innecesarios
export default memo(OptimizedProductImage);