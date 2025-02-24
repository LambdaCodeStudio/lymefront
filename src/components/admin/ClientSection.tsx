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
  MapPin
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
import { useDashboard } from './AdminDashboard';

// Tipos actualizados
interface User {
  _id: string;
  email: string;
  role: string;
}

interface Client {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string;
  userEmail?: string; // Para mostrar en la UI
}

interface CreateClientData {
  servicio: string;
  seccionDelServicio: string;
  userId: string;
}

// Componente actualizado
const ClientsSection = () => {
  // Acceder al contexto del dashboard
  const { selectedUserId } = useDashboard();
  // Estados
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>("all"); // Para filtrar por usuario
  const [formData, setFormData] = useState<CreateClientData>({
    servicio: '',
    seccionDelServicio: '',
    userId: ''
  });

  // Efecto para cargar clientes y usuarios
  useEffect(() => {
    fetchClients();
    fetchUsers();

    // Verificar si hay un usuario preseleccionado (de AdminUserManagement)
    const storedSelectedUserId = localStorage.getItem('selectedUserId');
    const lastCreatedUserId = localStorage.getItem('lastCreatedUserId');
    
    // Priorizar el userId del contexto, luego el almacenado, luego el último creado
    if (selectedUserId) {
      setSelectedUser(selectedUserId);
    } else if (storedSelectedUserId) {
      setSelectedUser(storedSelectedUserId);
      localStorage.removeItem('selectedUserId');
    } else if (lastCreatedUserId) {
      setSelectedUser(lastCreatedUserId);
      localStorage.removeItem('lastCreatedUserId');
    }
  }, []);

  // Cargar clientes
  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/cliente', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error('Error al cargar los clientes');
      }

      const data = await response.json();
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
      const token = localStorage.getItem('token');
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
      const activeBasicUsers = data.filter((user: User) => 
        user.role === 'basic' && user.isActive === true
      );
      setUsers(activeBasicUsers);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      // No mostrar error, ya que este es secundario
    }
  };

  // Crear cliente
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`http://localhost:4000/api/cliente/${currentClient._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
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
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
      const token = localStorage.getItem('token');
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
      userId: client.userId
    });
    setShowModal(true);
  };

  // Agregar nueva sección a un cliente existente
  const handleAddSection = (client: Client) => {
    setCurrentClient(null); // Indicamos que es una nueva entidad
    setFormData({
      servicio: client.servicio, // Mismo servicio
      seccionDelServicio: '', // Nueva sección
      userId: client.userId // Mismo usuario
    });
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    // Si hay un usuario seleccionado, mantenerlo en el formulario
    setFormData({
      servicio: '',
      seccionDelServicio: '',
      userId: selectedUser || ''
    });
    setCurrentClient(null);
  };

  // Obtener el email del usuario por su ID
  const getUserEmailById = (userId: string) => {
    const user = users.find(u => u._id === userId);
    return user ? user.email : 'Usuario no encontrado';
  };

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    // Filtro por texto de búsqueda
    const matchesSearch = 
      client.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.seccionDelServicio.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por usuario seleccionado
    const matchesUser = selectedUser === "all" || client.userId === selectedUser;
    
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

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
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

      {/* Barra de herramientas */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={selectedUser}
            onValueChange={setSelectedUser}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {users.map(user => (
                <SelectItem key={user._id} value={user._id}>
                  {user.email}
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

      {/* Listado de clientes agrupados */}
      {Object.keys(groupedClients).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No se encontraron clientes
          {selectedUser && " para el usuario seleccionado"}
          {searchTerm && ` que coincidan con "${searchTerm}"`}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedClients).map(([servicio, clientesDelServicio]) => (
            <div key={servicio} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium">{servicio}</h3>
                </div>
                
                {/* Botón para agregar nueva sección al servicio */}
                {clientesDelServicio.length > 0 && selectedUser && (
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
                                Usuario: {getUserEmailById(client.userId)}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Sin sección específica • Usuario: {getUserEmailById(client.userId)}
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
      )}

      {/* Modal de Cliente */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={currentClient ? handleUpdateClient : handleCreateClient} className="space-y-4">
            <div>
              <Label htmlFor="servicio">Servicio</Label>
              <Input
                id="servicio"
                placeholder="Ej: Ministerio de Salud, Estudiante La Plata"
                value={formData.servicio}
                onChange={(e) => setFormData({...formData, servicio: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="seccionDelServicio">Sección del Servicio (opcional)</Label>
              <Input
                id="seccionDelServicio"
                placeholder="Ej: Edificio Avellaneda, Puerto Madero"
                value={formData.seccionDelServicio}
                onChange={(e) => setFormData({...formData, seccionDelServicio: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Deje en blanco si no aplica una sección específica
              </p>
            </div>

            <div>
              <Label htmlFor="userId">Usuario Asignado</Label>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({...formData, userId: value})}
                disabled={Boolean(selectedUser)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2">
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