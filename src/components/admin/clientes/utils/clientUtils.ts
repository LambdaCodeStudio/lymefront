import { CACHE_CONFIG } from '../constants/clients';
import type { 
  Client, 
  SupervisorData, 
  UserExtended, 
  DeleteConfirmation, 
  SubServicio,
  CreateClientData, 
  CreateSubServicioData, 
  CreateSubUbicacionData 
} from '../types/clients';

/**
 * Obtiene datos de la caché local
 * @param key Clave de caché
 * @returns Datos almacenados o null si no existen o han expirado
 */
export const getFromCache = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;

  const cachedData = localStorage.getItem(key);
  if (!cachedData) return null;

  try {
    const { data, timestamp } = JSON.parse(cachedData);
    // Verificar si la caché ha expirado
    if (Date.now() - timestamp > CACHE_CONFIG.EXPIRY_TIME) {
      localStorage.removeItem(key);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error(`Error parsing cached ${key}:`, error);
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Guarda datos en la caché local
 * @param key Clave de caché
 * @param data Datos a almacenar
 */
export const saveToCache = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;

  const cacheData = {
    data,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving to cache ${key}:`, error);
  }
};

/**
 * Invalida claves de caché específicas
 * @param keys Array de claves para invalidar
 */
export const invalidateCache = (keys: string[]): void => {
  if (typeof window === 'undefined') return;
  keys.forEach(key => localStorage.removeItem(key));
};

/**
 * Obtiene token de autenticación del almacenamiento local
 * @returns Token o null si no está disponible
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

/**
 * Extrae IDs de usuario de un cliente, manejando diferentes estructuras de datos
 * @param client Cliente del que extraer IDs
 * @returns Array de IDs de usuarios
 */
export const extractUserIds = (client: Client): string[] => {
  if (!client.userId) return [];

  if (Array.isArray(client.userId)) {
    return client.userId.map(id =>
      typeof id === 'object' && id !== null && id._id ? id._id : String(id)
    );
  } else {
    return [typeof client.userId === 'object' && client.userId._id ? client.userId._id : String(client.userId)];
  }
};

/**
 * Genera un identificador legible para un usuario
 * @param userId ID del usuario
 * @param users Lista de usuarios disponibles
 * @returns Identificador legible (email, nombre, etc.)
 */
export const getUserIdentifier = (userId: string, users: UserExtended[]): string => {
  const user = users.find(u => u._id === userId);
  if (!user) return `ID: ${userId.substring(0, 8)}`;

  // Priorizar mostrar el email
  if (user.email) return user.email;
  if (user.usuario) return user.usuario;
  if (user.nombre && user.apellido) return `${user.nombre} ${user.apellido}`;
  if (user.nombre) return user.nombre;
  
  return `ID: ${userId.substring(0, 8)}`;
};

/**
 * Genera un identificador legible para un usuario con su rol
 * @param userId ID del usuario
 * @param users Lista de usuarios disponibles
 * @returns Identificador legible con rol
 */
export const getUserIdentifierWithRole = (userId: string, users: UserExtended[]): string => {
  const user = users.find(u => u._id === userId);
  if (!user) return 'Usuario no encontrado';

  // Crear el identificador
  let identifier = getUserIdentifier(userId, users);
  
  // Agregar etiqueta de rol para más claridad
  const roleName = user.role === 'supervisor' ? 'Supervisor' : 'Usuario';

  return `${identifier} - ${roleName}`;
};

/**
 * Genera un identificador legible para un supervisor
 * @param supervisorId ID del supervisor
 * @param supervisors Lista de supervisores disponibles
 * @returns Identificador legible del supervisor
 */
export const getSupervisorIdentifier = (supervisorId: string, supervisors: SupervisorData[]): string => {
  const supervisor = supervisors.find(s => s._id === supervisorId);
  if (!supervisor) return `ID: ${supervisorId.substring(0, 8)}`;

  if (supervisor.email) return supervisor.email;
  if (supervisor.usuario) return supervisor.usuario;
  if (supervisor.nombre && supervisor.apellido) return `${supervisor.nombre} ${supervisor.apellido}`;
  if (supervisor.nombre) return supervisor.nombre;
  
  return `ID: ${supervisorId.substring(0, 8)}`;
};

/**
 * Determina si un cliente tiene subservicios sin supervisor asignado
 * @param client Cliente a verificar
 * @returns true si hay subservicios sin supervisor
 */
export const clientHasUnassignedSubservices = (client: Client): boolean => {
  return client.subServicios.some(subservicio =>
    !subservicio.supervisorId || subservicio.requiereSupervisor
  );
};

/**
 * Obtiene un mensaje descriptivo para confirmar la eliminación
 * @param itemToDelete Información del elemento a eliminar
 * @param clients Lista de clientes disponibles
 * @returns Mensaje descriptivo
 */
export const getDeleteConfirmationMessage = (
  itemToDelete: DeleteConfirmation,
  clients: Client[]
): string => {
  if (!itemToDelete) return '';
  
  switch (itemToDelete.type) {
    case 'cliente':
      return 'Se eliminará este cliente junto con todos sus subservicios y sububicaciones.';
    case 'subservicio':
      return 'Se eliminará este subservicio junto con todas sus sububicaciones.';
    case 'sububicacion':
      return 'Se eliminará esta sububicación.';
    case 'supervisor':
      return 'Se removerá el supervisor de este subservicio.';
    default:
      return 'Esta acción no se puede deshacer.';
  }
};

/**
 * Filtra clientes según término de búsqueda y filtros activos
 * @param clients Lista de clientes
 * @param searchTerm Término de búsqueda
 * @param activeUserId ID de usuario activo (o "all")
 * @param activeSupervisorId ID de supervisor activo (o "all") 
 * @param viewMode Modo de vista ('all' o 'unassigned')
 * @returns Lista de clientes filtrada
 */
export const filterClients = (
  clients: Client[],
  searchTerm: string,
  activeUserId: string,
  activeSupervisorId: string,
  viewMode: 'all' | 'unassigned'
): Client[] => {
  return clients.filter(client => {
    // Si estamos en vista de subservicios sin supervisor, solo mostrar clientes relevantes
    if (viewMode === 'unassigned') {
      return clientHasUnassignedSubservices(client);
    }

    // Filtro por texto de búsqueda
    const searchFields = [
      client.nombre,
      client.descripcion,
      client.email,
      client.telefono,
      client.direccion
    ].filter(Boolean).map(field => field.toLowerCase());

    // También buscar en subservicios y sububicaciones
    if (client.subServicios) {
      client.subServicios.forEach(subServicio => {
        searchFields.push(subServicio.nombre.toLowerCase());
        if (subServicio.descripcion) searchFields.push(subServicio.descripcion.toLowerCase());

        if (subServicio.subUbicaciones) {
          subServicio.subUbicaciones.forEach(subUbicacion => {
            searchFields.push(subUbicacion.nombre.toLowerCase());
            if (subUbicacion.descripcion) searchFields.push(subUbicacion.descripcion.toLowerCase());
          });
        }
      });
    }

    const matchesSearch = !searchTerm || searchFields.some(field =>
      field.includes(searchTerm.toLowerCase())
    );

    // Filtro por usuario seleccionado
    let matchesUser = activeUserId === "all";

    // Si userId es un array, verificar si incluye activeUserId
    if (activeUserId !== "all" && Array.isArray(client.userId)) {
      const userIds = client.userId.map(id =>
        typeof id === 'object' && id !== null && id._id ? id._id.toString() : id.toString()
      );
      matchesUser = userIds.includes(activeUserId);
    }
    // Si userId es un objeto, verificar si su _id es igual a activeUserId
    else if (activeUserId !== "all" && typeof client.userId === 'object' && client.userId !== null) {
      matchesUser = client.userId._id === activeUserId;
    }
    // Si userId es un string, verificar si es igual a activeUserId
    else if (activeUserId !== "all") {
      matchesUser = client.userId === activeUserId;
    }

    // Filtro por supervisor (si está aplicado)
    const matchesSupervisor = activeSupervisorId === "all" ||
      client.subServicios.some(subServicio =>
      (typeof subServicio.supervisorId === 'object' && subServicio.supervisorId !== null
        ? subServicio.supervisorId._id === activeSupervisorId
        : subServicio.supervisorId === activeSupervisorId)
      );

    return matchesSearch && matchesUser && matchesSupervisor;
  });
};

/**
 * Aplica paginación a un array de elementos
 * @param items Lista completa de elementos
 * @param currentPage Página actual
 * @param itemsPerPage Elementos por página
 * @returns Objecto con elementos paginados y metadatos
 */
export const applyPagination = <T>(
  items: T[],
  currentPage: number,
  itemsPerPage: number
): { paginatedItems: T[], totalItems: number, startIndex: number, endIndex: number } => {
  const totalItems = items.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    paginatedItems,
    totalItems,
    startIndex,
    endIndex
  };
};

/**
 * Maneja errores HTTP comunes y errores de autenticación
 * @param response Respuesta HTTP
 * @param defaultErrorMessage Mensaje de error por defecto
 * @returns Promise que resuelve o rechaza según el estado de la respuesta
 */
export const handleApiResponse = async (
  response: Response, 
  defaultErrorMessage: string
): Promise<any> => {
  if (!response.ok) {
    // Manejar error de autenticación
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      }
      throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }
    
    // Intentar obtener mensaje de error del servidor
    try {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || defaultErrorMessage);
    } catch (e) {
      // Si no se puede parsear como JSON, usar mensaje por defecto
      throw new Error(defaultErrorMessage);
    }
  }
  
  // Si la respuesta está vacía, devolver true (para operaciones DELETE, etc.)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return true;
  }
  
  // De lo contrario, devolver los datos JSON
  return await response.json();
};

/**
 * Valida los datos del formulario de cliente antes de enviar
 * @param data Datos del formulario de cliente
 * @returns Objeto con estado de validación y mensajes de error
 */
export const validateClientForm = (data: CreateClientData): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validar nombre
  if (!data.nombre || data.nombre.trim() === '') {
    errors.nombre = 'El nombre del cliente es obligatorio';
  }
  
  // Validar que haya al menos un supervisor asignado
  if (!Array.isArray(data.userId) || data.userId.length === 0) {
    errors.userId = 'Debe seleccionar al menos un supervisor';
  }
  
  // Validar email si está presente
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'El formato del email no es válido';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida los datos del formulario de subservicio antes de enviar
 * @param data Datos del formulario de subservicio
 * @returns Objeto con estado de validación y mensajes de error
 */
export const validateSubservicioForm = (data: CreateSubServicioData): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validar nombre
  if (!data.nombre || data.nombre.trim() === '') {
    errors.nombre = 'El nombre del subservicio es obligatorio';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida los datos del formulario de sububicación antes de enviar
 * @param data Datos del formulario de sububicación
 * @returns Objeto con estado de validación y mensajes de error
 */
export const validateSubUbicacionForm = (data: CreateSubUbicacionData): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validar nombre
  if (!data.nombre || data.nombre.trim() === '') {
    errors.nombre = 'El nombre de la sububicación es obligatorio';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Obtiene información de un supervisor a partir de un subservicio
 * @param subservicio Subservicio del que obtener información del supervisor
 * @param supervisors Lista de supervisores disponibles
 * @returns Información del supervisor o null
 */
export const getSupervisorFromSubservicio = (
  subservicio: SubServicio, 
  supervisors: SupervisorData[]
): { id: string, name: string } | null => {
  if (!subservicio.supervisorId) return null;
  
  if (typeof subservicio.supervisorId === 'object' && subservicio.supervisorId) {
    return {
      id: subservicio.supervisorId._id,
      name: subservicio.supervisorId.email || 
            subservicio.supervisorId.usuario || 
            `${subservicio.supervisorId.nombre || ''} ${subservicio.supervisorId.apellido || ''}`.trim()
    };
  } else if (typeof subservicio.supervisorId === 'string') {
    return {
      id: subservicio.supervisorId,
      name: getSupervisorIdentifier(subservicio.supervisorId, supervisors)
    };
  }
  
  return null;
};

/**
 * Obtiene supervisores disponibles para un cliente específico
 * @param client Cliente del que obtener supervisores disponibles
 * @param supervisors Lista de todos los supervisores
 * @returns Lista de supervisores disponibles para el cliente
 */
export const getAvailableSupervisorsForClient = (
  client: Client | null, 
  supervisors: SupervisorData[]
): SupervisorData[] => {
  if (!client || !Array.isArray(client.userId)) return [];
  
  return supervisors.filter(supervisor => 
    client.userId.some(userId => 
      typeof userId === 'object' && userId !== null && userId._id 
        ? userId._id === supervisor._id
        : userId === supervisor._id
    )
  );
};

/**
 * Crea un cliente mínimo a partir de datos limitados
 * Útil cuando no tenemos acceso al cliente completo
 * @param clientId ID del cliente
 * @param clientName Nombre del cliente
 * @param userId ID o IDs de usuario
 * @returns Objeto cliente mínimo
 */
export const createMinimalClient = (
  clientId: string, 
  clientName: string, 
  userId: string | string[] | UserExtended | UserExtended[]
): Client => {
  // Normalizar userId como array
  const normalizedUserIds = Array.isArray(userId) 
    ? userId.map(id => typeof id === 'object' ? id : id.toString())
    : [typeof userId === 'object' ? userId : userId.toString()];
  
  return {
    _id: clientId,
    nombre: clientName,
    descripcion: '',
    servicio: clientName,
    seccionDelServicio: '',
    userId: normalizedUserIds,
    subServicios: [],
    direccion: '',
    telefono: '',
    email: '',
    activo: true
  };
};