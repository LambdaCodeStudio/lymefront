/**
 * Utilidades para gestionar usuarios en el panel de administración
 * Actualizado para reflejar el nuevo esquema de usuario
 */
import type { AdminUser } from '../services/userService';
import { ROLES } from '../types/UserRolesConfig';

/**
 * Obtener identificador principal del usuario para mostrar
 * Ahora el identificador principal es 'usuario' en lugar de 'email'
 */
export const getUserIdentifier = (user: AdminUser): string => {
  if (!user) return 'Usuario no disponible';
  
  return user.usuario || `ID:${user._id.substring(0, 8)}`;
};

/**
 * Obtener nombre completo del usuario si está disponible
 */
export const getFullName = (user: AdminUser): string | null => {
  if (!user) return null;
  
  const nombre = user.nombre ? user.nombre.trim() : '';
  const apellido = user.apellido ? user.apellido.trim() : '';
  
  if (nombre || apellido) {
    return `${nombre} ${apellido}`.trim();
  }
  
  return null;
};

/**
 * Filtrar usuarios basado en término de búsqueda y estado activo
 */
export const filterUsers = (
  users: AdminUser[],
  searchTerm: string,
  showInactiveUsers: boolean,
  selectedRole: string | null
) => {
  return users.filter((user) => {
    // Filtrar por término de búsqueda
    const matchesSearch =
      searchTerm === '' ||
      user.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.apellido && user.apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.celular && user.celular.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtrar por estado activo/inactivo
    const matchesActiveState = showInactiveUsers || user.isActive;

    // Filtrar por rol
    const matchesRole = !selectedRole || user.role === selectedRole;

    return matchesSearch && matchesActiveState && matchesRole;
  });
};

/**
 * Verificar si un usuario es temporal (temporario o operario con expiración)
 */
export const isTemporaryUser = (user: AdminUser): boolean => {
  return (user.role === ROLES.OPERARIO && !!user.expiresAt);
};

/**
 * Verificar si un usuario puede ser modificado por el usuario actual
 */
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

/**
 * Obtener información sobre la expiración de un usuario temporal
 */
export const getExpirationInfo = (user: AdminUser): { expired: boolean, minutes: number } | null => {
  if (!user.expiresAt) return null;
  
  const now = new Date();
  const expirationDate = new Date(user.expiresAt);
  
  return {
    expired: now > expirationDate,
    minutes: Math.max(0, Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60)))
  };
};

export default {
  getUserIdentifier,
  getFullName,
  filterUsers,
  isTemporaryUser,
  canModifyUser,
  getExpirationInfo
};