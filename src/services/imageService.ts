// src/services/imageService.ts

import { getAuthToken } from '@/utils/inventoryUtils';

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  timestamp?: boolean;
  useBase64?: boolean; // Nueva opción para usar base64
}

interface Product {
  _id: string;
  hasImage?: boolean;
  imagen?: any;
}

// Cache para resultados de verificación de existencia de imágenes
const imageExistenceCache: Record<string, { exists: boolean; timestamp: number }> = {};
// Tiempo de expiración del caché (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

class ImageService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4000/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Verifica si un producto tiene imagen basado en propiedades del producto
   * o resultados cacheados de verificaciones previas
   */
  hasImage(product: Product | null | undefined): boolean {
    if (!product || !product._id) return false;
    
    // Verificar el caché primero
    const cachedResult = imageExistenceCache[product._id];
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRATION) {
      return cachedResult.exists;
    }
    
    // Si hay una propiedad hasImage explícita, usarla
    if (product.hasImage !== undefined) {
      // Actualizar el caché
      imageExistenceCache[product._id] = { 
        exists: product.hasImage, 
        timestamp: Date.now() 
      };
      return product.hasImage;
    }
    
    // Si hay un campo imagen, verificar si existe
    if (product.imagen) {
      // Actualizar el caché
      imageExistenceCache[product._id] = { 
        exists: true, 
        timestamp: Date.now() 
      };
      return true;
    }
    
    // Si no hay información disponible, asumir que no hay imagen
    return false;
  }

  /**
   * Genera una URL para obtener la imagen de un producto
   */
  getImageUrl(productId: string, options: ImageOptions = {}): string {
    if (!productId) return '';
    
    // Determinar si usar el endpoint base64 o el binario
    const endpoint = options.useBase64 ? 'imagen-base64' : 'imagen';
    
    // Construir la URL base
    let url = `${this.baseUrl}/producto/${productId}/${endpoint}`;
    
    // Para el endpoint binario, añadir parámetros de consulta para redimensión y calidad
    if (!options.useBase64) {
      const params = new URLSearchParams();
      
      if (options.width) params.append('width', options.width.toString());
      if (options.height) params.append('height', options.height.toString());
      if (options.quality !== undefined) params.append('quality', options.quality.toString());
      
      // Añadir timestamp para evitar caché si se solicita o por defecto
      if (options.timestamp !== false) {
        params.append('timestamp', new Date().getTime().toString());
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }

  /**
   * Invalida el caché para un producto específico
   */
  invalidateCache(productId: string): void {
    if (productId && imageExistenceCache[productId]) {
      delete imageExistenceCache[productId];
    }
  }

  /**
   * Sube una imagen para un producto
   */
  async uploadImage(productId: string, imageFile: File): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const formData = new FormData();
    formData.append('imagen', imageFile);

    try {
      const response = await fetch(`${this.baseUrl}/producto/${productId}/imagen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir la imagen');
      }

      // Invalidar el caché después de subir una nueva imagen
      this.invalidateCache(productId);
      
      return await response.json();
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      throw error;
    }
  }

  /**
   * Sube una imagen en formato base64 para un producto
   */
  async uploadImageBase64(productId: string, base64Image: string): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await fetch(`${this.baseUrl}/producto/${productId}/imagen-base64`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base64Image })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir la imagen base64');
      }

      // Invalidar el caché después de subir una nueva imagen
      this.invalidateCache(productId);
      
      return await response.json();
    } catch (error: any) {
      console.error('Error al subir imagen base64:', error);
      throw error;
    }
  }

  /**
   * Obtiene una imagen en formato base64
   */
  async getImageBase64(productId: string): Promise<string> {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/producto/${productId}/imagen-base64`, {
        method: 'GET',
        headers
      });

      if (response.status === 204) {
        throw new Error('El producto no tiene una imagen');
      }

      if (!response.ok) {
        throw new Error('Error al obtener la imagen');
      }

      const data = await response.json();
      return data.image;
    } catch (error: any) {
      console.error('Error al obtener imagen base64:', error);
      throw error;
    }
  }

  /**
   * Elimina la imagen de un producto
   */
  async deleteImage(productId: string): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await fetch(`${this.baseUrl}/producto/${productId}/imagen`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la imagen');
      }

      // Actualizar el caché después de eliminar la imagen
      imageExistenceCache[productId] = { exists: false, timestamp: Date.now() };
      
      return await response.json();
    } catch (error: any) {
      console.error('Error al eliminar imagen:', error);
      throw error;
    }
  }

  /**
   * Convierte un archivo de imagen a Base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Comprueba si una imagen existe para un producto
   * mediante una solicitud HEAD (más eficiente que GET)
   * y almacena el resultado en caché
   */
  async checkImageExists(productId: string): Promise<boolean> {
    if (!productId) return false;
    
    // Verificar el caché primero
    const cachedResult = imageExistenceCache[productId];
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRATION) {
      return cachedResult.exists;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/producto/${productId}/imagen`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${getAuthToken() || ''}`
        }
      });
      
      const exists = response.status === 200;
      
      // Actualizar el caché
      imageExistenceCache[productId] = { exists, timestamp: Date.now() };
      
      return exists;
    } catch (error) {
      console.error(`Error verificando imagen para producto ${productId}:`, error);
      
      // En caso de error, asumir que no existe y cachear resultado negativo
      imageExistenceCache[productId] = { exists: false, timestamp: Date.now() };
      
      return false;
    }
  }
  
  /**
   * Verifica proactivamente la existencia de imágenes para una lista de productos
   * y actualiza el caché. Útil para prefetch.
   */
  async batchCheckImages(productIds: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Agrupar en lotes de 10 para no sobrecargar el servidor
    const batchSize = 10;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      // Ejecutar en paralelo para el lote actual
      const promises = batch.map(async (id) => {
        const exists = await this.checkImageExists(id);
        results[id] = exists;
      });
      
      await Promise.all(promises);
    }
    
    return results;
  }
}

// Exportar una instancia única del servicio
export const imageService = new ImageService();

export default imageService;