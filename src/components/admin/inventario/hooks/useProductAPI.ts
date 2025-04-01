// hooks/useProductAPI.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Product, 
  ApiResponse, 
  PaginatedResponse, 
  ApiError,
  ProductFormData
} from '../types/inventory.types';
import { getAuthToken } from '@/utils/inventoryUtils';
import { API_URL, LOW_STOCK_THRESHOLD, MESSAGES } from '../utils/constants';
import { inventoryObservable } from '@/utils/inventoryUtils';

interface UseProductAPIProps {
  itemsPerPage: number;
}

interface UseProductAPIReturn {
  products: Product[];
  loading: boolean;
  error: string;
  refreshing: boolean;
  currentPage: number;
  totalCount: number;
  totalPages: number;
  lowStockCount: number;
  noStockCount: number;
  isLowStockLoading: boolean;
  isNoStockLoading: boolean;
  
  setCurrentPage: (page: number) => void;
  handlePageChange: (page: number) => void;
  fetchProducts: (forceRefresh?: boolean, page?: number, limit?: number, filters?: any) => Promise<void>;
  handleManualRefresh: () => void;
  
  // CRUD operations
  fetchProductById: (id: string) => Promise<Product | null>;
  createProduct: (product: Partial<Product>, imageFile?: File | null) => Promise<Product | null>;
  updateProduct: (id: string, product: Partial<Product>, imageFile?: File | null) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  
  // Image operations
  uploadProductImage: (productId: string, imageFile: File) => Promise<string | null>;
  deleteProductImage: (productId: string) => Promise<boolean>;
  
  // Stock statistics
  countLowStockProducts: () => Promise<number>;
  countNoStockProducts: () => Promise<number>;
}

/**
 * Hook personalizado optimizado para gestionar la comunicación con API de productos
 * - Implementa memorización de funciones
 * - Reduce dependencias circulares
 * - Evita re-renderizados innecesarios
 */
