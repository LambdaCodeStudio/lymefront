// src/services/inventoryService.ts
import { BaseService, PaginationParams } from './baseService';
import api from './api';
import type { Product, ProductFilters, CreateProductData, UpdateProductData } from '@/types/inventory';

class InventoryService extends BaseService<Product> {
  constructor() {
    super('/producto');
  }

  // Método para obtener productos con filtros
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    return await api.get<Product[]>('/producto', filters);
  }

  // Método para exportar a Excel
  async exportToExcel(filters?: ProductFilters): Promise<Blob> {
    const client = api.getClient();
    const response = await client.get('/producto/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  // Sobrescribir el método update para manejar el formato específico
  async updateProduct(data: UpdateProductData): Promise<Product> {
    const { id, ...updateData } = data;
    return await this.update(id, updateData);
  }
}

// Exportar instancia singleton
export const inventoryService = new InventoryService();