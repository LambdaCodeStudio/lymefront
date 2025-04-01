import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDashboard } from './hooks/useDashboard';
import useClientManager from './hooks/useClientManager';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Search,
  Shield,
  Users,
  UserPlus,
  X,
  MapPin
} from 'lucide-react';

// Componentes UI
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Componentes personalizados
import Pagination from '../components/Pagination';
import ClientCard from './components/ClientCard';
import ClientForm from './form/ClientForm';
import SubservicioForm from './form/SubservicioForm';
import SubUbicacionForm from './form/SubUbicacionForm';
import SupervisorForm from './form/SupervisorForm';
import DeleteConfirmation from './form/DeleteConfirmation';

// Utilidades y tipos
import { DEFAULT_VALUES } from './constants/clients';
import { 
  filterClients, 
  applyPagination, 
  getUserIdentifierWithRole, 
  getSupervisorIdentifier 
} from './utils/clientUtils';
import type { 
  Client, 
  SubServicio, 
  SubUbicacion, 
  CreateClientData, 
  CreateSubServicioData, 
  CreateSubUbicacionData,
  FilterState,
  ViewMode,
  DeleteConfirmation as DeleteConfirmationType
} from './types/clients';

/**
 * Componente principal para gestión de clientes y su estructura jerárquica
 */
