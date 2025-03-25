import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '@/context/NotificationContext';

import {
  Plus,
  Search,
  FileEdit,
  Trash2,
  Loader2,
  AlertCircle,
  UserPlus,
  Check,
  Building,
  MapPin,
  Users,
  Filter,
  Mail,
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Home,
  Info,
  Phone,
  Shield,
  User
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import Pagination from './components/Pagination';
import { useDashboard } from '@/hooks/useDashboard';
import type { UserRole } from '@/types/users';

// Constantes para el caché
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutos
const CLIENTS_CACHE_KEY = 'lyme_clients_cache';
const USERS_CACHE_KEY = 'lyme_users_cache';
const SUPERVISORS_CACHE_KEY = 'lyme_supervisors_cache';
const UNASSIGNED_CLIENTS_CACHE_KEY = 'lyme_unassigned_clients_cache';
const UNASSIGNED_SUBSERVICES_CACHE_KEY = 'lyme_unassigned_subservices_cache';

// Interfaces para la estructura de datos
interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion: string;
}

interface SupervisorData {
  _id: string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

interface SubServicio {
  _id: string;
  nombre: string;
  descripcion: string;
  supervisorId?: string | SupervisorData;
  requiereSupervisor?: boolean;
  subUbicaciones: SubUbicacion[];
}

interface UnassignedSubServicio {
  clienteId: string;
  nombreCliente: string;
  userId: string | UserExtended | UserExtended[];
  subServicios: SubServicio[];
}

/**
 * Tipos extendidos para los usuarios con la estructura que viene del backend
 */
interface UserExtended {
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
 * Interfaz extendida para manejar tanto ID como objeto poblado
 */
interface Client {
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
  requiereAsignacion?: boolean; // Propiedad añadida para marcar clientes que necesitan asignación
}

interface CreateClientData {
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

interface UpdateClientData {
  id: string;
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

interface CreateSubServicioData {
  nombre: string;
  descripcion: string;
  supervisorId?: string;
}

interface CreateSubUbicacionData {
  nombre: string;
  descripcion: string;
}



// Funciones para gestionar la caché
const getFromCache = (key: string) => {
  if (typeof window === 'undefined') return null;

  const cachedData = localStorage.getItem(key);
  if (!cachedData) return null;

  try {
    const { data, timestamp } = JSON.parse(cachedData);
    // Verificar si la caché ha expirado
    if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error parsing cached ${key}:`, error);
    localStorage.removeItem(key);
    return null;
  }
};

// Guarda datos en la caché local
const saveToCache = (key: string, data: any) => {
  if (typeof window === 'undefined') return;

  const cacheData = {
    data,
    timestamp: Date.now()
  };

  localStorage.setItem(key, JSON.stringify(cacheData));
};

// Invalida claves de caché específicas
const invalidateCache = (keys: string[]) => {
  if (typeof window === 'undefined') return;
  keys.forEach(key => localStorage.removeItem(key));
};

/**
 * Componente principal para la gestión de clientes
 * Muestra una lista de clientes y su estructura jerárquica
 */
const ClientsSection: React.FC = () => {
  // Acceder al contexto del dashboard
  const { selectedUserId } = useDashboard();

  // Usar el hook de notificaciones
  const { addNotification } = useNotification();

  // Estados para datos principales
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserExtended[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
  const [unassignedSubservices, setUnassignedSubservices] = useState<UnassignedSubServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [showSubServicioModal, setShowSubServicioModal] = useState(false);
  const [showSubUbicacionModal, setShowSubUbicacionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);

  // Estados para la edición actual
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentSubServicio, setCurrentSubServicio] = useState<SubServicio | null>(null);
  const [currentClientForSubServicio, setCurrentClientForSubServicio] = useState<Client | null>(null);
  const [currentSubUbicacion, setCurrentSubUbicacion] = useState<SubUbicacion | null>(null);
  const [currentSupervisorId, setCurrentSupervisorId] = useState<string>('');
  const [idToDelete, setIdToDelete] = useState<{ id: string, type: 'cliente' | 'subservicio' | 'sububicacion' | 'supervisor', parentId?: string, subServicioId?: string } | null>(null);

  // Estados para mensajes de feedback
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Estados para filtrado y UI
  const [activeUserId, setActiveUserId] = useState<string>("all");
  const [activeSupervisorId, setActiveSupervisorId] = useState<string>("all");
  const [showUnassignedSubservices, setShowUnassignedSubservices] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [deletingOperation, setDeletingOperation] = useState(false);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);

  // Estados para vista
  const [viewMode, setViewMode] = useState<'all' | 'unassigned'>('all');

  // Estado para controlar qué cliente está expandido (solo uno a la vez)
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [expandedSubServicioId, setExpandedSubServicioId] = useState<string | null>(null);

  // Estados para formularios
  const [clientFormData, setClientFormData] = useState<CreateClientData>({
    nombre: '',
    descripcion: '',
    userId: [],
    direccion: '',
    telefono: '',
    email: '',
    activo: true
  });

  const [subServicioFormData, setSubServicioFormData] = useState<CreateSubServicioData>({
    nombre: '',
    descripcion: '',
    supervisorId: ''
  });

  const [subUbicacionFormData, setSubUbicacionFormData] = useState<CreateSubUbicacionData>({
    nombre: '',
    descripcion: ''
  });

  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Referencia para el scroll en móvil
  const mobileListRef = useRef<HTMLDivElement>(null);

  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Verificar disponibilidad del contexto de notificaciones
  useEffect(() => {
    console.log('NotificationContext disponible:', addNotification ? true : false);
  }, [addNotification]);

  // Efecto para detectar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);

      // Ajustar itemsPerPage según el tamaño inicial de la pantalla
      setItemsPerPage(window.innerWidth < 768 ? 3 : 7);

      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  /**
   * Funciones para alternar la expansión de un cliente
   */
  const toggleClientExpansion = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
    } else {
      setExpandedClientId(clientId);
    }
  };

  /**
   * Funciones para alternar la expansión de un subservicio
   */
  const toggleSubServicioExpansion = (subServicioId: string) => {
    if (expandedSubServicioId === subServicioId) {
      setExpandedSubServicioId(null);
    } else {
      setExpandedSubServicioId(subServicioId);
    }
  };

  /**
   * Contrae todos los clientes
   */
  const collapseAll = () => {
    setExpandedClientId(null);
    setExpandedSubServicioId(null);
  };

  /**
   * Obtener token de forma segura (solo en el cliente)
   */
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Componente para selección múltiple de supervisores
  const MultiSupervisorSelect = ({
    supervisors,
    selectedSupervisors = [],
    onChange,
    placeholder = "Seleccionar supervisores..."
  }) => {
    const [open, setOpen] = useState(false);

    const safeSelectedSupervisors = Array.isArray(selectedSupervisors) ? selectedSupervisors : [];

    const toggleSupervisor = (supervisorId) => {
      console.log('Toggling supervisor:', supervisorId);
      console.log('Current selected:', safeSelectedSupervisors);

      const isCurrentlySelected = safeSelectedSupervisors.includes(supervisorId);
      let newSelectedSupervisors;

      if (isCurrentlySelected) {
        // Si ya está seleccionado, quitar
        newSelectedSupervisors = safeSelectedSupervisors.filter(id => id !== supervisorId);
      } else {
        // Si no está seleccionado, agregar
        newSelectedSupervisors = [...safeSelectedSupervisors, supervisorId];
      }

      console.log('New selected:', newSelectedSupervisors);

      // Llamar directamente a onChange con el nuevo array
      onChange(newSelectedSupervisors);
    };

    return (
      <div className="flex flex-col space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-between w-full border-[#91BEAD] focus:ring-[#29696B]/20"
            >
              <span>
                {safeSelectedSupervisors.length > 0
                  ? `${safeSelectedSupervisors.length} supervisor${safeSelectedSupervisors.length > 1 ? 'es' : ''} seleccionado${safeSelectedSupervisors.length > 1 ? 's' : ''}`
                  : placeholder}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command className="w-full">
              <CommandInput placeholder="Buscar supervisor..." />
              <CommandList>
                <CommandEmpty>No se encontraron supervisores.</CommandEmpty>
                <CommandGroup>
                  {supervisors.map(supervisor => (
                    <CommandItem
                      key={supervisor._id}
                      onSelect={() => toggleSupervisor(supervisor._id)}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Checkbox
                          checked={safeSelectedSupervisors.includes(supervisor._id)}
                          onCheckedChange={() => toggleSupervisor(supervisor._id)}
                          className="text-[#29696B] border-[#91BEAD]"
                        />
                        <div className="flex flex-col">
                          <span>
                            {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisor._id}
                          </span>
                          {supervisor.role && (
                            <span className="text-xs text-muted-foreground">
                              {supervisor.role === 'supervisor' ? 'Supervisor' : supervisor.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {safeSelectedSupervisors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {safeSelectedSupervisors.map(id => {
              const supervisor = supervisors.find(s => s._id === id);
              return (
                <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-[#DFEFE6] text-[#29696B] border-[#91BEAD]">
                  {supervisor ? (supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || id.substring(0, 8)) : id.substring(0, 8)}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(safeSelectedSupervisors.filter(i => i !== id));
                    }}
                    className="ml-1 rounded-full hover:bg-[#91BEAD]/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  // Efecto para cargar datos iniciales
  useEffect(() => {
    console.log("ClientSection montado, selectedUserId:", selectedUserId);

    // Siempre iniciar con "all" seleccionado
    setActiveUserId("all");
    setActiveSupervisorId("all");

    // Cargar datos
    fetchClients(false);
    fetchUsers(false);
    fetchSupervisors(false);
    fetchClientsWithoutUser(false);
    fetchSubservicesWithoutSupervisor(false);

    // Los valores de localStorage ya no modificarán la selección por defecto
    // pero aún se usarán para el formulario si es necesario
    if (typeof window !== 'undefined') {
      const storedSelectedUserId = localStorage.getItem('selectedUserId');
      const lastCreatedUserId = localStorage.getItem('lastCreatedUserId');

      // Solo usar estos valores para el formulario, no para el filtro activo
      if (selectedUserId || storedSelectedUserId || lastCreatedUserId) {
        const userId = selectedUserId || storedSelectedUserId || lastCreatedUserId;
        console.log("Se encontró un userId para usar en el formulario:", userId);

        // Inicializar el formulario con este usuario - ASEGURARNOS DE QUE ES UN ARRAY
        setClientFormData(prev => ({
          ...prev,
          userId: userId ? [userId] : []
        }));

        // Limpiar valores de localStorage
        if (storedSelectedUserId) localStorage.removeItem('selectedUserId');
        if (lastCreatedUserId) localStorage.removeItem('lastCreatedUserId');
      }
    }
  }, [selectedUserId]);

  // Resetear la página actual cuando cambie el término de búsqueda o filtros activos
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeUserId, activeSupervisorId, viewMode, showUnassignedSubservices]);

  // Observar cambios en selectedUserId
  useEffect(() => {
    if (selectedUserId) {
      console.log("selectedUserId cambió a:", selectedUserId);

      // Actualizar el formulario para incluir el nuevo usuario seleccionado
      setClientFormData(prev => {
        // Asegurarnos que prev.userId es un array
        const currentUserIds = Array.isArray(prev.userId) ? prev.userId : [];
        return {
          ...prev,
          userId: currentUserIds.includes(selectedUserId) ? currentUserIds : [...currentUserIds, selectedUserId]
        };
      });
    }
  }, [selectedUserId]);

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
  }, []);

  /**
   * Carga todos los clientes con soporte de caché
   */
  const fetchClients = async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh && !isDataRefreshing) {
        const cachedClients = getFromCache(CLIENTS_CACHE_KEY);
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
        throw new Error('No hay token de autenticación');
      }

      let apiUrl = 'api/cliente';

      // Si hay un supervisor activo, obtener los clientes filtrados por supervisor
      if (activeSupervisorId !== "all" && viewMode === 'all') {
        apiUrl = `api/cliente/supervisor/${activeSupervisorId}`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            window.location.href = '/login';
          }
          return;
        }
        throw new Error('Error al cargar los clientes');
      }

      const data: Client[] = await response.json();
      console.log("Clientes cargados:", data.length);

      // Guardar en caché
      saveToCache(CLIENTS_CACHE_KEY, data);

      setClients(data);
      setError(null);
    } catch (err) {
      const errorMsg = 'Error al cargar los clientes: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación para error de carga de clientes
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
      setIsDataRefreshing(false);
    }
  };

  /**
   * Carga clientes sin asignar con soporte de caché
   */
  const fetchClientsWithoutUser = async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedUnassignedClients = getFromCache(UNASSIGNED_CLIENTS_CACHE_KEY);
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
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('api/cliente/sin-asignar', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar clientes sin asignar');
      }

      const data: Client[] = await response.json();
      console.log("Clientes sin asignar:", data.length);

      // Guardar en caché
      saveToCache(UNASSIGNED_CLIENTS_CACHE_KEY, data);

      // Agregar estos clientes al estado, marcándolos especialmente
      setClients(prevClients => {
        const clientsWithoutDuplicates = [...prevClients];

        // Añadir solo los que no están ya en la lista
        data.forEach(newClient => {
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
        addNotification(`Se encontraron ${data.length} clientes sin usuario asignado. Puede reasignarlos editándolos.`, 'warning', 8000);
      }
    } catch (err) {
      const errorMsg = 'Error al cargar clientes sin asignar: ' + (err instanceof Error ? err.message : String(err));
      console.error(errorMsg);
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Carga subservicios sin supervisor asignado
   */
  const fetchSubservicesWithoutSupervisor = async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedUnassignedSubservices = getFromCache(UNASSIGNED_SUBSERVICES_CACHE_KEY);
        if (cachedUnassignedSubservices) {
          console.log("Usando subservicios sin supervisor desde caché");
          setUnassignedSubservices(cachedUnassignedSubservices);
          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('api/cliente/subservicios/sin-supervisor', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar subservicios sin supervisor');
      }

      const data: UnassignedSubServicio[] = await response.json();
      console.log("Subservicios sin supervisor:", data.length);

      // Guardar en caché
      saveToCache(UNASSIGNED_SUBSERVICES_CACHE_KEY, data);
      setUnassignedSubservices(data);

      // Mostrar alerta si hay subservicios sin supervisor
      if (data.length > 0 && addNotification) {
        const totalSubservicios = data.reduce((total, client) => total + client.subServicios.length, 0);
        addNotification(`Se encontraron ${totalSubservicios} subservicios sin supervisor asignado. Puede asignar supervisores desde el menú de opciones.`, 'warning', 8000);
      }
    } catch (err) {
      const errorMsg = 'Error al cargar subservicios sin supervisor: ' + (err instanceof Error ? err.message : String(err));
      console.error(errorMsg);
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Carga la lista de usuarios con soporte de caché
   */
  const fetchUsers = async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedUsers = getFromCache(USERS_CACHE_KEY);
        if (cachedUsers) {
          console.log("Usando usuarios desde caché");
          setUsers(cachedUsers);
          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();

      // Filtrar usuarios válidos para asignar a clientes:
      // - Supervisores (antes 'basic')
      // - Solo usuarios activos
      const activeValidUsers = data.users.filter((user: any) => {
        // Verificar si es un rol válido (supervisor) y está activo
        const isValidRole = user.role === 'supervisor';
        const isActive = user.isActive === true;

        return isValidRole && isActive;
      });

      // Guardar en caché
      saveToCache(USERS_CACHE_KEY, activeValidUsers);

      setUsers(activeValidUsers);

      // Si hay un usuario activo seleccionado, mostrar en consola para depuración
      if (activeUserId !== "all") {
        const activeUser = activeValidUsers.find((u: { _id: string; }) => u._id === activeUserId);
        console.log("Usuario activo seleccionado:", activeUser?.email || "Email no disponible");
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      // Notificación para error de carga de usuarios (opcional)
      if (addNotification) {
        addNotification('Error al cargar usuarios. Algunas funciones pueden estar limitadas.', 'warning');
      }
    }
  };

  /**
   * Carga la lista de supervisores con soporte de caché
   */
  const fetchSupervisors = async (forceRefresh: boolean = false) => {
    try {
      // Si no es una actualización forzada, intentar obtener datos de la caché
      if (!forceRefresh) {
        const cachedSupervisors = getFromCache(SUPERVISORS_CACHE_KEY);
        if (cachedSupervisors) {
          console.log("Usando supervisores desde caché");
          setSupervisors(cachedSupervisors);
          return;
        }
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('api/auth/supervisors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar supervisores');
      }

      const data = await response.json();
      console.log("Supervisores cargados:", data.supervisors?.length || 0);

      // Guardar en caché
      saveToCache(SUPERVISORS_CACHE_KEY, data.supervisors || []);

      setSupervisors(data.supervisors || []);
    } catch (err) {
      console.error('Error al cargar supervisores:', err);
      if (addNotification) {
        addNotification('Error al cargar supervisores. Algunas funciones pueden estar limitadas.', 'warning');
      }
    }
  };

  /**
   * Crea un nuevo cliente
   */
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Creando cliente con datos:", clientFormData);

      const response = await fetch('api/cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clientFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al crear cliente');
      }

      // Invalidar caché después de crear cliente
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_CLIENTS_CACHE_KEY]);

      await fetchClients(true);
      setShowModal(false);
      resetClientForm();

      const successMsg = `Cliente "${clientFormData.nombre}" creado correctamente`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al crear cliente: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Actualiza un cliente existente
   */
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient?._id) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Actualizando cliente:", currentClient._id, "con datos:", clientFormData);

      const response = await fetch(`api/cliente/${currentClient._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clientFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al actualizar cliente');
      }

      // Invalidar caché después de actualizar cliente
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_CLIENTS_CACHE_KEY]);

