import React, { useState, useEffect } from 'react';
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
  Mail
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
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
import { useDashboard } from './AdminDashboard';
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
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>("all"); // Para filtrar por usuario
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Estado para el formulario
  const [formData, setFormData] = useState<CreateClientData>({
    servicio: '',
    seccionDelServicio: '',
    userId: ''
  });

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
        const activeUser = activeBasicUsers.find(u => u._id === activeUserId);
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
      setSuccessMessage('Cliente creado correctamente');
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
    if (typeof window === 'undefined' || !window.confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`http://localhost:4000/api/cliente/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al eliminar cliente');
      }

      await fetchClients();
      setSuccessMessage('Cliente eliminado correctamente');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('Error al eliminar cliente: ' + (err instanceof Error ? err.message : String(err)));
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
    setCurrentClient(null); // Indicamos que es una nueva entidad
    setFormData({
      servicio: client.servicio, // Mismo servicio
      seccionDelServicio: '', // Nueva sección
      userId: typeof client.userId === 'object' ? client.userId._id : client.userId // Mismo usuario
    });
    setShowModal(true);
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
    // Si userId viene poblado como objeto desde el backend
    if (typeof client.userId === 'object' && client.userId !== null) {
      if (client.userId.email) return client.userId.email;
      if (client.userId.usuario) return client.userId.usuario;
      if (client.userId.nombre && client.userId.apellido) 
        return `${client.userId.nombre} ${client.userId.apellido}`;
      return 'Correo no disponible';
    }
    
    // Si sigue siendo un string (ID), buscar en users
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
        <div className="flex justify-end">
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
                  </div>
                  
                  {/* Botón para agregar nueva sección al servicio */}
                  {clientesDelServicio.length > 0 && activeUserId !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSection(clientesDelServicio[0])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Sección
                    </Button>
                  )}
                </div>
                
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
                        >
                          <FileEdit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client._id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  </div>
                  
                  {/* Botón móvil para agregar nueva sección */}
                  {clientesDelServicio.length > 0 && activeUserId !== "all" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddSection(clientesDelServicio[0])}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
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
                        >
                          <FileEdit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client._id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
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
              {currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={currentClient ? handleUpdateClient : handleCreateClient} className="space-y-4 py-2">
            <div>
              <Label htmlFor="servicio" className="text-sm">Servicio</Label>
              <Input
                id="servicio"
                placeholder="Ej: Ministerio de Salud, Estudiante La Plata"
                value={formData.servicio}
                onChange={(e) => setFormData({...formData, servicio: e.target.value})}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="seccionDelServicio" className="text-sm">Sección del Servicio (opcional)</Label>
              <Input
                id="seccionDelServicio"
                placeholder="Ej: Edificio Avellaneda, Puerto Madero"
                value={formData.seccionDelServicio}
                onChange={(e) => setFormData({...formData, seccionDelServicio: e.target.value})}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deje en blanco si no aplica una sección específica
              </p>
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
                    onValueChange={(value) => setFormData({...formData, userId: value})}
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
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : currentClient ? 'Guardar Cambios' : 'Crear Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsSection;