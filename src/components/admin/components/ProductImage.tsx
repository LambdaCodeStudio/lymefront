import React, { useState, useEffect, useRef, memo } from 'react';
import { ImageIcon } from 'lucide-react';
import { getAuthToken } from '@/utils/inventoryUtils';

interface ProductImageProps {
  productId: string;
  alt?: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  fallbackClassName?: string;
  containerClassName?: string;
  priority?: boolean;
  placeholderText?: string;
  forceBase64?: boolean;
}

// Caché de memoria global para optimizar el rendimiento entre componentes
// Evita volver a verificar imágenes que ya sabemos que existen o no
const imageStatusCache = new Map<string, 'loading' | 'loaded' | 'error' | 'notExists'>();
const imageBase64Cache = new Map<string, string>();

// URL de la API
const API_URL = "http://localhost:3000/api/";

/**
 * Componente optimizado para mostrar imágenes de productos con carga diferida,
 * soporte para imágenes base64 y manejo eficiente de errores y caché.
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
  priority = false,
  placeholderText,
  forceBase64 = false, // Fuerza el uso de base64 incluso si la API directa está disponible
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
  const [useBase64, setUseBase64] = useState<boolean>(forceBase64);
  
  // Crear la URL de la imagen con parámetro de versión para evitar cachés obsoletas
  const directImageUrl = `${API_URL}producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}&v=${timestamp}`;
  const base64ImageUrl = `${API_URL}producto/${productId}/imagen-base64?v=${timestamp}`;

  useEffect(() => {
    // Si no hay ID de producto, no hacer nada
    if (!productId) return;

    // Si ya tenemos la imagen en caché base64, usarla directamente
    if (imageBase64Cache.has(productId)) {
      setImageSrc(imageBase64Cache.get(productId)!);
      setLoadState('loaded');
      return;
    }

    // Si ya tenemos el estado en caché y no está cargando, simplemente usarlo
    if (imageStatusCache.has(productId) && imageStatusCache.get(productId) !== 'loading') {
      setLoadState(imageStatusCache.get(productId)!);
      return;
    }

    const loadImage = () => {
      // Primero intentar obtener la imagen en base64 si está forzado o tenemos problemas con la carga directa
      if (useBase64 || forceBase64 || retryCount > 0) {
        fetchBase64Image();
      } else {
        // Intentar con la URL directa primero (más eficiente)
        setImageSrc(directImageUrl);
        setLoadState('loading');
      }
    };

    // Función para cargar imagen en formato base64
    const fetchBase64Image = async () => {
      setLoadState('loading');
      setUseBase64(true);

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const response = await fetch(base64ImageUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 204) {
            // El producto no tiene imagen
            imageStatusCache.set(productId, 'notExists');
            setLoadState('notExists');
            return;
          }
          throw new Error('Failed to load image');
        }

        const data = await response.json();
        if (data && data.image) {
          // Guardar en caché
          imageBase64Cache.set(productId, data.image);
          
          // Establecer la imagen y marcar como cargada
          setImageSrc(data.image);
          imageStatusCache.set(productId, 'loaded');
          setLoadState('loaded');
        } else {
          throw new Error('Invalid image data');
        }
      } catch (err) {
        console.error(`Error loading base64 image for ${productId}:`, err);
        imageStatusCache.set(productId, 'error');
        setLoadState('error');
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
  }, [productId, directImageUrl, base64ImageUrl, priority, forceBase64, retryCount]);

  // Manejar carga correcta de la imagen
  const handleImageLoad = () => {
    imageStatusCache.set(productId, 'loaded');
    setLoadState('loaded');
    setRetryCount(0); // Resetear contador de reintentos
  };

  // Manejar error de carga con reintento usando base64
  const handleImageError = () => {
    if (!useBase64 && retryCount < 1) {
      // Si falla la carga directa, intentar con base64
      setRetryCount(prev => prev + 1);
      setUseBase64(true);
      
      // Cargar en base64
      const token = getAuthToken();
      if (token) {
        fetch(base64ImageUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        })
        .then(response => {
          if (!response.ok) {
            if (response.status === 204) {
              imageStatusCache.set(productId, 'notExists');
              setLoadState('notExists');
              return null;
            }
            throw new Error('Failed to load base64 image');
          }
          return response.json();
        })
        .then(data => {
          if (data && data.image) {
            // Guardar en caché y mostrar
            imageBase64Cache.set(productId, data.image);
            setImageSrc(data.image);
            imageStatusCache.set(productId, 'loaded');
            setLoadState('loaded');
          } else {
            throw new Error('Invalid image data');
          }
        })
        .catch(error => {
          console.error('Error en reintento con base64:', error);
          imageStatusCache.set(productId, 'error');
          setLoadState('error');
        });
      } else {
        imageStatusCache.set(productId, 'error');
        setLoadState('error');
      }
    } else {
      // Si ya intentamos con base64 o excedimos los reintentos, marcar como error
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
          src={loadState === 'loading' ? undefined : directImageUrl}
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