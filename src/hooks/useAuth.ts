// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import  userService from '@/services/userService';
import type { User, LoginResponse, UserRole, CreateUserDTO } from '@/types/users';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

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

  // Verificar autenticación al iniciar
  const checkAuth = useCallback(async () => {
    try {
      const token = getStoredToken();
      
      if (!token) {
        setAuth({ user: null, isAuthenticated: false, loading: false, error: null });
        return false;
      }

      const user = await userService.getCurrentUser();
      
      setAuth({
        user,
        isAuthenticated: true,
        loading: false,
        error: null
      });
      
      return true;
    } catch (error) {
      console.error('Error checking auth:', error);
      removeStoredToken();
      setAuth({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: 'Sesión expirada o inválida'
      });
      
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Función de login actualizada para manejar la respuesta de la API
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await userService.login(email, password);
      
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
        
        // Intentar obtener los datos completos del usuario
        try {
          const fullUserData = await userService.getCurrentUser();
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
      // Actualizar estado con el error
      console.error('Error detallado del login:', error);
      setAuth(prev => ({ 
        ...prev, 
        loading: false,
        error: error.message || 'Error al iniciar sesión'
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

  // Función para registrar nuevo usuario
  const register = async (email: string, password: string, role: UserRole = 'basic'): Promise<User> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      const userData: CreateUserDTO = { email, password, role };
      const user = await userService.register(userData);

      // No autenticamos automáticamente tras el registro
      setAuth(prev => ({ ...prev, loading: false }));

      return user;
    } catch (error: any) {
      setAuth(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Error al registrar usuario'
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