export const useProductAPI = ({
  itemsPerPage
}: UseProductAPIProps): UseProductAPIReturn => {
  // Estado principal
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Estado para contadores de stock
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);
  const [noStockCount, setNoStockCount] = useState(0);
  const [isNoStockLoading, setIsNoStockLoading] = useState(false);
  
  // Referencias para evitar recargas innecesarias
  const lastFetchParams = useRef<{
    page: number;
    limit: number;
    filters?: any;
    timestamp: number;
  }>({ page: 1, limit: itemsPerPage, timestamp: 0 });
  
  const isMounted = useRef(true);
  const lastFetchPromise = useRef<Promise<void> | null>(null);
  
  // Efecto de limpieza al desmontar
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Función para normalizar productos
   * Asegura que todos los productos tengan propiedades consistentes
   */
  const normalizeProducts = useCallback((products: Product[]): Product[] => {
    return products.map(product => ({
      ...product,
      hasImage: (
        product.hasImage === true || 
        !!product.imageUrl || 
        (product.imagenInfo && !!product.imagenInfo.rutaArchivo)
      )
    }));
  }, []);
  
  /**
   * Obtiene las cabeceras de autenticación para las peticiones
   * Esta función no tiene dependencias, por lo que solo se crea una vez
   */
  const getAuthHeaders = useCallback((): HeadersInit | undefined => {
    const token = getAuthToken();
    if (!token) {
      throw new Error(MESSAGES.TOKEN_ERROR);
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
  }, []);
  
  /**
   * Maneja errores de respuesta HTTP
   * Esta función no tiene dependencias, por lo que solo se crea una vez
   */
  const handleApiError = useCallback((response: Response): Promise<ApiError> => {
    if (response.status === 401) {
      // Sesión expirada, redirigir a login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      }
      return Promise.reject({ message: 'Sesión expirada' });
    }
    
    return response.json()
      .then(data => {
        return {
          message: data.error || data.message || `Error (${response.status})`,
          status: response.status,
          details: data.details
        };
      })
      .catch(() => {
        return {
          message: `Error de red (${response.status})`,
          status: response.status
        };
      });
  }, []);

  /**
   * Obtener un producto por ID
   */
  const fetchProductById = useCallback(async (id: string): Promise<Product | null> => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}producto/${id}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const productData = await response.json();
      
      // Normalizar producto
      return {
        ...productData,
        hasImage: (
          productData.hasImage === true || 
          !!productData.imageUrl || 
          (productData.imagenInfo && !!productData.imagenInfo.rutaArchivo)
        )
      };
    } catch (error: any) {
      console.error(`Error al obtener producto ${id}:`, error);
      return null;
    }
  }, [getAuthHeaders, handleApiError]);

  /**
   * Subir imagen de producto
   * Optimizada para evitar dependencias circulares
   */
  const uploadProductImage = useCallback(async (
    productId: string, 
    imageFile: File
  ): Promise<string | null> => {
    try {
      const headers = getAuthHeaders();
      
      // Crear FormData para la imagen
      const formData = new FormData();
      formData.append('imagen', imageFile);
      
      const response = await fetch(`${API_URL}producto/${productId}/imagen`, {
        method: 'POST',
        headers: {
          'Authorization': headers?.['Authorization'] || ''
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const imageResponse = await response.json();
      
      // Actualizar el producto en el estado local usando una función que no depende de productos actuales
      const updatedProduct = await fetchProductById(productId);
      
      if (updatedProduct && isMounted.current) {
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { 
                  ...product, 
                  hasImage: true,
                  imageUrl: imageResponse.imageUrl || `${API_URL}images/products/${productId}.webp`
                } 
              : product
          )
        );
      }
      
      return imageResponse.imageUrl || null;
    } catch (error: any) {
      console.error(`Error al subir imagen para producto ${productId}:`, error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError, fetchProductById]);

  /**
   * Eliminar imagen de producto
   */
  const deleteProductImage = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}producto/${productId}/imagen`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      // Actualizar el producto en el estado local
      // Aquí usamos una función que no depende de productos
      if (isMounted.current) {
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { 
                  ...product, 
                  hasImage: false,
                  imageUrl: null,
                  imagenInfo: null
                } 
              : product
          )
        );
      }
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar imagen para producto ${productId}:`, error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError]);

  /**
   * Construye los parámetros de consulta para la API (extraído de fetchProducts)
   * Al extraer esta lógica, reducimos las dependencias de fetchProducts
   */
  const buildQueryParams = useCallback((
    page: number, 
    limit: number, 
    filters?: {
      searchTerm?: string,
      category?: string,
      showLowStockOnly?: boolean,
      showNoStockOnly?: boolean
    }
  ): URLSearchParams => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    // Aplicar filtros
    if (filters) {
      // Priorizar filtros de stock
      if (filters.showNoStockOnly) {
        queryParams.append('noStock', 'true');
      } else if (filters.showLowStockOnly) {
        queryParams.append('lowStock', 'true');
        queryParams.append('threshold', LOW_STOCK_THRESHOLD.toString());
      } else {
        // Búsqueda
        if (filters.searchTerm) {
          queryParams.append('regex', filters.searchTerm);
          queryParams.append('regexFields', 'nombre,descripcion,marca');
          queryParams.append('regexOptions', 'i');
        }
        
        // Categoría
        if (filters.category && filters.category !== 'all') {
          if (filters.category === 'combos') {
            queryParams.append('esCombo', 'true');
          } else {
            queryParams.append('category', filters.category);
          }
        }
      }
    }
    
    // Cache buster
    queryParams.append('_', Date.now().toString());
    
    return queryParams;
  }, []);

  /**
   * Carga productos del servidor con paginación y filtros
   * Versión optimizada que evita múltiples cargas redundantes
   */
  const fetchProducts = useCallback(async (
    forceRefresh = false, 
    page = currentPage, 
    limit = itemsPerPage,
    filters?: {
      searchTerm?: string,
      category?: string,
      showLowStockOnly?: boolean,
      showNoStockOnly?: boolean
    }
  ) => {
    // Validar si ya hay una carga en progreso o si estamos solicitando los mismos datos
    const now = Date.now();
    
    // Evitar cargas redundantes muy cercanas en el tiempo (dentro de 200ms) con los mismos parámetros
    if (!forceRefresh && 
        lastFetchParams.current.page === page && 
        lastFetchParams.current.limit === limit &&
        JSON.stringify(lastFetchParams.current.filters) === JSON.stringify(filters) && 
        now - lastFetchParams.current.timestamp < 200) {
      console.log('Evitando carga redundante con los mismos parámetros (dentro de 200ms)');
      return;
    }
    
    // Si hay una carga en progreso, volvemos a intentarlo cuando termine
    if (loading && !forceRefresh && lastFetchPromise.current) {
      console.log('Ya se está cargando productos, esperando a que termine...');
      await lastFetchPromise.current;
      
      // Si los parámetros son distintos, realizamos una nueva carga
      if (lastFetchParams.current.page !== page || 
          lastFetchParams.current.limit !== limit ||
          JSON.stringify(lastFetchParams.current.filters) !== JSON.stringify(filters)) {
        return fetchProducts(true, page, limit, filters);
      }
      return;
    }
    
    // Guardar los parámetros de esta carga
    lastFetchParams.current = { page, limit, filters, timestamp: now };
    
    // Crear una promesa para el seguimiento de esta carga
    let resolvePromise: () => void;
    lastFetchPromise.current = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
    
    try {
      if (!isMounted.current) return;
      
      setLoading(true);
      setRefreshing(forceRefresh);
      setError('');
      
      const headers = getAuthHeaders();
      
      // Construir parámetros de consulta (usando la función extraída)
      const queryParams = buildQueryParams(page, limit, filters);
      
      const response = await fetch(`${API_URL}producto?${queryParams.toString()}`, {
        headers
      });
      
      if (!isMounted.current) return;
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const responseData = await response.json();
      
      if (!isMounted.current) return;
      
      // Procesar la respuesta paginada
      let extractedProducts: Product[] = [];
      let totalItems = 0;
      
      if (responseData && typeof responseData === 'object') {
        if (Array.isArray(responseData)) {
          extractedProducts = responseData;
          totalItems = responseData.length;
        } else if (Array.isArray(responseData.items)) {
          extractedProducts = responseData.items;
          totalItems = responseData.totalItems || responseData.items.length;
          setTotalPages(responseData.totalPages || Math.ceil(totalItems / limit));
        }
      }
      
      // Normalizar productos
      const normalizedProducts = normalizeProducts(extractedProducts);
      setProducts(normalizedProducts);
      setTotalCount(totalItems);
      
    } catch (err: any) {
      if (!isMounted.current) return;
      
      const errorMsg = `Error al cargar productos: ${err.message}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
      
      // Resolver la promesa de esta carga
      if (resolvePromise) resolvePromise();
    }
  }, [currentPage, itemsPerPage, normalizeProducts, getAuthHeaders, handleApiError, buildQueryParams]);

  /**
   * Contar productos con stock bajo
   */
  const countLowStockProducts = useCallback(async (): Promise<number> => {
    if (isLowStockLoading) return lowStockCount;
    
    try {
      setIsLowStockLoading(true);
      
      const headers = getAuthHeaders();
      
      const response = await fetch(
        `${API_URL}producto/stats/stock?threshold=${LOW_STOCK_THRESHOLD}`, 
        { headers }
      );
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const data = await response.json();
      
      // El endpoint debe devolver un objeto con la propiedad 'count'
      if (data && typeof data.count === 'number') {
        if (isMounted.current) {
          setLowStockCount(data.count);
        }
        return data.count;
      }
      
      throw new Error('Formato de respuesta no válido');
    } catch (error) {
      console.error("Error al contar productos con stock bajo:", error);
      
      // Estimación local como fallback
      const lowStockEstimate = products.filter(
        product => product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0
      ).length;
      
      if (isMounted.current) {
        setLowStockCount(lowStockEstimate);
      }
      return lowStockEstimate;
    } finally {
      if (isMounted.current) {
        setIsLowStockLoading(false);
      }
    }
  }, [products, getAuthHeaders, handleApiError, isLowStockLoading, lowStockCount]);

  /**
   * Contar productos sin stock
   */
  const countNoStockProducts = useCallback(async (): Promise<number> => {
    if (isNoStockLoading) return noStockCount;
    
    try {
      setIsNoStockLoading(true);
      
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}producto?noStock=true&limit=1`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const data = await response.json();
      
      // Verificar si hay datos paginados
      if (data && typeof data.totalItems === 'number') {
        if (isMounted.current) {
          setNoStockCount(data.totalItems);
        }
        return data.totalItems;
      }
      
      // Contar productos si es un array
      const count = Array.isArray(data) ? data.length : 0;
      if (isMounted.current) {
        setNoStockCount(count);
      }
      return count;
    } catch (error) {
      console.error("Error al contar productos sin stock:", error);
      
      // Estimación local como fallback
      const noStockEstimate = products.filter(product => product.stock === 0).length;
      if (isMounted.current) {
        setNoStockCount(noStockEstimate);
      }
      return noStockEstimate;
    } finally {
      if (isMounted.current) {
        setIsNoStockLoading(false);
      }
    }
  }, [products, getAuthHeaders, handleApiError, isNoStockLoading, noStockCount]);

  /**
   * Crear un nuevo producto
   */
  const createProduct = useCallback(async (
    productData: Partial<Product>, 
    imageFile?: File | null
  ): Promise<Product | null> => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}producto`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const savedProduct = await response.json();
      
      // Si hay una imagen, subirla
      if (imageFile && savedProduct._id) {
        await uploadProductImage(savedProduct._id, imageFile);
      }
      
      // Notificar a otros componentes
      inventoryObservable.notify();
      
      // No volvemos a cargar los productos dentro de esta función
      // para evitar múltiples llamadas a fetchProducts
      
      return savedProduct;
    } catch (error: any) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError, uploadProductImage]);

  /**
   * Actualizar un producto existente
   */
  const updateProduct = useCallback(async (
    id: string, 
    productData: Partial<Product>,
    imageFile?: File | null
  ): Promise<Product | null> => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}producto/${id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const updatedProduct = await response.json();
      
      // Si hay una imagen, subirla
      if (imageFile && updatedProduct._id) {
        await uploadProductImage(updatedProduct._id, imageFile);
      }
      
      // Notificar a otros componentes
      inventoryObservable.notify();
      
      // No volvemos a cargar los productos dentro de esta función
      // para evitar múltiples llamadas a fetchProducts
      
      return updatedProduct;
    } catch (error: any) {
      console.error(`Error al actualizar producto ${id}:`, error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError, uploadProductImage]);

  /**
   * Eliminar un producto
   */
  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_URL}producto/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      // Actualizar estado local - forma óptima sin dependencias adicionales
      if (isMounted.current) {
        setProducts(prevProducts => prevProducts.filter(product => product._id !== id));
      }
      
      // Notificar a otros componentes
      inventoryObservable.notify();
      
      // No volvemos a cargar los contadores dentro de esta función
      // para evitar múltiples llamadas API
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar producto ${id}:`, error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError]);

  /**
   * Función para manejar cambio de página
   */
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    
    // No llamamos a fetchProducts aquí para evitar la doble carga
    // El componente consumidor debe capturar el cambio y hacer la llamada
    
    // Scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /**
   * Función para actualizar manualmente los productos
   */
  const handleManualRefresh = useCallback(() => {
    // Usar una única llamada force refresh
    fetchProducts(true);
    
    // Actualizar contadores
    countLowStockProducts();
    countNoStockProducts();
  }, [fetchProducts, countLowStockProducts, countNoStockProducts]);

  // Efecto para escuchar cambios en currentPage
  useEffect(() => {
    // Este es el único lugar donde deberíamos llamar a fetchProducts automáticamente
    if (!isNaN(currentPage) && currentPage > 0) {
      fetchProducts(false, currentPage, itemsPerPage);
    }
  }, [currentPage, itemsPerPage, fetchProducts]);

  return {
    // Estado
    products,
    loading,
    error,
    refreshing,
    currentPage,
    totalCount,
    totalPages: Math.ceil(totalCount / itemsPerPage),
    lowStockCount,
    noStockCount,
    isLowStockLoading,
    isNoStockLoading,
    
    // Funciones de paginación
    setCurrentPage,
    handlePageChange,
    
    // Funciones principales
    fetchProducts,
    handleManualRefresh,
    
    // CRUD
    fetchProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    
    // Imágenes
    uploadProductImage,
    deleteProductImage,
    
    // Estadísticas
    countLowStockProducts,
    countNoStockProducts
  };
};

export default useProductAPI;