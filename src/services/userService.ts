/**
 * Servicio para gestionar usuarios en la aplicación
 * Actualizado para soportar la estructura del backend modificado
 */
import { 
  User, 
  UserRole, 
  UserSection, 
  LoginResponse, 
  CreateUserDTO, 
  UpdateUserDTO, 
  ApiResponse 
} from '@/types/users';

// URL base para el backend
const API_URL = 'api/auth/';

/**
 * Obtener token de autenticación
 */
export const getAuthToken = (): string | null => {
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
export const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  // Mejorar la detección del endpoint de login para ser más flexible
  const isLoginEndpoint = endpoint === 'login' || endpoint === '/login' || endpoint.endsWith('/login');
  
  const token = !isLoginEndpoint ? getAuthToken() : null;
  
  if (!isLoginEndpoint && !token) {
    throw new Error('No hay token de autenticación');
  }
  
  // Normalizar el endpoint para construir la URL correctamente
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `${API_URL}${sanitizedEndpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Si la respuesta no es exitosa
    if (!response.ok) {
      // Si la respuesta es 401, redirigir al login (excepto si estamos en el endpoint de login)
      if (response.status === 401 && !isLoginEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userSecciones');
        localStorage.removeItem('expiresAt');
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
      
      // Personalizar mensajes de error para login
      if (isLoginEndpoint && response.status === 400) {
        throw new Error(errorData.message || 'Usuario o contraseña incorrectos');
      }
      
      if (isLoginEndpoint && response.status === 403) {
        throw new Error(errorData.message || 'Su cuenta ha sido desactivada');
      }
      
      // Lanzar error con el mensaje del API o un mensaje genérico
      throw Object.assign(
        new Error(errorData.message || errorData.msg || 'Error en la solicitud'),
        { status: response.status }
      );
    }
    
    // Obtener datos JSON
    const data = await response.json();
    
    // Verificar que la respuesta sea válida según la estructura esperada
    if (data === null || data === undefined) {
      throw new Error('Respuesta vacía del servidor');
    }
    
    // Si la respuesta no tiene el campo success explícito, añadirlo para consistencia
    if (typeof data.success === 'undefined') {
      data.success = true;
    }
    
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('Error detallado en fetchApi:', error);
    
    // Agregar información adicional al error de red
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Posibles causas:');
      console.error('- El servidor no está en ejecución');
      console.error(`- La URL ${url} no es accesible`);
      console.error('- Hay problemas de CORS');
      console.error('- Hay problemas de red');
    }
    
    throw error;
  }
};

/**
 * Función de login
 */
export const login = async (usuario: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetchApi<LoginResponse>('login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password })
    });
    
    // Verificar que la respuesta contiene token y user
    if (!response.success || !response.token || !response.user) {
      throw new Error('Formato de respuesta inválido del servidor');
    }
    
    return response as LoginResponse;
  } catch (error) {
    console.error('Error de login:', error);
    throw error;
  }
};

/**
 * Obtener todos los usuarios
 */
export const getAllUsers = async (): Promise<User[]> => {
  const response = await fetchApi<{users: User[]}>('users');
  
  if (!response.success || !response.users) {
    throw new Error('Error al obtener la lista de usuarios');
  }
  
  return response.users;
};

/**
 * Obtener un usuario por ID
 */
export const getUserById = async (id: string): Promise<User> => {
  const response = await fetchApi<{user: User}>(`users/${id}`);
  
  if (!response.success || !response.user) {
    throw new Error('Error al obtener el usuario');
  }
  
  return response.user;
};

/**
 * Crear un nuevo usuario
 */
export const createUser = async (userData: CreateUserDTO): Promise<User> => {
  const response = await fetchApi<{user: User}>('register', {
    method: 'POST',
    body: JSON.stringify({
      ...userData,
      // Convertir undefined en valores por defecto para evitar problemas
      isTemporary: userData.isTemporary || false,
      password: userData.password,
      role: userData.role
    })
  });
  
  if (!response.success || !response.user) {
    throw new Error('Error al crear el usuario');
  }
  
  return response.user;
};

/**
 * Actualizar usuario existente
 */
export const updateUser = async (id: string, userData: UpdateUserDTO): Promise<User> => {
  // Preparar datos para envío, eliminando campos undefined
  const cleanedUserData: Partial<UpdateUserDTO> = Object.fromEntries(
    Object.entries(userData).filter(([_, v]) => v !== undefined)
  );

  // Campos especiales que requieren tratamiento
  const preparedData: Partial<UpdateUserDTO> = {
    ...cleanedUserData
  };

  // Manejar campos específicos según el rol
  if (preparedData.role !== undefined) {
    // Si el rol NO es operario, eliminar el supervisorId para evitar el error de validación
    if (preparedData.role !== 'operario') {
      delete preparedData.supervisorId;
      delete preparedData.isTemporary;
      delete preparedData.expirationMinutes;
    } else {
      // Gestión especial para operarios temporales
      if (userData.isTemporary && userData.expirationMinutes) {
        preparedData.expirationMinutes = userData.expirationMinutes;
      }
    }
  }

  console.log('Enviando datos de actualización:', JSON.stringify(preparedData));

  try {
    const response = await fetchApi<{user: User}>(`users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(preparedData)
    });
    
    if (!response.success || !response.user) {
      throw new Error(response.message || 'Error al actualizar el usuario');
    }
    
    return response.user;
  } catch (error) {
    console.error('Error en updateUser:', error);
    throw error;
  }
};

