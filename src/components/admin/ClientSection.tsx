import React, { useState, useEffect } from 'react';
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
  ChevronUp
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dropdown-menu";
import { useDashboard } from '@/hooks/useDashboard';
import type { UserRole } from '@/types/users';

// Tipo extendido para los usuarios con la estructura que viene del backend
interface UserExtended {
  _id: string;       // El backend usa _id, no id como en el tipo User
  email?: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
  role?: UserRole;
  isActive?: boolean;
  celular?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
}

// Interfaz extendida para manejar tanto ID como objeto poblado
interface Client {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | {
    _id: string;
    email?: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CreateClientData {
  servicio: string;
  seccionDelServicio: string;
  userId: string;
}

interface UpdateClientData {
  id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string;
}

const ClientsSection: React.FC = () => {
  // Acceder al contexto del dashboard
  const { selectedUserId } = useDashboard();

  // Estados
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentService, setCurrentService] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>("all"); // Para filtrar por usuario
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState<{ nuevoNombre: string }>({ nuevoNombre: '' });
  const [deletingOperation, setDeletingOperation] = useState(false);

  // Estado para el modal de confirmación de eliminación de clientes individuales
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Nuevo estado para controlar servicios expandidos/contraídos
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

  // Estado para el formulario
  const [formData, setFormData] = useState<CreateClientData>({
    servicio: '',
    seccionDelServicio: '',
    userId: ''
  });

  // Función para alternar la expansión de un servicio
  const toggleServiceExpansion = (servicio: string) => {
    setExpandedServices(prev => ({
      ...prev,
      [servicio]: !prev[servicio]
    }));
  };

  // Función para expandir todos los servicios
  const expandAllServices = (services: string[]) => {
    const expanded: Record<string, boolean> = {};
    services.forEach(service => {
      expanded[service] = true;
    });
    setExpandedServices(expanded);
  };

  // Función para contraer todos los servicios
  const collapseAllServices = () => {
    setExpandedServices({});
  };

  // Obtener token de forma segura (solo en el cliente)
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    console.log("ClientSection montado, selectedUserId:", selectedUserId);
    fetchClients();
    fetchUsers();

