// hooks/useProductFilters.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Product } from '../types/inventory.types';
import { 
  applyAllFilters, 
  buildProductQueryParams 
} from '../utils/product-filters.utils';
import { DEBOUNCE_DELAY, LOW_STOCK_THRESHOLD } from '../utils/constants';

interface UseProductFiltersProps {
  clientSideFiltering?: boolean;
  productsData?: Product[];
  onFiltersChange?: (queryParams: URLSearchParams) => void;
  itemsPerPage: number;
}

interface UseProductFiltersReturn {
  // Estado de filtros
  searchTerm: string;
  selectedCategory: string;
  showLowStockOnly: boolean;
  showNoStockOnly: boolean;
  sortBy: string;
  sortDir: number;
  currentPage: number;
  
  // Productos filtrados (solo si clientSideFiltering es true)
  filteredProducts: Product[];
  totalCount: number;
  totalPages: number;
  
  // Setters
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (field: string) => void;
  setSortDir: (dir: number) => void;
  
  // Toggles
  toggleLowStockFilter: () => void;
  toggleNoStockFilter: () => void;
  
  // Helpers
  buildQueryString: () => string;
  resetFilters: () => void;
  
  // Debounce
  debouncedSearchTerm: string;
}

/**
 * Hook personalizado para gestionar filtros de productos
 * VERSIÓN OPTIMIZADA para reducir recargas
 * 
 * @param clientSideFiltering - Si el filtrado debe realizarse en el cliente
 * @param productsData - Datos de productos completos (requerido si clientSideFiltering es true)
 * @param onFiltersChange - Callback cuando cambian los filtros (útil para filtrado del lado del servidor)
 * @param itemsPerPage - Número de elementos por página
 */
export const useProductFilters = ({
  clientSideFiltering = false,
  productsData = [],
  onFiltersChange,
  itemsPerPage
}: UseProductFiltersProps): UseProductFiltersReturn => {
  // Estado para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showNoStockOnly, setShowNoStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState(1); // 1: asc, -1: desc
  const [currentPage, setCurrentPage] = useState(1);
  
  // Refs para control de estado
  const isInitialMount = useRef(true);
  const searchTermTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotifiedFilters = useRef<string>('');
  const filtersChangedSinceLastNotification = useRef(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTermTimeoutRef.current) {
        clearTimeout(searchTermTimeoutRef.current);
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);
  
  // Debounce para searchTerm
  useEffect(() => {
    // Primera vez no hacemos nada
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Limpiar timeout existente
    if (searchTermTimeoutRef.current) {
      clearTimeout(searchTermTimeoutRef.current);
    }
    
    // Configurar nuevo timeout
    searchTermTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      
      // Volver a la página 1 al buscar
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }, DEBOUNCE_DELAY);
  }, [searchTerm, currentPage]);
  
  /**
   * Toggle para el filtro de stock bajo - versión estable
   */
  const toggleLowStockFilter = useCallback(() => {
    setShowLowStockOnly(prev => {
      // Si activamos este filtro, desactivamos el otro
      if (!prev) {
        setShowNoStockOnly(false);
      }
      return !prev;
    });
    
    // Volver a la primera página
    setCurrentPage(1);
  }, []);
  
  /**
   * Toggle para el filtro de sin stock - versión estable
   */
  const toggleNoStockFilter = useCallback(() => {
    setShowNoStockOnly(prev => {
      // Si activamos este filtro, desactivamos el otro
      if (!prev) {
        setShowLowStockOnly(false);
      }
      return !prev;
    });
    
    // Volver a la primera página
    setCurrentPage(1);
  }, []);
  
  /**
   * Parámetros de filtro memorizados para evitar recreaciones en cada renderizado
   */
  const filterParams = useMemo(() => {
    return {
      searchTerm: debouncedSearchTerm,
      category: selectedCategory,
      showLowStockOnly,
      showNoStockOnly,
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortDir
    };
  }, [
    debouncedSearchTerm, 
    selectedCategory, 
    showLowStockOnly, 
    showNoStockOnly, 
    currentPage, 
    itemsPerPage,
    sortBy,
    sortDir
  ]);
  
  /**
   * Construye un objeto URLSearchParams para la API
   * Versión memoizada para evitar recreaciones innecesarias
   */
  const searchParams = useMemo(() => {
    return buildProductQueryParams(filterParams);
  }, [filterParams]);
  
  /**
   * Construye un string de consulta para la API
   */
  const buildQueryString = useCallback(() => {
    return searchParams.toString();
  }, [searchParams]);
  
  /**
   * Resetea todos los filtros a sus valores por defecto
   */
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('all');
    setShowLowStockOnly(false);
    setShowNoStockOnly(false);
    setSortBy('nombre');
    setSortDir(1);
    setCurrentPage(1);
  }, []);
  
  // Calcular productos filtrados si el filtrado es del lado del cliente
  const { filteredProducts, totalCount, totalPages } = useMemo(() => {
    if (!clientSideFiltering || productsData.length === 0) {
      return { 
        filteredProducts: [], 
        totalCount: 0,
        totalPages: 0
      };
    }
    
    const { filteredProducts, totalCount } = applyAllFilters(productsData, filterParams);
    
    return {
      filteredProducts,
      totalCount,
      totalPages: Math.ceil(totalCount / itemsPerPage)
    };
  }, [clientSideFiltering, productsData, filterParams, itemsPerPage]);
  
  // Notificar cambios en los filtros de manera eficiente
  // Limitamos la frecuencia de notificaciones para no sobrecargar
  useEffect(() => {
    if (!onFiltersChange) return;
    
    // Verificamos si realmente han cambiado los parámetros
    const currentFilterString = JSON.stringify(filterParams);
    if (currentFilterString === lastNotifiedFilters.current) {
      return;
    }
    
    // Marcar que hay cambios pendientes de notificar
    filtersChangedSinceLastNotification.current = true;
    
    // Si ya hay un timeout programado, no hacer nada
    if (notificationTimeoutRef.current) {
      return;
    }
    
    // Programar una notificación para no sobrecargar con actualizaciones
    notificationTimeoutRef.current = setTimeout(() => {
      // Si ha habido cambios desde la última notificación
      if (filtersChangedSinceLastNotification.current) {
        onFiltersChange(searchParams);
        lastNotifiedFilters.current = JSON.stringify(filterParams);
        filtersChangedSinceLastNotification.current = false;
      }
      
      notificationTimeoutRef.current = null;
    }, 50); // Pequeño delay para agrupar cambios
  }, [filterParams, searchParams, onFiltersChange]);
  
  return {
    // Estado
    searchTerm,
    selectedCategory,
    showLowStockOnly,
    showNoStockOnly,
    sortBy,
    sortDir,
    currentPage,
    debouncedSearchTerm,
    
    // Productos filtrados
    filteredProducts,
    totalCount,
    totalPages,
    
    // Setters
    setSearchTerm,
    setSelectedCategory,
    setCurrentPage,
    setSortBy,
    setSortDir,
    
    // Toggles
    toggleLowStockFilter,
    toggleNoStockFilter,
    
    // Helpers
    buildQueryString,
    resetFilters
  };
};

export default useProductFilters;