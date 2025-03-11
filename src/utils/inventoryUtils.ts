/**
 * Utilidades para gestionar el inventario con optimizaciones de rendimiento
 */

// Clase Cache para implementar caché en memoria 
class ProductCache {
  private cache = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutos
  
  // Establecer valor en caché con tiempo de expiración
  set(key, value) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });
    // Programar limpieza
    setTimeout(() => this.cleanExpired(), this.ttl);
    return value;
  }
  
  // Obtener valor si existe y no ha expirado
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  
  // Invalidar una clave específica
  invalidate(key) {
    this.cache.delete(key);
  }
  
  // Invalidar todo el caché
  invalidateAll() {
    this.cache.clear();
  }
  
  // Limpiar entradas expiradas
  cleanExpired() {
    const now = Date.now();
    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    });
  }
}

// Observable para notificaciones de actualización de inventario
class InventoryObservable {
  private listeners = new Set();
  private lastNotification = 0;
  private pendingNotification = null;
  private THROTTLE_TIME = 2000; // 2 segundos entre notificaciones para evitar sobrecarga
  
  // Suscribir un oyente
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Notificar a todos los oyentes con throttling
  notify() {
    const now = Date.now();
    
    // Si hay una notificación pendiente, cancelarla
    if (this.pendingNotification) {
      clearTimeout(this.pendingNotification);
    }
    
    // Si pasó suficiente tiempo desde la última notificación, enviar inmediatamente
    if (now - this.lastNotification > this.THROTTLE_TIME) {
      this.lastNotification = now;
      this.listeners.forEach(listener => listener());
    } 
    // Si no, programar para más tarde
    else {
      const delay = this.THROTTLE_TIME - (now - this.lastNotification);
      this.pendingNotification = setTimeout(() => {
        this.lastNotification = Date.now();
        this.listeners.forEach(listener => listener());
        this.pendingNotification = null;
      }, delay);
    }
  }
}

// Crear instancias globales
export const productCache = new ProductCache();
export const inventoryObservable = new InventoryObservable();

/**
 * Obtener token de autenticación
 */
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error al obtener token:', error);
    return null;
  }
};

/**
 * Función para obtener productos con caché
 */
export const fetchProducts = async (options = {}) => {
  const { forceRefresh = false, search = '', category = 'all', page = 1, limit = 20 } = options;
  
  // Generar clave de caché
  const cacheKey = `products_${search}_${category}_${page}_${limit}`;
  
  // Verificar caché si no es una carga forzada
  if (!forceRefresh) {
    const cachedData = productCache.get(cacheKey);
    if (cachedData) {
      console.log(`Usando datos en caché para: ${cacheKey}`);
      return cachedData;
    }
  }
  
  console.log(`Cargando productos desde API: ${cacheKey}`);
  
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }
  
  // Construir URL con parámetros de consulta
  let url = 'https://lyme-back.vercel.app/api/producto';
  const params = new URLSearchParams();
  
  if (search) params.append('search', search);
  if (category !== 'all') params.append('category', category);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      }
      throw new Error(`Error al cargar productos: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Guardar en caché
    productCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Error en fetchProducts:', error);
    throw error;
  }
};

// Exportar todas las utilidades
export default {
  productCache,
  inventoryObservable,
  getAuthToken,
  fetchProducts
};