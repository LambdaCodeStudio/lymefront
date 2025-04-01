import { User } from '@/types/users';

// Constante con roles para usar en los componentes
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario'
};

// Nombres cortos para roles en pantallas pequeñas
export const shortRoleNames = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPERVISOR_DE_SUPERVISORES]: 'Sup. de Sups.',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.OPERARIO]: 'Operario'
};

// Función para verificar si el usuario tiene fecha de expiración
export const hasExpiration = (user: User): boolean => {
  return user.role === ROLES.OPERARIO && Boolean(user.expiresAt);
};

// Función para verificar si un usuario puede modificar a otro según jerarquía
export const canModifyUser = (currentUserRole: string, targetUserRole: string): boolean => {
  // Administrador puede modificar a cualquiera
  if (currentUserRole === ROLES.ADMIN) return true;
  
  // Supervisor de supervisores puede modificar a supervisores y roles inferiores
  if (currentUserRole === ROLES.SUPERVISOR_DE_SUPERVISORES) {
    return ![ROLES.ADMIN, ROLES.SUPERVISOR_DE_SUPERVISORES].includes(targetUserRole);
  }
  
  // Otros roles no pueden modificar usuarios
  return false;
};

// Función para verificar si un usuario puede ser desactivado o eliminado
export const canDeleteOrDeactivate = (userRole: string): boolean => userRole !== ROLES.ADMIN;

// Función para obtener el nombre del creador de un usuario
export const getCreatorName = (user: User): string => {
  // Si no hay información del creador
  if (!user.createdBy) return '-';
  
  // Si createdBy es un objeto con propiedades
  if (typeof user.createdBy === 'object' && user.createdBy !== null) {
    if (user.createdBy.nombre && user.createdBy.apellido) {
      return `${user.createdBy.nombre} ${user.createdBy.apellido}`;
    } else if (user.createdBy.nombre) {
      return user.createdBy.nombre;
    } else if (user.createdBy.usuario) {
      return user.createdBy.usuario;
    }
  }
  
  // Si createdBy es un string (ID) o no tiene propiedades reconocibles
  return 'Admin';
};

// Función para determinar la clase CSS según el estado del usuario
export const getUserStatusClass = (user: User): string => {
  if (!user.isActive) {
    return 'bg-red-100 text-red-800';
  }
  
  if (hasExpiration(user)) {
    // Verificar si la expiración es en el futuro
    return user.expiresAt && new Date(user.expiresAt) > new Date()
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';
  }
  
  return 'bg-green-100 text-green-800';
};

// Función para obtener el texto de estado del usuario
export const getUserStatusText = (user: User): string => {
  if (!user.isActive) {
    return 'Inactivo';
  }
  
  if (hasExpiration(user)) {
    return user.expiresAt && new Date(user.expiresAt) > new Date()
      ? 'Temporal Activo'
      : 'Expirado';
  }
  
  return 'Activo';
};

// Función para obtener la clase CSS según el rol del usuario
export const getRoleBadgeClass = (role: string): string => {
  switch (role) {
    case ROLES.ADMIN:
      return 'border-purple-500 text-purple-700 bg-purple-50';
    case ROLES.SUPERVISOR_DE_SUPERVISORES:
      return 'border-blue-500 text-blue-700 bg-blue-50';
    case ROLES.SUPERVISOR:
      return 'border-cyan-500 text-cyan-700 bg-cyan-50';
    case ROLES.OPERARIO:
      return 'border-green-500 text-green-700 bg-green-50';
    default:
      return '';
  }
};