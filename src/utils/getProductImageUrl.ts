// src/utils/getProductImageUrl.ts

import { imageService } from '@/services/imageService';

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Función auxiliar para obtener la URL de la imagen de un producto
 * (versión simplificada que utiliza imageService)
 */
export const getProductImageUrl = (
  productId: string, 
  options: ImageOptions = {}
): string => {
  return imageService.getImageUrl(productId, {
    ...options,
    timestamp: true // Siempre añadir timestamp para evitar caché
  });
};

export default getProductImageUrl;