      await fetchClients(true);
      setShowModal(false);
      resetClientForm();

      const successMsg = `Cliente "${clientFormData.nombre}" actualizado correctamente`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al actualizar cliente: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Crea un nuevo subservicio para un cliente
   */
  const handleCreateSubServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientForSubServicio?._id) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Creando subservicio para cliente", currentClientForSubServicio._id, "con datos:", subServicioFormData);

      const response = await fetch(`api/cliente/${currentClientForSubServicio._id}/subservicio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subServicioFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al crear subservicio');
      }

      // Invalidar caché después de crear subservicio
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_SUBSERVICES_CACHE_KEY]);

      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      setShowSubServicioModal(false);
      resetSubServicioForm();

      const successMsg = `Subservicio "${subServicioFormData.nombre}" creado correctamente`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al crear subservicio: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Actualiza un subservicio existente
   */
  const handleUpdateSubServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientForSubServicio?._id || !currentSubServicio?._id) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Actualizando subservicio:", currentSubServicio._id, "del cliente:", currentClientForSubServicio._id, "con datos:", subServicioFormData);

      const response = await fetch(`api/cliente/${currentClientForSubServicio._id}/subservicio/${currentSubServicio._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subServicioFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al actualizar subservicio');
      }

      // Invalidar caché después de actualizar subservicio
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_SUBSERVICES_CACHE_KEY]);

      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      setShowSubServicioModal(false);
      resetSubServicioForm();

