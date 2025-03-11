// src/services/api.ts
import axios, { type AxiosInstance, AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

// Configuración del API base
const API_CONFIG = {
  baseURL: import.meta.env.PUBLIC_API_URL || 'https://lyme-back.vercel.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 segundos de timeout
};

// Clase base para el cliente API
export class ApiClient {
  getBaseUrl() {
    throw new Error('Method not implemented.');
  }
  private client: AxiosInstance;

  constructor(config: AxiosRequestConfig = {}) {
    this.client = axios.create({
      ...API_CONFIG,
      ...config,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Interceptor de solicitudes
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor de respuestas
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Manejar errores de autenticación
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  // Método para manejar errores de manera consistente
  private handleError(error: AxiosError): Error {
    const errorResponse = error.response?.data;
    if (errorResponse && typeof errorResponse === 'object' && 'msg' in errorResponse) {
      return new Error(errorResponse.msg as string);
    }
    
    return error as Error;
  }

  // Métodos para realizar peticiones HTTP
  public async get<T>(url: string, params = {}): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  public async post<T>(url: string, data = {}, config = {}): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data = {}, config = {}): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config = {}): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Método para personalizar cliente
  public getClient(): AxiosInstance {
    return this.client;
  }
}

// Instancia por defecto para uso general
const api = new ApiClient();
export default api;