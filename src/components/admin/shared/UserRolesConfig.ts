/**
 * Configuración de roles de usuario y sus permisos
 * Define los tipos de roles y las funciones para gestionar permisos
 */
export type RoleType = 'admin' | 'supervisor_de_supervisores' | 'supervisor' | 'operario' | 'temporario';

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
        { value: 'supervisor_de_supervisores', label: 'Supervisor de Supervisores' },
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'operario', label: 'Operario' },
        { value: 'temporario', label: 'Temporario' }
      ];
    case 'supervisor_de_supervisores':
      return [
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'operario', label: 'Operario' },
        { value: 'temporario', label: 'Temporario' }
      ];
    case 'supervisor':
      return [
        { value: 'operario', label: 'Operario' },
        { value: 'temporario', label: 'Temporario' }
      ];
    default:
      return [
        { value: 'temporario', label: 'Temporario' }
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
    'supervisor_de_supervisores': 'Supervisor de Supervisores',
    'supervisor': 'Supervisor',
    'operario': 'Operario',
    'temporario': 'Temporario'
  };
  
  return roleMap[role] || role;
}