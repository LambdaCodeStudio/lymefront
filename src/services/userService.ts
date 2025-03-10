// src/services/userService.ts
import axios from 'axios';

// API URL desde variables de entorno
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lyme-back.vercel.app/api';

// Definición de tipos que reflejan el esquema del backend
export interface AdminUser {
  _id: string;
  usuario: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  celular?: string;
  role: 'admin' | 'supervisor_de_supervisores' | 'supervisor' | 'operario' | 'temporario';
  isActive: boolean;
  createdBy?: {
    _id: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
  };
  expiresAt?: string;
  secciones: 'limpieza' | 'mantenimiento' | 'ambos';
  expirationInfo?: {
    expired: boolean;
    expirationDate: string;
    minutesRemaining: number;
  };
}

export interface CreateUserData {
  usuario: string;
  password: string;
  role: 'admin' | 'supervisor_de_supervisores' | 'supervisor' | 'operario' | 'temporario';
  nombre?: string;
  apellido?: string;
  email?: string;
  celular?: string;
  secciones: 'limpieza' | 'mantenimiento' | 'ambos';
  isTemporary?: boolean;
  expirationMinutes?: number;
}

export interface LoginResponse {
  token: string;
  role: string;
}

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

// Funciones exportadas para ser usadas por useUserManagement

// Login con nombre de usuario y contraseña
export async function login(usuario: string, password: string): Promise<LoginResponse> {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      usuario,
      password
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Obtener usuario actual
export async function getCurrentUser(): Promise<AdminUser> {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Obtener todos los usuarios
export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const response = await axios.get(`${API_URL}/auth/users`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Crear nuevo usuario con cualquier rol
export async function createUser(userData: CreateUserData): Promise<AdminUser> {
  try {
    // Determinar el endpoint correcto basado en si es un usuario temporal
    const endpoint = userData.role === 'temporario' || (userData.isTemporary && userData.role === 'operario')
      ? `${API_URL}/auth/temporary`
      : `${API_URL}/auth/register`;
      
    // Preparar datos para enviar al backend
    const payload = {
      ...userData,
      // Asegurar que se envíe isTemporary solo para operarios
      ...(userData.role === 'operario' && { isTemporary: !!userData.isTemporary })
    };
    
    const response = await axios.post(endpoint, payload);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Actualizar usuario existente
export async function updateUser(id: string, userData: Partial<CreateUserData>): Promise<AdminUser> {
  try {
    // Filtrar la contraseña si está vacía
    const payload = { ...userData };
    if (!payload.password) delete payload.password;
    
    const response = await axios.put(`${API_URL}/auth/users/${id}`, payload);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Activar/desactivar usuario
export async function toggleUserStatus(id: string, activate: boolean): Promise<AdminUser> {
  try {
    const action = activate ? 'activate' : 'deactivate';
    const response = await axios.put(`${API_URL}/auth/users/${id}/${action}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Eliminar usuario
export async function deleteUser(id: string): Promise<{msg: string, clientesEnStandBy?: number}> {
  try {
    const response = await axios.delete(`${API_URL}/auth/users/${id}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Reactivar usuario temporal
export async function reactivateTemporaryUser(): Promise<{msg: string, expiresAt: string}> {
  try {
    const response = await axios.post(`${API_URL}/auth/reactivate-temporary`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Mantener el export default por compatibilidad
export default {
  login,
  getCurrentUser,
  getAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  reactivateTemporaryUser
};