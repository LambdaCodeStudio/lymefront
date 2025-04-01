import type { UserRole } from '@/types/users';

/**
 * Interfaz para las sububicaciones dentro de un subservicio
 */
export interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion: string;
}

/**
 * Datos básicos de un supervisor
 */
export interface SupervisorData {
  _id: string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

/**
 * Subservicio dentro de un cliente
 */
export interface SubServicio {
  _id: string;
  nombre: string;
  descripcion: string;
  supervisorId?: string | SupervisorData;
  requiereSupervisor?: boolean;
  subUbicaciones: SubUbicacion[];
}

/**
 * Estructura para subservicios que necesitan asignación de supervisor
 */
export interface UnassignedSubServicio {
  clienteId: string;
  nombreCliente: string;
  userId: string | UserExtended | UserExtended[];
  subServicios: SubServicio[];
}

/**
 * Usuario con información extendida
 */
export interface UserExtended {
  _id: string;
  email?: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
  role?: UserRole;
  isActive?: boolean;
  celular?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
  expiresAt?: string; // Para usuarios temporales
}

/**
 * Cliente con todos sus datos y relaciones
 */
export interface Client {
  _id: string;
  nombre: string;
  descripcion: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string[] | {
    _id: string;
    email?: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
  }[];
  subServicios: SubServicio[];
  direccion: string;
  telefono: string;
  email: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
  requiereAsignacion?: boolean; // Propiedad para marcar clientes que necesitan asignación
}

/**
 * Datos para crear un cliente nuevo
 */
export interface CreateClientData {
  nombre: string;
  descripcion: string;
  servicio?: string;
  seccionDelServicio?: string;
  userId: string[];
  direccion: string;
  telefono: string;
  email: string;
  activo: boolean;
}

/**
 * Datos para actualizar un cliente existente
 */
export interface UpdateClientData extends CreateClientData {
  id: string;
}

/**
 * Datos para crear un subservicio
 */
export interface CreateSubServicioData {
  nombre: string;
  descripcion: string;
  supervisorId?: string;
}

/**
 * Datos para crear una sububicación
 */
export interface CreateSubUbicacionData {
  nombre: string;
  descripcion: string;
}

/**
 * Tipo para los elementos a eliminar
 */
export type DeleteItemType = 'cliente' | 'subservicio' | 'sububicacion' | 'supervisor';

/**
 * Información para confirmar eliminación
 */
export interface DeleteConfirmation {
  id: string;
  type: DeleteItemType;
  parentId?: string;
  subServicioId?: string;
}

/**
 * Modos de visualización
 */
export type ViewMode = 'all' | 'unassigned';

/**
 * Estado del formulario de cliente
 */
export interface ClientFormState {
  isOpen: boolean;
  isEditing: boolean;
  currentClient: Client | null;
  formData: CreateClientData;
}

/**
 * Estado del formulario de subservicio
 */
export interface SubservicioFormState {
  isOpen: boolean;
  isEditing: boolean;
  currentClient: Client | null;
  currentSubservicio: SubServicio | null;
  formData: CreateSubServicioData;
}

/**
 * Estado del formulario de sububicación
 */
export interface SubUbicacionFormState {
  isOpen: boolean;
  isEditing: boolean;
  currentClient: Client | null;
  currentSubservicio: SubServicio | null;
  currentSubUbicacion: SubUbicacion | null;
  formData: CreateSubUbicacionData;
}

/**
 * Estado del formulario de asignación de supervisor
 */
export interface SupervisorFormState {
  isOpen: boolean;
  currentClient: Client | null;
  currentSubservicio: SubServicio | null;
  selectedSupervisorId: string;
}

/**
 * Estado de la operación de eliminación
 */
export interface DeleteOperationState {
  isConfirmOpen: boolean;
  isDeleting: boolean;
  itemToDelete: DeleteConfirmation | null;
}

/**
 * Estado de filtros de la UI
 */
export interface FilterState {
  searchTerm: string;
  activeUserId: string;
  activeSupervisorId: string;
  viewMode: ViewMode;
  showUnassignedSubservices: boolean;
  isMobileFilterOpen: boolean;
  expandedClientId: string | null;
  expandedSubservicioId: string | null;
}

/**
 * Estado de paginación
 */
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

/**
 * Opciones para selector múltiple de supervisores
 */
export interface MultiSupervisorSelectProps {
  supervisors: SupervisorData[];
  selectedSupervisors?: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}