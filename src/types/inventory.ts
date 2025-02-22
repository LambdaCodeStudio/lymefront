export interface Product {
  _id: string;      
  nombre: string;
  descripcion: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  precio: number;
  stock: number;
  proovedorInfo?: string;
  createdAt: string;
  updatedAt: string;
}
  
  export interface ProductFilters {
    search?: string;
    category?: string;
    stockStatus?: 'all' | 'low' | 'out';
    sortBy?: 'name' | 'stock' | 'price' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }
  
  export interface CreateProductData {
    name: string;
    description?: string;
    price: number;
    stock: number;
    minStock?: number;
    category?: string;
  }
  
  export interface UpdateProductData extends Partial<CreateProductData> {
    id: string;
  }