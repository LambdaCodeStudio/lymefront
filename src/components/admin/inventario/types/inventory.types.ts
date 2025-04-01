// types/inventory.types.ts
import { ReactNode } from 'react';

export type ProductCategory = 'limpieza' | 'mantenimiento';

export type ProductSubCategory =
  // Limpieza
  | 'accesorios'
  | 'aerosoles'
  | 'bolsas'
  | 'estandar'
  | 'indumentaria'
  | 'liquidos'
  | 'papeles'
  | 'calzado'
  | 'sinClasificarLimpieza'
  // Mantenimiento
  | 'iluminaria'
  | 'electricidad'
  | 'cerraduraCortina'
  | 'pintura'
  | 'superficiesConstruccion'
  | 'plomeria';

export type ProductStatus = 'activo' | 'discontinuado' | 'agotado';

export interface ProductLocation {
  deposito: string;
  pasillo?: string;
  estante?: string;
  posicion?: string;
}

export interface ProductSupplier {
  nombre: string;
  codigo?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

export interface ProductImageInfo {
  mimetype: string;
  tamano?: number;
  ultimaActualizacion?: Date;
  rutaArchivo?: string;
}

export interface ComboItem {
  productoId: string | Product;
  cantidad: number;
  nombre?: string;
  precio?: number;
}

export interface Product {
  _id: string;
  nombre: string;
  descripcion?: string;
  categoria: ProductCategory;
  subCategoria: ProductSubCategory;
  marca?: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  stockMaximo?: number;
  alertaStockBajo?: boolean;
  proveedor?: ProductSupplier;
  ubicacion?: ProductLocation;
  imagen?: Buffer | null;
  imagenInfo?: ProductImageInfo;
  imageUrl?: string;
  hasImage?: boolean;
  vendidos?: number;
  esCombo?: boolean;
  itemsCombo?: ComboItem[];
  estado?: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  sortBy?: string;
  sortDir?: number;
}

export interface ProductFormData {
  nombre: string;
  descripcion: string;
  categoria: string;
  subCategoria: string;
  marca: string;
  precio: string;
  stock: string;
  stockMinimo: string;
  proveedor: {
    nombre: string;
    contacto: string;
    telefono: string;
    email: string;
  };
  estado: string;
  imagen: File | null;
  imagenPreview: string | ArrayBuffer | null;
}

export interface ProductFilters {
  searchTerm: string;
  category: string;
  showLowStockOnly: boolean;
  showNoStockOnly: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: string;
}

export type ApiResponse<T> = 
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T };

export interface ProductImageProps {
  product: Product | string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  addTimestamp?: boolean;
  alt?: string;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export interface StockIndicatorProps {
  stock: number;
  alertaStockBajo?: boolean;
  stockMinimo?: number;
  threshold?: number;
}

export interface ProductFormProps {
  product?: Product | null;
  onSave: (product: Partial<Product>, imageFile?: File | null) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  isCombo?: boolean;
}

export interface ComboSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ComboItem[];
  onItemsSelected: (items: ComboItem[]) => void;
  products: Product[];
}