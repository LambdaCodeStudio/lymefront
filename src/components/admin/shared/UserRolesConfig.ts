/**
 * Configuración de roles de usuario y sus permisos
 * Define los tipos de roles y las funciones para gestionar permisos
 */
export type RoleType = 'admin' | 'supervisor' | 'basic' | 'temporal';

export interface RoleOption {
  value: RoleType;
  label: string;
}

/**
 * Obtiene los roles disponibles para crear o editar usuarios
 * basados en el rol del usuario actual
 * @param userRole - Rol del usuario actual
 * @returns Lista de roles disponibles
 */
export function getAvailableRoles(userRole: RoleType | null): RoleOption[] {
  switch (userRole) {
    case 'admin':
      return [
        { value: 'admin', label: 'Administrador' },
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'basic', label: 'Básico' },
        { value: 'temporal', label: 'Temporal' }
      ];
    case 'supervisor':
      return [
        { value: 'basic', label: 'Básico' },
        { value: 'temporal', label: 'Temporal' }
      ];
    case 'basic':
      return [
        { value: 'temporal', label: 'Temporal' }
      ];
    default:
      return [
        { value: 'basic', label: 'Básico' }
      ];
  }
}

/**
 * Verifica si un usuario con cierto rol puede crear usuarios con otro rol
 * @param creatorRole - Rol del usuario creador
 * @param targetRole - Rol que se intenta crear
 * @returns true si está permitido, false si no
 */
export function canCreateRole(creatorRole: RoleType, targetRole: RoleType): boolean {
  const availableRoles = getAvailableRoles(creatorRole);
  return availableRoles.some(role => role.value === targetRole);
}

/**
 * Obtiene el nombre mostrable de un rol
 * @param role - Tipo de rol
 * @returns Nombre en español del rol
 */
export function getRoleName(role: RoleType): string {
  const roleMap: Record<RoleType, string> = {
    'admin': 'Administrador',
    'supervisor': 'Supervisor',
    'basic': 'Básico',
    'temporal': 'Temporal'
  };
  
  return roleMap[role] || role;
}