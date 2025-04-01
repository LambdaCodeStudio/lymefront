import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotification } from '@/context/NotificationContext';
import useCache from './useCache';
import { getAuthToken, handleApiResponse } from '../utils/clientUtils';
import { CACHE_CONFIG, API_ENDPOINTS, NOTIFICATION_MESSAGES } from '../constants/clients';
import type {
  Client,
  UserExtended,
  SupervisorData,
  UnassignedSubServicio,
  CreateClientData,
  UpdateClientData,
  CreateSubServicioData,
  CreateSubUbicacionData
} from '../types/clients';

/**
 * Hook principal para la gestión de clientes y operaciones relacionadas
 */
export const useClientManager = (selectedUserId?: string) => {
  const { addNotification } = useNotification();
  const { getCached, saveCache, invalidate } = useCache();

  // Estados para datos
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserExtended[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
  const [unassignedSubservices, setUnassignedSubservices] = useState<UnassignedSubServicio[]>([]);
  
  // Estados para operaciones
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);

  // Estadísticas calculadas
  const totalUnassignedSubservices = useMemo(() => {
    return unassignedSubservices.reduce(
      (acc, client) => acc + client.subServicios.length, 0
    );
  }, [unassignedSubservices]);

  /**
   * Muestra un mensaje de éxito temporal
   */
  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
    
    if (addNotification) {
      addNotification(message, 'success');
    }
  }, [addNotification]);

  /**
   * Muestra un mensaje de error
   */
  const showErrorMessage = useCallback((message: string, errorObj?: any) => {
    const fullMessage = errorObj instanceof Error 
      ? `${message}: ${errorObj.message}` 
      : message;
    
    setError(fullMessage);
    
    if (addNotification) {
      addNotification(fullMessage, 'error');
    }
  }, [addNotification]);

  /**
   * Carga todos los clientes con soporte de caché
   */
  const fetchClients = useCallback(async (forceRefresh: boolean = false, supervisorId?: string) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh && !isDataRefreshing) {
        const cachedClients = getCached<Client[]>(CACHE_CONFIG.KEYS.CLIENTS);
        if (cachedClients) {
          console.log("Usando clientes desde caché");
          setClients(cachedClients);
          setLoading(false);
          return;
        }
      }

      if (isDataRefreshing) {
        console.log("Ya se está actualizando la lista de clientes, evitando petición duplicada");
        return;
      }

      setIsDataRefreshing(true);
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      // Determinar URL según si hay un filtro de supervisor
      let apiUrl = API_ENDPOINTS.CLIENTS.BASE;
      if (supervisorId && supervisorId !== "all") {
        apiUrl = API_ENDPOINTS.CLIENTS.BY_SUPERVISOR(supervisorId);
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.LOAD_CLIENTS);
      
      // Guardar en caché
      saveCache(CACHE_CONFIG.KEYS.CLIENTS, data);
      
      setClients(data);
      setError(null);
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.LOAD_CLIENTS, err);
    } finally {
      setLoading(false);
      setIsDataRefreshing(false);
    }
  }, [getCached, saveCache, isDataRefreshing, showErrorMessage]);

  /**
   * Carga clientes sin asignar con soporte de caché
   */
  const fetchClientsWithoutUser = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedUnassignedClients = getCached<Client[]>(CACHE_CONFIG.KEYS.UNASSIGNED_CLIENTS);
        if (cachedUnassignedClients) {
          console.log("Usando clientes sin asignar desde caché");

          // Agregar estos clientes al estado, marcándolos especialmente
          setClients(prevClients => {
            const clientsWithoutDuplicates = [...prevClients];

            // Añadir solo los que no están ya en la lista
            cachedUnassignedClients.forEach((newClient: Client) => {
              if (!clientsWithoutDuplicates.some(c => c._id === newClient._id)) {
                // Añadir propiedad para identificarlos visualmente
                clientsWithoutDuplicates.push({
                  ...newClient,
                  requiereAsignacion: true
                });
              }
            });

            return clientsWithoutDuplicates;
          });

          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      const response = await fetch(API_ENDPOINTS.CLIENTS.UNASSIGNED, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await handleApiResponse(
        response, 
        NOTIFICATION_MESSAGES.ERROR.LOAD_UNASSIGNED_CLIENTS
      );

      // Guardar en caché
      saveCache(CACHE_CONFIG.KEYS.UNASSIGNED_CLIENTS, data);

      // Agregar estos clientes al estado, marcándolos especialmente
      setClients(prevClients => {
        const clientsWithoutDuplicates = [...prevClients];

        // Añadir solo los que no están ya en la lista
        data.forEach((newClient: Client) => {
          if (!clientsWithoutDuplicates.some(c => c._id === newClient._id)) {
            // Añadir propiedad para identificarlos visualmente
            clientsWithoutDuplicates.push({
              ...newClient,
              requiereAsignacion: true
            });
          }
        });

        return clientsWithoutDuplicates;
      });

      // Mostrar alerta si hay clientes sin asignar
      if (data.length > 0 && addNotification) {
        addNotification(
          NOTIFICATION_MESSAGES.INFO.UNASSIGNED_CLIENTS(data.length), 
          'warning', 
          8000
        );
      }
    } catch (err) {
      console.error('Error al cargar clientes sin asignar:', err);
      if (addNotification) {
        addNotification(NOTIFICATION_MESSAGES.ERROR.LOAD_UNASSIGNED_CLIENTS, 'error');
      }
    }
  }, [getCached, saveCache, addNotification]);

  /**
   * Carga subservicios sin supervisor asignado
   */
  const fetchSubservicesWithoutSupervisor = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedUnassignedSubservices = getCached<UnassignedSubServicio[]>(
          CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES
        );
        if (cachedUnassignedSubservices) {
          console.log("Usando subservicios sin supervisor desde caché");
          setUnassignedSubservices(cachedUnassignedSubservices);
          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUBSERVICES_UNASSIGNED, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await handleApiResponse(
        response, 
        NOTIFICATION_MESSAGES.ERROR.LOAD_SUBSERVICES
      );

      // Guardar en caché
      saveCache(CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES, data);
      setUnassignedSubservices(data);

      // Mostrar alerta si hay subservicios sin supervisor
      if (data.length > 0 && addNotification) {
        const totalSubservicios = data.reduce((total, client) => total + client.subServicios.length, 0);
        addNotification(
          NOTIFICATION_MESSAGES.INFO.UNASSIGNED_SUBSERVICES(totalSubservicios), 
          'warning', 
          8000
        );
      }
    } catch (err) {
      console.error('Error al cargar subservicios sin supervisor:', err);
      if (addNotification) {
        addNotification(NOTIFICATION_MESSAGES.ERROR.LOAD_SUBSERVICES, 'error');
      }
    }
  }, [getCached, saveCache, addNotification]);

  /**
   * Carga la lista de usuarios con soporte de caché
   */
  const fetchUsers = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedUsers = getCached<UserExtended[]>(CACHE_CONFIG.KEYS.USERS);
        if (cachedUsers) {
          console.log("Usando usuarios desde caché");
          setUsers(cachedUsers);
          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      const response = await fetch(API_ENDPOINTS.USERS.ALL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.LOAD_USERS);

      // Filtrar usuarios válidos para asignar a clientes:
      // - Solo supervisores
      // - Solo usuarios activos
      const activeValidUsers = data.users.filter((user: UserExtended) => {
        // Verificar si es un rol válido (supervisor) y está activo
        const isValidRole = user.role === 'supervisor';
        const isActive = user.isActive === true;

        return isValidRole && isActive;
      });

      // Guardar en caché
      saveCache(CACHE_CONFIG.KEYS.USERS, activeValidUsers);
      setUsers(activeValidUsers);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      // Notificación para error de carga de usuarios (opcional)
      if (addNotification) {
        addNotification(NOTIFICATION_MESSAGES.ERROR.LOAD_USERS, 'warning');
      }
    }
  }, [getCached, saveCache, addNotification]);

  /**
   * Carga la lista de supervisores con soporte de caché
   */
  const fetchSupervisors = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedSupervisors = getCached<SupervisorData[]>(CACHE_CONFIG.KEYS.SUPERVISORS);
        if (cachedSupervisors) {
          console.log("Usando supervisores desde caché");
          setSupervisors(cachedSupervisors);
          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      const response = await fetch(API_ENDPOINTS.USERS.SUPERVISORS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.LOAD_SUPERVISORS);
      
      // Guardar en caché
      saveCache(CACHE_CONFIG.KEYS.SUPERVISORS, data.supervisors || []);
      setSupervisors(data.supervisors || []);
    } catch (err) {
      console.error('Error al cargar supervisores:', err);
      if (addNotification) {
        addNotification(NOTIFICATION_MESSAGES.ERROR.LOAD_SUPERVISORS, 'warning');
      }
    }
  }, [getCached, saveCache, addNotification]);

  /**
   * Crea un nuevo cliente
   */
  const createClient = useCallback(async (clientData: CreateClientData): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Creando cliente con datos:", clientData);

      const response = await fetch(API_ENDPOINTS.CLIENTS.BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clientData)
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.CREATE_CLIENT);

      // Invalidar caché después de crear cliente
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_CLIENTS]);
      await fetchClients(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.CREATE_CLIENT(clientData.nombre));
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.CREATE_CLIENT, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Actualiza un cliente existente
   */
  const updateClient = useCallback(async (updateData: UpdateClientData): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Actualizando cliente:", updateData.id, "con datos:", updateData);

      const response = await fetch(API_ENDPOINTS.CLIENTS.CLIENT(updateData.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.UPDATE_CLIENT);

      // Invalidar caché después de actualizar cliente
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_CLIENTS]);
      await fetchClients(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.UPDATE_CLIENT(updateData.nombre));
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.UPDATE_CLIENT, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Crea un nuevo subservicio para un cliente
   */
  const createSubServicio = useCallback(async (
    clientId: string,
    subservicioData: CreateSubServicioData
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Creando subservicio para cliente", clientId, "con datos:", subservicioData);

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUBSERVICIO(clientId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subservicioData)
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.CREATE_SUBSERVICIO);

      // Invalidar caché después de crear subservicio
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES]);
      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.CREATE_SUBSERVICIO(subservicioData.nombre));
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.CREATE_SUBSERVICIO, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, fetchSubservicesWithoutSupervisor, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Actualiza un subservicio existente
   */
  const updateSubServicio = useCallback(async (
    clientId: string,
    subservicioId: string,
    subservicioData: CreateSubServicioData
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Actualizando subservicio:", subservicioId, "del cliente:", clientId, "con datos:", subservicioData);

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUBSERVICIO_BY_ID(clientId, subservicioId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subservicioData)
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.UPDATE_SUBSERVICIO);

      // Invalidar caché después de actualizar subservicio
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES]);
      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.UPDATE_SUBSERVICIO(subservicioData.nombre));
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.UPDATE_SUBSERVICIO, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, fetchSubservicesWithoutSupervisor, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Asigna un supervisor a un subservicio
   */
  const assignSupervisor = useCallback(async (
    clientId: string,
    subservicioId: string,
    supervisorId: string,
    subservicioName: string,
    supervisorName: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Asignando supervisor", supervisorId, "al subservicio:", subservicioId, "del cliente:", clientId);

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUPERVISOR(clientId, subservicioId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ supervisorId })
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.ASSIGN_SUPERVISOR);

      // Invalidar caché después de asignar supervisor
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES]);
      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      
      showSuccessMessage(
        NOTIFICATION_MESSAGES.SUCCESS.ASSIGN_SUPERVISOR(supervisorName, subservicioName)
      );
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.ASSIGN_SUPERVISOR, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, fetchSubservicesWithoutSupervisor, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Elimina un supervisor de un subservicio
   */
  const removeSupervisor = useCallback(async (
    clientId: string,
    subservicioId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Removiendo supervisor del subservicio:", subservicioId, "del cliente:", clientId);

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUPERVISOR(clientId, subservicioId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.REMOVE_SUPERVISOR);

      // Invalidar caché
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES]);
      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.REMOVE_SUPERVISOR);
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.REMOVE_SUPERVISOR, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, fetchSubservicesWithoutSupervisor, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Crea una nueva sububicación para un subservicio
   */
  const createSubUbicacion = useCallback(async (
    clientId: string,
    subservicioId: string,
    sububicacionData: CreateSubUbicacionData
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Creando sububicación para subservicio", subservicioId, "del cliente", clientId, "con datos:", sububicacionData);

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUBUBICACION(clientId, subservicioId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sububicacionData)
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.CREATE_SUBUBICACION);

      // Invalidar caché después de crear sububicación
      invalidate([CACHE_CONFIG.KEYS.CLIENTS]);
      await fetchClients(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.CREATE_SUBUBICACION(sububicacionData.nombre));
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.CREATE_SUBUBICACION, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Actualiza una sububicación existente
   */
  const updateSubUbicacion = useCallback(async (
    clientId: string,
    subservicioId: string,
    sububicacionId: string,
    sububicacionData: CreateSubUbicacionData
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      console.log("Actualizando sububicación:", sububicacionId, "del subservicio:", subservicioId, "del cliente:", clientId, "con datos:", sububicacionData);

      const response = await fetch(API_ENDPOINTS.CLIENTS.SUBUBICACION_BY_ID(clientId, subservicioId, sububicacionId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sububicacionData)
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.UPDATE_SUBUBICACION);

      // Invalidar caché después de actualizar sububicación
      invalidate([CACHE_CONFIG.KEYS.CLIENTS]);
      await fetchClients(true);
      
      showSuccessMessage(NOTIFICATION_MESSAGES.SUCCESS.UPDATE_SUBUBICACION(sububicacionData.nombre));
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.UPDATE_SUBUBICACION, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, invalidate, showSuccessMessage, showErrorMessage]);

  /**
   * Elimina un elemento (cliente, subservicio o sububicación)
   */
  const deleteItem = useCallback(async (
    id: string,
    type: 'cliente' | 'subservicio' | 'sububicacion',
    parentId?: string,
    subServicioId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error(NOTIFICATION_MESSAGES.ERROR.NO_AUTH);
      }

      let url = '';
      let successMsg = '';

      switch (type) {
        case 'cliente':
          url = API_ENDPOINTS.CLIENTS.CLIENT(id);
          successMsg = NOTIFICATION_MESSAGES.SUCCESS.DELETE_CLIENT;
          break;
        case 'subservicio':
          if (!parentId) throw new Error('ID de cliente requerido para eliminar subservicio');
          url = API_ENDPOINTS.CLIENTS.SUBSERVICIO_BY_ID(parentId, id);
          successMsg = NOTIFICATION_MESSAGES.SUCCESS.DELETE_SUBSERVICIO;
          break;
        case 'sububicacion':
          if (!parentId || !subServicioId)
            throw new Error('ID de cliente y subservicio requeridos para eliminar sububicación');
          url = API_ENDPOINTS.CLIENTS.SUBUBICACION_BY_ID(parentId, subServicioId, id);
          successMsg = NOTIFICATION_MESSAGES.SUCCESS.DELETE_SUBUBICACION;
          break;
      }

      console.log(`Eliminando ${type} con ID: ${id}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      await handleApiResponse(response, NOTIFICATION_MESSAGES.ERROR.DELETE_GENERIC(type));

      // Invalidar caché
      invalidate([CACHE_CONFIG.KEYS.CLIENTS, CACHE_CONFIG.KEYS.UNASSIGNED_SUBSERVICES]);
      await fetchClients(true);
      
      if (type === 'subservicio') {
        await fetchSubservicesWithoutSupervisor(true);
      }

      showSuccessMessage(successMsg);
      return true;
    } catch (err) {
      showErrorMessage(NOTIFICATION_MESSAGES.ERROR.DELETE_GENERIC(type), err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchClients, fetchSubservicesWithoutSupervisor, invalidate, showSuccessMessage, showErrorMessage]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    console.log("ClientManager montado, selectedUserId:", selectedUserId);

    // Cargar datos
    fetchClients(false);
    fetchUsers(false);
    fetchSupervisors(false);
    fetchClientsWithoutUser(false);
    fetchSubservicesWithoutSupervisor(false);
  }, [
    selectedUserId, 
    fetchClients, 
    fetchUsers, 
    fetchSupervisors, 
    fetchClientsWithoutUser, 
    fetchSubservicesWithoutSupervisor
  ]);

  // Escuchar eventos de actualización de usuarios
  useEffect(() => {
    // Función para manejar eventos globales
    const handleUserUpdated = () => {
      console.log("Detectado cambio de usuarios, actualizando lista...");
      fetchUsers(true);
      fetchSupervisors(true);
      fetchClientsWithoutUser(true);
      fetchSubservicesWithoutSupervisor(true);
    };

    // Verificar localStorage para eventos
    const checkLocalStorage = () => {
      if (typeof window !== 'undefined') {
        const userUpdated = localStorage.getItem('userUpdated');
        if (userUpdated === 'true') {
          handleUserUpdated();
          localStorage.removeItem('userUpdated');
        }
      }
    };

    // Intervalo para verificar localStorage
    const interval = setInterval(checkLocalStorage, 2000);

    // Evento personalizado cuando localStorage cambia
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userUpdated' && e.newValue === 'true') {
        handleUserUpdated();
        localStorage.removeItem('userUpdated');
      }
    };

    // Suscribirse a storage events
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    // Verificar al montar si hay actualizaciones pendientes
    checkLocalStorage();

    // Limpieza al desmontar
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
      clearInterval(interval);
    };
  }, [fetchUsers, fetchSupervisors, fetchClientsWithoutUser, fetchSubservicesWithoutSupervisor]);

  return {
    // Estados
    clients,
    users,
    supervisors,
    unassignedSubservices,
    loading,
    error,
    successMessage,
    totalUnassignedSubservices,

    // Acciones para clientes
    fetchClients,
    createClient,
    updateClient,
    
    // Acciones para subservicios
    createSubServicio,
    updateSubServicio,
    
    // Acciones para supervisores
    assignSupervisor,
    removeSupervisor,
    
    // Acciones para sububicaciones
    createSubUbicacion,
    updateSubUbicacion,
    
    // Acción general para eliminar
    deleteItem,
    
    // Manejador de mensaje de éxito
    setSuccessMessage,
    clearError: () => setError(null)
  };
};

export default useClientManager;