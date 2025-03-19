// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import userService from '@/services/userService';
import { User, UserRole, UserSection, LoginResponse, CreateUserDTO, ApiResponse } from '@/types/users';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Utilidad para manejar reintentos con backoff exponencial
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  backoffMs = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Si no hay más reintentos o no es un error 429, lanzar el error original
    if (retries <= 0 || !error.response || error.response.status !== 429) {
      throw error;
    }
    
    console.log(`Error 429 detectado, reintentando en ${backoffMs}ms. Reintentos restantes: ${retries}`);
    
    // Esperar según el tiempo de backoff
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    
    // Reintentar con backoff exponencial (duplicar el tiempo de espera)
    return withRetry(fn, retries - 1, backoffMs * 2);
  }
};

// Función para formatear el mensaje de error según el código de respuesta
const formatErrorMessage = (error: any): string => {
  if (!error.response) {
    return error.message || 'Error de conexión';
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
    default:
      const serverMessage = error.response.data?.message || error.response.data?.msg;
      return serverMessage || error.message || 'Error desconocido';
  }
};

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null
  });

  // Funciones para manejar el almacenamiento en localStorage
  const getStoredToken = (): string | null => {
    return localStorage.getItem('token');
  };

  const setStoredToken = (token: string) => {
    localStorage.setItem('token', token);
  };

  const setUserData = (user: User) => {
    // Almacenar información importante del usuario
    if (user.role) {
      localStorage.setItem('userRole', user.role);
    }
    if (user.secciones) {
      localStorage.setItem('userSecciones', user.secciones);
    }
    if (user.expiresAt) {
      localStorage.setItem('expiresAt', user.expiresAt);
    }
    // Guardar ID de usuario para referencia
    localStorage.setItem('userId', user.id);
  };

  const removeStoredData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userSecciones');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('userId');
  };

  // Verificar autenticación al iniciar con manejo de reintentos
  const checkAuth = useCallback(async () => {
    try {
      const token = getStoredToken();
      
      if (!token) {
        setAuth({ user: null, isAuthenticated: false, loading: false, error: null });
        return false;
      }

      // Usar withRetry para manejar posibles errores 429
      const response = await withRetry(
        () => userService.getCurrentUser(),
        2, // Menos reintentos para esta operación
        1000
      );
      
      if (response.success && response.user) {
        setAuth({
          user: response.user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        
        // Actualizar datos almacenados con la información más reciente
        setUserData(response.user);
        
        return true;
      } else {
        throw new Error('Respuesta de autenticación inválida');
      }
    } catch (error: any) {
      console.error('Error checking auth:', error);
      removeStoredData();
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

  // Función de login actualizada
  const login = async (usuario: string, password: string): Promise<LoginResponse> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      // Usar withRetry para manejar errores 429 en el login
      const response = await withRetry(
        () => userService.login(usuario, password),
        3, // Máximo 3 reintentos
        1000 // Empezar con 1 segundo de espera
      );
      
      // Guardar token
      setStoredToken(response.token);
      
      // Guardar información del usuario
      setUserData(response.user);

      // Actualizar estado
      setAuth({
        user: response.user,
        isAuthenticated: true,
        loading: false,
        error: null
      });

      return response;
    } catch (error: any) {
      // Actualizar estado con el error formateado
      console.error('Error detallado del login:', error);
      setAuth(prev => ({ 
        ...prev, 
        loading: false,
        error: formatErrorMessage(error)
      }));
      
      throw error;
    }
  };

  // Función de logout
  const logout = () => {
    removeStoredData();
    setAuth({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
    window.location.href = '/login';
  };

  // Función para registrar nuevo usuario
  const register = async (userData: CreateUserDTO): Promise<ApiResponse<User>> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      // Usar withRetry para manejar posibles errores 429
      const response = await withRetry(
        () => userService.register(userData),
        3,
        1000
      );

      // No autenticamos automáticamente tras el registro
      setAuth(prev => ({ ...prev, loading: false }));

      return response;
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

  // Verificar si el usuario tiene acceso a una sección específica
  const hasSection = (requiredSection: UserSection): boolean => {
    if (!auth.user) return false;
    
    // Si el usuario tiene acceso a "ambos", siempre retornar true
    if (auth.user.secciones === 'ambos') return true;
    
    // Verificar sección específica
    return auth.user.secciones === requiredSection;
  };

  // Verificar si un operario es temporal
  const isTemporaryOperator = (): boolean => {
    if (!auth.user) return false;
    
    return auth.user.role === 'operario' && !!auth.user.expiresAt;
  };

  // Obtener tiempo de expiración para operarios temporales
  const getExpirationInfo = () => {
    if (!auth.user || !auth.user.expiresAt) return null;
    
    const expiresAt = new Date(auth.user.expiresAt);
    const now = new Date();
    
    return {
      expiresAt,
      expired: now > expiresAt,
      minutesRemaining: Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60)))
    };
  };

  return {
    ...auth,
    login,
    logout,
    register,
    checkAuth,
    hasRole,
    hasSection,
    isTemporaryOperator,
    getExpirationInfo
  };
};