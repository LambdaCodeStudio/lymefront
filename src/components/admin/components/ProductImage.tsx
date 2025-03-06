// src/components/ProductImage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { imageService } from '@/services/imageService';
import { PackageOpen, Loader2, RefreshCw } from 'lucide-react';

interface ProductImageProps {
  productId: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  containerClassName?: string;
  fallbackClassName?: string;
  checkExistence?: boolean;
  placeholderText?: string;
  retryOnError?: boolean;
}

/**
 * Componente para mostrar imágenes de productos con estados de carga y error
 */
const ProductImage: React.FC<ProductImageProps> = ({
  productId,
  alt,
  width = 200,
  height = 200,
  quality = 80,
  className = "",
  containerClassName = "",
  fallbackClassName = "",
  checkExistence = true,
  placeholderText = "Sin imagen",
  retryOnError = true
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageExists, setImageExists] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | null>(null); // Estado para almacenar la imagen en base64
  
  // Función para cargar la imagen
  const loadImage = useCallback(async () => {
    if (!productId) {
      setError(true);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(false);
    
    try {
      // Verificar existencia si es necesario
      if (checkExistence) {
        const exists = await imageService.checkImageExists(productId);
        setImageExists(exists);
        
        if (!exists) {
          setError(true);
          setLoading(false);
          return;
        }
      }
      
      // Intentar cargar la imagen en base64
      try {
        const base64Data = await imageService.getImageBase64(productId);
        if (base64Data) {
          setImageBase64(base64Data);
          setLoading(false);
          return;
        } else {
          // Si no se pudo obtener la imagen en base64, intentar con URL normal
          console.log(`No se pudo obtener imagen base64 para ${productId}, usando URL normal`);
        }
      } catch (error) {
        console.error('Error al cargar imagen base64:', error);
        // Fallback a URL normal
      }
      
      // Si hubo un error al cargarla, usar URL normal
      const url = imageService.getImageUrl(productId, { 
        width, 
        height, 
        quality,
        timestamp: true
      });
      
      setImageUrl(url);
      
      // El estado de loading cambiará cuando la imagen se cargue o falle
    } catch (err) {
      console.error('Error al cargar imagen:', err);
      setError(true);
      setLoading(false);
    }
  }, [productId, checkExistence, width, height, quality]);
  
  // Iniciar carga de imagen
  useEffect(() => {
    loadImage();
  }, [loadImage, productId, retryCount]);

  // Manejadores de eventos
  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    console.log(`Error cargando imagen para producto ${productId}`);
    setLoading(false);
    setError(true);
    
    // Auto-retry una vez en caso de error (puede ser timeout o problema de red)
    if (retryOnError && retryCount === 0) {
      setTimeout(() => {
        // Invalidar caché y reintentar
        imageService.invalidateCache(productId);
        setRetryCount(prev => prev + 1);
      }, 2000);
    }
  };
  
  // Reintentar cargar la imagen manualmente
  const handleRetry = () => {
    imageService.invalidateCache(productId);
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      className={`relative overflow-hidden ${containerClassName}`} 
      style={{ minHeight: '40px', minWidth: '40px' }}
    >
      {/* Estado de carga */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#DFEFE6]/20">
          <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
        </div>
      )}
      
      {/* Imagen en formato base64 */}
      {!error && imageBase64 && (
        <img 
          src={`data:image/jpeg;base64,${imageBase64}`}
          alt={alt}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          style={{ 
            width: width ? `${width}px` : 'auto', 
            height: height ? `${height}px` : 'auto',
            objectFit: 'cover' 
          }}
        />
      )}
      
      {/* Imagen URL normal */}
      {!error && !imageBase64 && imageUrl && (
        <img 
          src={imageUrl}
          alt={alt}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          style={{ 
            width: width ? `${width}px` : 'auto', 
            height: height ? `${height}px` : 'auto',
            objectFit: 'cover' 
          }}
        />
      )}
      
      {/* Estado de error o sin imagen */}
      {error && (
        <div 
          className={`flex flex-col items-center justify-center ${fallbackClassName}`}
          style={{ 
            width: width ? `${width}px` : '100%', 
            height: height ? `${height}px` : '100%',
            minHeight: '40px'
          }}
        >
          <PackageOpen className="w-8 h-8 text-[#91BEAD] mb-1" />
          <span className="text-xs text-[#7AA79C]">{placeholderText}</span>
          
          {/* Botón de reintentar solo visible cuando hay error pero se espera que haya imagen */}
          {imageExists !== false && retryOnError && (
            <button 
              onClick={handleRetry} 
              className="mt-2 text-xs text-[#29696B] hover:underline focus:outline-none flex items-center"
              type="button"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductImage;