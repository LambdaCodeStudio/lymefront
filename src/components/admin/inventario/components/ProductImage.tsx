// components/ProductImage.tsx
import React, { memo, useState, useEffect } from 'react';
import { getProductImageUrl, hasProductImage, handleImageError } from '../utils/product-image.utils';
import { ProductImageProps } from '../types/inventory.types';
import { DEFAULT_IMAGE_URL } from '../utils/constants';

/**
 * Componente optimizado para mostrar imágenes de productos con manejo adecuado de errores
 * VERSIÓN MEJORADA para prevenir solicitudes 404
 * 
 * @param product - Producto o ID de producto
 * @param size - Tamaño de la imagen (small, medium, large)
 * @param className - Clases CSS adicionales
 * @param addTimestamp - Si se debe agregar un timestamp para evitar caché
 * @param alt - Texto alternativo
 * @param onError - Manejador personalizado para errores de carga
 */
const ProductImage: React.FC<ProductImageProps> = ({
  product,
  size = 'small',
  className = '',
  addTimestamp = true,
  alt,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Determinar si el producto tiene imagen y establecer la fuente
  useEffect(() => {
    // Si el producto tiene imagen, obtener su URL
    if (product && hasProductImage(typeof product === 'string' ? { _id: product, hasImage: true } as any : product)) {
      setImageSrc(getProductImageUrl(product, addTimestamp));
    } else {
      // Si no tiene imagen, usar la imagen por defecto inmediatamente
      setImageSrc(DEFAULT_IMAGE_URL);
      setIsLoading(false);
    }
  }, [product, addTimestamp]);
  
  // Determinar las clases según el tamaño
  let sizeClasses = '';
  
  switch (size) {
    case 'small':
      sizeClasses = 'h-8 w-8';
      break;
    case 'medium':
      sizeClasses = 'h-16 w-16';
      break;
    case 'large':
      sizeClasses = 'h-32 w-32';
      break;
    default:
      sizeClasses = 'h-8 w-8';
  }
  
  // Determinar el texto alternativo adecuado
  const productName = typeof product === 'object' ? product.nombre : '';
  const altText = alt || `Imagen de ${productName || 'producto'}`;
  
  /**
   * Manejador de error personalizado
   */
  const handleImageLoadError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    
    // Si se proporcionó un manejador de error personalizado, usarlo
    if (onError) {
      onError(e);
    } else {
      // Usar el manejador predeterminado
      const target = e.target as HTMLImageElement;
      target.src = DEFAULT_IMAGE_URL;
      target.alt = "Imagen no disponible";
    }
  };
  
  /**
   * Manejador para cuando la imagen termina de cargar
   */
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative flex-shrink-0 overflow-hidden ${sizeClasses} rounded-md bg-slate-100 ${className}`}>
      {/* Estado de carga */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}
      
      {/* Solo renderizar la imagen si tenemos una fuente */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={altText}
          onError={handleImageLoadError}
          onLoad={handleImageLoad}
          className={`h-full w-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
          aria-hidden={hasError}
        />
      )}
    </div>
  );
};

export default memo(ProductImage);