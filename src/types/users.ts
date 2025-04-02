/**
 * Tipos para definir estructura de usuarios basada en el modelo de backend
 */
import { ROLES } from './UserRolesConfig';

export type UserRole = 
  | 'admin'
  | 'supervisor_de_supervisores'
  | 'supervisor'
  | 'operario';

export type UserSection = 'limpieza' | 'mantenimiento' | 'ambos';

export interface CreatedByUser {
  _id: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
}

export interface User {
  _id: string;
  usuario: string;
  nombre?: string;
  apellido?: string;
  role: UserRole;
  secciones: UserSection;
  celular?: string;
  email?: string;
  isActive: boolean;
  createdBy?: CreatedByUser;
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date | null;
  expirationInfo?: {
    expired: boolean;
    expirationDate: Date;
    minutesRemaining: number;
  };
  // Agregamos la propiedad supervisorId para operarios
  supervisorId?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    usuario: string;
    nombre?: string;
    role: UserRole;
    secciones: UserSection;
  };
}

export interface CreateUserDTO {
  usuario: string;
  password: string;
  nombre?: string;
  apellido?: string;
  role: UserRole;
  secciones: UserSection;
  celular?: string;
  isTemporary?: boolean;
  expirationMinutes?: number;
  supervisorId?: string;
}

export interface UpdateUserDTO {
  usuario?: string;
  nombre?: string;
  apellido?: string;
  password?: string;
  role?: UserRole;
  secciones?: UserSection;
  celular?: string;
  isActive?: boolean;
  isTemporary?: boolean;
  expirationMinutes?: number;
  supervisorId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * Interfaz para representar subservicios asignados a un operario
 */
export interface SubservicioAsignado {
  clienteId: string;
  subServicioId: string;
}

/**
 * Interfaces para tipos de cliente y subservicio
 */
export interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion?: string;
}

export interface SubServicio {
  _id: string;
  nombre: string;
  descripcion?: string;
  supervisorId?: string | User;
  subUbicaciones?: SubUbicacion[];
  operarios?: string[] | User[];
  isSelected?: boolean; // Para UI
  isExpanded?: boolean; // Para UI
}

export interface Cliente {
  _id: string;
  clienteId?: string; // Usado en respuestas específicas de la API
  nombreCliente?: string; // Usado en respuestas específicas de la API
  nombre: string;
  descripcion?: string;
  subServicios: SubServicio[];
  userId?: string | User;
  isExpanded?: boolean; // Para UI
}