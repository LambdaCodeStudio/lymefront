// hooks/useProductAPI.ts
import { useState, useCallback, useEffect } from 'react';
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
  fetchProducts: (forceRefresh?: boolean, page?: number, limit?: number) => Promise<void>;
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
 * Hook personalizado para gestionar la comunicación con API de productos
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
   * IMPORTANTE: Movida para evitar el error de referencia circular
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
      
      // Actualizar el producto en el estado local
      const updatedProduct = await fetchProductById(productId);
      if (updatedProduct) {
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
      const updatedProduct = await fetchProductById(productId);
      if (updatedProduct) {
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
  }, [getAuthHeaders, handleApiError, fetchProductById]);

  /**
   * Carga productos del servidor con paginación y filtros
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
    // Evitar cargas redundantes
    if (loading && !forceRefresh) {
      console.log('Ya se está cargando productos, evitando otra carga');
      return;
    }
    
    try {
      setLoading(true);
      setRefreshing(forceRefresh);
      setError('');
      
      const headers = getAuthHeaders();
      
      // Construir parámetros de consulta
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
      
      const response = await fetch(`${API_URL}producto?${queryParams.toString()}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await handleApiError(response);
        throw new Error(errorData.message);
      }
      
      const responseData = await response.json();
      
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
      const errorMsg = `Error al cargar productos: ${err.message}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, loading, normalizeProducts, getAuthHeaders, handleApiError]);

  /**
   * Contar productos con stock bajo
   */
  const countLowStockProducts = useCallback(async (): Promise<number> => {
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
        setLowStockCount(data.count);
        return data.count;
      }
      
      throw new Error('Formato de respuesta no válido');
    } catch (error) {
      console.error("Error al contar productos con stock bajo:", error);
      
      // Estimación local como fallback
      const lowStockEstimate = products.filter(
        product => product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0
      ).length;
      
      setLowStockCount(lowStockEstimate);
      return lowStockEstimate;
    } finally {
      setIsLowStockLoading(false);
    }
  }, [products, getAuthHeaders, handleApiError]);

  /**
   * Contar productos sin stock
   */
  const countNoStockProducts = useCallback(async (): Promise<number> => {
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
        setNoStockCount(data.totalItems);
        return data.totalItems;
      }
      
      // Contar productos si es un array
      const count = Array.isArray(data) ? data.length : 0;
      setNoStockCount(count);
      return count;
    } catch (error) {
      console.error("Error al contar productos sin stock:", error);
      
      // Estimación local como fallback
      const noStockEstimate = products.filter(product => product.stock === 0).length;
      setNoStockCount(noStockEstimate);
      return noStockEstimate;
    } finally {
      setIsNoStockLoading(false);
    }
  }, [products, getAuthHeaders, handleApiError]);

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
      
      // Actualizar la interfaz
      fetchProducts(true, 1, itemsPerPage);
      countLowStockProducts();
      countNoStockProducts();
      
      // Notificar a otros componentes
      inventoryObservable.notify();
      
      return savedProduct;
    } catch (error: any) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError, fetchProducts, uploadProductImage, countLowStockProducts, countNoStockProducts, itemsPerPage]);

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
      
      // Actualizar la interfaz
      fetchProducts(true, currentPage, itemsPerPage);
      countLowStockProducts();
      countNoStockProducts();
      
      // Notificar a otros componentes
      inventoryObservable.notify();
      
      return updatedProduct;
    } catch (error: any) {
      console.error(`Error al actualizar producto ${id}:`, error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError, currentPage, itemsPerPage, fetchProducts, uploadProductImage, countLowStockProducts, countNoStockProducts]);

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
      
      // Actualizar estado local
      setProducts(prevProducts => prevProducts.filter(product => product._id !== id));
      
      // Actualizar contadores
      countLowStockProducts();
      countNoStockProducts();
      
      // Notificar a otros componentes
      inventoryObservable.notify();
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar producto ${id}:`, error);
      throw error;
    }
  }, [getAuthHeaders, handleApiError, countLowStockProducts, countNoStockProducts]);

  /**
   * Función para manejar cambio de página
   */
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    fetchProducts(true, pageNumber, itemsPerPage);
    
    // Scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [itemsPerPage, fetchProducts]);

  /**
   * Función para actualizar manualmente los productos
   */
  const handleManualRefresh = useCallback(() => {
    fetchProducts(true);
    countLowStockProducts();
    countNoStockProducts();
  }, [fetchProducts, countLowStockProducts, countNoStockProducts]);

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