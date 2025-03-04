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
  useBase64?: boolean; // Nueva propiedad para elegir el formato
}

/**
 * Componente para mostrar imágenes de productos con estados de carga y error
 * Añadido soporte para cargar imágenes en formato base64
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
  retryOnError = true,
  useBase64 = false // Por defecto usamos el método binario
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageExists, setImageExists] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [imageData, setImageData] = useState<string>(''); // Para base64 o URL
  
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
      if (useBase64) {
        // Método Base64
        try {
          const base64Data = await imageService.getImageBase64(productId);
          setImageData(base64Data);
          setImageExists(true);
          // El estado de loading cambiará cuando la imagen se procese
        } catch (error) {
          console.error('Error obteniendo imagen base64:', error);
          setError(true);
          setImageExists(false);
          setLoading(false);
        }
      } else {
        // Método URL (original)
        if (checkExistence) {
          const exists = await imageService.checkImageExists(productId);
          setImageExists(exists);
          
          if (!exists) {
            setError(true);
            setLoading(false);
            return;
          }
        }
        
        // Generar URL con timestamp único para evitar problemas de caché
        const url = imageService.getImageUrl(productId, { 
          width, 
          height, 
          quality,
          timestamp: true
        });
        
        setImageData(url);
        // El estado de loading cambiará cuando la imagen se cargue o falle
      }
    } catch (err) {
      console.error('Error al cargar imagen:', err);
      setError(true);
      setLoading(false);
    }
  }, [productId, checkExistence, width, height, quality, useBase64]);
  
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
      
      {/* Imagen */}
      {!error && imageData && (
        <img 
          src={imageData}
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