    // Verificar si hay un usuario preseleccionado (de AdminUserManagement)
    if (typeof window !== 'undefined') {
      const storedSelectedUserId = localStorage.getItem('selectedUserId');
      const lastCreatedUserId = localStorage.getItem('lastCreatedUserId');

      // Priorizar el userId del contexto, luego el almacenado, luego el último creado
      if (selectedUserId) {
        console.log("Usando selectedUserId del contexto:", selectedUserId);
        setActiveUserId(selectedUserId);

        // Inicializar el formulario con este usuario si se abre para agregar un nuevo cliente
        setFormData(prev => ({
          ...prev,
          userId: selectedUserId
        }));
      } else if (storedSelectedUserId) {
        console.log("Usando selectedUserId del localStorage:", storedSelectedUserId);
        setActiveUserId(storedSelectedUserId);
        setFormData(prev => ({
          ...prev,
          userId: storedSelectedUserId
        }));
        localStorage.removeItem('selectedUserId');
      } else if (lastCreatedUserId) {
        console.log("Usando lastCreatedUserId del localStorage:", lastCreatedUserId);
        setActiveUserId(lastCreatedUserId);
        setFormData(prev => ({
          ...prev,
          userId: lastCreatedUserId
        }));
        localStorage.removeItem('lastCreatedUserId');
      }
    }
  }, [selectedUserId]);

  // Observar cambios en selectedUserId
  useEffect(() => {
    if (selectedUserId) {
      console.log("selectedUserId cambió a:", selectedUserId);
      setActiveUserId(selectedUserId);
      setFormData(prev => ({
        ...prev,
        userId: selectedUserId
      }));
    }
  }, [selectedUserId]);

  // Cargar clientes
  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/cliente', {
        headers: { 'Authorization': `Bearer ${token}` }
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
      setClients(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los clientes: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios (para asignar a clientes)
  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      // Filtrar solo usuarios básicos y activos
      const activeBasicUsers = data.filter((user: any) =>
        user.role === 'basic' && user.isActive === true
      );
      console.log("Usuarios básicos activos:", activeBasicUsers.length);

      // Asegurar que tenemos los emails para todos los usuarios
      activeBasicUsers.forEach((user: UserExtended) => {
        console.log(`Usuario: ${user._id}, Email: ${user.email || 'No disponible'}`);
      });

      setUsers(activeBasicUsers);

      // Si hay un usuario activo seleccionado, mostrar en consola para depuración
      if (activeUserId !== "all") {
        const activeUser = activeBasicUsers.find((u: { _id: string; }) => u._id === activeUserId);
        console.log("Usuario activo seleccionado:", activeUser?.email || "Email no disponible");
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      // No mostrar error, ya que este es secundario
    }
  };

  // Crear cliente
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log("Creando cliente con datos:", formData);

      const response = await fetch('http://localhost:4000/api/cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al crear cliente');
      }

      await fetchClients();
      setShowModal(false);
      resetForm();
      setSuccessMessage(formData.seccionDelServicio
        ? `Nueva sección "${formData.seccionDelServicio}" agregada al servicio "${formData.servicio}"`
        : 'Cliente creado correctamente');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('Error al crear cliente: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Actualizar cliente
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient?._id) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Crear el objeto UpdateClientData con el id
      const updateData: UpdateClientData = {
        id: currentClient._id,
        servicio: formData.servicio,
        seccionDelServicio: formData.seccionDelServicio,
        userId: formData.userId
      };

      console.log("Actualizando cliente:", currentClient._id, "con datos:", updateData);

      const response = await fetch(`http://localhost:4000/api/cliente/${currentClient._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData) // El backend espera los datos sin el id
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al actualizar cliente');
      }

      await fetchClients();
      setShowModal(false);
      resetForm();
      setSuccessMessage('Cliente actualizado correctamente');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('Error al actualizar cliente: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Eliminar cliente
  const handleDeleteClient = async (id: string) => {
    try {
      setDeletingOperation(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log(`Eliminando cliente con ID: ${id}`);
      const response = await fetch(`http://localhost:4000/api/cliente/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Guardar el status para debug
      const statusCode = response.status;
      console.log(`Status code al eliminar cliente ${id}: ${statusCode}`);

      // Intentar obtener el cuerpo de la respuesta para más detalles
      let responseBody;
      try {
        // La respuesta podría ser JSON o texto
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }
        console.log(`Respuesta del servidor:`, responseBody);
      } catch (parseError) {
        console.error('Error al parsear respuesta:', parseError);
      }

      if (!response.ok) {
        throw new Error(`Error al eliminar cliente (${statusCode}): ${responseBody?.mensaje || responseBody || 'Error desconocido'}`);
      }

      await fetchClients();
      setSuccessMessage('Cliente eliminado correctamente');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error completo al eliminar cliente:', err);
      setError('Error al eliminar cliente: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingOperation(false);
    }
  };

  // Editar cliente
  const handleEditClient = (client: Client) => {
    setCurrentClient(client);
    setFormData({
      servicio: client.servicio,
      seccionDelServicio: client.seccionDelServicio,
      userId: typeof client.userId === 'object' ? client.userId._id : client.userId
    });
    setShowModal(true);
  };

  // Agregar nueva sección a un cliente existente 
  const handleAddSection = (client: Client) => {
    console.log(`Agregando nueva sección al servicio: ${client.servicio}`);
    
    // Indicamos que es una nueva entidad (no es edición)
    setCurrentClient(null);
    
    // Preparar el formulario con datos del servicio padre
    setFormData({
      servicio: client.servicio,       // Mantener el mismo servicio (cliente padre)
      seccionDelServicio: '',          // Nueva sección (vacía para que el usuario la complete)
      // Si hay un usuario seleccionado, lo usamos, sino tomamos el del cliente padre
      userId: activeUserId !== "all" 
        ? activeUserId 
        : typeof client.userId === 'object' 
          ? client.userId._id 
          : client.userId
    });
    
    // Abrir el modal para agregar sección
    setShowModal(true);
  };

  // Editar servicio (Cliente Padre)
  const handleEditService = (servicio: string) => {
    setCurrentService(servicio);
    setServiceFormData({ nuevoNombre: servicio });
    setShowServiceModal(true);
  };

  // Mostrar confirmación para eliminar servicio
  const handleShowDeleteService = (servicio: string) => {
    setCurrentService(servicio);
    setShowDeleteServiceModal(true);
  };

  // Actualizar nombre de servicio (Cliente Padre)
  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentService || !serviceFormData.nuevoNombre) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const clientesDelServicio = clients.filter(c => c.servicio === currentService);

      // Actualizamos cada cliente que pertenece a este servicio
      const updatePromises = clientesDelServicio.map(client => {
        return fetch(`http://localhost:4000/api/cliente/${client._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            servicio: serviceFormData.nuevoNombre,
            seccionDelServicio: client.seccionDelServicio,
            userId: typeof client.userId === 'object' ? client.userId._id : client.userId
          })
        });
      });

      // Esperar a que todas las actualizaciones se completen
      const results = await Promise.allSettled(updatePromises);

      // Verificar si hubo errores
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        throw new Error(`Ocurrieron ${errors.length} errores al actualizar el servicio`);
      }

      // Actualizar el estado de expansión con el nuevo nombre
      if (expandedServices[currentService]) {
        setExpandedServices(prev => {
          const newState = { ...prev };
          delete newState[currentService];
          newState[serviceFormData.nuevoNombre] = true;
          return newState;
        });
      }

      await fetchClients();
      setShowServiceModal(false);
      setSuccessMessage(`Servicio "${currentService}" actualizado a "${serviceFormData.nuevoNombre}"`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('Error al actualizar servicio: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Eliminar servicio completo (Cliente Padre y todas sus secciones)
  const handleDeleteService = async () => {
    if (!currentService) return;

    try {
      setDeletingOperation(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const clientesDelServicio = clients.filter(c => c.servicio === currentService);
      console.log(`Eliminando servicio "${currentService}" con ${clientesDelServicio.length} secciones`);

      // Eliminamos cada cliente de forma secuencial para mayor control
      const fallosEliminacion = [];

      // Procesamos uno por uno para mejor control y depuración
      for (const client of clientesDelServicio) {
        console.log(`Eliminando sección: ${client._id} - ${client.seccionDelServicio || 'Sin sección'}`);
        try {
          const response = await fetch(`http://localhost:4000/api/cliente/${client._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          // Verificar el resultado de cada eliminación
          if (!response.ok) {
            // Intentar obtener el detalle del error
            let errorDetail;
            try {
              errorDetail = await response.json();
            } catch (e) {
              errorDetail = await response.text();
            }

            fallosEliminacion.push({
              id: client._id,
              seccion: client.seccionDelServicio || 'Sin sección',
              status: response.status,
              mensaje: errorDetail?.mensaje || 'Error desconocido'
            });
            console.error(`Error al eliminar sección ${client._id}:`, errorDetail);
          } else {
            console.log(`Sección ${client._id} eliminada correctamente`);
          }
        } catch (error) {
          fallosEliminacion.push({
            id: client._id,
            seccion: client.seccionDelServicio || 'Sin sección',
            mensaje: error.message || 'Error en la petición'
          });
          console.error(`Excepción al eliminar sección ${client._id}:`, error);
        }

        // Pequeña pausa para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verificar si hubo errores
      if (fallosEliminacion.length > 0) {
        console.error('Fallos en eliminación:', fallosEliminacion);
        throw new Error(`No se pudieron eliminar ${fallosEliminacion.length} de ${clientesDelServicio.length} secciones`);
      }

      // Eliminar el servicio del estado de expansión
      setExpandedServices(prev => {
        const newState = { ...prev };
        delete newState[currentService];
        return newState;
      });

      // Asegurarse de que la lista de clientes se actualiza
      await fetchClients();
      setShowDeleteServiceModal(false);
      setSuccessMessage(`Servicio "${currentService}" y todas sus secciones eliminados correctamente`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error completo al eliminar servicio:', err);
      setError('Error al eliminar servicio: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingOperation(false);
    }
  };

  // Mostrar confirmación para eliminar cliente
  const confirmDeleteClient = (id: string) => {
    setClientToDelete(id);
    setShowDeleteClientModal(true);
  };

  // Ejecutar eliminación después de confirmación en el modal
  const executeDeleteClient = () => {
    if (clientToDelete) {
      handleDeleteClient(clientToDelete);
      setShowDeleteClientModal(false);
      setClientToDelete(null);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    // Si hay un usuario seleccionado, mantenerlo en el formulario
    setFormData({
      servicio: '',
      seccionDelServicio: '',
      userId: activeUserId !== "all" ? activeUserId : ''
    });
    setCurrentClient(null);
  };

  // Obtener el identificador del usuario por su ID (email, usuario o nombre)
  const getUserIdentifierById = (userId: string) => {
    const user = users.find(u => u._id === userId);
    if (!user) return 'Usuario no encontrado';

    // Priorizar mostrar el email, ya que es lo que se usa principalmente para identificar usuarios
    if (user.email) return user.email;
    if (user.usuario) return user.usuario;
    if (user.nombre && user.apellido) return `${user.nombre} ${user.apellido}`;
    if (user.nombre) return user.nombre;

    return `Usuario ID: ${userId.substring(0, 8)}`;
  };

  // Función para obtener el correo del creador del cliente
  const getCreatorEmail = (client: Client) => {
    // Utilizar el email recordado del localStorage como creador
    if (typeof window !== 'undefined') {
      // Podemos usar rememberedEmail que está en localStorage
      const creatorEmail = localStorage.getItem('rememberedEmail');
      if (creatorEmail) {
        return creatorEmail; // Devuelve el email del localStorage
      }

    }
    
    // Como fallback, mantenemos la lógica original
    if (typeof client.userId === 'object' && client.userId !== null) {
      if (client.userId.email) return client.userId.email;
      if (client.userId.usuario) return client.userId.usuario;
      if (client.userId.nombre && client.userId.apellido)
        return `${client.userId.nombre} ${client.userId.apellido}`;
    }
    
    const user = users.find(u => u._id === client.userId);
    if (user?.email) return user.email;
    if (user?.usuario) return user.usuario;
    
    return 'Correo no disponible';
  };

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    // Filtro por texto de búsqueda
    const matchesSearch =
      client.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.seccionDelServicio.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por usuario seleccionado
    const matchesUser = activeUserId === "all" ||
      (typeof client.userId === 'object'
        ? client.userId._id === activeUserId
        : client.userId === activeUserId);

    return matchesSearch && matchesUser;
  });

  // Agrupar clientes por servicio
  const groupedClients = filteredClients.reduce((acc: Record<string, Client[]>, client) => {
    if (!acc[client.servicio]) {
      acc[client.servicio] = [];
    }
    acc[client.servicio].push(client);
    return acc;
  }, {});

  // Modal automático para crear cliente si hay un usuario seleccionado y no hay clientes
  useEffect(() => {
    if (activeUserId !== "all" && !loading && clients.filter(c => {
      return typeof c.userId === 'object'
        ? c.userId._id === activeUserId
        : c.userId === activeUserId;
    }).length === 0) {
      // Abrir automáticamente el modal para crear un cliente para este usuario
      console.log("Abriendo modal automáticamente para usuario:", activeUserId);
      resetForm();
      setShowModal(true);
    }
  }, [activeUserId, loading, clients]);

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Alertas */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Usuario actualmente seleccionado */}
      {activeUserId !== "all" && (
        <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
          <UserPlus className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            Gestionando clientes para el usuario: <strong>{getUserIdentifierById(activeUserId)}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Barra de herramientas para pantallas medianas y grandes */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar clientes..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtro por usuario */}
        <div>
          <Select
            value={activeUserId}
            onValueChange={setActiveUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por usuario" />
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
        </div>

        {/* Botón Nuevo Cliente */}
        <div className="flex justify-end gap-2">
          {Object.keys(groupedClients).length > 0 && (
            <Button
              variant="outline"
              onClick={() => expandAllServices(Object.keys(groupedClients))}
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Expandir Todo
            </Button>
          )}
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Barra de herramientas para móviles */}
      <div className="md:hidden mb-6 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar clientes..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            className="flex-shrink-0"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            className="flex-shrink-0"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {isMobileFilterOpen && (
          <div className="p-3 bg-gray-50 rounded-md border">
            <Label htmlFor="mobileUserFilter" className="text-sm font-medium mb-1 block">
              Filtrar por usuario
            </Label>
            <Select
              value={activeUserId}
              onValueChange={(value) => {
                setActiveUserId(value);
                setIsMobileFilterOpen(false);
              }}
            >
              <SelectTrigger id="mobileUserFilter">
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

            {Object.keys(groupedClients).length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => expandAllServices(Object.keys(groupedClients))}
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Expandir Todo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllServices}
                >
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Contraer Todo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mensaje cuando no hay clientes */}
      {Object.keys(groupedClients).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No se encontraron clientes
          {activeUserId !== "all" && " para el usuario seleccionado"}
          {searchTerm && ` que coincidan con "${searchTerm}"`}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vista para pantallas medianas y grandes */}
          <div className="hidden md:block space-y-6">
            {Object.entries(groupedClients).map(([servicio, clientesDelServicio]) => (
              <div key={servicio} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                  <div className="flex items-center">
                    <Building className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="text-lg font-medium">{servicio}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-8 w-8 p-0"
                      onClick={() => toggleServiceExpansion(servicio)}
                    >
                      {expandedServices[servicio] ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                    <span className="text-xs text-gray-500 ml-2">
                      {clientesDelServicio.length} {clientesDelServicio.length === 1 ? 'sección' : 'secciones'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón para agregar nueva sección al servicio */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSection(clientesDelServicio[0])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Sección
                    </Button>

                    {/* Menú desplegable para opciones del servicio */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditService(servicio)}>
                          <FileEdit className="w-4 h-4 mr-2 text-blue-600" />
                          Editar Servicio
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleShowDeleteService(servicio)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar Servicio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {expandedServices[servicio] && (
                  <div className="divide-y divide-gray-100">
                    {clientesDelServicio.map(client => (
                      <div key={client._id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                        <div>
                          <div className="flex items-start gap-2">
                            {client.seccionDelServicio ? (
                              <>
                                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                <div>
                                  <span className="font-medium">{client.seccionDelServicio}</span>
                                  <div className="text-sm text-gray-500">
                                    <div className="flex items-center">
                                      <Users className="w-3 h-3 mr-1 inline" />
                                      Usuario Asignado: <strong className="ml-1">{
                                        typeof client.userId === 'object' && client.userId.email
                                          ? client.userId.email
                                          : typeof client.userId === 'string'
                                            ? getUserIdentifierById(client.userId)
                                            : 'No disponible'
                                      }</strong>
                                    </div>
                                    {/* Mostrar información del creador */}
                                    <div className="flex items-center mt-1">
                                      <Mail className="w-3 h-3 mr-1 inline" />
                                      Creado por: {getCreatorEmail(client)}
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1 inline" />
                                  Usuario Asignado: <strong className="ml-1">{
                                    typeof client.userId === 'object' && client.userId.email
                                      ? client.userId.email
                                      : typeof client.userId === 'string'
                                        ? getUserIdentifierById(client.userId)
                                        : 'No disponible'
                                  }</strong>
                                </div>
                                {/* Mostrar información del creador */}
                                <div className="flex items-center mt-1">
                                  <Mail className="w-3 h-3 mr-1 inline" />
                                  Creado por: {getCreatorEmail(client)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClient(client)}
                            disabled={deletingOperation}
                          >
                            <FileEdit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteClient(client._id)}
                            disabled={deletingOperation}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!expandedServices[servicio] && clientesDelServicio.length > 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <Button 
                      variant="ghost"
                      onClick={() => toggleServiceExpansion(servicio)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Mostrar {clientesDelServicio.length} {clientesDelServicio.length === 1 ? 'sección' : 'secciones'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Vista móvil: tarjetas agrupadas por servicio */}
          <div className="md:hidden space-y-6">
            {Object.entries(groupedClients).map(([servicio, clientesDelServicio]) => (
              <div key={servicio} className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-500 mr-2" />
                    <h3 className="text-base font-semibold">{servicio}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-6 w-6 p-0"
                      onClick={() => toggleServiceExpansion(servicio)}
                    >
                      {expandedServices[servicio] ? (
                        <ChevronUp className="w-3 h-3 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                      )}
                    </Button>
                    <span className="text-xs text-gray-500 ml-1">
                      ({clientesDelServicio.length})
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Botón móvil para agregar nueva sección */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddSection(clientesDelServicio[0])}
                      className="h-8 w-8 p-0"
                      disabled={deletingOperation}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    
                    {/* Menú móvil para opciones del servicio */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={deletingOperation}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditService(servicio)}>
                          <FileEdit className="w-4 h-4 mr-2 text-blue-600" />
                          Editar Servicio
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleShowDeleteService(servicio)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar Servicio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {expandedServices[servicio] && (
                  <div className="grid grid-cols-1 gap-3">
                    {clientesDelServicio.map(client => (
                      <Card key={client._id} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                              <CardTitle className="text-base">
                                {client.seccionDelServicio || "Sin sección específica"}
                              </CardTitle>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {servicio}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 pb-2">
                          <div className="flex flex-col gap-1 mt-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              <span>Usuario Asignado: <strong>{
                                typeof client.userId === 'object' && client.userId.email
                                  ? client.userId.email
                                  : typeof client.userId === 'string'
                                    ? getUserIdentifierById(client.userId)
                                    : 'No disponible'
                              }</strong></span>
                            </div>
                            {/* Mostrar información del creador en móvil */}
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              <span>Creado por: {getCreatorEmail(client)}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="p-2 flex justify-end gap-2 bg-gray-50">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClient(client)}
                            className="h-8 w-8 p-0"
                            disabled={deletingOperation}
                          >
                            <FileEdit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteClient(client._id)}
                            className="h-8 w-8 p-0"
                            disabled={deletingOperation}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
                
                {!expandedServices[servicio] && clientesDelServicio.length > 0 && (
                  <div className="px-1 text-center text-gray-500 text-xs">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleServiceExpansion(servicio)}
                      className="text-gray-500 hover:text-gray-700 text-xs p-2"
                    >
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Mostrar {clientesDelServicio.length} {clientesDelServicio.length === 1 ? 'sección' : 'secciones'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Cliente */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle>
              {currentClient
                ? 'Editar Cliente'
                : formData.seccionDelServicio || !formData.servicio
                  ? 'Nuevo Cliente'
                  : 'Nueva Sección'}
            </DialogTitle>
            {formData.servicio && !currentClient && (
              <DialogDescription>
                Agregando nueva sección al servicio: <strong>{formData.servicio}</strong>
              </DialogDescription>
            )}
          </DialogHeader>
          
          <form onSubmit={currentClient ? handleUpdateClient : handleCreateClient} className="space-y-4 py-2">
            <div>
              <Label htmlFor="servicio" className="text-sm">Servicio</Label>
              {/* Campo de servicio deshabilitado cuando es edición de sección o nueva sección */}
              {(currentClient?.seccionDelServicio || (!currentClient && formData.servicio && !formData.seccionDelServicio)) ? (
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center text-sm">
                  <Building className="text-gray-500 w-4 h-4 mr-2" />
                  <span>
                    Servicio: <strong>{formData.servicio}</strong>
                  </span>
                </div>
              ) : (
                <Input
                  id="servicio"
                  placeholder="Ej: Ministerio de Salud, Estudiante La Plata"
                  value={formData.servicio}
                  onChange={(e) => setFormData({ ...formData, servicio: e.target.value })}
                  required
                  className="mt-1"
                />
              )}
              {(currentClient?.seccionDelServicio || (!currentClient && formData.servicio)) && (
                <p className="text-xs text-gray-500 mt-1">
                  El nombre del servicio padre no se puede modificar cuando se edita o añade una sección
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="seccionDelServicio" className="text-sm">
                {(currentClient?.seccionDelServicio || (!currentClient && formData.servicio))
                  ? "Nombre de la Sección"
                  : "Sección del Servicio (opcional)"}
              </Label>
              <Input
                id="seccionDelServicio"
                placeholder={
                  (currentClient?.seccionDelServicio || (!currentClient && formData.servicio))
                    ? "Ej: Edificio Avellaneda, Puerto Madero"
                    : "Deje en blanco si no aplica una sección específica"
                }
                value={formData.seccionDelServicio}
                onChange={(e) => setFormData({ ...formData, seccionDelServicio: e.target.value })}
                className="mt-1"
                required={!currentClient && formData.servicio ? true : false}
              />
              {!(currentClient?.seccionDelServicio || (!currentClient && formData.servicio)) && (
                <p className="text-xs text-gray-500 mt-1">
                  Deje en blanco si no aplica una sección específica
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="userId" className="text-sm">Usuario Asignado</Label>
              {activeUserId !== "all" ? (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center text-sm">
                  <Users className="text-blue-500 w-4 h-4 mr-2" />
                  <span>
                    Usuario Asignado: <strong>{getUserIdentifierById(activeUserId)}</strong>
                  </span>
                </div>
              ) : (
                <>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.email || user.usuario || `${user.nombre || ''} ${user.apellido || ''}`.trim() || user._id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Añadir muestra del correo del usuario seleccionado */}
                  {formData.userId && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      Usuario Asignado: <strong className="ml-1">{getUserIdentifierById(formData.userId)}</strong>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-4 z-10 gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || deletingOperation}
              >
                {loading || deletingOperation ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : currentClient
                  ? 'Guardar Cambios'
                  : formData.seccionDelServicio || !formData.servicio
                    ? 'Crear Cliente'
                    : 'Agregar Sección'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Servicio */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
            <DialogDescription>
              Cambiar el nombre del servicio "{currentService}". Esta acción actualizará todas las secciones asociadas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateService} className="space-y-4 py-2">
            <div>
              <Label htmlFor="nuevoNombre" className="text-sm">Nuevo Nombre del Servicio</Label>
              <Input
                id="nuevoNombre"
                placeholder="Ingrese el nuevo nombre del servicio"
                value={serviceFormData.nuevoNombre}
                onChange={(e) => setServiceFormData({ nuevoNombre: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowServiceModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={deletingOperation}
              >
                {deletingOperation ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación para Eliminar Servicio */}
      <Dialog open={showDeleteServiceModal} onOpenChange={(open) => !deletingOperation && setShowDeleteServiceModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Servicio Completo
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar el servicio "{currentService}" y todas sus secciones? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
            <p>Se eliminarán <strong>{
              clients.filter(c => c.servicio === currentService).length
            } secciones</strong> asociadas a este servicio.</p>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteServiceModal(false)}
              disabled={deletingOperation}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteService}
              disabled={deletingOperation}
            >
              {deletingOperation ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Eliminando...
                </span>
              ) : 'Eliminar Servicio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación para Eliminar Cliente individual */}
      <Dialog open={showDeleteClientModal} onOpenChange={(open) => !deletingOperation && setShowDeleteClientModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Cliente
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar este cliente? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {clientToDelete && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
              <p>ID del cliente: <strong>{clientToDelete}</strong></p>
              {clients.find(c => c._id === clientToDelete)?.seccionDelServicio && (
                <p className="mt-1">Sección: <strong>{clients.find(c => c._id === clientToDelete)?.seccionDelServicio}</strong></p>
              )}
              <p className="mt-1">Servicio: <strong>{clients.find(c => c._id === clientToDelete)?.servicio}</strong></p>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteClientModal(false)}
              disabled={deletingOperation}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={executeDeleteClient}
              disabled={deletingOperation}
            >
              {deletingOperation ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Eliminando...
                </span>
              ) : 'Eliminar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsSection;