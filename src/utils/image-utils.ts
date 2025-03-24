/**
 * Utilidades para el manejo de imágenes de productos
 */

import { Product } from '@/types/inventory';

/**
 * Obtiene la URL de la imagen para un producto
 * @param productId - ID del producto
 * @param addTimestamp - Si se debe agregar timestamp para evitar caché (default: true)
 * @returns URL de la imagen o imagen por defecto si no existe
 */
export const getProductImageUrl = (product: string | Product, addTimestamp = true): string => {
    // Caso 1: Si es null, undefined o vacío, devolver logo
    if (!product) return '/lyme.png';
    
    // Caso 2: Si product es un string (ID)
    if (typeof product === 'string') {
      if (!product.trim()) return '/lyme.png';
      const url = `/images/products/${product}.webp`;
      return addTimestamp ? `${url}?t=${Date.now()}` : url;
    }
    
    // Caso 3: Si product es un objeto Product
    
    // Si no tiene ID o hasImage es explícitamente false, devolver logo
    if (!product._id || product.hasImage === false) return '/lyme.png';
    
    // Prioridad 1: Si tiene imageUrl explícita, usarla
    if (product.imageUrl) {
      return addTimestamp ? `${product.imageUrl}?t=${Date.now()}` : product.imageUrl;
    }
    
    // Prioridad 2: Construir URL basada en ID
    const url = `/images/products/${product._id}.webp`;
    return addTimestamp ? `${url}?t=${Date.now()}` : url;
  };


/**
 * Verifica si un producto tiene imagen asociada
 * @param product - Objeto producto
 * @returns true si el producto tiene imagen, false en caso contrario
 */
  // Mejora de la función hasProductImage para ser más explícita
  export const hasProductImage = (product: Product): boolean => {
    if (!product) return false;
    if (product.hasImage === false) return false; // Si explícitamente es false
    
    // Verificar todos los posibles indicadores de imagen
    return (
      product.hasImage === true || 
      !!product.imageUrl || 
      (product.imagenInfo && !!product.imagenInfo.rutaArchivo)
    );
  };


/**
 * Manejador de errores de carga de imágenes
 * @param event - Evento de error
 * @param productName - Nombre del producto (para logging)
 * @param isThumbnail - Si es una imagen pequeña (ajusta el tamaño)
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  productName?: string,
  isThumbnail = true
): void => {
  console.warn(`Error al cargar imagen${productName ? ` para ${productName}` : ''}`);
  const target = event.target as HTMLImageElement;
  target.src = "/lyme.png";
  target.className = isThumbnail ? "h-8 w-8 object-contain" : "w-full h-full object-contain p-4";
  target.alt = "Imagen no disponible";
};