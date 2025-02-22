// hooks/useInventory.ts
import { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import type { Product, ProductFilters, CreateProductData, UpdateProductData } from '../types/inventory';

export const useInventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({});

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryService.getProducts(filters);
      setProducts(data);
    } catch (err) {
      setError('Error al cargar los productos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const createProduct = async (data: CreateProductData) => {
    try {
      setLoading(true);
      await inventoryService.createProduct(data);
      await loadProducts();
      return true;
    } catch (err) {
      setError('Error al crear el producto');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (data: UpdateProductData) => {
    try {
      setLoading(true);
      await inventoryService.updateProduct(data);
      await loadProducts();
      return true;
    } catch (err) {
      setError('Error al actualizar el producto');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setLoading(true);
      await inventoryService.deleteProduct(id);
      await loadProducts();
      return true;
    } catch (err) {
      setError('Error al eliminar el producto');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const blob = await inventoryService.exportToExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventario.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar el inventario');
      console.error(err);
    }
  };

  return {
    products,
    loading,
    error,
    filters,
    setFilters,
    createProduct,
    updateProduct,
    deleteProduct,
    exportToExcel,
    refreshProducts: loadProducts
  };
};