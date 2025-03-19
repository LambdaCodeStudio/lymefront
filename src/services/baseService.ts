// src/services/baseService.ts
import api from './api';

// Clase base para todos los servicios
export abstract class BaseService<T> {
  protected endpoint: string;
  
  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }
  
  // Métodos CRUD básicos
  async getAll(params = {}): Promise<T[]> {
    return await api.get<T[]>(this.endpoint, params);
  }
  
  async getById(id: string): Promise<T> {
    return await api.get<T>(`${this.endpoint}/${id}`);
  }
  
  async create(data: Partial<T>): Promise<T> {
    return await api.post<T>(this.endpoint, data);
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    return await api.put<T>(`${this.endpoint}/${id}`, data);
  }
  
  async delete(id: string): Promise<void> {
    return await api.delete<void>(`${this.endpoint}/${id}`);
  }
}

// Interfaz básica para respuestas paginadas
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Interfaz para params de paginación
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
}