/**
 * Eliminar usuario
 */
export const deleteUser = async (id: string): Promise<{success: boolean, message: string}> => {
  const response = await fetchApi<{message: string}>(`users/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.success) {
    throw new Error('Error al eliminar el usuario');
  }
  
  return {
    success: true,
    message: response.message || 'Usuario eliminado correctamente'
  };
};

/**
 * Activar/desactivar usuario
 */
export const toggleUserStatus = async (id: string, activate: boolean): Promise<User> => {
  const action = activate ? 'activate' : 'deactivate';
  const response = await fetchApi<{user: User}>(`users/${id}/${action}`, {
    method: 'PUT'
  });
  
  if (!response.success || !response.user) {
    throw new Error(`Error al ${activate ? 'activar' : 'desactivar'} el usuario`);
  }
  
  return response.user;
};

/**
 * Obtener información del usuario actual
 */
export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  const response = await fetchApi<{user: User}>('me');
  
  if (!response.success || !response.user) {
    throw new Error('Error al obtener información del usuario actual');
  }
  
  return {
    success: true,
    user: response.user
  };
};

/**
 * Reactivar operario temporal expirado
 */
export const reactivateTemporaryOperator = async (): Promise<{expiresAt: string, minutesRemaining: number}> => {
  const response = await fetchApi<{expiresAt: string, minutesRemaining: number}>('reactivate-temporary', {
    method: 'POST'
  });
  
  if (!response.success || !response.expiresAt) {
    throw new Error('Error al reactivar el operario temporal');
  }
  
  return {
    expiresAt: response.expiresAt,
    minutesRemaining: response.minutesRemaining
  };
};

/**
 * Registro de usuario
 */
export const register = async (userData: CreateUserDTO): Promise<User> => {
  return await createUser(userData);
};

/**
 * Obtener lista de supervisores
 * @param {boolean} fresh - Si es true, fuerza una actualización fresca ignorando la caché
 * @returns {Promise<User[]>} Lista de supervisores
 */
export const getSupervisors = async (fresh = false): Promise<User[]> => {
  // Construir el endpoint con el parámetro fresh si es necesario
  const endpoint = fresh ? 'supervisors?fresh=true' : 'supervisors';
  
  const response = await fetchApi<{supervisors: User[], count: number}>(endpoint);
  
  if (!response.success || !response.supervisors) {
    throw new Error('Error al obtener la lista de supervisores');
  }
  
  return response.supervisors;
};

// Servicio de usuarios para exportar como objeto completo
const userService = {
  login,     
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getCurrentUser,
  reactivateTemporaryOperator,
  getAuthToken,
  register,
  getSupervisors
};

export default userService;