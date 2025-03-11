/**
 * Servicio para gestionar usuarios en la aplicación
 * Actualizado para soportar la nueva estructura de roles y expiración de usuarios
 */

// URL base para el backend
const API_URL = 'https://lyme-back.vercel.app/api/auth';

// Tipo para el creador de un usuario
export interface UserCreator {
  _id: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
}

// Tipo para un usuario administrado
export interface AdminUser {
  _id: string;
  usuario: string;
  nombre?: string;
  apellido?: string;
  role: string;
  celular?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: UserCreator;
  expiresAt?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
  direccion?: string;
  ciudad?: string;
}

// Tipo para datos de creación o actualización de usuario
export interface CreateUserData {
  usuario: string;
  password: string;
  nombre?: string;
  apellido?: string;
  celular?: string;
  role: string;
  expirationMinutes?: number;
  secciones: 'limpieza' | 'mantenimiento' | 'ambos';
  isTemporary?: boolean;
  direccion?: string;
  ciudad?: string;
}

/**
 * Obtener token de autenticación
 */
const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error al obtener token:', error);
    return null;
  }
};

/**
 * Función base para realizar peticiones al API
 */
const fetchApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación');
  }
  
  const url = `${API_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Si la respuesta no es exitosa
    if (!response.ok) {
      // Si la respuesta es 401, redirigir al login
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
      
      // Intentar obtener detalles del error
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Lanzar error con el mensaje del API o un mensaje genérico
      throw Object.assign(
        new Error(errorData.msg || errorData.error || 'Error en la solicitud'),
        { status: response.status }
      );
    }
    
    // Si todo está bien, devolver datos JSON
    return await response.json();
  } catch (error) {
    console.error('Error en fetchApi:', error);
    throw error;
  }
};

/**
 * Obtener todos los usuarios
 */
export const getAllUsers = async (): Promise<AdminUser[]> => {
  return await fetchApi('/users');
};

/**
 * Obtener un usuario por ID
 */
export const getUserById = async (id: string): Promise<AdminUser> => {
  return await fetchApi(`/users/${id}`);
};

/**
 * Crear un nuevo usuario
 */
export const createUser = async (userData: CreateUserData): Promise<AdminUser> => {
  // Asegurarnos que secciones es obligatorio
  if (!userData.secciones) {
    userData.secciones = 'ambos';
  }
  
  return await fetchApi('/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

/**
 * Actualizar usuario existente
 */
export const updateUser = async (id: string, userData: Partial<CreateUserData>): Promise<AdminUser> => {
  return await fetchApi(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
};

/**
 * Eliminar usuario
 */
export const deleteUser = async (id: string): Promise<void> => {
  await fetchApi(`/users/${id}`, {
    method: 'DELETE'
  });
};

/**
 * Activar/desactivar usuario
 */
export const toggleUserStatus = async (id: string, activate: boolean): Promise<AdminUser> => {
  const action = activate ? 'activate' : 'deactivate';
  return await fetchApi(`/users/${id}/${action}`, {
    method: 'PUT'
  });
};

/**
 * Crear usuario temporal
 */
export const createTemporaryUser = async (userData: CreateUserData): Promise<AdminUser> => {
  return await fetchApi('/temporary', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

/**
 * Obtener información del usuario actual
 */
export const getCurrentUser = async (): Promise<AdminUser> => {
  return await fetchApi('/me');
};

/**
 * Reactivar usuario temporal expirado
 */
export const reactivateTemporaryUser = async (): Promise<{expiresAt: string}> => {
  return await fetchApi('/reactivate-temporary', {
    method: 'POST'
  });
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  createTemporaryUser,
  getCurrentUser,
  reactivateTemporaryUser
};