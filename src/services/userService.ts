// src/services/userService.ts
import { BaseService } from './baseService';
import api from './api';
import type { User, CreateUserDTO, LoginResponse } from '@/types/users';

class UserService extends BaseService<User> {
  constructor() {
    super('/auth/users');
  }

  // Autenticación
  async login(email: string, password: string): Promise<LoginResponse> {
    return await api.post<LoginResponse>('/auth/login', { email, password });
  }

  async register(userData: CreateUserDTO): Promise<User> {
    return await api.post<User>('/auth/register', userData);
  }

  // Métodos específicos para usuarios
  async getCurrentUser(): Promise<User> {
    return await api.get<User>('/auth/me');
  }
  
  async createTemporaryUser(userData: CreateUserDTO): Promise<User> {
    return await api.post<User>('/auth/temporary', userData);
  }

  async toggleUserStatus(userId: string): Promise<User> {
    return await api.put<User>(`/auth/users/${userId}/toggle-status`);
  }

  // Método para crear usuario determinando el endpoint según el rol
  async createUser(userData: CreateUserDTO): Promise<User> {
    const endpoint = userData.role === 'temporal' 
      ? '/auth/temporary' 
      : '/auth/register';
      
    return await api.post<User>(endpoint, userData);
  }
}

// Exportar instancia singleton
export const userService = new UserService();