// src/types/users.ts
export type UserRole = 'admin' | 'supervisor' | 'basic' | 'temporal';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  lastLogin?: string;
  createdBy?: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  role: UserRole;
  expiresAt?: string;
}

export interface UpdateUserDTO {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  expiresAt?: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  user?: User;
}