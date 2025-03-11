// src/services/inventoryService.ts
import { BaseService } from './baseService';
import type { PaginationParams } from './baseService';
import api from './api';
import type { Product, ProductFilters, CreateProductData, UpdateProductData } from '@/types/inventory';

class InventoryService extends BaseService<Product> {
  constructor() {
    super('/producto');
  }

  // Método para obtener productos con filtros
  async getProducts() {
    try {
      const response = await api.get('/producto');
      
      // Asegurarnos de que siempre devolvamos un array
      if (Array.isArray(response)) {
        return response;
      } else if (response && typeof response === 'object') {
        // Si es un objeto con propiedad items (paginación)
        if (Array.isArray(response.items)) {
          return response.items;
        }
        // Si solo tiene datos en otra propiedad
        for (const key in response) {
          if (Array.isArray(response[key])) {
            return response[key];
          }
        }
      }
      
      console.error('Formato de respuesta inesperado:', response);
      return []; // Devolver array vacío en caso de formato desconocido
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
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