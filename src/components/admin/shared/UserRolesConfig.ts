/**
 * Configuración de roles y permisos para el sistema
 * Actualizada con la nueva estructura de roles
 */

// Constantes de roles
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario',
  TEMPORARIO: 'temporario'
};

// Tipo para opciones de rol en UI
export interface RoleOption {
  value: string;
  label: string;
}

// Opciones de roles para la UI
export const roleOptions: Record<string, RoleOption[]> = {
  // Opciones disponibles para administrador
  [ROLES.ADMIN]: [
    { value: ROLES.ADMIN, label: 'Administrador' },
    { value: ROLES.SUPERVISOR_DE_SUPERVISORES, label: 'Supervisor de Supervisores' },
    { value: ROLES.SUPERVISOR, label: 'Supervisor' },
    { value: ROLES.OPERARIO, label: 'Operario' },
    { value: ROLES.TEMPORARIO, label: 'Temporario' }
  ],
  // Opciones disponibles para supervisor de supervisores
  [ROLES.SUPERVISOR_DE_SUPERVISORES]: [
    { value: ROLES.SUPERVISOR, label: 'Supervisor' },
    { value: ROLES.OPERARIO, label: 'Operario' },
    { value: ROLES.TEMPORARIO, label: 'Temporario' }
  ],
  // Roles sin permisos de creación
  [ROLES.SUPERVISOR]: [],
  [ROLES.OPERARIO]: [],
  [ROLES.TEMPORARIO]: []
};

// Función para verificar permisos de creación
export const canCreateRole = (creatorRole: string, newRole: string): boolean => {
  switch (creatorRole) {
    case ROLES.ADMIN:
      return [ROLES.ADMIN, ROLES.SUPERVISOR_DE_SUPERVISORES, ROLES.SUPERVISOR, ROLES.OPERARIO, ROLES.TEMPORARIO].includes(newRole);
    case ROLES.SUPERVISOR_DE_SUPERVISORES:
      return [ROLES.SUPERVISOR, ROLES.OPERARIO, ROLES.TEMPORARIO].includes(newRole);
    default:
      return false;
  }
};

// Función para verificar permisos de edición
export const canEditRole = (editorRole: string, targetRole: string): boolean => {
  return canCreateRole(editorRole, targetRole);
};

// Función para obtener roles disponibles según el rol actual
export const getAvailableRoles = (currentRole: string): RoleOption[] => {
  return roleOptions[currentRole] || [];
};

// Función para verificar si un rol tiene permisos de administración
export const hasAdminPermissions = (role: string): boolean => {
  return [ROLES.ADMIN, ROLES.SUPERVISOR_DE_SUPERVISORES].includes(role);
};

// Función para verificar si un usuario es temporal (temporario o operario con expiración)
export const isTemporaryUser = (role: string, expiresAt: string | null): boolean => {
  return role === ROLES.TEMPORARIO || (role === ROLES.OPERARIO && !!expiresAt);
};

// Función para obtener el peso jerárquico de un rol (útil para ordenar)
export const getRoleWeight = (role: string): number => {
  switch (role) {
    case ROLES.ADMIN:
      return 100;
    case ROLES.SUPERVISOR_DE_SUPERVISORES:
      return 80;
    case ROLES.SUPERVISOR:
      return 60;
    case ROLES.OPERARIO:
      return 40;
    case ROLES.TEMPORARIO:
      return 20;
    default:
      return 0;
  }
};

export default {
  ROLES,
  roleOptions,
  canCreateRole,
  canEditRole,
  getAvailableRoles,
  hasAdminPermissions,
  isTemporaryUser,
  getRoleWeight
};