const ClientsSection: React.FC = () => {
  // Contexto y hooks
  const { selectedUserId } = useDashboard();
  const {
    clients,
    users,
    supervisors,
    unassignedSubservices,
    loading,
    error,
    successMessage,
    totalUnassignedSubservices,
    fetchClients,
    createClient,
    updateClient,
    createSubServicio,
    updateSubServicio,
    assignSupervisor,
    removeSupervisor,
    createSubUbicacion,
    updateSubUbicacion,
    deleteItem,
    setSuccessMessage,
    clearError
  } = useClientManager(selectedUserId);

  // Estados para formularios
  const [clientFormState, setClientFormState] = useState({
    isOpen: false,
    currentClient: null as Client | null
  });
  
  const [subservicioFormState, setSubservicioFormState] = useState({
    isOpen: false,
    currentClient: null as Client | null,
    currentSubservicio: null as SubServicio | null
  });
  
  const [sububicacionFormState, setSubUbicacionFormState] = useState({
    isOpen: false,
    currentClient: null as Client | null,
    currentSubservicio: null as SubServicio | null,
    currentSubUbicacion: null as SubUbicacion | null
  });
  
  const [supervisorFormState, setSupervisorFormState] = useState({
    isOpen: false,
    currentClient: null as Client | null,
    currentSubservicio: null as SubServicio | null,
    selectedSupervisorId: ''
  });
  
  const [deleteState, setDeleteState] = useState({
    isOpen: false,
    itemToDelete: null as DeleteConfirmationType | null,
    isDeleting: false
  });

  // Estados para filtrado y UI
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    activeUserId: DEFAULT_VALUES.FILTER_STATE.ALL,
    activeSupervisorId: DEFAULT_VALUES.FILTER_STATE.ALL,
    viewMode: DEFAULT_VALUES.FILTER_STATE.viewMode,
    showUnassignedSubservices: DEFAULT_VALUES.FILTER_STATE.showUnassignedSubservices,
    isMobileFilterOpen: DEFAULT_VALUES.FILTER_STATE.isMobileFilterOpen,
    expandedClientId: null,
    expandedSubservicioId: null
  });

  // Estados para paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: DEFAULT_VALUES.PAGINATION.DESKTOP_ITEMS_PER_PAGE
  });

  // Referencia para el scroll en móvil
  const mobileListRef = useRef<HTMLDivElement>(null);

  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Efecto para detectar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setPagination(prev => ({
        ...prev,
        itemsPerPage: width < 768 
          ? DEFAULT_VALUES.PAGINATION.MOBILE_ITEMS_PER_PAGE 
          : DEFAULT_VALUES.PAGINATION.DESKTOP_ITEMS_PER_PAGE
      }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      
      // Ajustar itemsPerPage según el tamaño inicial de la pantalla
      handleResize();
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Resetear la página actual cuando cambie el término de búsqueda o filtros activos
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [
    filters.searchTerm, 
    filters.activeUserId, 
    filters.activeSupervisorId, 
    filters.viewMode, 
    filters.showUnassignedSubservices
  ]);

  // Aplicar filtros a la lista de clientes
  const filteredClients = useMemo(() => 
    filterClients(
      clients,
      filters.searchTerm,
      filters.activeUserId,
      filters.activeSupervisorId,
      filters.viewMode
    ),
    [clients, filters.searchTerm, filters.activeUserId, filters.activeSupervisorId, filters.viewMode]
  );

  // Aplicar paginación a los clientes filtrados
  const { 
    paginatedItems: paginatedClients, 
    totalItems, 
    startIndex, 
    endIndex 
  } = useMemo(() => 
    applyPagination(
      filteredClients,
      pagination.currentPage,
      pagination.itemsPerPage
    ),
    [filteredClients, pagination.currentPage, pagination.itemsPerPage]
  );

  // Callbacks para manejar las acciones de los clientes
  const handleToggleClientExpansion = useCallback((clientId: string) => {
    setFilters(prev => ({
      ...prev,
      expandedClientId: prev.expandedClientId === clientId ? null : clientId
    }));
  }, []);

  const handleToggleSubservicioExpansion = useCallback((subservicioId: string) => {
    setFilters(prev => ({
      ...prev,
      expandedSubservicioId: prev.expandedSubservicioId === subservicioId ? null : subservicioId
    }));
  }, []);

  const collapseAll = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      expandedClientId: null,
      expandedSubservicioId: null
    }));
  }, []);

  // Callbacks para manejar la paginación
  const handlePageChange = useCallback((pageNumber: number) => {
    setPagination(prev => ({ ...prev, currentPage: pageNumber }));
    
    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [windowWidth]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setPagination({
      currentPage: 1,
      itemsPerPage: newItemsPerPage
    });
  }, []);

  // Callbacks para cambiar el modo de vista
  const toggleViewMode = useCallback((mode: ViewMode) => {
    setFilters(prev => ({
      ...prev,
      viewMode: mode
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Limpiadores de filtros
  const clearActiveUserId = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      activeUserId: DEFAULT_VALUES.FILTER_STATE.ALL
    }));
    
    // También limpiar localStorage por si acaso
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedUserId');
      localStorage.removeItem('lastCreatedUserId');
    }
  }, []);

  const clearActiveSupervisorId = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      activeSupervisorId: DEFAULT_VALUES.FILTER_STATE.ALL
    }));
  }, []);

  // Manejadores para formularios de cliente
  const openClientForm = useCallback((client: Client | null = null) => {
    setClientFormState({
      isOpen: true,
      currentClient: client
    });
  }, []);

  const closeClientForm = useCallback(() => {
    setClientFormState({
      isOpen: false,
      currentClient: null
    });
  }, []);

  const handleClientFormSubmit = useCallback(async (data: CreateClientData) => {
    let success;
    
    if (clientFormState.currentClient) {
      success = await updateClient({
        id: clientFormState.currentClient._id,
        ...data
      });
    } else {
      success = await createClient(data);
    }
    
    if (success) {
      closeClientForm();
    }
  }, [clientFormState.currentClient, createClient, updateClient, closeClientForm]);

  // Manejadores para formularios de subservicio
  const openSubservicioForm = useCallback((client: Client, subservicio: SubServicio | null = null) => {
    setSubservicioFormState({
      isOpen: true,
      currentClient: client,
      currentSubservicio: subservicio
    });
  }, []);

  const closeSubservicioForm = useCallback(() => {
    setSubservicioFormState({
      isOpen: false,
      currentClient: null,
      currentSubservicio: null
    });
  }, []);

  const handleSubservicioFormSubmit = useCallback(async (data: CreateSubServicioData) => {
    if (!subservicioFormState.currentClient) return;
    
    let success;
    
    if (subservicioFormState.currentSubservicio) {
      success = await updateSubServicio(
        subservicioFormState.currentClient._id,
        subservicioFormState.currentSubservicio._id,
        data
      );
    } else {
      success = await createSubServicio(
        subservicioFormState.currentClient._id,
        data
      );
    }
    
    if (success) {
      closeSubservicioForm();
    }
  }, [
    subservicioFormState.currentClient, 
    subservicioFormState.currentSubservicio, 
    createSubServicio,
    updateSubServicio,
    closeSubservicioForm
  ]);

  // Manejadores para formularios de sububicación
  const openSubUbicacionForm = useCallback(
    (client: Client, subservicio: SubServicio, sububicacion: SubUbicacion | null = null) => {
      setSubUbicacionFormState({
        isOpen: true,
        currentClient: client,
        currentSubservicio: subservicio,
        currentSubUbicacion: sububicacion
      });
    }, 
    []
  );

  const closeSubUbicacionForm = useCallback(() => {
    setSubUbicacionFormState({
      isOpen: false,
      currentClient: null,
      currentSubservicio: null,
      currentSubUbicacion: null
    });
  }, []);

  const handleSubUbicacionFormSubmit = useCallback(async (data: CreateSubUbicacionData) => {
    if (!sububicacionFormState.currentClient || !sububicacionFormState.currentSubservicio) return;
    
    let success;
    
    if (sububicacionFormState.currentSubUbicacion) {
      success = await updateSubUbicacion(
        sububicacionFormState.currentClient._id,
        sububicacionFormState.currentSubservicio._id,
        sububicacionFormState.currentSubUbicacion._id,
        data
      );
    } else {
      success = await createSubUbicacion(
        sububicacionFormState.currentClient._id,
        sububicacionFormState.currentSubservicio._id,
        data
      );
    }
    
    if (success) {
      closeSubUbicacionForm();
    }
  }, [
    sububicacionFormState.currentClient,
    sububicacionFormState.currentSubservicio,
    sububicacionFormState.currentSubUbicacion,
    createSubUbicacion,
    updateSubUbicacion,
    closeSubUbicacionForm
  ]);

  // Manejadores para formularios de supervisor
  const openSupervisorForm = useCallback((client: Client, subservicio: SubServicio) => {
    let currentSupervisorId = '';
    
    // Establecer el supervisor actual si existe
    if (subservicio.supervisorId) {
      currentSupervisorId = typeof subservicio.supervisorId === 'object'
        ? subservicio.supervisorId._id
        : subservicio.supervisorId;
    }
    
    setSupervisorFormState({
      isOpen: true,
      currentClient: client,
      currentSubservicio: subservicio,
      selectedSupervisorId: currentSupervisorId
    });
  }, []);

  const closeSupervisorForm = useCallback(() => {
    setSupervisorFormState({
      isOpen: false,
      currentClient: null,
      currentSubservicio: null,
      selectedSupervisorId: ''
    });
  }, []);

  const handleSupervisorFormSubmit = useCallback(async (supervisorId: string) => {
    if (!supervisorFormState.currentClient || !supervisorFormState.currentSubservicio) return;

    const client = supervisorFormState.currentClient;
    const subservicio = supervisorFormState.currentSubservicio;
    
    const subservicioName = subservicio.nombre;
    const supervisorInfo = supervisors.find(s => s._id === supervisorId);
    const supervisorName = supervisorInfo 
      ? getSupervisorIdentifier(supervisorId, supervisors)
      : 'Supervisor';
    
    const success = await assignSupervisor(
      client._id,
      subservicio._id,
      supervisorId,
      subservicioName,
      supervisorName
    );
    
    if (success) {
      closeSupervisorForm();
    }
  }, [
    supervisorFormState.currentClient,
    supervisorFormState.currentSubservicio,
    supervisors,
    assignSupervisor,
    closeSupervisorForm
  ]);

  // Manejadores para eliminación
  const openDeleteConfirmation = useCallback(
    (id: string, type: 'cliente' | 'subservicio' | 'sububicacion' | 'supervisor', parentId?: string, subServicioId?: string) => {
      setDeleteState({
        isOpen: true,
        itemToDelete: { id, type, parentId, subServicioId },
        isDeleting: false
      });
    }, 
    []
  );

  const closeDeleteConfirmation = useCallback(() => {
    setDeleteState({
      isOpen: false,
      itemToDelete: null,
      isDeleting: false
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteState.itemToDelete) return;
    
    setDeleteState(prev => ({ ...prev, isDeleting: true }));
    
    try {
      const { id, type, parentId, subServicioId } = deleteState.itemToDelete;
      
      let success = false;
      
      if (type === 'supervisor' && parentId && subServicioId) {
        success = await removeSupervisor(parentId, subServicioId);
      } else {
        success = await deleteItem(id, type, parentId, subServicioId);
      }
      
      if (success) {
        closeDeleteConfirmation();
      }
    } finally {
      setDeleteState(prev => ({ ...prev, isDeleting: false }));
    }
  }, [deleteState.itemToDelete, deleteItem, removeSupervisor, closeDeleteConfirmation]);

  // Manejadores específicos para ClientCard
  const handleEditClient = useCallback((client: Client) => {
    openClientForm(client);
  }, [openClientForm]);

  const handleAddSubservicio = useCallback((client: Client) => {
    openSubservicioForm(client);
  }, [openSubservicioForm]);

  const handleEditSubservicio = useCallback((client: Client, subservicioId: string) => {
    const subservicio = client.subServicios.find(s => s._id === subservicioId);
    if (subservicio) {
      openSubservicioForm(client, subservicio);
    }
  }, [openSubservicioForm]);

  const handleAddSubUbicacion = useCallback((client: Client, subservicioId: string) => {
    const subservicio = client.subServicios.find(s => s._id === subservicioId);
    if (subservicio) {
      openSubUbicacionForm(client, subservicio);
    }
  }, [openSubUbicacionForm]);

  const handleEditSubUbicacion = useCallback(
    (client: Client, subservicioId: string, sububicacionId: string) => {
      const subservicio = client.subServicios.find(s => s._id === subservicioId);
      if (subservicio) {
        const sububicacion = subservicio.subUbicaciones.find(s => s._id === sububicacionId);
        if (sububicacion) {
          openSubUbicacionForm(client, subservicio, sububicacion);
        }
      }
    },
    [openSubUbicacionForm]
  );

  const handleAssignSupervisor = useCallback((client: Client, subservicioId: string) => {
    const subservicio = client.subServicios.find(s => s._id === subservicioId);
    if (subservicio) {
      openSupervisorForm(client, subservicio);
    }
  }, [openSupervisorForm]);

  const handleRemoveSupervisor = useCallback((clientId: string, subservicioId: string) => {
    openDeleteConfirmation(
      'supervisor',
      'supervisor',
      clientId,
      subservicioId
    );
  }, [openDeleteConfirmation]);

  // Renderizado cuando está cargando y no hay datos
  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 animate-spin text-[#29696B]">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="animate-spin"
            aria-label="Cargando"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert 
          className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert 
          className="mb-4 bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg"
          role="status"
        >
          <Check className="h-4 w-4 text-[#29696B]" aria-hidden="true" />
          <AlertDescription className="ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Usuario actualmente seleccionado */}
      {filters.activeUserId !== DEFAULT_VALUES.FILTER_STATE.ALL && (
        <Alert 
          className="mb-4 bg-[#DFEFE6]/50 border border-[#91BEAD]/50 text-[#29696B] rounded-lg flex justify-between items-center"
          role="status"
        >
          <div className="flex items-center">
            <UserPlus className="h-4 w-4 text-[#29696B] mr-2" aria-hidden="true" />
            <AlertDescription>
              Gestionando clientes para el usuario: <strong>{getUserIdentifierWithRole(filters.activeUserId, users)}</strong>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActiveUserId}
            className="text-[#29696B] hover:bg-[#DFEFE6]/40"
            aria-label="Limpiar filtro de usuario"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Alert>
      )}

      {/* Supervisor actualmente seleccionado */}
      {filters.activeSupervisorId !== DEFAULT_VALUES.FILTER_STATE.ALL && (
        <Alert 
          className="mb-4 bg-[#DFEFE6]/50 border border-[#91BEAD]/50 text-[#29696B] rounded-lg flex justify-between items-center"
          role="status"
        >
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-[#29696B] mr-2" aria-hidden="true" />
            <AlertDescription>
              Mostrando subservicios del supervisor: <strong>{getSupervisorIdentifier(filters.activeSupervisorId, supervisors)}</strong>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActiveSupervisorId}
            className="text-[#29696B] hover:bg-[#DFEFE6]/40"
            aria-label="Limpiar filtro de supervisor"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Alert>
      )}

      {/* Barra de herramientas para pantallas medianas y grandes */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C]" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Buscar clientes..."
            className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            aria-label="Buscar clientes"
          />
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2">
          {/* Filtro por usuario */}
          <Select
            value={filters.activeUserId}
            onValueChange={(value) => setFilters(prev => ({ ...prev, activeUserId: value }))}
            aria-label="Filtrar por usuario"
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
            value={filters.activeSupervisorId}
            onValueChange={(value) => setFilters(prev => ({ ...prev, activeSupervisorId: value }))}
            aria-label="Filtrar por supervisor"
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
                aria-haspopup="true"
              >
                <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
                {filters.viewMode === 'all' ? 'Vista normal' : 'Ver sin supervisor'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => toggleViewMode('all')}
                className={filters.viewMode === 'all' ? 'bg-[#DFEFE6]/30 font-medium' : ''}
                aria-selected={filters.viewMode === 'all'}
              >
                <Building className="w-4 h-4 mr-2 text-[#29696B]" aria-hidden="true" />
                Vista normal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleViewMode('unassigned')}
                className={filters.viewMode === 'unassigned' ? 'bg-[#DFEFE6]/30 font-medium' : ''}
                aria-selected={filters.viewMode === 'unassigned'}
              >
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" aria-hidden="true" />
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
            onClick={() => openClientForm()}
            className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Barra de herramientas para móviles */}
      <div className="md:hidden mb-6 space-y-3 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" 
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Buscar clientes..."
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              aria-label="Buscar clientes"
            />
          </div>
          <Button
            variant="outline"
            className="flex-shrink-0 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            onClick={() => setFilters(prev => ({ ...prev, isMobileFilterOpen: !prev.isMobileFilterOpen }))}
            aria-label="Mostrar filtros"
            aria-expanded={filters.isMobileFilterOpen}
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            onClick={() => openClientForm()}
            size="sm"
            aria-label="Nuevo cliente"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {filters.isMobileFilterOpen && (
          <div className="p-3 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/30">
            {/* Vista */}
            <div className="mb-3">
              <Label className="text-sm font-medium mb-1 block text-[#29696B]">
                Vista
              </Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Button
                  variant={filters.viewMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleViewMode('all')}
                  className={filters.viewMode === 'all'
                    ? 'bg-[#29696B] text-white hover:bg-[#29696B]/90'
                    : 'border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50'}
                  aria-pressed={filters.viewMode === 'all'}
                >
                  <Building className="w-3 h-3 mr-1" aria-hidden="true" />
                  Vista normal
                </Button>
                <Button
                  variant={filters.viewMode === 'unassigned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleViewMode('unassigned')}
                  className={filters.viewMode === 'unassigned'
                    ? 'bg-[#29696B] text-white hover:bg-[#29696B]/90'
                    : 'border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50'}
                  aria-pressed={filters.viewMode === 'unassigned'}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
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
                  value={filters.activeUserId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, activeUserId: value }))}
                >
                  <SelectTrigger 
                    id="mobileUserFilter" 
                    className="border-[#91BEAD] focus:ring-[#29696B]/20"
                  >
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user._id} value={user._id}>
                        {getUserIdentifierWithRole(user._id, users)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {filters.activeUserId !== DEFAULT_VALUES.FILTER_STATE.ALL && (
                  <div className="mt-2 flex items-center justify-between py-1 px-2 bg-[#DFEFE6]/40 rounded border border-[#91BEAD]/20">
                    <div className="text-xs text-[#29696B]">
                      Usuario seleccionado: <strong>{getUserIdentifierWithRole(filters.activeUserId, users)}</strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActiveUserId}
                      className="h-6 w-6 p-0"
                      aria-label="Limpiar filtro de usuario"
                    >
                      <X className="h-3 w-3 text-[#29696B]" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="mobileSupervisorFilter" className="text-sm font-medium mb-1 block text-[#29696B]">
                  Filtrar por supervisor
                </Label>
                <Select
                  value={filters.activeSupervisorId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, activeSupervisorId: value }))}
                >
                  <SelectTrigger 
                    id="mobileSupervisorFilter" 
                    className="border-[#91BEAD] focus:ring-[#29696B]/20"
                  >
                    <SelectValue placeholder="Seleccionar supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los supervisores</SelectItem>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor._id} value={supervisor._id}>
                        {getSupervisorIdentifier(supervisor._id, supervisors)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {filters.activeSupervisorId !== DEFAULT_VALUES.FILTER_STATE.ALL && (
                  <div className="mt-2 flex items-center justify-between py-1 px-2 bg-[#DFEFE6]/40 rounded border border-[#91BEAD]/20">
                    <div className="text-xs text-[#29696B]">
                      Supervisor seleccionado: <strong>{getSupervisorIdentifier(filters.activeSupervisorId, supervisors)}</strong>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActiveSupervisorId}
                      className="h-6 w-6 p-0"
                      aria-label="Limpiar filtro de supervisor"
                    >
                      <X className="h-3 w-3 text-[#29696B]" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {filteredClients.length > 0 && filters.viewMode === 'all' && (
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                  aria-label={filters.expandedClientId ? "Contraer todos los clientes" : "Expandir cliente"}
                >
                  {filters.expandedClientId ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" aria-hidden="true" />
                      Contraer Cliente
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" aria-hidden="true" />
                      Expandir Cliente
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vista de clientes */}
      <div aria-live="polite">
        {/* Vista de clientes normales */}
        {filters.viewMode === 'all' && (
          <>
            {/* Mensaje cuando no hay clientes */}
            {filteredClients.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
                  <Users className="w-6 h-6 text-[#29696B]" aria-hidden="true" />
                </div>
                <p>
                  No se encontraron clientes
                  {filters.activeUserId !== DEFAULT_VALUES.FILTER_STATE.ALL && " para el usuario seleccionado"}
                  {filters.activeSupervisorId !== DEFAULT_VALUES.FILTER_STATE.ALL && " con el supervisor seleccionado"}
                  {filters.searchTerm && ` que coincidan con "${filters.searchTerm}"`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Contador de resultados con información detallada */}
                {filteredClients.length > 0 && (
                  <div 
                    className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center"
                    aria-live="polite"
                  >
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
                  {filteredClients.length > pagination.itemsPerPage && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mb-4">
                      <Pagination
                        totalItems={totalItems}
                        itemsPerPage={pagination.itemsPerPage}
                        currentPage={pagination.currentPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                      />
                    </div>
                  )}
                </div>

                {/* Lista de clientes para pantallas grandes */}
                <div className="hidden md:block space-y-6">
                  {paginatedClients.map(client => (
                    <ClientCard
                      key={client._id}
                      client={client}
                      supervisors={supervisors}
                      isExpanded={filters.expandedClientId === client._id}
                      expandedSubservicioId={filters.expandedSubservicioId}
                      onToggleExpand={handleToggleClientExpansion}
                      onToggleSubservicio={handleToggleSubservicioExpansion}
                      onEdit={handleEditClient}
                      onAddSubservicio={handleAddSubservicio}
                      onEditSubservicio={handleEditSubservicio}
                      onAddSubUbicacion={handleAddSubUbicacion}
                      onEditSubUbicacion={handleEditSubUbicacion}
                      onAssignSupervisor={handleAssignSupervisor}
                      onRemoveSupervisor={handleRemoveSupervisor}
                      onDeleteClient={(clientId) => openDeleteConfirmation(clientId, 'cliente')}
                      onDeleteSubservicio={(clientId, subservicioId) => openDeleteConfirmation(subservicioId, 'subservicio', clientId)}
                      onDeleteSubUbicacion={(clientId, subservicioId, sububicacionId) => openDeleteConfirmation(sububicacionId, 'sububicacion', clientId, subservicioId)}
                    />
                  ))}
                </div>

                {/* Vista móvil - adaptada con Tabs */}
                <div className="md:hidden space-y-6">
                  {/* Lista de clientes */}
                  {paginatedClients.map(client => (
                    <div 
                      key={client._id} 
                      className="bg-white rounded-lg border border-[#91BEAD]/20 shadow-sm"
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start">
                            <Building 
                              className="w-4 h-4 text-[#29696B] mt-1 mr-2"
                              aria-hidden="true" 
                            />
                            <div>
                              <h3 className="text-base text-[#29696B] font-medium">{client.nombre}</h3>
                              {client.descripcion && (
                                <p className="text-xs text-[#7AA79C] mt-1">{client.descripcion}</p>
                              )}
                              {client.requiereAsignacion && (
                                <Badge 
                                  variant="outline" 
                                  className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
                                >
                                  Requiere Asignación
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleClientExpansion(client._id)}
                              className="h-8 w-8 p-0"
                              aria-label={filters.expandedClientId === client._id ? "Contraer cliente" : "Expandir cliente"}
                              aria-expanded={filters.expandedClientId === client._id}
                            >
                              {filters.expandedClientId === client._id ? (
                                <ChevronUp className="w-4 h-4 text-[#7AA79C]" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#7AA79C]" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Contenido expandible */}
                      {filters.expandedClientId === client._id && (
                        <div className="border-t border-[#91BEAD]/20 p-3">
                          <Tabs defaultValue="info">
                            <TabsList className="bg-[#DFEFE6]/30 w-full">
                              <TabsTrigger value="info" className="flex-1 text-xs">Info</TabsTrigger>
                              <TabsTrigger value="subservicios" className="flex-1 text-xs">
                                Subservicios ({client.subServicios.length})
                              </TabsTrigger>
                              <TabsTrigger value="actions" className="flex-1 text-xs">Acciones</TabsTrigger>
                            </TabsList>
                            
                            {/* Tab de información */}
                            <TabsContent value="info" className="mt-2 space-y-3">
                              <div className="text-xs space-y-2">
                                <div className="flex items-center">
                                  <Mail className="w-3 h-3 text-[#7AA79C] mr-2" aria-hidden="true" />
                                  <span className="text-[#7AA79C]">
                                    Email: <span className="text-[#29696B]">{client.email || 'No especificado'}</span>
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 text-[#7AA79C] mr-2" aria-hidden="true" />
                                  <span className="text-[#7AA79C]">
                                    Supervisores:
                                  </span>
                                </div>
                                {Array.isArray(client.userId) && client.userId.length > 0 ? (
                                  <div className="ml-5 flex flex-wrap gap-1">
                                    {client.userId.map(userId => {
                                      const supervisorId = typeof userId === 'object' && userId !== null ? userId._id : userId;
                                      return (
                                        <Badge
                                          key={supervisorId}
                                          variant="outline"
                                          className="bg-[#DFEFE6]/80 text-[#29696B] border-[#91BEAD] text-xs"
                                        >
                                          {getSupervisorIdentifier(supervisorId.toString(), supervisors)}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="ml-5 text-[#29696B] text-xs">
                                    No hay supervisores asignados
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                            
                            {/* Tab de subservicios */}
                            <TabsContent value="subservicios" className="mt-2">
                              {client.subServicios.length > 0 ? (
                                <div className="space-y-3">
                                  {client.subServicios.map(subservicio => (
                                    <div 
                                      key={subservicio._id} 
                                      className="border border-[#91BEAD]/20 rounded-md overflow-hidden"
                                      aria-expanded={filters.expandedSubservicioId === subservicio._id}
                                    >
                                      <button
                                        className="w-full p-2 bg-[#DFEFE6]/20 flex justify-between items-center text-left"
                                        onClick={() => handleToggleSubservicioExpansion(subservicio._id)}
                                        aria-expanded={filters.expandedSubservicioId === subservicio._id}
                                      >
                                        <div className="flex items-center">
                                          <MapPin className="w-3 h-3 text-[#29696B] mr-2" aria-hidden="true" />
                                          <div className="text-left">
                                            <span className="text-sm font-medium text-[#29696B]">{subservicio.nombre}</span>
                                            {subservicio.supervisorId ? (
                                              <div className="flex items-center mt-1 text-xs text-[#29696B]">
                                                <Shield className="w-2 h-2 mr-1" aria-hidden="true" />
                                                {typeof subservicio.supervisorId === 'object' && subservicio.supervisorId
                                                  ? (subservicio.supervisorId.email || subservicio.supervisorId.usuario)
                                                  : typeof subservicio.supervisorId === 'string'
                                                    ? getSupervisorIdentifier(subservicio.supervisorId, supervisors)
                                                    : 'No asignado'}
                                              </div>
                                            ) : (
                                              <Badge 
                                                variant="outline" 
                                                className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
                                              >
                                                Sin Supervisor
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        {filters.expandedSubservicioId === subservicio._id ? (
                                          <ChevronUp className="w-3 h-3" aria-hidden="true" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3" aria-hidden="true" />
                                        )}
                                      </button>
                                      
                                      {/* Acciones y sububicaciones */}
                                      {filters.expandedSubservicioId === subservicio._id && (
                                        <div className="p-2 space-y-2 text-xs">
                                          <div className="flex flex-wrap gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleAssignSupervisor(client, subservicio._id)}
                                              className="text-xs h-7"
                                            >
                                              <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
                                              {subservicio.supervisorId ? 'Cambiar' : 'Asignar'} Supervisor
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleEditSubservicio(client, subservicio._id)}
                                              className="text-xs h-7"
                                            >
                                              Editar
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleAddSubUbicacion(client, subservicio._id)}
                                              className="text-xs h-7"
                                            >
                                              + Sububicación
                                            </Button>
                                          </div>
                                          
                                          {/* Sububicaciones */}
                                          {subservicio.subUbicaciones?.length > 0 && (
                                            <div className="mt-3 pl-3 space-y-2 border-l-2 border-[#DFEFE6]">
                                              <div className="text-xs font-medium text-[#29696B] mb-1">
                                                Sububicaciones:
                                              </div>
                                              {subservicio.subUbicaciones.map(sububicacion => (
                                                <div 
                                                  key={sububicacion._id}
                                                  className="p-1 flex justify-between items-center bg-[#DFEFE6]/10 rounded-md"
                                                >
                                                  <div>
                                                    <span className="text-xs font-medium text-[#29696B]">
                                                      {sububicacion.nombre}
                                                    </span>
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => handleEditSubUbicacion(
                                                        client, 
                                                        subservicio._id, 
                                                        sububicacion._id
                                                      )}
                                                      className="h-5 w-5 p-0"
                                                      aria-label={`Editar sububicación ${sububicacion.nombre}`}
                                                    >
                                                      <svg 
                                                        className="w-2 h-2 text-[#29696B]" 
                                                        fill="none" 
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        aria-hidden="true"
                                                      >
                                                        <path 
                                                          strokeLinecap="round" 
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                        />
                                                      </svg>
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => openDeleteConfirmation(
                                                        sububicacion._id, 
                                                        'sububicacion', 
                                                        client._id, 
                                                        subservicio._id
                                                      )}
                                                      className="h-5 w-5 p-0 text-red-600"
                                                      aria-label={`Eliminar sububicación ${sububicacion.nombre}`}
                                                    >
                                                      <svg 
                                                        className="w-2 h-2" 
                                                        fill="none" 
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        aria-hidden="true"
                                                      >
                                                        <path 
                                                          strokeLinecap="round" 
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                      </svg>
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-[#7AA79C] text-sm">
                                  <p>No hay subservicios disponibles</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddSubservicio(client)}
                                    className="mt-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50 text-xs"
                                  >
                                    <Plus className="w-3 h-3 mr-1" aria-hidden="true" />
                                    Agregar Primer Subservicio
                                  </Button>
                                </div>
                              )}
                            </TabsContent>
                            
                            {/* Tab de acciones */}
                            <TabsContent value="actions" className="mt-2">
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClient(client)}
                                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                                >
                                  Editar Cliente
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddSubservicio(client)}
                                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                                >
                                  Agregar Subservicio
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteConfirmation(client._id, 'cliente')}
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  Eliminar Cliente
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                {filteredClients.length > pagination.itemsPerPage && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
                    <Pagination
                      totalItems={totalItems}
                      itemsPerPage={pagination.itemsPerPage}
                      currentPage={pagination.currentPage}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Vista de subservicios sin supervisor */}
        {filters.viewMode === 'unassigned' && (
          <>
            {unassignedSubservices.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
                  <Shield className="w-6 h-6 text-[#29696B]" aria-hidden="true" />
                </div>
                <p>No hay subservicios sin supervisor asignado</p>
                <Button
                  variant="outline"
                  onClick={() => toggleViewMode('all')}
                  className="mt-4 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                >
                  <Building className="w-4 h-4 mr-2" aria-hidden="true" />
                  Volver a la vista normal
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Información sobre subservicios sin asignar */}
                <Alert className="bg-amber-50 border border-amber-200 text-amber-800" role="alert">
                  <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <AlertDescription className="ml-2">
                    Se encontraron {totalUnassignedSubservices} subservicios sin supervisor asignado.
                    Puede asignarles un supervisor utilizando el botón "Asignar Supervisor".
                  </AlertDescription>
                </Alert>

                {/* Lista de clientes con subservicios sin supervisor */}
                <div className="space-y-6">
                  {unassignedSubservices.map(clienteData => {
                    // Buscar el cliente completo para tener acceso a toda su información
                    const fullClient = clients.find(c => c._id === clienteData.clienteId);
                    
                    return (
                      <div 
                        key={clienteData.clienteId}
                        className="bg-white rounded-lg border border-[#91BEAD]/20 shadow-sm overflow-hidden"
                      >
                        <div className="p-4 bg-[#DFEFE6]/30 border-b border-[#91BEAD]/20">
                          <div className="flex items-center">
                            <Building className="w-5 h-5 text-[#29696B] mr-2" aria-hidden="true" />
                            <h3 className="text-lg font-medium text-[#29696B]">
                              {clienteData.nombreCliente}
                            </h3>
                            <Badge className="ml-3 bg-amber-100 text-amber-700 border-amber-300">
                              {clienteData.subServicios.length} subservicios sin supervisor
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="p-4 divide-y divide-[#91BEAD]/10">
                          {clienteData.subServicios.map(subservicio => (
                            <div key={subservicio._id} className="py-3 first:pt-0 last:pb-0">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start">
                                  <MapPin className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
                                  <div>
                                    <h4 className="font-medium text-[#29696B]">{subservicio.nombre}</h4>
                                    {subservicio.descripcion && (
                                      <p className="text-sm text-[#7AA79C]">{subservicio.descripcion}</p>
                                    )}
                                    <Badge 
                                      variant="outline" 
                                      className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
                                    >
                                      Sin Supervisor
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (fullClient) {
                                      handleAssignSupervisor(fullClient, subservicio._id);
                                    } else {
                                      // Crear un objeto cliente mínimo si no lo encontramos
                                      const minimalClient: Client = {
                                        _id: clienteData.clienteId,
                                        nombre: clienteData.nombreCliente,
                                        descripcion: '',
                                        servicio: clienteData.nombreCliente,
                                        seccionDelServicio: '',
                                        userId: typeof clienteData.userId === 'object' && Array.isArray(clienteData.userId)
                                          ? clienteData.userId
                                          : (clienteData.userId ? [clienteData.userId] : []),
                                        subServicios: [],
                                        direccion: '',
                                        telefono: '',
                                        email: '',
                                        activo: true
                                      };
                                      handleAssignSupervisor(minimalClient, subservicio._id);
                                    }
                                  }}
                                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                                >
                                  <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                                  Asignar Supervisor
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón para volver a la vista normal */}
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => toggleViewMode('all')}
                    className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                  >
                    <Building className="w-4 h-4 mr-2" aria-hidden="true" />
                    Volver a la vista normal
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Formularios en modales */}
      <ClientForm
        isOpen={clientFormState.isOpen}
        onClose={closeClientForm}
        onSubmit={handleClientFormSubmit}
        client={clientFormState.currentClient}
        supervisors={supervisors}
        isLoading={loading}
      />

      <SubservicioForm
        isOpen={subservicioFormState.isOpen}
        onClose={closeSubservicioForm}
        onSubmit={handleSubservicioFormSubmit}
        client={subservicioFormState.currentClient}
        subservicio={subservicioFormState.currentSubservicio}
        supervisors={supervisors}
        isLoading={loading}
      />

      <SubUbicacionForm
        isOpen={sububicacionFormState.isOpen}
        onClose={closeSubUbicacionForm}
        onSubmit={handleSubUbicacionFormSubmit}
        client={sububicacionFormState.currentClient}
        subservicio={sububicacionFormState.currentSubservicio}
        sububicacion={sububicacionFormState.currentSubUbicacion}
        isLoading={loading}
      />

      <SupervisorForm
        isOpen={supervisorFormState.isOpen}
        onClose={closeSupervisorForm}
        onSubmit={handleSupervisorFormSubmit}
        client={supervisorFormState.currentClient}
        subservicio={supervisorFormState.currentSubservicio}
        supervisors={supervisors}
        selectedSupervisorId={supervisorFormState.selectedSupervisorId}
        setSelectedSupervisorId={(id) => 
          setSupervisorFormState(prev => ({ ...prev, selectedSupervisorId: id }))
        }
        isLoading={loading}
      />

      <DeleteConfirmation
        isOpen={deleteState.isOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={handleDeleteConfirm}
        itemToDelete={deleteState.itemToDelete}
        clients={clients}
        supervisors={supervisors}
        isLoading={deleteState.isDeleting}
      />
    </div>
  );
};

export default ClientsSection;