// utils/product-filters.utils.ts
import { Product } from '../types/inventory.types';
import { LOW_STOCK_THRESHOLD } from './constants';

/**
 * Filtra productos por término de búsqueda
 * @param products - Lista de productos a filtrar
 * @param searchTerm - Término de búsqueda
 * @returns Lista de productos filtrados
 */
export const filterProductsBySearch = (
  products: Product[], 
  searchTerm: string
): Product[] => {
  if (!searchTerm) return products;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return products.filter(product => {
    // Buscar coincidencias en múltiples campos para mejores resultados
    return (
      (product.nombre && product.nombre.toLowerCase().includes(lowerSearchTerm)) ||
      (product.descripcion && product.descripcion.toLowerCase().includes(lowerSearchTerm)) ||
      (product.marca && product.marca.toLowerCase().includes(lowerSearchTerm)) ||
      (product.proveedor?.nombre && product.proveedor.nombre.toLowerCase().includes(lowerSearchTerm))
    );
  });
};

/**
 * Filtra productos por categoría
 * @param products - Lista de productos a filtrar
 * @param category - Categoría a filtrar ('all' para todas, 'combos' para combos)
 * @returns Lista de productos filtrados
 */
export const filterProductsByCategory = (
  products: Product[], 
  category: string
): Product[] => {
  if (!category || category === 'all') return products;
  
  return products.filter(product => {
    if (category === 'combos') {
      return product.esCombo === true;
    }
    return product.categoria === category;
  });
};

/**
 * Filtra productos por stock bajo
 * @param products - Lista de productos a filtrar
 * @param threshold - Umbral para considerar stock bajo
 * @returns Lista de productos con stock bajo
 */
export const filterLowStockProducts = (
  products: Product[], 
  threshold = LOW_STOCK_THRESHOLD
): Product[] => {
  return products.filter(product => {
    // Usar alertaStockBajo si está disponible
    if (product.alertaStockBajo !== undefined) {
      return product.alertaStockBajo && product.stock > 0;
    }
    
    // O calcular basado en umbral
    return product.stock <= threshold && product.stock > 0;
  });
};

/**
 * Filtra productos sin stock
 * @param products - Lista de productos a filtrar
 * @returns Lista de productos sin stock
 */
export const filterNoStockProducts = (products: Product[]): Product[] => {
  return products.filter(product => product.stock <= 0);
};

/**
 * Ordena productos por diversos criterios
 * @param products - Lista de productos a ordenar
 * @param sortBy - Campo por el que ordenar
 * @param sortDir - Dirección (1: ascendente, -1: descendente)
 * @returns Lista de productos ordenados
 */
export const sortProducts = (
  products: Product[], 
  sortBy = 'nombre', 
  sortDir = 1
): Product[] => {
  return [...products].sort((a, b) => {
    let valueA: any;
    let valueB: any;
    
    // Extraer valores a comparar según el campo
    switch (sortBy) {
      case 'nombre':
        valueA = a.nombre || '';
        valueB = b.nombre || '';
        break;
      case 'precio':
        valueA = a.precio || 0;
        valueB = b.precio || 0;
        break;
      case 'stock':
        valueA = a.stock || 0;
        valueB = b.stock || 0;
        break;
      case 'categoria':
        valueA = a.categoria || '';
        valueB = b.categoria || '';
        break;
      case 'updatedAt':
        valueA = new Date(a.updatedAt || 0);
        valueB = new Date(b.updatedAt || 0);
        break;
      default:
        valueA = a.nombre || '';
        valueB = b.nombre || '';
    }
    
    // Comparar según tipo de dato
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDir * valueA.localeCompare(valueB);
    }
    
    if (valueA instanceof Date && valueB instanceof Date) {
      return sortDir * (valueA.getTime() - valueB.getTime());
    }
    
    // Valores numéricos u otros
    if (valueA < valueB) return -1 * sortDir;
    if (valueA > valueB) return 1 * sortDir;
    return 0;
  });
};

/**
 * Pagina una lista de productos
 * @param products - Lista completa de productos
 * @param page - Número de página (comienza en 1)
 * @param itemsPerPage - Elementos por página
 * @returns Subconjunto de productos para la página
 */
export const paginateProducts = (
  products: Product[], 
  page = 1, 
  itemsPerPage = 10
): Product[] => {
  const startIndex = (page - 1) * itemsPerPage;
  return products.slice(startIndex, startIndex + itemsPerPage);
};

/**
 * Aplica múltiples filtros a productos en memoria
 * (útil para filtrado del lado del cliente)
 */
export const applyAllFilters = (
  products: Product[],
  filters: {
    searchTerm?: string;
    category?: string;
    showLowStockOnly?: boolean;
    showNoStockOnly?: boolean;
    sortBy?: string;
    sortDir?: number;
    page?: number;
    itemsPerPage?: number;
  }
): {
  filteredProducts: Product[];
  totalCount: number;
} => {
  let result = [...products];
  
  // Aplicar filtros en orden
  if (filters.showNoStockOnly) {
    result = filterNoStockProducts(result);
  } else if (filters.showLowStockOnly) {
    result = filterLowStockProducts(result);
  } else {
    // Aplicar filtros normales solo si no hay filtros de stock
    if (filters.searchTerm) {
      result = filterProductsBySearch(result, filters.searchTerm);
    }
    
    if (filters.category) {
      result = filterProductsByCategory(result, filters.category);
    }
  }
  
  // Guardar conteo total antes de paginar
  const totalCount = result.length;
  
  // Ordenar resultado
  if (filters.sortBy) {
    result = sortProducts(result, filters.sortBy, filters.sortDir);
  }
  
  // Paginar resultado
  if (filters.page !== undefined && filters.itemsPerPage) {
    result = paginateProducts(result, filters.page, filters.itemsPerPage);
  }
  
  return {
    filteredProducts: result,
    totalCount
  };
};

/**
 * Construye parámetros de URL para la API de productos
 */
export const buildProductQueryParams = (
  filters: {
    searchTerm?: string;
    category?: string;
    showLowStockOnly?: boolean;
    showNoStockOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: number;
  }
): URLSearchParams => {
  const queryParams = new URLSearchParams();
  
  // Paginación
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  
  // Ordenamiento
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters.sortDir) queryParams.append('sortDir', filters.sortDir.toString());
  
  // Prioridad de filtros: Sin Stock > Stock Bajo > Filtros normales
  if (filters.showNoStockOnly) {
    queryParams.append('noStock', 'true');
  } else if (filters.showLowStockOnly) {
    queryParams.append('lowStock', 'true');
    queryParams.append('threshold', LOW_STOCK_THRESHOLD.toString());
  } else {
    // Aplicamos los filtros normales
    if (filters.searchTerm) {
      queryParams.append('regex', filters.searchTerm);
      queryParams.append('regexFields', 'nombre,descripcion,marca');
      queryParams.append('regexOptions', 'i');
    }

    if (filters.category && filters.category !== 'all') {
      if (filters.category === 'combos') {
        queryParams.append('esCombo', 'true');
      } else {
        queryParams.append('category', filters.category);
      }
    }
  }
  
  // Agregar cache buster para evitar resultados en caché
  queryParams.append('_', Date.now().toString());
  
  return queryParams;
};