      const successMsg = `Subservicio "${subServicioFormData.nombre}" actualizado correctamente`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al actualizar subservicio: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Asigna un supervisor a un subservicio
   */
  const handleAssignSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientForSubServicio?._id || !currentSubServicio?._id || !currentSupervisorId) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Asignando supervisor", currentSupervisorId, "al subservicio:", currentSubServicio._id, "del cliente:", currentClientForSubServicio._id);

      const response = await fetch(`api/cliente/${currentClientForSubServicio._id}/subservicio/${currentSubServicio._id}/supervisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ supervisorId: currentSupervisorId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al asignar supervisor');
      }

      // Invalidar caché después de asignar supervisor
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_SUBSERVICES_CACHE_KEY]);

      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      setShowSupervisorModal(false);
      setCurrentSupervisorId('');

      const supervisorNombre = supervisors.find(s => s._id === currentSupervisorId)?.nombre || 'Supervisor';
      const successMsg = `Supervisor "${supervisorNombre}" asignado correctamente al subservicio "${currentSubServicio.nombre}"`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al asignar supervisor: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Elimina un supervisor de un subservicio
   */
  const handleRemoveSupervisor = async () => {
    if (!idToDelete || !idToDelete.parentId || !idToDelete.subServicioId) return;

    try {
      setDeletingOperation(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Removiendo supervisor del subservicio:", idToDelete.subServicioId, "del cliente:", idToDelete.parentId);

      const response = await fetch(`api/cliente/${idToDelete.parentId}/subservicio/${idToDelete.subServicioId}/supervisor`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al remover supervisor');
      }

      // Invalidar caché
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_SUBSERVICES_CACHE_KEY]);

      await fetchClients(true);
      await fetchSubservicesWithoutSupervisor(true);
      setShowDeleteModal(false);
      setIdToDelete(null);

      const successMsg = 'Supervisor removido correctamente del subservicio';
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al remover supervisor: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setDeletingOperation(false);
    }
  };

  /**
   * Crea una nueva sububicación para un subservicio
   */
  const handleCreateSubUbicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientForSubServicio?._id || !currentSubServicio?._id) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Creando sububicación para subservicio", currentSubServicio._id, "del cliente", currentClientForSubServicio._id, "con datos:", subUbicacionFormData);

      const response = await fetch(`api/cliente/${currentClientForSubServicio._id}/subservicio/${currentSubServicio._id}/sububicacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subUbicacionFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al crear sububicación');
      }

      // Invalidar caché después de crear sububicación
      invalidateCache([CLIENTS_CACHE_KEY]);

      await fetchClients(true);
      setShowSubUbicacionModal(false);
      resetSubUbicacionForm();

