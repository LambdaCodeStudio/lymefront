/**
 * Configuración de roles de usuario para el sistema
 * Define la estructura de roles y permisos disponibles
 */

// Tipos de roles disponibles en el sistema
export type RoleType = 'admin' | 'supervisor' | 'basic' | 'temporal';

// Configuración de un rol
export interface RoleConfig {
  value: RoleType;
  label: string;
  canCreate?: RoleType[]; // Roles que este rol puede crear
  description?: string;
}

// Interfaz para las opciones de roles disponibles
export interface RoleOption {
  value: RoleType;
  label: string;
}

/**
 * Configuración completa de roles del sistema
 * Incluye todos los roles y sus propiedades
 */
export const ROLES_CONFIG: Record<RoleType, RoleConfig> = {
  admin: {
    value: 'admin',
    label: 'Administrador',
    canCreate: ['supervisor', 'basic', 'temporal'],
    description: 'Acceso completo al sistema'
  },
  supervisor: {
    value: 'supervisor',
    label: 'Supervisor',
    canCreate: ['basic', 'temporal'],
    description: 'Gestión de usuarios básicos y temporales'
  },
  basic: {
    value: 'basic',
    label: 'Básico',
    canCreate: ['temporal'],
    description: 'Acceso básico a funcionalidades'
  },
  temporal: {
    value: 'temporal',
    label: 'Temporal',
    canCreate: [],
    description: 'Acceso temporal con expiración'
  }
};

/**
 * Obtiene las opciones de roles disponibles para un rol específico
 * @param userRole - Rol del usuario actual
 * @returns Array de opciones de roles disponibles
 */
export function getAvailableRoles(userRole: RoleType | null): RoleOption[] {
  // Si no hay rol definido, solo permitir usuarios temporales
  if (!userRole || !ROLES_CONFIG[userRole]) {
    return [{ value: 'temporal', label: 'Temporal' }];
  }
  
  // Obtener lista de roles que puede crear según configuración
  const canCreate = ROLES_CONFIG[userRole].canCreate || [];
  
  // Convertir a formato de opciones
  return canCreate.map(role => ({
    value: role,
    label: ROLES_CONFIG[role].label
  }));
}