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
 * Permite filtrado del lado del cliente o del servidor
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
  
  // Refs para debounce
  const searchTermTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce para searchTerm
  useEffect(() => {
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
    
    // Limpiar el timeout al desmontar
    return () => {
      if (searchTermTimeoutRef.current) {
        clearTimeout(searchTermTimeoutRef.current);
      }
    };
  }, [searchTerm, currentPage]);
  
  /**
   * Toggle para el filtro de stock bajo
   */
  const toggleLowStockFilter = useCallback(() => {
    // Si el filtro de sin stock está activo, desactivarlo
    if (showNoStockOnly) {
      setShowNoStockOnly(false);
    }
    
    // Invertir estado del filtro de stock bajo
    setShowLowStockOnly(prev => !prev);
    
    // Volver a la primera página
    setCurrentPage(1);
  }, [showNoStockOnly]);
  
  /**
   * Toggle para el filtro de sin stock
   */
  const toggleNoStockFilter = useCallback(() => {
    // Si el filtro de stock bajo está activo, desactivarlo
    if (showLowStockOnly) {
      setShowLowStockOnly(false);
    }
    
    // Invertir estado del filtro de sin stock
    setShowNoStockOnly(prev => !prev);
    
    // Volver a la primera página
    setCurrentPage(1);
  }, [showLowStockOnly]);
  
  /**
   * Construye un objeto URLSearchParams para la API
   */
  const buildSearchParams = useCallback(() => {
    return buildProductQueryParams({
      searchTerm: debouncedSearchTerm,
      category: selectedCategory,
      showLowStockOnly,
      showNoStockOnly,
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortDir
    });
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
   * Construye un string de consulta para la API
   */
  const buildQueryString = useCallback(() => {
    const params = buildSearchParams();
    return params.toString();
  }, [buildSearchParams]);
  
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
    
    const { filteredProducts, totalCount } = applyAllFilters(productsData, {
      searchTerm: debouncedSearchTerm,
      category: selectedCategory,
      showLowStockOnly,
      showNoStockOnly,
      sortBy,
      sortDir,
      page: currentPage,
      itemsPerPage
    });
    
    return {
      filteredProducts,
      totalCount,
      totalPages: Math.ceil(totalCount / itemsPerPage)
    };
  }, [
    clientSideFiltering,
    productsData,
    debouncedSearchTerm,
    selectedCategory,
    showLowStockOnly,
    showNoStockOnly,
    sortBy,
    sortDir,
    currentPage,
    itemsPerPage
  ]);
  
  // Notificar cambios en los filtros
  useEffect(() => {
    if (onFiltersChange) {
      const params = buildSearchParams();
      onFiltersChange(params);
    }
  }, [buildSearchParams, onFiltersChange]);
  
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