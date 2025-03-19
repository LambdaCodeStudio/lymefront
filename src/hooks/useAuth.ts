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

      // Usar withRetry para manejar posibles errores 429
      const user = await withRetry(
        () => userService.getCurrentUser(),
        2, // Menos reintentos para esta operación
        1000
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

  // Función de login actualizada para manejar la respuesta de la API con reintentos
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      // Usar withRetry para manejar errores 429 en el login
      const response = await withRetry(
        () => userService.login(email, password),
        3, // Máximo 3 reintentos
        1000 // Empezar con 1 segundo de espera
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
            2,
            1000
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
    removeStoredToken();
    setAuth({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
    window.location.href = '/login';
  };

  // Función para registrar nuevo usuario (con reintentos)
  const register = async (email: string, password: string, role: UserRole = 'basic'): Promise<User> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      const userData: CreateUserDTO = { email, password, role };
      
      // Usar withRetry para manejar posibles errores 429
      const user = await withRetry(
        () => userService.register(userData),
        3,
        1000
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