/**
 * Configuración de roles para la gestión de usuarios
 * Define nombres de roles, jerarquía y opciones disponibles para cada rol
 */

export type RoleOption = {
  value: string;
  label: string;
};

export type UserSection = 'limpieza' | 'mantenimiento' | 'ambos';

// Constantes de roles (alineadas con backend)
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario'
};

// Nombres de roles para mostrar en la interfaz
export const rolesDisplayNames = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.SUPERVISOR_DE_SUPERVISORES]: 'Supervisor de Supervisores',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.OPERARIO]: 'Operario'
};

// Versiones abreviadas para dispositivos móviles
export const shortRolesDisplayNames = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPERVISOR_DE_SUPERVISORES]: 'Sup. de Sups.',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.OPERARIO]: 'Operario'
};

// Opciones de roles que cada rol puede crear - alineado con lógica del backend
export const roleOptions: Record<string, RoleOption[]> = {
  [ROLES.ADMIN]: [
    { value: ROLES.ADMIN, label: 'Administrador' },
    { value: ROLES.SUPERVISOR_DE_SUPERVISORES, label: 'Supervisor de Supervisores' },
    { value: ROLES.SUPERVISOR, label: 'Supervisor' },
    { value: ROLES.OPERARIO, label: 'Operario' }
  ],
  [ROLES.SUPERVISOR_DE_SUPERVISORES]: [
    { value: ROLES.SUPERVISOR, label: 'Supervisor' },
    { value: ROLES.OPERARIO, label: 'Operario' }
  ],
  // Los demás roles no pueden crear usuarios
  [ROLES.SUPERVISOR]: [],
  [ROLES.OPERARIO]: [],
};