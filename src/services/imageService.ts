// src/services/imageService.ts
import { getAuthToken } from '@/utils/inventoryUtils';

interface ImageOptions {
  quality?: number;
  width?: number;
  height?: number;
}

const BASE_URL = 'http://localhost:4000/api';

/**
 * Verifica si un producto tiene imagen basado en sus datos
 * @param product - Objeto producto o su ID y propiedad de imagen
 * @returns boolean indicando si el producto tiene imagen
 */
export const hasProductImage = (product: any): boolean => {
  // Si es null o undefined, no tiene imagen
  if (!product) return false;
  
  // Comprobación explícita para ver si el producto tiene una imagen
  if (typeof product === 'object') {
    // Verificamos si tiene una propiedad imagen que sea un Buffer o un string no vacío
    return !!(
      product.imagen && 
      (
        (Buffer.isBuffer(product.imagen) && product.imagen.length > 0) ||
        (typeof product.imagen === 'string' && product.imagen.length > 0)
      )
    );
  }
  
  return false;
};

/**
 * Servicio para gestionar las imágenes de productos
 */
export const imageService = {
  /**
   * Sube una imagen para un producto específico
   * @param {string} productId - ID del producto
   * @param {File} file - Archivo de imagen a subir
   * @returns {Promise<boolean>} - true si la operación fue exitosa
   */
  async uploadImage(productId: string, file: File): Promise<boolean> {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const formData = new FormData();
      formData.append('imagen', file);

      const response = await fetch(`${BASE_URL}/producto/${productId}/imagen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // No incluir Content-Type aquí, fetch lo configurará automáticamente con el boundary correcto
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir la imagen');
      }

      return true;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw error;
    }
  },

  /**
   * Obtiene la URL de la imagen de un producto con opciones de calidad y tamaño
   * @param {string} productId - ID del producto
   * @param {ImageOptions} options - Opciones de la imagen (calidad, ancho, alto)
   * @returns {string} - URL de la imagen
   */
  getImageUrl(productId: string, options: ImageOptions = {}): string {
    const { quality = 80, width, height } = options;
    
    let url = `${BASE_URL}/producto/${productId}/imagen?quality=${quality}`;
    
    if (width) url += `&width=${width}`;
    if (height) url += `&height=${height}`;
    
    return url;
  },

  /**
   * Elimina la imagen de un producto
   * @param {string} productId - ID del producto
   * @returns {Promise<boolean>} - true si la operación fue exitosa
   */
  async deleteImage(productId: string): Promise<boolean> {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${BASE_URL}/producto/${productId}/imagen`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la imagen');
      }

      return true;
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      throw error;
    }
  }
};