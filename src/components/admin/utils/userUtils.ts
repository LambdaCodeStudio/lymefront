/**
 * Utilidades para el manejo de usuarios en el panel administrativo
 * Funciones auxiliares para mostrar información de usuario y filtrado
 */
import type { AdminUser } from '../services/userService';

/**
 * Obtiene el identificador principal del usuario (email, usuario o ID)
 * @param user - Usuario a procesar
 * @returns Cadena con el identificador principal
 */
export function getUserIdentifier(user: AdminUser): string {
  return user.email || user.usuario || `Usuario ID: ${user._id.substring(0, 8)}`;
}

/**
 * Obtiene el nombre completo del usuario si está disponible
 * @param user - Usuario a procesar
 * @returns Nombre completo o null si no hay información
 */
export function getFullName(user: AdminUser): string | null {
  if (user.nombre || user.apellido) {
    return `${user.nombre || ''} ${user.apellido || ''}`.trim();
  }
  return null;
}

/**
 * Filtra una lista de usuarios según criterios de búsqueda
 * @param users - Lista de usuarios a filtrar
 * @param searchTerm - Término de búsqueda
 * @param showInactive - Si se deben mostrar usuarios inactivos
 * @returns Lista filtrada de usuarios
 */
export function filterUsers(
  users: AdminUser[],
  searchTerm: string,
  showInactive: boolean
): AdminUser[] {
  return users.filter(user => {
    // Filtro por texto de búsqueda
    const searchFields = [
      user.email?.toLowerCase() || '',
      user.usuario?.toLowerCase() || '',
      user.nombre?.toLowerCase() || '',
      user.apellido?.toLowerCase() || '',
      user.role.toLowerCase()
    ];
    
    const matchesSearch = searchFields.some(field => 
      field.includes(searchTerm.toLowerCase())
    );
    
    // Filtro por estado activo/inactivo
    return matchesSearch && (showInactive || user.isActive);
  });
}

/**
 * Obtiene el estado de activación en formato legible
 * @param user - Usuario a evaluar
 * @returns Cadena con el estado de activación
 */
export function getUserStatus(user: AdminUser): string {
  if (!user.isActive) {
    return 'Inactivo';
  }
  
  if (user.role === 'temporal') {
    if (user.expiresAt && new Date(user.expiresAt) > new Date()) {
      return 'Temporal Activo';
    }
    return 'Expirado';
  }
  
  return 'Activo';
}

/**
 * Obtiene las clases CSS para el estado de un usuario
 * @param user - Usuario a evaluar
 * @returns Clases CSS para mostrar el estado
 */
export function getUserStatusClasses(user: AdminUser): string {
  if (!user.isActive) {
    return 'bg-red-100 text-red-800';
  }
  
  if (user.role === 'temporal') {
    if (user.expiresAt && new Date(user.expiresAt) > new Date()) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-red-100 text-red-800';
  }
  
  return 'bg-green-100 text-green-800';
}