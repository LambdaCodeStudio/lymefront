// src/hooks/useInventory.ts
import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '@/services/inventoryService';
import type { Product, ProductFilters, CreateProductData, UpdateProductData } from '@/types/inventory';

interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string | null;
  currentProduct: Product | null;
}

export const useInventory = (initialFilters?: ProductFilters) => {
  const [state, setState] = useState<InventoryState>({
    products: [],
    loading: true,
    error: null,
    currentProduct: null
  });

  const [filters, setFilters] = useState<ProductFilters | undefined>(initialFilters);

  // Cargar productos
  const loadProducts = useCallback(async (searchFilters?: ProductFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const filtersToUse = searchFilters || filters;
      const products = await inventoryService.getProducts(filtersToUse);
      
      setState(prev => ({
        ...prev,
        products,
        loading: false
      }));
      
      return products;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar productos'
      }));
      
      return [];
    }
  }, [filters]);

  // Cargar al montar y cuando cambien los filtros
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Obtener un producto por ID
  const getProduct = async (id: string): Promise<Product | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const product = await inventoryService.getById(id);
      
      setState(prev => ({
        ...prev,
        currentProduct: product,
        loading: false
      }));
      
      return product;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al obtener el producto'
      }));
      
      return null;
    }
  };

  // Crear un nuevo producto
  const createProduct = async (productData: CreateProductData): Promise<Product | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const product = await inventoryService.create(productData);
      
      // Actualizar la lista de productos
      setState(prev => ({
        ...prev,
        products: [product, ...prev.products],
        loading: false
      }));
      
      return product;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al crear el producto'
      }));
      
      return null;
    }
  };

  // Actualizar un producto
  const updateProduct = async (data: UpdateProductData): Promise<Product | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const product = await inventoryService.updateProduct(data);
      
      // Actualizar la lista de productos
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === product.id ? product : p),
        currentProduct: product,
        loading: false
      }));
      
      return product;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al actualizar el producto'
      }));
      
      return null;
    }
  };

  // Eliminar un producto
  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await inventoryService.delete(id);
      
      // Eliminar de la lista
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id),
        loading: false
      }));
      
      return true;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al eliminar el producto'
      }));
      
      return false;
    }
  };

  // Exportar a Excel
  const exportProductsToExcel = async (): Promise<Blob | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const blob = await inventoryService.exportToExcel(filters);
      
      setState(prev => ({
        ...prev,
        loading: false
      }));
      
      return blob;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al exportar productos'
      }));
      
      return null;
    }
  };

  // Actualizar filtros
  const updateFilters = (newFilters: ProductFilters) => {
    setFilters(newFilters);
  };

  return {
    ...state,
    loadProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    exportProductsToExcel,
    updateFilters,
    filters
  };
};