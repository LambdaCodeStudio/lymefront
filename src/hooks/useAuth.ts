// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import userService from '@/services/userService';
import type { User, LoginResponse, UserRole, CreateUserDTO } from '@/types/users';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface RetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  retryableStatuses?: number[];
}

// Utilidad mejorada para manejar reintentos con backoff exponencial y soporte para múltiples códigos de error
const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialBackoffMs = 1000,
    maxBackoffMs = 10000,
    retryableStatuses = [429, 503, 502, 500]
  } = options;
  
  let retries = 0;
  let backoffMs = initialBackoffMs;
  
  // Función recursiva para intentar con backoff
  const attempt = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      // Determinar si el error es retryable basado en su código de estado
      const isRetryable = error.response && 
        retryableStatuses.includes(error.response.status);
      
      // Incrementar contador de intentos
      retries++;
      
      // Si no hay más reintentos o no es un error retryable, lanzar el error original
      if (retries > maxRetries || !isRetryable) {
        throw error;
      }
      
      // Log para depuración
      console.log(`Error ${error.response?.status || 'de red'} detectado, reintentando en ${backoffMs}ms. Reintentos restantes: ${maxRetries - retries}`);
      
      // Si es un error 503 (servicio no disponible), añadir un mensaje específico
      if (error.response?.status === 503) {
        console.log('Servicio temporalmente no disponible. Esperando para reintentar...');
      }
      
      // Esperar según el tiempo de backoff actual
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      // Calcular próximo backoff con jitter para evitar thundering herd
      backoffMs = Math.min(
        backoffMs * 2 * (0.9 + Math.random() * 0.2), // Backoff exponencial con 10% de jitter
        maxBackoffMs
      );
      
      // Reintentar
      return attempt();
    }
  };
  
  return attempt();
};

// Función mejorada para formatear el mensaje de error según el código de respuesta
const formatErrorMessage = (error: any): string => {
  if (!error.response) {
    return error.message || 'Error de conexión. Verifique su internet.';
  }
  
  switch (error.response.status) {
    case 400:
      return 'Usuario o contraseña incorrectos';
    case 401:
      return 'No autorizado. Verifique sus credenciales.';
    case 403:
      return 'Acceso prohibido';
    case 429:
      return 'Demasiados intentos. Por favor, espere un momento antes de volver a intentarlo.';
    case 500:
      return 'Error en el servidor. Por favor, intente de nuevo más tarde.';
    case 502:
    case 503:
    case 504:
      return 'Servicio temporalmente no disponible. Por favor, intente de nuevo más tarde.';
    default:
      return error.response.data?.msg || error.message || 'Error desconocido';
  }
};

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null
  });

  // Funciones para manejar el token en localStorage
  const getStoredToken = (): string | null => {
    return localStorage.getItem('token');
  };

  const setStoredToken = (token: string) => {
    localStorage.setItem('token', token);
  };

  const removeStoredToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole'); // También eliminar el rol al cerrar sesión
  };

  // Verificar autenticación al iniciar con manejo de reintentos
  const checkAuth = useCallback(async () => {
    try {
      const token = getStoredToken();
      
      if (!token) {
        setAuth({ user: null, isAuthenticated: false, loading: false, error: null });
        return false;
      }

      // Usar withRetry con opciones mejoradas
      const user = await withRetry(
        () => userService.getCurrentUser(),
        {
          maxRetries: 2,
          initialBackoffMs: 1000,
          retryableStatuses: [429, 503, 502]
        }
      );
      
      setAuth({
        user,
        isAuthenticated: true,
        loading: false,
        error: null
      });
      
      return true;
    } catch (error: any) {
      console.error('Error checking auth:', error);
      removeStoredToken();
      setAuth({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: formatErrorMessage(error)
      });
      
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Función de login actualizada para manejar la respuesta de la API con reintentos mejorados
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      // Usar withRetry con opciones específicas para login
      const response = await withRetry(
        () => userService.login(email, password),
        {
          maxRetries: 5, // Más reintentos para login
          initialBackoffMs: 1000,
          maxBackoffMs: 15000, // Hasta 15 segundos de espera máxima
          retryableStatuses: [429, 503, 502, 500] // Incluir errores de servidor
        }
      );
      
      // Verificar si tenemos token
      if (!response.token) {
        throw new Error('Respuesta sin token de autenticación');
      }

      // Guardar token
      setStoredToken(response.token);
      
      // Guardar rol en localStorage
      if (response.role) {
        localStorage.setItem('userRole', response.role);
        console.log('Rol guardado en localStorage:', response.role);
      }

      // Si la respuesta no tiene user pero tiene role, creamos un user mínimo
      let userData: User;
      
      if (response.user) {
        userData = response.user;
      } else {
        // Crear un objeto user básico con el rol de la respuesta
        userData = {
          _id: '', // Se completará cuando obtengamos los datos completos
          role: response.role
        };
        
        // Intentar obtener los datos completos del usuario (con reintentos)
        try {
          const fullUserData = await withRetry(
            () => userService.getCurrentUser(),
            {
              maxRetries: 2,
              initialBackoffMs: 1000
            }
          );
          userData = fullUserData;
        } catch (userError) {
          console.warn('No se pudieron cargar los datos completos del usuario:', userError);
          // Continuamos con los datos básicos
        }
      }

      // Actualizar estado
      setAuth({
        user: userData,
        isAuthenticated: true,
        loading: false,
        error: null
      });

      // Asegurar que la respuesta tenga user para compatibilidad con el código existente
      return {
        token: response.token,
        role: response.role,
        user: userData
      };
    } catch (error: any) {
      // Actualizar estado con el error formateado
      console.error('Error detallado del login:', error);
      
      let errorMessage = formatErrorMessage(error);
      
      // Mensaje específico para errores de servicio no disponible
      if (error.response?.status === 503) {
        errorMessage = 'El servidor está temporalmente no disponible. Por favor, intente más tarde o contacte a soporte si el problema persiste.';
      }
      
      setAuth(prev => ({ 
        ...prev, 
        loading: false,
        error: errorMessage
      }));
      
      throw error;
    }
  };

  // Función de logout
  const logout = () => {
    removeStoredToken();
    setAuth({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
    window.location.href = '/login';
  };

  // Función para registrar nuevo usuario (con reintentos mejorados)
  const register = async (email: string, password: string, role: UserRole = 'basic'): Promise<User> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      const userData: CreateUserDTO = { email, password, role };
      
      // Usar withRetry mejorado
      const user = await withRetry(
        () => userService.register(userData),
        {
          maxRetries: 3,
          initialBackoffMs: 1000,
          retryableStatuses: [429, 503, 502]
        }
      );

      // No autenticamos automáticamente tras el registro
      setAuth(prev => ({ ...prev, loading: false }));

      return user;
    } catch (error: any) {
      setAuth(prev => ({ 
        ...prev, 
        loading: false, 
        error: formatErrorMessage(error)
      }));
      
      throw error;
    }
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!auth.user) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(auth.user.role as UserRole);
    }
    
    return auth.user.role === requiredRole;
  };

  return {
    ...auth,
    login,
    logout,
    register,
    checkAuth,
    hasRole
  };
};