// src/types/users.d.ts

// Roles actualizados según la nueva jerarquía
export type UserRole = 
  | 'admin'                    // Sin cambios
  | 'supervisor_de_supervisores' // Antes era 'supervisor'
  | 'supervisor'               // Antes era 'basic'
  | 'operario'                 // Nuevo rol
  | 'temporario';              // Antes era 'temporal'

export interface User {
  _id: string;
  usuario?: string;           // Cambiado de email a usuario
  nombre?: string;
  apellido?: string;
  role: UserRole;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos'; // Nueva propiedad de secciones
  isActive?: boolean;
  expiresAt?: string | Date;  // Para usuarios temporales
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  user?: User;
}

export interface CreateUserDTO {
  usuario: string;            // Cambiado de email a usuario
  password: string;
  role: UserRole;
  nombre?: string;
  apellido?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
  isTemporary?: boolean;      // Nuevo campo para indicar si un operario es temporal
}

export interface UpdateUserDTO {
  usuario?: string;           // Cambiado de email a usuario
  password?: string;
  role?: UserRole;
  nombre?: string;
  apellido?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
  isActive?: boolean;
  isTemporary?: boolean;      // Para activar/desactivar temporalidad en operarios
}