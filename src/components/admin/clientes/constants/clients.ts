/**
 * Configuración para caché y almacenamiento
 */
export const CACHE_CONFIG = {
    EXPIRY_TIME: 5 * 60 * 1000, // 5 minutos en milisegundos
    KEYS: {
      CLIENTS: 'lyme_clients_cache',
      USERS: 'lyme_users_cache',
      SUPERVISORS: 'lyme_supervisors_cache',
      UNASSIGNED_CLIENTS: 'lyme_unassigned_clients_cache',
      UNASSIGNED_SUBSERVICES: 'lyme_unassigned_subservices_cache'
    }
  };
  
  /**
   * Configuración de API endpoints
   */
  export const API_ENDPOINTS = {
    CLIENTS: {
      BASE: '/api/cliente',
      BY_SUPERVISOR: (supervisorId: string) => `/api/cliente/supervisor/${supervisorId}`,
      UNASSIGNED: '/api/cliente/sin-asignar',
      SUBSERVICES_UNASSIGNED: '/api/cliente/subservicios/sin-supervisor',
      CLIENT: (clientId: string) => `/api/cliente/${clientId}`,
      SUBSERVICIO: (clientId: string) => `/api/cliente/${clientId}/subservicio`,
      SUBSERVICIO_BY_ID: (clientId: string, subservicioId: string) => 
        `/api/cliente/${clientId}/subservicio/${subservicioId}`,
      SUPERVISOR: (clientId: string, subservicioId: string) => 
        `/api/cliente/${clientId}/subservicio/${subservicioId}/supervisor`,
      SUBUBICACION: (clientId: string, subservicioId: string) => 
        `/api/cliente/${clientId}/subservicio/${subservicioId}/sububicacion`,
      SUBUBICACION_BY_ID: (clientId: string, subservicioId: string, sububicacionId: string) => 
        `/api/cliente/${clientId}/subservicio/${subservicioId}/sububicacion/${sububicacionId}`
    },
    USERS: {
      ALL: '/api/auth/users',
      SUPERVISORS: '/api/auth/supervisors'
    }
  };
  
  /**
   * Mensajes predefinidos para notificaciones
   */
  export const NOTIFICATION_MESSAGES = {
    ERROR: {
      LOAD_CLIENTS: 'Error al cargar los clientes',
      LOAD_UNASSIGNED_CLIENTS: 'Error al cargar clientes sin asignar',
      LOAD_SUBSERVICES: 'Error al cargar subservicios sin supervisor',
      LOAD_USERS: 'Error al cargar usuarios. Algunas funciones pueden estar limitadas.',
      LOAD_SUPERVISORS: 'Error al cargar supervisores. Algunas funciones pueden estar limitadas.',
      CREATE_CLIENT: 'Error al crear cliente',
      UPDATE_CLIENT: 'Error al actualizar cliente',
      CREATE_SUBSERVICIO: 'Error al crear subservicio',
      UPDATE_SUBSERVICIO: 'Error al actualizar subservicio',
      ASSIGN_SUPERVISOR: 'Error al asignar supervisor',
      REMOVE_SUPERVISOR: 'Error al remover supervisor',
      CREATE_SUBUBICACION: 'Error al crear sububicación',
      UPDATE_SUBUBICACION: 'Error al actualizar sububicación',
      DELETE_GENERIC: (type: string) => `Error al eliminar ${type}`,
      NO_AUTH: 'No hay token de autenticación'
    },
    SUCCESS: {
      CREATE_CLIENT: (name: string) => `Cliente "${name}" creado correctamente`,
      UPDATE_CLIENT: (name: string) => `Cliente "${name}" actualizado correctamente`,
      CREATE_SUBSERVICIO: (name: string) => `Subservicio "${name}" creado correctamente`,
      UPDATE_SUBSERVICIO: (name: string) => `Subservicio "${name}" actualizado correctamente`,
      ASSIGN_SUPERVISOR: (supervisorName: string, subservicioName: string) => 
        `Supervisor "${supervisorName}" asignado correctamente al subservicio "${subservicioName}"`,
      REMOVE_SUPERVISOR: 'Supervisor removido correctamente del subservicio',
      CREATE_SUBUBICACION: (name: string) => `Sububicación "${name}" creada correctamente`,
      UPDATE_SUBUBICACION: (name: string) => `Sububicación "${name}" actualizada correctamente`,
      DELETE_CLIENT: 'Cliente eliminado correctamente',
      DELETE_SUBSERVICIO: 'Subservicio eliminado correctamente',
      DELETE_SUBUBICACION: 'Sububicación eliminada correctamente'
    },
    INFO: {
      UNASSIGNED_CLIENTS: (count: number) => 
        `Se encontraron ${count} clientes sin usuario asignado. Puede reasignarlos editándolos.`,
      UNASSIGNED_SUBSERVICES: (count: number) => 
        `Se encontraron ${count} subservicios sin supervisor asignado. Puede asignar supervisores desde el menú de opciones.`,
      CLEAR_USER_FILTER: 'Se ha limpiado el filtro de usuario',
      CLEAR_SUPERVISOR_FILTER: 'Se ha limpiado el filtro de supervisor'
    }
  };
  
  /**
   * Valores por defecto para inicialización
   */
  export const DEFAULT_VALUES = {
    CLIENT_FORM: {
      nombre: '',
      descripcion: '',
      userId: [],
      direccion: '',
      telefono: '',
      email: '',
      activo: true
    },
    SUBSERVICIO_FORM: {
      nombre: '',
      descripcion: '',
      supervisorId: ''
    },
    SUBUBICACION_FORM: {
      nombre: '',
      descripcion: ''
    },
    PAGINATION: {
      DESKTOP_ITEMS_PER_PAGE: 7,
      MOBILE_ITEMS_PER_PAGE: 3
    },
    FILTER_STATE: {
      ALL: 'all',
      searchTerm: '',
      activeUserId: 'all',
      activeSupervisorId: 'all',
      viewMode: 'all' as const,
      showUnassignedSubservices: false,
      isMobileFilterOpen: false
    }
  };
  
  /**
   * Tiempos para operaciones
   */
  export const TIMING = {
    SUCCESS_MESSAGE_DURATION: 5000, // 5 segundos
    NOTIFICATION_DURATION: 8000, // 8 segundos para notificaciones importantes
  };