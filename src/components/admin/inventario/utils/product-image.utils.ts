// utils/product-image.utils.ts
import { Product } from "../types/inventory.types";

/**
 * Comprueba si un producto tiene imagen disponible
 * VERSION CORREGIDA para evitar solicitudes 404
 * 
 * @param product - Producto o ID de producto a comprobar
 * @returns boolean que indica si el producto tiene imagen
 */
export const hasProductImage = (product: Product | string | null): boolean => {
  if (!product) return false;
  
  // Si product es un string (ID), no podemos determinar si tiene imagen sin consultar la API
  if (typeof product === 'string') return false;
  
  // VERIFICACIÓN MEJORADA:
  // Un producto tiene imagen si:
  // 1. Tiene hasImage explícitamente marcado como true, O
  // 2. Tiene un imageUrl válido (no nulo, no vacío), O
  // 3. Tiene información de imagen (imagenInfo no nulo)
  
  // Verificar explícitamente la propiedad hasImage
  if (product.hasImage === true) return true;
  
  // Verificar si tiene una URL de imagen válida
  if (product.imageUrl && product.imageUrl.trim() !== '') return true;
  
  // Verificar información de imagen
  if (product.imagenInfo && Object.keys(product.imagenInfo).length > 0) return true;
  
  // Si no cumple ninguna condición, no tiene imagen
  return false;
};

/**
 * Obtiene la URL de la imagen para un producto
 * VERSION CORREGIDA para evitar solicitudes 404
 * 
 * @param product - Producto o ID de producto
 * @param addTimestamp - Si se debe agregar timestamp para evitar caché (default: true)
 * @returns URL de la imagen o imagen por defecto si no existe
 */
export const getProductImageUrl = (
  product: Product | string | null, 
  addTimestamp = true
): string => {
  // Imagen por defecto
  const DEFAULT_IMAGE = '/lyme.png';
  
  // Caso 1: Si es null, undefined o vacío, devolver logo
  if (!product) return DEFAULT_IMAGE;
  
  // Caso 2: Si es un string (ID) Y asumimos que tiene imagen (verificación externa)
  if (typeof product === 'string') {
    if (!product.trim()) return DEFAULT_IMAGE;
    const url = `/images/products/${product}.webp`;
    return addTimestamp ? `${url}?t=${Date.now()}` : url;
  }
  
  // Caso 3: Si product es un objeto Product
  
  // VERIFICACIÓN CRÍTICA: Si no tiene imagen según nuestros criterios, devolver imagen por defecto
  if (!hasProductImage(product)) {
    return DEFAULT_IMAGE;
  }
  
  // Si tiene imageUrl explícita, usarla
  if (product.imageUrl) {
    return addTimestamp ? `${product.imageUrl}?t=${Date.now()}` : product.imageUrl;
  }
  
  // Si llegamos aquí, construir URL basada en ID (caso poco probable tras las verificaciones)
  const url = `/images/products/${product._id}.webp`;
  return addTimestamp ? `${url}?t=${Date.now()}` : url;
};

/**
 * Manejador de errores de carga de imágenes unificado
 * 
 * @param event - Evento de error de imagen
 * @param productName - Nombre del producto (opcional para mensajes de error)
 * @param isThumbnail - Si la imagen es una miniatura (para estilos)
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  productName?: string,
  isThumbnail = true
): void => {
  console.warn(`Error al cargar imagen${productName ? ` para ${productName}` : ''}`);
  const target = event.target as HTMLImageElement;
  target.src = "/lyme.png";
  target.className = isThumbnail 
    ? "h-8 w-8 object-contain" 
    : "w-full h-full object-contain p-4";
  target.alt = "Imagen no disponible";
};

/**
 * Valida un archivo de imagen antes de subirlo
 * 
 * @param file - Archivo a validar
 * @returns Objeto con resultado de validación
 */
export const validateImageFile = (file: File | null): {
  isValid: boolean;
  error?: string;
} => {
  if (!file) {
    return { isValid: false, error: 'No se ha seleccionado ningún archivo' };
  }
  
  // Validar tamaño (5MB máximo)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return { isValid: false, error: 'La imagen no debe superar los 5MB' };
  }
  
  // Validar tipo
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'El archivo debe ser una imagen' };
  }
  
  return { isValid: true };
};

/**
 * Lee un archivo como base64 para mostrar vista previa
 * 
 * @param file - Archivo a leer
 * @returns Promesa que resuelve a la cadena base64
 */
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};