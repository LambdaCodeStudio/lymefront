import React, { useState } from 'react';
import { Product } from '@/types/inventory';
import { getProductImageUrl, hasProductImage, handleImageError } from '../../../utils/image-utils';

interface ProductImageProps {
  product: Product;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  fallbackClassName?: string;
}

/**
 * Componente para mostrar imágenes de productos con manejo de errores
 * y fallbacks consistentes
 */
const ProductImage: React.FC<ProductImageProps> = ({
  product,
  size = 'small',
  className = '',
  fallbackClassName = ''
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  
  const sizeClasses = {
    small: 'h-10 w-10',
    medium: 'h-16 w-16',
    large: 'h-32 w-32'
  };

  const containerClass = `${sizeClasses[size]} ${className} rounded-md flex items-center justify-center overflow-hidden`;
  const fallbackClass = `${sizeClasses[size]} ${fallbackClassName || 'bg-[#DFEFE6]/50'} flex items-center justify-center`;

  // Verificación más estricta para hasImage
  const hasImage = () => {
    if (!product || product.hasImage === false) return false;
    return (
      product.hasImage === true || 
      !!product.imageUrl || 
      !!product._id
    );
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageError(true);
    console.error(`Error cargando imagen: ${product.nombre || 'Producto sin nombre'} (${product._id || 'sin ID'})`);
    
    const target = e.target as HTMLImageElement;
    if (target) {
      target.src = "/lyme.png"; // SIEMPRE usar el logo como fallback
      target.className = size === 'small' ? 'h-8 w-8 object-contain' : 'w-full h-full object-contain p-4';
      target.alt = "Logo Lyme";
    }
  };

  return (
    <div className={containerClass}>
      {hasImage() && !imageError ? (
        <img
          src={getProductImageUrl(product)}
          alt={product.nombre || 'Producto'}
          className={`${sizeClasses[size]} object-cover`}
          loading="lazy"
          onError={handleImageError}
        />
      ) : (
        <div className={fallbackClass}>
          <img
            src="/lyme.png"
            alt="Logo Lyme"
            className={size === 'small' ? 'h-8 w-8' : 'h-12 w-12'}
            style={{ objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
};

export default ProductImage;