// Caché en memoria para imágenes
class ImageCache {
  private imageStatus: Map<string, boolean>;
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.imageStatus = new Map();
    this.maxEntries = maxEntries;
  }

  // Añadir información sobre si un producto tiene imagen
  set(productId: string, hasImage: boolean): void {
    // Si alcanzamos el límite, eliminar la entrada más antigua
    if (this.imageStatus.size >= this.maxEntries) {
      const oldestKey = this.imageStatus.keys().next().value;
      this.imageStatus.delete(oldestKey);
    }
    this.imageStatus.set(productId, hasImage);
  }

  // Obtener información sobre si un producto tiene imagen
  get(productId: string): boolean | undefined {
    return this.imageStatus.get(productId);
  }

  // Eliminar una entrada de la caché
  delete(productId: string): boolean {
    return this.imageStatus.delete(productId);
  }

  // Limpiar toda la caché
  clear(): void {
    this.imageStatus.clear();
  }
}

// Crear instancia de caché
const cache = new ImageCache();

// Función para convertir un archivo a Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Función para verificar si un producto tiene imagen
const hasImage = async (product: any): Promise<boolean> => {
  // Si el producto tiene la propiedad hasImage, usarla
  if (product.hasImage !== undefined) {
    return product.hasImage;
  }

  // Si tenemos la información en caché, usarla
  const cachedStatus = cache.get(product._id);
  if (cachedStatus !== undefined) {
    return cachedStatus;
  }

  // De lo contrario, verificar con el servidor
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`http://localhost:3000/api/producto/${product._id}/imagen`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const hasImage = response.status === 200;
    
    // Guardar en caché
    cache.set(product._id, hasImage);
    
    return hasImage;
  } catch (error) {
    console.error('Error checking image status:', error);
    return false;
  }
};

// Función para verificar múltiples imágenes en paralelo
const batchCheckImages = async (productIds: string[]): Promise<{id: string, hasImage: boolean}[]> => {
  if (!productIds || productIds.length === 0) return [];

  // Filtrar IDs que ya están en caché
  const uncachedIds = productIds.filter(id => cache.get(id) === undefined);
  
  if (uncachedIds.length === 0) {
    // Todos están en caché, devolver datos de caché
    return productIds.map(id => ({
      id,
      hasImage: cache.get(id) || false
    }));
  }

  // Verificar estado de imágenes para IDs no cacheados
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');

    // Hacer la verificación en lotes de 10 para no sobrecargar el servidor
    const batchSize = 10;
    const results: {id: string, hasImage: boolean}[] = [];

    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      
      // Ejecutar peticiones en paralelo
      const checks = await Promise.all(batch.map(async id => {
        try {
          const response = await fetch(`http://localhost:3000/api/producto/${id}/imagen`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            method: 'HEAD' // Solo verificar si existe, no descargar
          });
          
          const hasImage = response.status === 200;
          
          // Actualizar caché
          cache.set(id, hasImage);
          
          return { id, hasImage };
        } catch (error) {
          console.error(`Error checking image for product ${id}:`, error);
          return { id, hasImage: false };
        }
      }));
      
      results.push(...checks);
    }
    
    // Combinar resultados de caché y nuevas verificaciones
    return productIds.map(id => {
      const uncachedResult = results.find(r => r.id === id);
      if (uncachedResult) return uncachedResult;
      
      return {
        id,
        hasImage: cache.get(id) || false
      };
    });
  } catch (error) {
    console.error('Error in batch image check:', error);
    return productIds.map(id => ({
      id,
      hasImage: cache.get(id) || false
    }));
  }
};

// Función para subir una imagen en formato base64
const uploadImageBase64 = async (productId: string, base64Data: string): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`http://localhost:3000/api/producto/${productId}/imagen-base64`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ base64Image: base64Data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error uploading image');
  }

  // Actualizar caché
  cache.set(productId, true);

  return await response.json();
};

// Función para eliminar una imagen
const deleteImage = async (productId: string): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`http://localhost:3000/api/producto/${productId}/imagen`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error deleting image');
  }

  // Actualizar caché
  cache.set(productId, false);

  return await response.json();
};

// Función para obtener la URL de una imagen
const getImageUrl = (productId: string, width = 80, height = 80, quality = 80): string => {
  return `http://localhost:3000/api/producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}&_=${new Date().getTime()}`;
};

// Función para invalidar la caché de una imagen
const invalidateCache = (productId: string): void => {
  cache.delete(productId);
};

// Exponer funciones
export const imageService = {
  hasImage,
  batchCheckImages,
  fileToBase64,
  uploadImageBase64,
  deleteImage,
  getImageUrl,
  invalidateCache
};