import React, { useState, useEffect, useRef } from 'react';
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
}

const ProductImage: React.FC<ProductImageProps> = ({
  productId,
  alt = 'Product image',
  width = 80,
  height = 80,
  quality = 80,
  className = '',
  fallbackClassName = '',
  containerClassName = '',
  useBase64 = false
}) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Si no hay ID de producto, no hacer nada
    if (!productId) return;

    const loadImage = () => {
      // Construir URL de la imagen
      const imageUrl = useBase64 
        ? `https://lyme-back.vercel.app/api/producto/${productId}/imagen-base64`
        : `https://lyme-back.vercel.app/api/producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}`;
      
      if (useBase64) {
        // Para imágenes base64, necesitamos hacer un fetch
        setLoaded(false);
        fetch(imageUrl)
          .then(response => {
            if (!response.ok) {
              if (response.status === 204) {
                // El producto no tiene imagen
                throw new Error('No image');
              }
              throw new Error('Failed to load image');
            }
            return response.json();
          })
          .then(data => {
            setImageSrc(data.image);
            setLoaded(true);
          })
          .catch(err => {
            console.log(`Error loading image for product ${productId}:`, err.message);
            setError(true);
          });
      } else {
        // Para imágenes directas, establecer la URL
        setImageSrc(imageUrl);
      }
    };

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
          rootMargin: '100px', // Precargar cuando esté a 100px de ser visible
          threshold: 0.1 // Cuando al menos el 10% del elemento sea visible
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
  }, [productId, quality, width, height, useBase64]);

  // Manejar carga correcta de la imagen
  const handleImageLoad = () => {
    setLoaded(true);
    setError(false);
  };

  // Manejar error de carga
  const handleImageError = () => {
    setError(true);
    setLoaded(false);
  };

  // Renderizar componente
  return (
    <div className={`relative ${containerClassName}`}>
      {/* Fallback/Placeholder mientras carga o si hay error */}
      {(!loaded || error) && (
        <div className={`flex items-center justify-center ${fallbackClassName || 'bg-gray-100 rounded-md'}`}>
          <ImageIcon className="w-6 h-6 text-gray-400" />
        </div>
      )}
      
      {/* Imagen real (visible solo cuando está cargada) */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default ProductImage;