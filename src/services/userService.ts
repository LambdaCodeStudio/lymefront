// src/services/userService.ts
import type { User, LoginResponse, CreateUserDTO } from '@/types/users';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Función mejorada para llamadas a la API con mejor manejo de errores
const fetchApi = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    // Si la respuesta no es ok, convertir a error con información útil
    if (!response.ok) {
      // Intentar obtener detalles del error del cuerpo
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { msg: 'Error sin detalles disponibles' };
      }

      // Crear un error con información completa
      const error = new Error(errorData.msg || `Error ${response.status}`);
      (error as any).response = {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      };
      
      console.error(`Error en fetchApi: ${errorData.msg || response.statusText} (${response.status})`);
      
      // Si es error 503, agregar información de diagnóstico para depuración
      if (response.status === 503) {
        console.log('Diagnóstico de conectividad:');
        try {
          // Intenta hacer un ping simple al servidor
          const pingStart = performance.now();
          await fetch(`${API_URL}/health`, { method: 'GET', cache: 'no-store' })
            .then(r => console.log(`Health check: ${r.ok ? 'OK' : 'Falló'} (${Math.round(performance.now() - pingStart)}ms)`))
            .catch(e => console.log(`Health check falló: ${e.message}`));
        } catch (diagError) {
          console.error('Diagnóstico falló:', diagError);
        }
      }
      
      throw error;
    }

    // Si la respuesta es 204 (sin contenido), devolver null
    if (response.status === 204) {
      return null;
    }

    // Devolver los datos JSON
    return await response.json();
  } catch (error: any) {
    // Si es un error de red (sin response), mejorar mensaje para el usuario
    if (!error.response) {
      console.error('Error de red en fetchApi:', error.message);
      error.message = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
    }
    
    // Re-lanzar el error para manejarlo en la capa superior
    throw error;
  }
};

// Servicio de usuarios mejorado
const userService = {
  // Login con mejor manejo de errores y respuestas
  login: async (usuario: string, password: string): Promise<LoginResponse> => {
    try {
      console.log(`Iniciando login para usuario: ${usuario}`);
      const startTime = performance.now();
      
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usuario, password }),
      });
      
      console.log(`Login completado en ${Math.round(performance.now() - startTime)}ms`);
      
      return data;
    } catch (error: any) {
      console.error('Error en login:', error);
      
      // Agregar información de diagnóstico útil en caso de errores 503
      if (error.response?.status === 503) {
        console.log('Sugerencia: El servidor podría estar sobrecargado o la base de datos no está disponible');
      }
      
      throw error;
    }
  },

  // Registro de usuario
  register: async (userData: CreateUserDTO): Promise<User> => {
    try {
      return await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  },

  // Obtener usuario actual
  getCurrentUser: async (): Promise<User> => {
    try {
      return await fetchApi('/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      throw error;
    }
  },

  // Obtener todos los usuarios (solo admin)
  getAllUsers: async (): Promise<User[]> => {
    try {
      return await fetchApi('/auth/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error('Error al obtener todos los usuarios:', error);
      throw error;
    }
  },

  // Obtener usuario por ID
  getUserById: async (id: string): Promise<User> => {
    try {
      return await fetchApi(`/auth/users/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error(`Error al obtener usuario con ID ${id}:`, error);
      throw error;
    }
  },

  // Actualizar usuario
  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    try {
      return await fetchApi(`/auth/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error(`Error al actualizar usuario con ID ${id}:`, error);
      throw error;
    }
  },

  // Eliminar usuario
  deleteUser: async (id: string): Promise<void> => {
    try {
      await fetchApi(`/auth/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error(`Error al eliminar usuario con ID ${id}:`, error);
      throw error;
    }
  },

  // Cambiar estado del usuario (activar/desactivar)
  toggleUserStatus: async (id: string, activate: boolean): Promise<User> => {
    try {
      const action = activate ? 'activate' : 'deactivate';
      return await fetchApi(`/auth/users/${id}/${action}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error(`Error al cambiar estado del usuario con ID ${id}:`, error);
      throw error;
    }
  },
};

export default userService;