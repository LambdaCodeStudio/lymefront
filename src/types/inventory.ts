// src/types/inventory.ts

/**
 * Interfaz para los datos del proveedor
 */
export interface ProveedorType {
  nombre?: string;
  codigo?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

/**
 * Interfaz para los items de un combo
 */
export interface ComboItemType {
  productoId: string | { _id: string; nombre: string; precio: number };
  cantidad: number;
  nombre?: string;
  precio?: number;
}

/**
 * Interfaz para la información de imagen
 */
export interface ImagenInfoType {
  mimetype?: string;
  tamano?: number;
  ultimaActualizacion?: Date;
}

/**
 * Interfaz para la tendencia de ventas
 */
export interface TendenciaVentasType {
  diaria?: number;
  semanal?: number;
  mensual?: number;
}

/**
 * Interfaz principal del producto
 */
export interface Product {
  _id: string;
  nombre: string;
  descripcion?: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  
  // Nuevos campos según schema actualizado
  marca?: string;
  proveedor?: ProveedorType;
  
  // Campos de precio y stock
  precio: number;
  stock: number;
  stockMinimo?: number;
  stockMaximo?: number;
  alertaStockBajo?: boolean;
  
  // Ubicación física
  ubicacion?: {
    deposito?: string;
    pasillo?: string;
    estante?: string;
    posicion?: string;
  };
  
  // Imagen y metadatos
  hasImage?: boolean; // No forma parte del schema pero es útil en frontend
  imagenInfo?: ImagenInfoType;
  
  // Estadísticas de ventas
  vendidos?: number;
  ultimaVenta?: Date;
  tendenciaVentas?: TendenciaVentasType;
  diasHastaAgotamiento?: number;
  
  // Campos para combos
  esCombo?: boolean;
  itemsCombo?: ComboItemType[];
  
  // Metadata y códigos
  codigoBarras?: string;
  codigoInterno?: string;
  estado?: 'activo' | 'discontinuado' | 'agotado';
  
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para filtros de productos
 */
export interface ProductFilters {
  // Filtros de búsqueda
  search?: string;
  category?: string;
  subCategory?: string;
  
  // Filtros de marcas y proveedores
  marca?: string;
  proveedor?: string;
  
  // Filtros de stock
  stockStatus?: 'all' | 'low' | 'out';
  threshold?: number;
  
  // Filtros de precio
  precioMin?: number;
  precioMax?: number;
  
  // Filtros de estado
  estado?: 'activo' | 'discontinuado' | 'agotado';
  
  // Filtros de fecha
  updatedAfter?: string;
  
  // Ordenamiento
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  
  // Paginación
  page?: number;
  limit?: number;
}

/**
 * Interfaz para la respuesta paginada
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  sortBy?: string;
  sortDir?: string;
}

/**
 * Interfaz para la creación de productos
 */
export interface CreateProductData {
  nombre: string;
  descripcion?: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  marca?: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  
  // Información del proveedor
  proveedor?: ProveedorType;
  
  // Campos para combos
  esCombo?: boolean;
  itemsCombo?: { productoId: string; cantidad: number }[];
  
  // Estado del producto
  estado?: 'activo' | 'discontinuado' | 'agotado';
}

/**
 * Interfaz para la actualización de productos
 */
export interface UpdateProductData extends Partial<Omit<CreateProductData, 'categoria'>> {
  id: string;
}