      const successMsg = `Sububicación "${subUbicacionFormData.nombre}" creada correctamente`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al crear sububicación: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Actualiza una sububicación existente
   */
  const handleUpdateSubUbicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientForSubServicio?._id || !currentSubServicio?._id || !currentSubUbicacion?._id) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Actualizando sububicación:", currentSubUbicacion._id, "del subservicio:", currentSubServicio._id, "del cliente:", currentClientForSubServicio._id, "con datos:", subUbicacionFormData);

      const response = await fetch(`api/cliente/${currentClientForSubServicio._id}/subservicio/${currentSubServicio._id}/sububicacion/${currentSubUbicacion._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subUbicacionFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al actualizar sububicación');
      }

      // Invalidar caché después de actualizar sububicación
      invalidateCache([CLIENTS_CACHE_KEY]);

      await fetchClients(true);
      setShowSubUbicacionModal(false);
      resetSubUbicacionForm();

      const successMsg = `Sububicación "${subUbicacionFormData.nombre}" actualizada correctamente`;
      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al actualizar sububicación: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    }
  };

  /**
   * Prepara el formulario para editar un cliente
   */
  const handleEditClient = (client: Client) => {
    setCurrentClient(client);

    // Convertir userId a array de strings si no lo es
    let userIds: string[] = [];

    if (Array.isArray(client.userId)) {
      userIds = client.userId.map(id =>
        typeof id === 'object' && id !== null && id._id ? id._id : String(id)
      );
    } else if (client.userId) {
      // Si no es un array, convertirlo en array con un solo elemento
      const id = typeof client.userId === 'object' && client.userId._id
        ? client.userId._id
        : String(client.userId);
      userIds = [id];
    }

    setClientFormData({
      nombre: client.nombre,
      descripcion: client.descripcion || '',
      userId: userIds,
      direccion: client.direccion || '',
      telefono: client.telefono || '',
      email: client.email || '',
      activo: client.activo
    });
    setShowModal(true);
  };

  /**
   * Prepara el formulario para agregar un nuevo subservicio
   */
  const handleAddSubServicio = (client: Client) => {
    setCurrentClientForSubServicio(client);
    setCurrentSubServicio(null);
    resetSubServicioForm();
    setShowSubServicioModal(true);
  };

  /**
   * Prepara el formulario para editar un subservicio
   */
  const handleEditSubServicio = (client: Client, subservicio: SubServicio) => {
    setCurrentClientForSubServicio(client);
    setCurrentSubServicio(subservicio);
    setSubServicioFormData({
      nombre: subservicio.nombre,
      descripcion: subservicio.descripcion || '',
      supervisorId: typeof subservicio.supervisorId === 'object' && subservicio.supervisorId
        ? subservicio.supervisorId._id
        : typeof subservicio.supervisorId === 'string'
          ? subservicio.supervisorId
          : ''
    });
    setShowSubServicioModal(true);
  };

  /**
   * Prepara el formulario para asignar un supervisor a un subservicio
   */
  const handleOpenSupervisorModal = (client: Client, subservicio: SubServicio) => {
    setCurrentClientForSubServicio(client);
    setCurrentSubServicio(subservicio);
    // Establecer el supervisor actual si existe
    if (subservicio.supervisorId) {
      setCurrentSupervisorId(
        typeof subservicio.supervisorId === 'object'
          ? subservicio.supervisorId._id
          : subservicio.supervisorId
      );
    } else {
      setCurrentSupervisorId('');
    }
    setShowSupervisorModal(true);
  };

  /**
   * Prepara la confirmación para remover un supervisor
   */
  const confirmRemoveSupervisor = (clientId: string, subServicioId: string) => {
    setIdToDelete({
      id: 'supervisor',
      type: 'supervisor',
      parentId: clientId,
      subServicioId: subServicioId
    });
    setShowDeleteModal(true);
  };

  /**
   * Prepara el formulario para agregar una nueva sububicación
   */
  const handleAddSubUbicacion = (client: Client, subservicio: SubServicio) => {
    setCurrentClientForSubServicio(client);
    setCurrentSubServicio(subservicio);
    setCurrentSubUbicacion(null);
    resetSubUbicacionForm();
    setShowSubUbicacionModal(true);
  };

  /**
   * Prepara el formulario para editar una sububicación
   */
  const handleEditSubUbicacion = (client: Client, subservicio: SubServicio, sububicacion: SubUbicacion) => {
    setCurrentClientForSubServicio(client);
    setCurrentSubServicio(subservicio);
    setCurrentSubUbicacion(sububicacion);
    setSubUbicacionFormData({
      nombre: sububicacion.nombre,
      descripcion: sububicacion.descripcion || ''
    });
    setShowSubUbicacionModal(true);
  };

  /**
   * Prepara el modal para confirmar la eliminación de un elemento
   */
  const confirmDelete = (id: string, type: 'cliente' | 'subservicio' | 'sububicacion', parentId?: string, subServicioId?: string) => {
    setIdToDelete({ id, type, parentId, subServicioId });
    setShowDeleteModal(true);
  };

  /**
   * Ejecuta la eliminación del elemento después de confirmación
   */
  const executeDelete = async () => {
    if (!idToDelete) return;

    // Si es eliminación de supervisor, usar la función específica
    if (idToDelete.type === 'supervisor') {
      await handleRemoveSupervisor();
      return;
    }

    try {
      setDeletingOperation(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      let url = '';
      let successMsg = '';

      switch (idToDelete.type) {
        case 'cliente':
          url = `api/cliente/${idToDelete.id}`;
          successMsg = 'Cliente eliminado correctamente';
          break;
        case 'subservicio':
          if (!idToDelete.parentId) throw new Error('ID de cliente requerido para eliminar subservicio');
          url = `api/cliente/${idToDelete.parentId}/subservicio/${idToDelete.id}`;
          successMsg = 'Subservicio eliminado correctamente';
          break;
        case 'sububicacion':
          if (!idToDelete.parentId || !idToDelete.subServicioId)
            throw new Error('ID de cliente y subservicio requeridos para eliminar sububicación');
          url = `api/cliente/${idToDelete.parentId}/subservicio/${idToDelete.subServicioId}/sububicacion/${idToDelete.id}`;
          successMsg = 'Sububicación eliminada correctamente';
          break;
      }

      console.log(`Eliminando ${idToDelete.type} con ID: ${idToDelete.id}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al eliminar ${idToDelete.type}`);
      }

      // Invalidar caché
      invalidateCache([CLIENTS_CACHE_KEY, UNASSIGNED_SUBSERVICES_CACHE_KEY]);

      await fetchClients(true);
      if (idToDelete.type === 'subservicio') {
        await fetchSubservicesWithoutSupervisor(true);
      }

      setShowDeleteModal(false);
      setIdToDelete(null);

      setSuccessMessage(successMsg);

      // Notificación de éxito
      if (addNotification) {
        addNotification(successMsg, 'success');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = `Error al eliminar ${idToDelete.type}: ` + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);

      // Notificación de error
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setDeletingOperation(false);
    }
  };

  /**
   * Resetea el formulario de cliente a sus valores iniciales
   */
  const resetClientForm = () => {
    setClientFormData({
      nombre: '',
      descripcion: '',
      userId: activeUserId !== "all" ? [activeUserId] : [],
      direccion: '',
      telefono: '',
      email: '',
      activo: true
    });
    setCurrentClient(null);
  };

  /**
   * Resetea el formulario de subservicio a sus valores iniciales
   */
  const resetSubServicioForm = () => {
    setSubServicioFormData({
      nombre: '',
      descripcion: '',
      supervisorId: ''
    });
  };

  /**
   * Resetea el formulario de sububicación a sus valores iniciales
   */
  const resetSubUbicacionForm = () => {
    setSubUbicacionFormData({
      nombre: '',
      descripcion: ''
    });
  };

  /**
   * Limpia el filtro de usuario activo
   */
  const clearActiveUserId = () => {
    setActiveUserId("all");
    // También limpiar localStorage por si acaso
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedUserId');
      localStorage.removeItem('lastCreatedUserId');
    }
    // Notificar al usuario
    if (addNotification) {
      addNotification('Se ha limpiado el filtro de usuario', 'info');
    }
  };

  /**
   * Limpia el filtro de supervisor activo
   */
  const clearActiveSupervisorId = () => {
    setActiveSupervisorId("all");
    // Notificar al usuario
    if (addNotification) {
      addNotification('Se ha limpiado el filtro de supervisor', 'info');
    }
  };

  /**
   * Maneja el cambio de página en la paginación
   */
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);

    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Maneja el cambio de elementos por página
   */
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Volver a la primera página cuando cambia el tamaño
  };

  /**
   * Cambiar entre vistas normal y subservicios sin supervisor
   */
  const toggleViewMode = (mode: 'all' | 'unassigned') => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  /**
   * Obtiene un identificador para un usuario a partir de su ID
   */
  const getUserIdentifierById = (userId: string) => {
    const user = users.find(u => u._id === userId);
    if (!user) return 'Usuario no encontrado';

    // Crear el identificador con rol
    let identifier = '';

    // Priorizar mostrar el email, ya que es lo que se usa principalmente para identificar usuarios
    if (user.email) identifier = user.email;
    else if (user.usuario) identifier = user.usuario;
    else if (user.nombre && user.apellido) identifier = `${user.nombre} ${user.apellido}`;
    else if (user.nombre) identifier = user.nombre;
    else identifier = `ID: ${userId.substring(0, 8)}`;

    // Agregar etiqueta de rol para más claridad
    const roleName = user.role === 'supervisor' ? 'Supervisor' : 'Usuario';

    return `${identifier} - ${roleName}`;
  };

  /**
   * Obtiene un identificador para un supervisor a partir de su ID
   */
  const getSupervisorIdentifierById = (supervisorId: string) => {
    const supervisor = supervisors.find(s => s._id === supervisorId);
    if (!supervisor) return 'Supervisor no encontrado';

    let identifier = '';

    // Priorizar mostrar el email
    if (supervisor.email) identifier = supervisor.email;
    else if (supervisor.usuario) identifier = supervisor.usuario;
    else if (supervisor.nombre && supervisor.apellido) identifier = `${supervisor.nombre} ${supervisor.apellido}`;
    else if (supervisor.nombre) identifier = supervisor.nombre;
    else identifier = `ID: ${supervisorId.substring(0, 8)}`;

    return identifier;
  };

  /**
   * Determina si un cliente contiene subservicios sin supervisor
   */
  const clientHasUnassignedSubservices = (client: Client) => {
    return client.subServicios.some(subservicio =>
      !subservicio.supervisorId || subservicio.requiereSupervisor
    );
  };

  /**
   * Obtiene los supervisores asignados a un cliente
   */
  const getClientSupervisors = (client: Client): string[] => {
    if (!client.userId) return [];

    if (Array.isArray(client.userId)) {
      return client.userId.map(id =>
        typeof id === 'object' && id !== null && id._id ? id._id : String(id)
      );
    } else {
      return [typeof client.userId === 'object' && client.userId._id ? client.userId._id : String(client.userId)];
    }
  };

  // Filtrar clientes según término de búsqueda, usuario seleccionado y supervisor
  const filteredClients = clients.filter(client => {
    // Si estamos en vista de subservicios sin supervisor, solo mostrar clientes relevantes
    if (viewMode === 'unassigned') {
      return clientHasUnassignedSubservices(client);
    }

    // Filtro por texto de búsqueda (buscar en nombre, servicio, email, etc.)
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

    const matchesSearch = searchFields.some(field =>
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

  // Aplicar paginación
  const totalItems = filteredClients.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Obtener solo los clientes de la página actual
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Para vista de subservicios sin supervisor
  const totalUnassignedSubservices = unassignedSubservices.reduce(
    (acc, client) => acc + client.subServicios.length, 0
  );

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#29696B]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4 bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <Check className="h-4 w-4 text-[#29696B]" />
          <AlertDescription className="ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Usuario actualmente seleccionado */}
      {activeUserId !== "all" && (
        <Alert className="mb-4 bg-[#DFEFE6]/50 border border-[#91BEAD]/50 text-[#29696B] rounded-lg flex justify-between items-center">
          <div className="flex items-center">
            <UserPlus className="h-4 w-4 text-[#29696B] mr-2" />
            <AlertDescription>
              Gestionando clientes para el usuario: <strong>{getUserIdentifierById(activeUserId)}</strong>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActiveUserId}
            className="text-[#29696B] hover:bg-[#DFEFE6]/40"
          >
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {/* Supervisor actualmente seleccionado */}
      {activeSupervisorId !== "all" && (
        <Alert className="mb-4 bg-[#DFEFE6]/50 border border-[#91BEAD]/50 text-[#29696B] rounded-lg flex justify-between items-center">
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-[#29696B] mr-2" />
            <AlertDescription>
              Mostrando subservicios del supervisor: <strong>{getSupervisorIdentifierById(activeSupervisorId)}</strong>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActiveSupervisorId}
            className="text-[#29696B] hover:bg-[#DFEFE6]/40"
          >
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {/* Barra de herramientas para pantallas medianas y grandes */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C]" />
          <Input
            type="text"
            placeholder="Buscar clientes..."
            className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2">
          {/* Filtro por usuario */}
          <Select
            value={activeUserId}
            onValueChange={setActiveUserId}
          >
            <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
              <SelectValue placeholder="Filtrar por usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>

              {/* Agrupar por supervisores */}
              {users.filter(user => user.role === 'supervisor').length > 0 && (
                <>
                  <SelectItem value="header-supervisors" disabled className="font-semibold text-[#29696B] cursor-default bg-[#DFEFE6]/30">
                    -- Supervisores --
                  </SelectItem>
                  {users
                    .filter(user => user.role === 'supervisor')
                    .sort((a, b) => (a.email || a.usuario || '').localeCompare(b.email || b.usuario || ''))
                    .map(user => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.email || user.usuario || `${user.nombre || ''} ${user.apellido || ''}`.trim() || user._id}
                      </SelectItem>
                    ))
                  }
                </>
              )}
            </SelectContent>
          </Select>

          {/* Filtro por supervisor */}
          <Select
            value={activeSupervisorId}
            onValueChange={setActiveSupervisorId}
          >
            <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
              <SelectValue placeholder="Filtrar por supervisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los supervisores</SelectItem>
              {supervisors.length > 0 ? (
                supervisors
                  .sort((a, b) => (a.email || a.usuario || '').localeCompare(b.email || b.usuario || ''))
                  .map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisor._id}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-supervisors" disabled>
                  No hay supervisores disponibles
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Botón Nuevo Cliente y Vistas */}
        <div className="flex justify-end gap-2">
          {/* Selector de vista */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <Filter className="w-4 h-4 mr-2" />
                {viewMode === 'all' ? 'Vista normal' : 'Ver sin supervisor'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => toggleViewMode('all')}
                className={viewMode === 'all' ? 'bg-[#DFEFE6]/30 font-medium' : ''}
              >
                <Building className="w-4 h-4 mr-2 text-[#29696B]" />
                Vista normal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleViewMode('unassigned')}
                className={viewMode === 'unassigned' ? 'bg-[#DFEFE6]/30 font-medium' : ''}
              >
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                Subservicios sin supervisor
                {totalUnassignedSubservices > 0 && (
                  <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-300">
                    {totalUnassignedSubservices}
                  </Badge>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>



          <Button
            onClick={() => {
              resetClientForm();
              setShowModal(true);
            }}
            className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Barra de herramientas para móviles */}
      <div className="md:hidden mb-6 space-y-3 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar clientes..."
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="flex-shrink-0 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            onClick={() => {
              resetClientForm();
              setShowModal(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {isMobileFilterOpen && (
          <div className="p-3 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/30">
            {/* Vista */}
            <div className="mb-3">
              <Label className="text-sm font-medium mb-1 block text-[#29696B]">
                Vista
              </Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleViewMode('all')}
                  className={viewMode === 'all'
                    ? 'bg-[#29696B] text-white hover:bg-[#29696B]/90'
                    : 'border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50'}
                >
                  <Building className="w-3 h-3 mr-1" />
                  Vista normal
                </Button>
                <Button
                  variant={viewMode === 'unassigned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleViewMode('unassigned')}
                  className={viewMode === 'unassigned'
                    ? 'bg-[#29696B] text-white hover:bg-[#29696B]/90'
                    : 'border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50'}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Sin supervisor
                  {totalUnassignedSubservices > 0 && (
                    <Badge className="ml-1 text-xs bg-amber-100 text-amber-700 border-amber-300">
                      {totalUnassignedSubservices}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            {/* Filtros */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="mobileUserFilter" className="text-sm font-medium mb-1 block text-[#29696B]">
                  Filtrar por usuario
                </Label>
                <Select
                  value={activeUserId}
                  onValueChange={setActiveUserId}
                >
                  <SelectTrigger id="mobileUserFilter" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user._id} value={user._id}>
                        {getUserIdentifierById(user._id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeUserId !== "all" && (
                  <div className="mt-2 flex items-center justify-between py-1 px-2 bg-[#DFEFE6]/40 rounded border border-[#91BEAD]/20">
                    <div className="text-xs text-[#29696B]">
                      Usuario seleccionado: <strong>{getUserIdentifierById(activeUserId)}</strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActiveUserId}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3 text-[#29696B]" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="mobileSupervisorFilter" className="text-sm font-medium mb-1 block text-[#29696B]">
                  Filtrar por supervisor
                </Label>
                <Select
                  value={activeSupervisorId}
                  onValueChange={setActiveSupervisorId}
                >
                  <SelectTrigger id="mobileSupervisorFilter" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Seleccionar supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los supervisores</SelectItem>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor._id} value={supervisor._id}>
                        {getSupervisorIdentifierById(supervisor._id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeSupervisorId !== "all" && (
                  <div className="mt-2 flex items-center justify-between py-1 px-2 bg-[#DFEFE6]/40 rounded border border-[#91BEAD]/20">
                    <div className="text-xs text-[#29696B]">
                      Supervisor seleccionado: <strong>{getSupervisorIdentifierById(activeSupervisorId)}</strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActiveSupervisorId}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3 text-[#29696B]" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {filteredClients.length > 0 && viewMode === 'all' && (
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => collapseAll()}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                >
                  {expandedClientId ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Contraer Cliente
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Expandir Cliente
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vista de clientes normales */}
      {viewMode === 'all' && (
        <>
          {/* Mensaje cuando no hay clientes */}
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
                <Users className="w-6 h-6 text-[#29696B]" />
              </div>
              <p>
                No se encontraron clientes
                {activeUserId !== "all" && " para el usuario seleccionado"}
                {activeSupervisorId !== "all" && " con el supervisor seleccionado"}
                {searchTerm && ` que coincidan con "${searchTerm}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contador de resultados con información detallada */}
              {filteredClients.length > 0 && (
                <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
                  <span>
                    Total: {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
                  </span>
                  <span className="text-[#29696B] font-medium">
                    Mostrando: {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems}
                  </span>
                </div>
              )}

              {/* Paginación visible en la parte superior para móvil */}
              <div ref={mobileListRef} id="mobile-clients-list" className="md:hidden">
                {filteredClients.length > itemsPerPage && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mb-4">
                    <Pagination
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  </div>
                )}
              </div>

              {/* Lista de clientes */}
              <div className="space-y-6">
                {/* Vista para pantallas medianas y grandes */}
                <div className="hidden md:block space-y-6">
                  {paginatedClients.map(client => (
                    <Card key={client._id} className="border border-[#91BEAD]/20 shadow-sm overflow-hidden">
                      <CardHeader className="p-4 bg-[#DFEFE6]/30 border-b border-[#91BEAD]/20 flex justify-between items-center">
                        <div className="flex items-center">
                          <Building className="w-5 h-5 text-[#29696B] mr-2" />
                          <CardTitle className="text-lg font-medium text-[#29696B]">{client.nombre}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-8 w-8 p-0 text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
                            onClick={() => toggleClientExpansion(client._id)}
                          >
                            {expandedClientId === client._id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          {client.subServicios && (
                            <span className="text-xs text-[#7AA79C] ml-2">
                              {client.subServicios.length} {client.subServicios.length === 1 ? 'subservicio' : 'subservicios'}
                              </span>
                          )}
                          {client.requiereAsignacion && (
                            <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-300">
                              Requiere Asignación
                            </Badge>
                          )}
                          {clientHasUnassignedSubservices(client) && (
                            <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-300">
                              Subservicios Sin Supervisor
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Botón para agregar nuevo subservicio */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddSubServicio(client)}
                            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar Subservicio
                          </Button>

                          {/* Acciones para el cliente */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                <FileEdit className="w-4 h-4 mr-2 text-[#29696B]" />
                                Editar Cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => confirmDelete(client._id, 'cliente')}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar Cliente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      {/* Información del cliente y subservicios */}
                      <CardContent className={`p-0 ${expandedClientId === client._id ? 'block' : 'hidden'}`}>
                        {/* Información del cliente */}
                        <div className="p-4 border-b border-[#91BEAD]/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <Mail className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" />
                              <div>
                                <p className="text-sm text-[#7AA79C]">Email</p>
                                <p className="text-[#29696B]">{client.email || 'No especificado'}</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <Phone className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" />
                              <div>
                                <p className="text-sm text-[#7AA79C]">Teléfono</p>
                                <p className="text-[#29696B]">{client.telefono || 'No especificado'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <Home className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" />
                              <div>
                                <p className="text-sm text-[#7AA79C]">Dirección</p>
                                <p className="text-[#29696B]">{client.direccion || 'No especificada'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-start">
                                <Users className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" />
                                <div>
                                  <p className="text-sm text-[#7AA79C]">Supervisores Asignados</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Array.isArray(client.userId) && client.userId.length > 0 ? (
                                      client.userId.map(userId => {
                                        const supervisorId = typeof userId === 'object' && userId !== null ? userId._id : userId;
                                        const supervisor = supervisors.find(s => s._id === supervisorId);

                                        return (
                                          <Badge
                                            key={supervisorId}
                                            variant="outline"
                                            className="bg-[#DFEFE6]/80 text-[#29696B] border-[#91BEAD] text-xs"
                                          >
                                            {supervisor
                                              ? (supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisorId.substring(0, 8))
                                              : `Supervisor ID: ${supervisorId.substring(0, 8)}`
                                            }
                                          </Badge>
                                        );
                                      })
                                    ) : (
                                      <span className="text-[#29696B]">No hay supervisores asignados</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {client.descripcion && (
                            <div className="space-y-2 md:col-span-2 lg:col-span-1">
                              <div className="flex items-start">
                                <Info className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" />
                                <div>
                                  <p className="text-sm text-[#7AA79C]">Descripción</p>
                                  <p className="text-[#29696B]">{client.descripcion}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Lista de subservicios */}
                        <div className="divide-y divide-[#91BEAD]/10">
                          {client.subServicios && client.subServicios.length > 0 ? (
                            client.subServicios.map(subservicio => (
                              <div key={subservicio._id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 text-[#7AA79C] mr-2" />
                                    <div>
                                      <h4 className="font-medium text-[#29696B]">{subservicio.nombre}</h4>
                                      {subservicio.descripcion && (
                                        <p className="text-sm text-[#7AA79C]">{subservicio.descripcion}</p>
                                      )}

                                      {/* Mostrar información del supervisor */}
                                      {subservicio.supervisorId ? (
                                        <div className="flex items-center mt-1">
                                          <Shield className="w-3 h-3 text-[#29696B] mr-1" />
                                          <span className="text-xs text-[#29696B]">
                                            Supervisor: {
                                              typeof subservicio.supervisorId === 'object' && subservicio.supervisorId
                                                ? subservicio.supervisorId.email || subservicio.supervisorId.usuario || `${subservicio.supervisorId.nombre || ''} ${subservicio.supervisorId.apellido || ''}`.trim()
                                                : typeof subservicio.supervisorId === 'string'
                                                  ? getSupervisorIdentifierById(subservicio.supervisorId)
                                                  : 'No asignado'
                                            }
                                          </span>
                                        </div>
                                      ) : (
                                        <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
                                          Sin Supervisor
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-2 h-6 w-6 p-0 text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
                                      onClick={() => toggleSubServicioExpansion(subservicio._id)}
                                    >
                                      {expandedSubServicioId === subservicio._id ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </Button>
                                    {subservicio.subUbicaciones && (
                                      <span className="text-xs text-[#7AA79C] ml-2">
                                        {subservicio.subUbicaciones.length} {subservicio.subUbicaciones.length === 1 ? 'sububicación' : 'sububicaciones'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Botón para gestionar supervisor */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenSupervisorModal(client, subservicio)}
                                      className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50 text-xs"
                                    >
                                      <Shield className="w-3 h-3 mr-1" />
                                      {subservicio.supervisorId ? 'Cambiar Supervisor' : 'Asignar Supervisor'}
                                    </Button>

                                    {/* Botón para agregar nueva sububicación */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddSubUbicacion(client, subservicio)}
                                      className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50 text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Agregar Sububicación
                                    </Button>

                                    {/* Acciones para el subservicio */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]">
                                          <Settings className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditSubServicio(client, subservicio)}>
                                          <FileEdit className="w-4 h-4 mr-2 text-[#29696B]" />
                                          Editar Subservicio
                                        </DropdownMenuItem>
                                        {subservicio.supervisorId && (
                                          <DropdownMenuItem
                                            onClick={() => confirmRemoveSupervisor(client._id, subservicio._id)}
                                            className="text-amber-600"
                                          >
                                            <X className="w-4 h-4 mr-2" />
                                            Remover Supervisor
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => confirmDelete(subservicio._id, 'subservicio', client._id)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Eliminar Subservicio
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Lista de sububicaciones */}
                                {expandedSubServicioId === subservicio._id && subservicio.subUbicaciones && subservicio.subUbicaciones.length > 0 && (
                                  <div className="pl-6 mt-2 space-y-3 border-l-2 border-[#DFEFE6]">
                                    {subservicio.subUbicaciones.map(sububicacion => (
                                      <div key={sububicacion._id} className="py-2 pl-2 pr-1 flex justify-between items-center bg-[#DFEFE6]/10 rounded-md">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-[#29696B] rounded-full mr-2"></div>
                                          <div>
                                            <h5 className="text-sm font-medium text-[#29696B]">{sububicacion.nombre}</h5>
                                            {sububicacion.descripcion && (
                                              <p className="text-xs text-[#7AA79C]">{sububicacion.descripcion}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditSubUbicacion(client, subservicio, sububicacion)}
                                            className="h-6 w-6 p-0 text-[#29696B] hover:bg-[#DFEFE6]/70"
                                          >
                                            <FileEdit className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => confirmDelete(sububicacion._id, 'sububicacion', client._id, subservicio._id)}
                                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-[#7AA79C]">
                              <p>No hay subservicios disponibles</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSubServicio(client)}
                                className="mt-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Primer Subservicio
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      {/* Pie de tarjeta - mensaje cuando está colapsado */}
                      {expandedClientId !== client._id && (
                        <CardFooter className="p-2 bg-[#DFEFE6]/10 border-t border-[#91BEAD]/10 flex justify-center">
                          <Button
                            variant="ghost"
                            onClick={() => toggleClientExpansion(client._id)}
                            className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
                          >
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Ver detalles
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Vista móvil */}
                <div className="md:hidden space-y-6">
                  {paginatedClients.map(client => (
                    <Card key={client._id} className="border border-[#91BEAD]/20 shadow-sm">
                      <CardHeader className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start">
                            <Building className="w-4 h-4 text-[#29696B] mt-1 mr-2" />
                            <div>
                              <CardTitle className="text-base text-[#29696B]">{client.nombre}</CardTitle>
                              {client.descripcion && (
                                <p className="text-xs text-[#7AA79C] mt-1">{client.descripcion}</p>
                              )}
                              {client.requiereAsignacion && (
                                <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  Requiere Asignación
                                </Badge>
                              )}
                              {clientHasUnassignedSubservices(client) && (
                                <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  Sin Supervisor
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Settings className="w-4 h-4 text-[#7AA79C]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                <FileEdit className="w-4 h-4 mr-2 text-[#29696B]" />
                                Editar Cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAddSubServicio(client)}
                              >
                                <Plus className="w-4 h-4 mr-2 text-[#29696B]" />
                                Agregar Subservicio
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => confirmDelete(client._id, 'cliente')}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar Cliente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="p-0">
                        <Accordion
                          type="single"
                          collapsible
                          value={expandedClientId === client._id ? 'details' : ''}
                          onValueChange={(value) => {
                            if (value === 'details') {
                              setExpandedClientId(client._id);
                            } else {
                              setExpandedClientId(null);
                            }
                          }}
                        >
                          <AccordionItem value="details" className="border-0">
                            <AccordionTrigger className="py-2 px-3 text-[#7AA79C] hover:no-underline hover:bg-[#DFEFE6]/20">
                              <span className="text-xs">Ver detalles</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="px-3 py-2 space-y-3 text-sm">
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center">
                                    <Mail className="w-3 h-3 text-[#7AA79C] mr-2" />
                                    <span className="text-[#7AA79C]">
                                      Email: <span className="text-[#29696B]">{client.email || 'No especificado'}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="w-3 h-3 text-[#7AA79C] mr-2" />
                                    <span className="text-[#7AA79C]">
                                      Teléfono: <span className="text-[#29696B]">{client.telefono || 'No especificado'}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Home className="w-3 h-3 text-[#7AA79C] mr-2" />
                                    <span className="text-[#7AA79C]">
                                      Dirección: <span className="text-[#29696B]">{client.direccion || 'No especificada'}</span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-start">
                                      <Users className="w-3 h-3 text-[#7AA79C] mt-1 mr-2" />
                                      <div>
                                        <span className="text-[#7AA79C]">Supervisores:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {Array.isArray(client.userId) && client.userId.length > 0 ? (
                                            client.userId.map(userId => {
                                              const supervisorId = typeof userId === 'object' && userId !== null ? userId._id : userId;
                                              const supervisor = supervisors.find(s => s._id === supervisorId);

                                              return (
                                                <Badge
                                                  key={supervisorId}
                                                  variant="outline"
                                                  className="bg-[#DFEFE6]/80 text-[#29696B] border-[#91BEAD] text-xs"
                                                >
                                                  {supervisor
                                                    ? (supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisorId.substring(0, 8))
                                                    : `ID: ${supervisorId.substring(0, 8)}`
                                                  }
                                                </Badge>
                                              );
                                            })
                                          ) : (
                                            <span className="text-[#29696B] text-xs">No hay supervisores asignados</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Tabs para subservicios en móvil */}
                                <Tabs defaultValue="subservicios" className="mt-4">
                                  <TabsList className="bg-[#DFEFE6]/30 w-full">
                                    <TabsTrigger value="subservicios" className="flex-1 text-xs">Subservicios</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="subservicios" className="mt-2">
                                    {client.subServicios && client.subServicios.length > 0 ? (
                                      <div className="space-y-3">
                                        {client.subServicios.map(subservicio => (
                                          <div key={subservicio._id} className="border border-[#91BEAD]/20 rounded-md overflow-hidden">
                                            <div className="p-2 bg-[#DFEFE6]/20 flex justify-between items-center">
                                              <div className="flex items-center">
                                                <MapPin className="w-3 h-3 text-[#29696B] mr-2" />
                                                <div>
                                                  <span className="text-sm font-medium text-[#29696B]">{subservicio.nombre}</span>
                                                  {/* Mostrar información del supervisor */}
                                                  {subservicio.supervisorId ? (
                                                    <div className="flex items-center mt-1">
                                                      <Shield className="w-2 h-2 text-[#29696B] mr-1" />
                                                      <span className="text-xs text-[#29696B]">
                                                        {typeof subservicio.supervisorId === 'object' && subservicio.supervisorId
                                                          ? subservicio.supervisorId.email || subservicio.supervisorId.usuario || `${subservicio.supervisorId.nombre || ''} ${subservicio.supervisorId.apellido || ''}`.trim()
                                                          : typeof subservicio.supervisorId === 'string'
                                                            ? getSupervisorIdentifierById(subservicio.supervisorId)
                                                            : 'No asignado'}
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
                                                      Sin Supervisor
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleOpenSupervisorModal(client, subservicio)}
                                                  className="h-6 w-6 p-0 text-[#29696B]"
                                                >
                                                  <Shield className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleAddSubUbicacion(client, subservicio)}
                                                  className="h-6 w-6 p-0 text-[#29696B]"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleEditSubServicio(client, subservicio)}
                                                  className="h-6 w-6 p-0 text-[#29696B]"
                                                >
                                                  <FileEdit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => confirmDelete(subservicio._id, 'subservicio', client._id)}
                                                  className="h-6 w-6 p-0 text-red-600"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            <Accordion
                                              type="single"
                                              collapsible
                                            >
                                              <AccordionItem value="sububicaciones" className="border-0">
                                                <AccordionTrigger className="py-1 px-2 text-xs text-[#7AA79C] hover:no-underline">
                                                  {subservicio.subUbicaciones?.length || 0} sububicaciones
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                  {subservicio.subUbicaciones && subservicio.subUbicaciones.length > 0 ? (
                                                    <div className="px-2 pb-2 space-y-2">
                                                      {subservicio.subUbicaciones.map(sububicacion => (
                                                        <div key={sububicacion._id} className="p-2 flex justify-between items-center bg-[#DFEFE6]/10 rounded-md">
                                                          <div>
                                                            <span className="text-xs font-medium text-[#29696B]">{sububicacion.nombre}</span>
                                                            {sububicacion.descripcion && (
                                                              <p className="text-xs text-[#7AA79C]">{sububicacion.descripcion}</p>
                                                            )}
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => handleEditSubUbicacion(client, subservicio, sububicacion)}
                                                              className="h-5 w-5 p-0 text-[#29696B]"
                                                            >
                                                              <FileEdit className="w-2 h-2" />
                                                            </Button>
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => confirmDelete(sububicacion._id, 'sububicacion', client._id, subservicio._id)}
                                                              className="h-5 w-5 p-0 text-red-600"
                                                            >
                                                              <Trash2 className="w-2 h-2" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <div className="p-2 text-xs text-center text-[#7AA79C]">
                                                      No hay sububicaciones disponibles
                                                    </div>
                                                  )}
                                                </AccordionContent>
                                              </AccordionItem>
                                            </Accordion>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-4 text-[#7AA79C] text-sm">
                                        <p>No hay subservicios disponibles</p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddSubServicio(client)}
                                          className="mt-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50 text-xs"
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Agregar Primer Subservicio
                                        </Button>
                                      </div>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Paginación para la vista de escritorio */}
                {filteredClients.length > itemsPerPage && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
                    <Pagination
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Vista de subservicios sin supervisor */}
      {viewMode === 'unassigned' && (
        <>
          {unassignedSubservices.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
                <Shield className="w-6 h-6 text-[#29696B]" />
              </div>
              <p>No hay subservicios sin supervisor asignado</p>
              <Button
                variant="outline"
                onClick={() => toggleViewMode('all')}
                className="mt-4 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <Building className="w-4 h-4 mr-2" />
                Volver a la vista normal
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información sobre subservicios sin asignar */}
              <Alert className="bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="ml-2">
                  Se encontraron {totalUnassignedSubservices} subservicios sin supervisor asignado.
                  Puede asignarles un supervisor utilizando el botón "Asignar Supervisor".
                </AlertDescription>
              </Alert>

              {/* Lista de subservicios sin supervisor */}
              <div className="space-y-6">
                {unassignedSubservices.map(cliente => (
                  <Card key={cliente.clienteId} className="border border-[#91BEAD]/20 shadow-sm">
                    <CardHeader className="p-4 bg-[#DFEFE6]/30 border-b border-[#91BEAD]/20">
                      <div className="flex items-center">
                        <Building className="w-5 h-5 text-[#29696B] mr-2" />
                        <CardTitle className="text-lg font-medium text-[#29696B]">{cliente.nombreCliente}</CardTitle>
                        <Badge className="ml-3 bg-amber-100 text-amber-700 border-amber-300">
                          {cliente.subServicios.length} subservicios sin supervisor
                        </Badge>
                      </div>
                      <div className="text-sm text-[#7AA79C] mt-1">
                        Supervisores asignados: {
                          Array.isArray(cliente.userId) ? (
                            cliente.userId.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {cliente.userId.map(userId => {
                                  const supervisorId = typeof userId === 'object' && userId !== null ? userId._id : userId;
                                  const supervisor = supervisors.find(s => s._id === supervisorId);

                                  return (
                                    <Badge
                                      key={supervisorId}
                                      variant="outline"
                                      className="bg-[#DFEFE6]/80 text-[#29696B] border-[#91BEAD] text-xs"
                                    >
                                      {supervisor
                                        ? (supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisorId.substring(0, 8))
                                        : `ID: ${supervisorId.substring(0, 8)}`
                                      }
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : 'Ninguno'
                          ) : (
                            typeof cliente.userId === 'object' && cliente.userId
                              ? cliente.userId.email || cliente.userId.usuario || `${cliente.userId.nombre || ''} ${cliente.userId.apellido || ''}`.trim()
                              : typeof cliente.userId === 'string'
                                ? getUserIdentifierById(cliente.userId as string)
                                : 'No asignado'
                          )
                        }
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 divide-y divide-[#91BEAD]/10">
                      {cliente.subServicios.map(subservicio => (
                        <div key={subservicio._id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              <MapPin className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" />
                              <div>
                                <h4 className="font-medium text-[#29696B]">{subservicio.nombre}</h4>
                                {subservicio.descripcion && (
                                  <p className="text-sm text-[#7AA79C]">{subservicio.descripcion}</p>
                                )}
                                <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  Sin Supervisor
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Buscar el cliente completo para tener toda la información
                                const fullClient = clients.find(c => c._id === cliente.clienteId);
                                if (fullClient) {
                                  handleOpenSupervisorModal(fullClient, subservicio);
                                } else {
                                  // Crear un objeto cliente mínimo si no lo encontramos
                                  const minimalClient: Client = {
                                    _id: cliente.clienteId,
                                    nombre: cliente.nombreCliente,
                                    descripcion: '',
                                    servicio: cliente.nombreCliente,
                                    seccionDelServicio: '',
                                    userId: typeof cliente.userId === 'object' && Array.isArray(cliente.userId)
                                      ? cliente.userId
                                      : (cliente.userId ? [cliente.userId] : []),
                                    subServicios: [],
                                    direccion: '',
                                    telefono: '',
                                    email: '',
                                    activo: true
                                  };
                                  handleOpenSupervisorModal(minimalClient, subservicio);
                                }
                              }}
                              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Asignar Supervisor
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Botón para volver a la vista normal */}
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => toggleViewMode('all')}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Volver a la vista normal
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Cliente */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle className="text-[#29696B]">
              {currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={currentClient ? handleUpdateClient : handleCreateClient} className="space-y-4 py-2">
            <div>
              <Label htmlFor="nombre" className="text-sm text-[#29696B]">Nombre del Cliente*</Label>
              <Input
                id="nombre"
                placeholder="Ej: Ministerio de Salud, Universidad XYZ"
                value={clientFormData.nombre}
                onChange={(e) => setClientFormData({ ...clientFormData, nombre: e.target.value })}
                required
                className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
              />
            </div>

            <div>
              <Label htmlFor="descripcion" className="text-sm text-[#29696B]">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Descripción opcional del cliente"
                value={clientFormData.descripcion}
                onChange={(e) => setClientFormData({ ...clientFormData, descripcion: e.target.value })}
                className="mt-1 border-[#91BEAD] focus:border-[#29696B] resize-none"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="userId" className="text-sm text-[#29696B]">Supervisores Asignados*</Label>
              <div className="mt-1">
                <MultiSupervisorSelect
                  supervisors={supervisors}
                  selectedSupervisors={clientFormData.userId || []}
                  onChange={(newValue: any) => setClientFormData({ ...clientFormData, userId: newValue })}
                  placeholder="Seleccionar supervisores..."
                />
              </div>
              {!clientFormData.userId || (Array.isArray(clientFormData.userId) && clientFormData.userId.length === 0) && (
                <p className="text-xs text-red-500 mt-1">Debe seleccionar al menos un supervisor</p>
              )}
            </div>

            <div>
              <Label htmlFor="direccion" className="text-sm text-[#29696B]">Dirección</Label>
              <Input
                id="direccion"
                placeholder="Ej: Av. Rivadavia 1234, Buenos Aires"
                value={clientFormData.direccion}
                onChange={(e) => setClientFormData({ ...clientFormData, direccion: e.target.value })}
                className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono" className="text-sm text-[#29696B]">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="Ej: +54 11 12345678"
                  value={clientFormData.telefono}
                  onChange={(e) => setClientFormData({ ...clientFormData, telefono: e.target.value })}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm text-[#29696B]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: contacto@empresa.com"
                  value={clientFormData.email}
                  onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="activo"
                type="checkbox"
                checked={clientFormData.activo}
                onChange={(e) => setClientFormData({ ...clientFormData, activo: e.target.checked })}
                className="form-checkbox h-4 w-4 text-[#29696B] rounded border-[#91BEAD] focus:ring-[#29696B]/20"
              />
              <Label htmlFor="activo" className="text-sm text-[#29696B]">Cliente activo</Label>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-4 z-10 gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetClientForm();
                }}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || deletingOperation || !clientFormData.userId ||
                  (Array.isArray(clientFormData.userId) && clientFormData.userId.length === 0)}
                className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                {loading || deletingOperation ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : currentClient
                  ? 'Guardar Cambios'
                  : 'Crear Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Subservicio */}
      <Dialog open={showSubServicioModal} onOpenChange={setShowSubServicioModal}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {currentSubServicio ? 'Editar Subservicio' : 'Nuevo Subservicio'}
            </DialogTitle>
            {currentClientForSubServicio && (
              <DialogDescription className="text-[#7AA79C]">
                Cliente: <span className="text-[#29696B]">{currentClientForSubServicio.nombre}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={currentSubServicio ? handleUpdateSubServicio : handleCreateSubServicio} className="space-y-4 py-2">
            <div>
              <Label htmlFor="subservicio-nombre" className="text-sm text-[#29696B]">Nombre del Subservicio*</Label>
              <Input
                id="subservicio-nombre"
                placeholder="Ej: Sede Central, Edificio A"
                value={subServicioFormData.nombre}
                onChange={(e) => setSubServicioFormData({ ...subServicioFormData, nombre: e.target.value })}
                required
                className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
              />
            </div>

            <div>
              <Label htmlFor="subservicio-descripcion" className="text-sm text-[#29696B]">Descripción</Label>
              <Textarea
                id="subservicio-descripcion"
                placeholder="Descripción opcional del subservicio"
                value={subServicioFormData.descripcion}
                onChange={(e) => setSubServicioFormData({ ...subServicioFormData, descripcion: e.target.value })}
                className="mt-1 border-[#91BEAD] focus:border-[#29696B] resize-none"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="subservicio-supervisor" className="text-sm text-[#29696B]">Supervisor Asignado (Opcional)</Label>
              <Select
                value={subServicioFormData.supervisorId || ''}
                onValueChange={(value) => setSubServicioFormData({ ...subServicioFormData, supervisorId: value === 'all' ? '' : value })}
                required
              >
                <SelectTrigger
                  id="subservicio-supervisor"
                  className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20"
                  data-invalid={!subServicioFormData.supervisorId}
                >
                  <SelectValue placeholder="Seleccionar supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sin supervisor</SelectItem>
                  {/* Obtener solo los supervisores que están asignados al cliente */}
                  {currentClientForSubServicio && Array.isArray(currentClientForSubServicio.userId) ? (
                    currentClientForSubServicio.userId.length > 0 ? (
                      currentClientForSubServicio.userId.map(userId => {
                        const supervisorId = typeof userId === 'object' && userId !== null && userId._id ? userId._id : String(userId);
                        const supervisor = supervisors.find(s => s._id === supervisorId);

                        return supervisor ? (
                          <SelectItem key={supervisorId} value={supervisorId}>
                            {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisorId}
                          </SelectItem>
                        ) : null;
                      }).filter(Boolean)
                    ) : (
                      <SelectItem value="no-supervisors" disabled>
                        No hay supervisores asignados al cliente
                      </SelectItem>
                    )
                  ) : (
                    <SelectItem value="no-supervisors" disabled>
                      Cliente no disponible
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Mostrar detalles del supervisor seleccionado */}
              {subServicioFormData.supervisorId && (
                <div className="mt-2 text-sm text-[#29696B] flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Supervisor: <strong className="ml-1">{getSupervisorIdentifierById(subServicioFormData.supervisorId)}</strong>
                </div>
              )}

              <p className="text-xs text-[#7AA79C] mt-1">
                Nota: Solo se muestran los supervisores asignados a este cliente.
              </p>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSubServicioModal(false);
                  resetSubServicioForm();
                }}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || deletingOperation}
                className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                {loading || deletingOperation ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : currentSubServicio
                  ? 'Guardar Cambios'
                  : 'Crear Subservicio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Asignación de Supervisor */}
      <Dialog open={showSupervisorModal} onOpenChange={setShowSupervisorModal}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B] flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              {currentSubServicio?.supervisorId ? 'Cambiar Supervisor' : 'Asignar Supervisor'}
            </DialogTitle>
            {currentClientForSubServicio && currentSubServicio && (
              <DialogDescription className="text-[#7AA79C]">
                Cliente: <span className="text-[#29696B]">{currentClientForSubServicio.nombre}</span>
                <br />
                Subservicio: <span className="text-[#29696B]">{currentSubServicio.nombre}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={handleAssignSupervisor} className="space-y-4 py-2">
            <div>
              <Label htmlFor="supervisor-id" className="text-sm text-[#29696B]">Seleccionar Supervisor*</Label>
              <Select
                value={currentSupervisorId}
                onValueChange={setCurrentSupervisorId}
                required
              >
                <SelectTrigger id="supervisor-id" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {/* Obtener solo los supervisores que están asignados al cliente */}
                  {currentClientForSubServicio && Array.isArray(currentClientForSubServicio.userId) ? (
                    currentClientForSubServicio.userId.length > 0 ? (
                      currentClientForSubServicio.userId.map(userId => {
                        const supervisorId = typeof userId === 'object' && userId !== null && userId._id ? userId._id : String(userId);
                        const supervisor = supervisors.find(s => s._id === supervisorId);

                        return supervisor ? (
                          <SelectItem key={supervisorId} value={supervisorId}>
                            {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisorId}
                          </SelectItem>
                        ) : null;
                      }).filter(Boolean)
                    ) : (
                      <SelectItem value="no-supervisors" disabled>
                        No hay supervisores asignados al cliente
                      </SelectItem>
                    )
                  ) : (
                    <SelectItem value="no-supervisors" disabled>
                      Cliente no disponible
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Mostrar información del supervisor seleccionado */}
              {currentSupervisorId && (
                <div className="mt-3 p-3 bg-[#DFEFE6]/20 border border-[#91BEAD]/30 rounded-md">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 text-[#29696B] mr-2" />
                    <span className="font-medium text-[#29696B]">Información del Supervisor</span>
                  </div>
                  <div className="text-sm space-y-1 text-[#7AA79C]">
                    {(() => {
                      const supervisor = supervisors.find(s => s._id === currentSupervisorId);
                      if (supervisor) {
                        return (
                          <>
                            {supervisor.email && (
                              <div className="flex items-center">
                                <Mail className="w-3 h-3 mr-1 text-[#29696B]" />
                                Email: <span className="ml-1 text-[#29696B]">{supervisor.email}</span>
                              </div>
                            )}
                            {supervisor.usuario && (
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1 text-[#29696B]" />
                                Usuario: <span className="ml-1 text-[#29696B]">{supervisor.usuario}</span>
                              </div>
                            )}
                            {supervisor.nombre && (
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1 text-[#29696B]" />
                                Nombre: <span className="ml-1 text-[#29696B]">{`${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim()}</span>
                              </div>
                            )}
                          </>
                        );
                      }
                      return (
                        <div className="text-center">No se encontró información del supervisor</div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <p className="text-xs text-[#7AA79C] mt-2">
                Nota: Solo puede seleccionar supervisores que estén asignados a este cliente.
              </p>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSupervisorModal(false);
                  setCurrentSupervisorId('');
                }}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!currentSupervisorId || loading || deletingOperation}
                className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                {loading || deletingOperation ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : currentSubServicio?.supervisorId
                  ? 'Cambiar Supervisor'
                  : 'Asignar Supervisor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Sububicación */}
      <Dialog open={showSubUbicacionModal} onOpenChange={setShowSubUbicacionModal}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {currentSubUbicacion ? 'Editar Sububicación' : 'Nueva Sububicación'}
            </DialogTitle>
            {currentClientForSubServicio && currentSubServicio && (
              <DialogDescription className="text-[#7AA79C]">
                Cliente: <span className="text-[#29696B]">{currentClientForSubServicio.nombre}</span>
                <br />
                Subservicio: <span className="text-[#29696B]">{currentSubServicio.nombre}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={currentSubUbicacion ? handleUpdateSubUbicacion : handleCreateSubUbicacion} className="space-y-4 py-2">
            <div>
              <Label htmlFor="sububicacion-nombre" className="text-sm text-[#29696B]">Nombre de la Sububicación*</Label>
              <Input
                id="sububicacion-nombre"
                placeholder="Ej: Piso 3, Sector B"
                value={subUbicacionFormData.nombre}
                onChange={(e) => setSubUbicacionFormData({ ...subUbicacionFormData, nombre: e.target.value })}
                required
                className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
              />
            </div>

            <div>
              <Label htmlFor="sububicacion-descripcion" className="text-sm text-[#29696B]">Descripción</Label>
              <Textarea
                id="sububicacion-descripcion"
                placeholder="Descripción opcional de la sububicación"
                value={subUbicacionFormData.descripcion}
                onChange={(e) => setSubUbicacionFormData({ ...subUbicacionFormData, descripcion: e.target.value })}
                className="mt-1 border-[#91BEAD] focus:border-[#29696B] resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSubUbicacionModal(false);
                  resetSubUbicacionForm();
                }}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || deletingOperation}
                className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                {loading || deletingOperation ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : currentSubUbicacion
                  ? 'Guardar Cambios'
                  : 'Crear Sububicación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación para Eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => !deletingOperation && setShowDeleteModal(open)}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {idToDelete?.type === 'cliente' ? 'Eliminar Cliente' :
                idToDelete?.type === 'subservicio' ? 'Eliminar Subservicio' :
                  idToDelete?.type === 'sububicacion' ? 'Eliminar Sububicación' :
                    'Remover Supervisor'}
            </DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              {idToDelete?.type === 'supervisor'
                ? '¿Está seguro de remover el supervisor de este subservicio? Esta acción no se puede deshacer.'
                : `¿Está seguro de eliminar este ${idToDelete?.type}? Esta acción no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>

          {idToDelete && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
              {(() => {
                if (idToDelete.type === 'cliente') {
                  const client = clients.find(c => c._id === idToDelete.id);
                  return (
                    <>
                      <p className="font-medium text-red-700">Datos del cliente:</p>
                      <p className="mt-1">Nombre: <strong>{client?.nombre}</strong></p>
                      {client?.subServicios && client.subServicios.length > 0 && (
                        <p className="mt-1 text-red-700">
                          ⚠️ Se eliminarán también todos los subservicios ({client.subServicios.length}) y sus sububicaciones.
                        </p>
                      )}
                    </>
                  );
                } else if (idToDelete.type === 'subservicio') {
                  const client = clients.find(c => c._id === idToDelete.parentId);
                  const subservicio = client?.subServicios.find(s => s._id === idToDelete.id);
                  return (
                    <>
                      <p className="font-medium text-red-700">Datos del subservicio:</p>
                      <p className="mt-1">Cliente: <strong>{client?.nombre}</strong></p>
                      <p className="mt-1">Subservicio: <strong>{subservicio?.nombre}</strong></p>
                      {subservicio?.subUbicaciones && subservicio.subUbicaciones.length > 0 && (
                        <p className="mt-1 text-red-700">
                          ⚠️ Se eliminarán también todas las sububicaciones ({subservicio.subUbicaciones.length}).
                        </p>
                      )}
                    </>
                  );
                } else if (idToDelete.type === 'sububicacion') {
                  const client = clients.find(c => c._id === idToDelete.parentId);
                  const subservicio = client?.subServicios.find(s => s._id === idToDelete.subServicioId);
                  const sububicacion = subservicio?.subUbicaciones.find(s => s._id === idToDelete.id);
                  return (
                    <>
                      <p className="font-medium text-red-700">Datos de la sububicación:</p>
                      <p className="mt-1">Cliente: <strong>{client?.nombre}</strong></p>
                      <p className="mt-1">Subservicio: <strong>{subservicio?.nombre}</strong></p>
                      <p className="mt-1">Sububicación: <strong>{sububicacion?.nombre}</strong></p>
                    </>
                  );
                } else if (idToDelete.type === 'supervisor') {
                  const client = clients.find(c => c._id === idToDelete.parentId);
                  const subservicio = client?.subServicios.find(s => s._id === idToDelete.subServicioId);
                  return (
                    <>
                      <p className="font-medium text-amber-700">Se removerá el supervisor del siguiente subservicio:</p>
                      <p className="mt-1">Cliente: <strong>{client?.nombre}</strong></p>
                      <p className="mt-1">Subservicio: <strong>{subservicio?.nombre}</strong></p>
                      <p className="mt-1">Supervisor actual:
                        <strong>
                          {typeof subservicio?.supervisorId === 'object' && subservicio?.supervisorId
                            ? ' ' + (subservicio.supervisorId.email || subservicio.supervisorId.usuario || `${subservicio.supervisorId.nombre || ''} ${subservicio.supervisorId.apellido || ''}`.trim())
                            : typeof subservicio?.supervisorId === 'string'
                              ? ' ' + getSupervisorIdentifierById(subservicio.supervisorId)
                              : ' No asignado'}
                        </strong>
                      </p>
                    </>
                  );
                }
              })()}
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingOperation}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={executeDelete}
              disabled={deletingOperation}
              className={idToDelete?.type === 'supervisor'
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-red-600 hover:bg-red-700"}
            >
              {deletingOperation ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {idToDelete?.type === 'supervisor' ? 'Removiendo...' : 'Eliminando...'}
                </span>
              ) : idToDelete?.type === 'supervisor'
                ? 'Remover Supervisor'
                : `Eliminar ${idToDelete?.type === 'cliente' ? 'Cliente' :
                  idToDelete?.type === 'subservicio' ? 'Subservicio' :
                    'Sububicación'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsSection;