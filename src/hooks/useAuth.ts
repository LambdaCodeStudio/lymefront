// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'supervisor' | 'basic' | 'temporal';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface LoginResponse {
  token: string;
  user: User;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = getStoredToken();
      
      if (!token) {
        setAuth({ user: null, isAuthenticated: false, loading: false });
        return;
      }

      const { data } = await api.get('/api/auth/me');
      setAuth({
        user: data,
        isAuthenticated: true,
        loading: false
      });
    } catch (error) {
      console.error('Error checking auth:', error);
      removeStoredToken();
      setAuth({
        user: null,
        isAuthenticated: false,
        loading: false
      });
    }
  };

  const getStoredToken = (): string | null => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] || null;
  };

  const setStoredToken = (token: string) => {
    document.cookie = `token=${token}; path=/; max-age=86400; secure; samesite=strict`;
  };

  const removeStoredToken = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  };

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password
      });

      // Verificar que recibimos los datos necesarios
      if (!data.token || !data.user) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Guardar token
      setStoredToken(data.token);

      // Actualizar estado
      setAuth({
        user: data.user,
        isAuthenticated: true,
        loading: false
      });

      return data;
    } catch (error: any) {
      // Si el error viene del servidor, usar ese mensaje
      if (error.response?.data?.msg) {
        throw new Error(error.response.data.msg);
      }
      // Si es un error de red u otro tipo
      throw new Error('Error al iniciar sesión');
    }
  };

  const logout = () => {
    removeStoredToken();
    setAuth({
      user: null,
      isAuthenticated: false,
      loading: false
    });
    window.location.href = '/login';
  };

  const registerAdmin = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const { data } = await api.post<LoginResponse>('/api/auth/register/admin', {
        email,
        password
      });

      setStoredToken(data.token);
      setAuth({
        user: data.user,
        isAuthenticated: true,
        loading: false
      });

      return data;
    } catch (error: any) {
      if (error.response?.data?.msg) {
        throw new Error(error.response.data.msg);
      }
      throw new Error('Error al registrar administrador');
    }
  };

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    login,
    logout,
    registerAdmin,
    checkAuth
  };
};