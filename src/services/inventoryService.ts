import type { Product, ProductFilters, CreateProductData, UpdateProductData } from '../types/inventory';
import api from './api';

export const inventoryService = {
  getProducts: async (filters?: ProductFilters): Promise<Product[]> => {
    const { data } = await api.get('/api/producto', { params: filters });
    return data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const { data } = await api.get(`/api/producto/${id}`);
    return data;
  },

  createProduct: async (productData: CreateProductData): Promise<Product> => {
    const { data } = await api.post('/api/producto', productData);
    return data;
  },

  updateProduct: async (data: UpdateProductData): Promise<Product> => {
    const { id, ...updateData } = data;
    const response = await api.put(`/api/producto/${id}`, updateData);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/api/producto/${id}`);
  },

  exportToExcel: async (filters?: ProductFilters): Promise<Blob> => {
    const response = await api.get('/api/producto/export', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }
};