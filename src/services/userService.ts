// src/services/userService.ts
import axios from 'axios';
import type { User, LoginResponse, CreateUserDTO, UpdateUserDTO } from '@/types/users';

// API URL desde variables de entorno
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Interceptor para agregar token a las peticiones
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Función para manejar errores de la API
const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  
  // Manejar respuesta de error específica
  if (error.response) {
    // El servidor respondió con un código de error
    const message = error.response.data.msg || error.response.data.error || 'Error en la petición';
    throw new Error(message);
  } else if (error.request) {
    // La petición fue hecha pero no hubo respuesta
    throw new Error('No hay respuesta del servidor. Verifica tu conexión.');
  } else {
    // Algo sucedió en la configuración de la petición
    throw new Error('Error en la configuración de la petición: ' + error.message);
  }
};

// Servicio para manejo de usuarios
export const userService = {
  // Login con nombre de usuario y contraseña
  async login(usuario: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        usuario,
        password
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Obtener usuario actual
  async getCurrentUser(): Promise<User> {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Registrar nuevo usuario
  async register(userData: CreateUserDTO): Promise<User> {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Crear usuario temporal
  async createTemporaryUser(userData: CreateUserDTO): Promise<User> {
    try {
      const response = await axios.post(`${API_URL}/auth/temporary`, userData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Obtener todos los usuarios
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await axios.get(`${API_URL}/auth/users`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Obtener usuario por ID
  async getUserById(id: string): Promise<User> {
    try {
      const response = await axios.get(`${API_URL}/auth/users/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Actualizar usuario
  async updateUser(id: string, userData: UpdateUserDTO): Promise<User> {
    try {
      const response = await axios.put(`${API_URL}/auth/users/${id}`, userData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Activar/desactivar usuario
  async toggleUserStatus(id: string, activate: boolean): Promise<User> {
    try {
      const action = activate ? 'activate' : 'deactivate';
      const response = await axios.put(`${API_URL}/auth/users/${id}/${action}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Eliminar usuario
  async deleteUser(id: string): Promise<any> {
    try {
      const response = await axios.delete(`${API_URL}/auth/users/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Reactivar usuario temporal
  async reactivateTemporaryUser(): Promise<any> {
    try {
      const response = await axios.post(`${API_URL}/auth/reactivate-temporary`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

export default userService;