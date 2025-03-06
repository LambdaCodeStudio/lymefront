/**
 * Servicios para la gestión de usuarios en el panel de administración
 * Centraliza todas las comunicaciones con la API relacionadas con usuarios
 */
import type { RoleType } from '../shared/UserRolesConfig';

// Interfaz de usuario en el panel administrativo
export interface AdminUser {
  _id: string;
  email?: string;
  usuario?: string;
  role: RoleType;
  nombre?: string;
  apellido?: string;
  celular?: string;
  isActive: boolean;
  createdBy?: {
    _id: string;
    email?: string;
    usuario?: string;
  };
  expiresAt?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
}

// Datos para crear un usuario
export interface CreateUserData {
  email: string;
  usuario?: string;
  password: string;
  role: RoleType;
  expirationMinutes?: number;
  nombre?: string;
  apellido?: string;
  celular?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
}

// Obtener token de autenticación
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

/**
 * Obtiene todos los usuarios del sistema
 * @returns Lista de usuarios
 */
export async function getAllUsers(): Promise<AdminUser[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch('https://lyme-back.vercel.app/api/auth/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
      return [];
    }
    throw new Error('Error al cargar usuarios');
  }

  const data = await response.json();

  // Procesar usuarios para manejar expiración
  return data.map((user: AdminUser) => ({
    ...user,
    // Un usuario temporal está activo si:
    // 1. Su campo isActive es true Y
    // 2. No ha expirado (si tiene fecha de expiración)
    isActive: user.isActive && (
      user.role !== 'temporal' ||
      !user.expiresAt ||
      new Date(user.expiresAt) > new Date()
    )
  }));
}

/**
 * Crea un nuevo usuario en el sistema
 * @param userData Datos del usuario a crear
 * @returns Datos del usuario creado
 */
export async function createUser(userData: CreateUserData): Promise<AdminUser> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  let endpoint = 'https://lyme-back.vercel.app/api/auth/';
  const payload: any = {
    email: userData.email,
    usuario: userData.usuario,
    password: userData.password,
    role: userData.role,
    nombre: userData.nombre,
    apellido: userData.apellido,
    celular: userData.celular,
    secciones: userData.secciones
  };

  // Determinar endpoint según el tipo de usuario
  endpoint += userData.role === 'temporal' ? 'temporary' : 'register';

  // Manejar expiración para usuarios temporales
  if (userData.role === 'temporal' && userData.expirationMinutes) {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + userData.expirationMinutes);
    payload.expiresAt = expirationDate.toISOString();
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || error.error || 'Error en la operación');
  }

  return await response.json();
}

/**
 * Actualiza un usuario existente
 * @param userId ID del usuario a actualizar
 * @param userData Datos actualizados del usuario
 * @returns Usuario actualizado
 */
export async function updateUser(userId: string, userData: Partial<CreateUserData>): Promise<AdminUser> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const endpoint = `https://lyme-back.vercel.app/api/auth/users/${userId}`;
  const payload: any = {
    email: userData.email,
    usuario: userData.usuario,
    role: userData.role,
    nombre: userData.nombre,
    apellido: userData.apellido,
    celular: userData.celular,
    secciones: userData.secciones
  };

  // Solo incluir password si se proporciona
  if (userData.password?.trim()) {
    payload.password = userData.password;
  }

  // Manejar expiración para usuarios temporales
  if (userData.role === 'temporal' && userData.expirationMinutes) {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + userData.expirationMinutes);
    payload.expiresAt = expirationDate.toISOString();
  }

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || error.error || 'Error al actualizar usuario');
  }

  return await response.json();
}

/**
 * Elimina un usuario
 * @param userId ID del usuario a eliminar
 * @returns Respuesta de la API
 */
export async function deleteUser(userId: string): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`https://lyme-back.vercel.app/api/auth/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || error.error || 'Error al eliminar usuario');
  }

  return await response.json();
}

/**
 * Activa o desactiva un usuario
 * @param userId ID del usuario
 * @param activate true para activar, false para desactivar
 * @returns Usuario actualizado
 */
export async function toggleUserStatus(userId: string, activate: boolean): Promise<AdminUser> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(
    `https://lyme-back.vercel.app/api/auth/users/${userId}/${activate ? 'activate' : 'deactivate'}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || error.error || `Error al ${activate ? 'activar' : 'desactivar'} usuario`);
  }

  return await response.json();
}