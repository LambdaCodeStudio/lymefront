import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  UserCog,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Filter
} from 'lucide-react';
import { useDashboard } from './AdminDashboard';

// Interfaces para tipado
interface User {
  _id: string;
  email?: string;
  usuario?: string;
  role: 'admin' | 'supervisor' | 'basic' | 'temporal';
  nombre?: string;
  apellido?: string;
  celular?: string;
  isActive: boolean;
  createdBy?: {
    _id: string;
    email?: string;
    usuario?: string;
  };
  expiresAt?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
}

interface FormData {
  email: string;
  usuario?: string;
  password: string;
  role: User['role'];
  expirationMinutes?: number;
  nombre?: string;
  apellido?: string;
  celular?: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
}

const AdminUserManagement: React.FC = () => {
  // Acceder al contexto del dashboard
  const { changeSection } = useDashboard();
  
  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveUsers, setShowInactiveUsers] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    usuario: '',
    password: '',
    role: 'basic',
    expirationMinutes: 30,
    nombre: '',
    apellido: '',
    celular: '',
    secciones: 'ambos'
  });

  // Roles disponibles según permisos (admin puede crear supervisores)
  const [userRole, setUserRole] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState([
    { value: 'basic', label: 'Básico' },
    { value: 'temporal', label: 'Temporal' }
  ]);
  
  // Inicializar los roles disponibles según el rol del usuario actual
  useEffect(() => {
    // Solo acceder a localStorage en el cliente
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      setUserRole(role);
      
      if (role === 'admin') {
        setAvailableRoles([
          { value: 'supervisor', label: 'Supervisor' },
          { value: 'basic', label: 'Básico' },
          { value: 'temporal', label: 'Temporal' }
        ]);
      } else if (role === 'supervisor') {
        setAvailableRoles([
          { value: 'basic', label: 'Básico' },
          { value: 'temporal', label: 'Temporal' }
        ]);
      } else {
        setAvailableRoles([
          { value: 'temporal', label: 'Temporal' }
        ]);
      }
    }
  }, []);

  // Obtener token de forma segura (solo en el cliente)
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Cargar usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return;
        }
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();

      // Procesar usuarios
      const processedUsers = data.map((user: User) => ({
        ...user,
        // Un usuario temporal está activo si:
        // 1. Su campo isActive es true Y
        // 2. No ha expirado (si tiene fecha de expiración)
        isActive: user.isActive && (
          user.role !== 'temporal' ||
          !user.expiresAt ||
          new Date(user.expiresAt) > new Date()
        )
      }));

      setUsers(processedUsers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios al montar
  useEffect(() => {
    fetchUsers();
  }, []);

  // Crear o actualizar usuario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = getAuthToken();
      if (!token) throw new Error('No hay token de autenticación');

      let endpoint = 'http://localhost:4000/api/auth/';
      let method = 'POST';
      let payload: any = {
        email: formData.email,
        usuario: formData.usuario,
        role: formData.role,
        nombre: formData.nombre,
        apellido: formData.apellido,
        celular: formData.celular,
        secciones: formData.secciones
      };

      // Si estamos editando
      if (editingUser) {
        endpoint += `users/${editingUser._id}`;
        method = 'PUT';
        if (formData.password?.trim()) {
          payload.password = formData.password;
        }
      } else {
        // Si estamos creando
        endpoint += formData.role === 'temporal' ? 'temporary' : 'register';
        payload.password = formData.password;
      }

      // Manejar expiración para usuarios temporales
      if (formData.role === 'temporal' && formData.expirationMinutes) {
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + formData.expirationMinutes);
        payload.expiresAt = expirationDate.toISOString();
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || error.error || 'Error en la operación');
      }

      const data = await response.json();
      await fetchUsers();
      setShowModal(false);
      resetForm();
      
      // Mostrar mensaje de éxito y preguntar si quiere asignar un cliente
      setSuccessMessage(`Usuario ${editingUser ? 'actualizado' : 'creado'} correctamente.`);
      
      // Si es un usuario nuevo (no editando) y es básico, preguntar si quiere asignar cliente
      if (!editingUser && formData.role === 'basic' && typeof window !== 'undefined') {
        if (window.confirm('¿Desea asignar un cliente a este usuario ahora?')) {
          // Guardar temporalmente el ID de usuario para usarlo en el componente de clientes
          localStorage.setItem('lastCreatedUserId', data.userId || '');
          
          // Cambiar a la sección de clientes usando el contexto
          changeSection('clients', data.userId);
        }
      }
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Eliminar usuario
  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:4000/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || error.error || 'Error al eliminar usuario');
      }

      await fetchUsers();
      setSuccessMessage('Usuario eliminado correctamente');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Activar/desactivar usuario
  const handleToggleStatus = async (userId: string, activate: boolean) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `http://localhost:4000/api/auth/users/${userId}/${activate ? 'activate' : 'deactivate'}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || error.error || `Error al ${activate ? 'activar' : 'desactivar'} usuario`);
      }

      // Actualizar el estado local inmediatamente
      setUsers(prevUsers => prevUsers.map(user => {
        if (user._id === userId) {
          return {
            ...user,
            isActive: activate
          };
        }
        return user;
      }));

      await fetchUsers(); // Recargar todos los usuarios para asegurar sincronización
      setSuccessMessage(`Usuario ${activate ? 'activado' : 'desactivado'} correctamente`);
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Preparar edición de usuario
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      usuario: user.usuario || '',
      password: '', // Campo vacío para edición
      role: user.role,
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      celular: user.celular || '',
      secciones: user.secciones || 'ambos',
      expirationMinutes: user.role === 'temporal' && user.expiresAt ?
        Math.round((new Date(user.expiresAt).getTime() - Date.now()) / 60000) :
        30
    });
    setShowModal(true);
  };

  // Ir a la gestión de clientes para este usuario
  const handleAssignClient = (userId: string, identifier: string) => {
    // Guardar el ID del usuario seleccionado para usar en el componente de clientes
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', userId);
      localStorage.setItem('selectedUserIdentifier', identifier); // Email o nombre de usuario
    }
    
    // Cambiar a la sección de clientes usando el contexto
    changeSection('clients', userId);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      email: '',
      usuario: '',
      password: '',
      role: 'basic',
      expirationMinutes: 30,
      nombre: '',
      apellido: '',
      celular: '',
      secciones: 'ambos'
    });
    setEditingUser(null);
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
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
    
    return matchesSearch && (showInactiveUsers || user.isActive);
  });

  // Función para obtener el identificador principal del usuario (email o usuario)
  const getUserIdentifier = (user: User) => {
    return user.email || user.usuario || `Usuario ID: ${user._id.substring(0, 8)}`;
  };

  // Función para obtener el nombre completo si está disponible
  const getFullName = (user: User) => {
    if (user.nombre || user.apellido) {
      return `${user.nombre || ''} ${user.apellido || ''}`.trim();
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Alerta de Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Mensaje de éxito */}
      {successMessage && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Herramientas */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="showInactive" 
              checked={showInactiveUsers} 
              onCheckedChange={(checked) => setShowInactiveUsers(checked as boolean)}
            />
            <Label htmlFor="showInactive" className="text-sm cursor-pointer">
              Mostrar inactivos
            </Label>
          </div>
          
          <Button onClick={() => {
            resetForm();
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Usuario</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Vista de Carga */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Cargando usuarios...</span>
        </div>
      )}

      {/* Mensaje cuando no hay usuarios */}
      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        {!loading && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secciones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado por</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getUserIdentifier(user)}
                      </div>
                      {getFullName(user) && (
                        <div className="text-xs text-gray-500">
                          {getFullName(user)}
                        </div>
                      )}
                      {user.role === 'temporal' && user.expiresAt && (
                        <div className="text-xs text-gray-500">
                          <Clock className="inline-block w-3 h-3 mr-1" />
                          Expira: {new Date(user.expiresAt).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-sm text-gray-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                          ${!user.isActive
                            ? 'bg-red-100 text-red-800'
                            : user.role === 'temporal'
                              ? user.expiresAt && new Date(user.expiresAt) > new Date()
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {!user.isActive
                            ? 'Inactivo'
                            : user.role === 'temporal'
                              ? user.expiresAt && new Date(user.expiresAt) > new Date()
                                ? 'Temporal Activo'
                                : 'Expirado'
                              : 'Activo'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.secciones ? (
                        <span className="capitalize">{user.secciones}</span>
                      ) : (
                        <span className="text-gray-400">No especificado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.createdBy ? 
                        (user.createdBy.email || user.createdBy.usuario || `ID: ${user.createdBy._id.substring(0, 8)}`) 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Botón de Asignar Cliente (solo para usuarios básicos activos) */}
                        {user.role === 'basic' && user.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignClient(user._id, getUserIdentifier(user))} 
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* Botón de activar/desactivar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user._id, !user.isActive)}
                          className={user.isActive 
                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'}>
                          {user.isActive ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                        
                        {/* Botón de editar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <UserCog className="w-4 h-4" />
                        </Button>
                        
                        {/* Botón de eliminar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {!loading && filteredUsers.map(user => (
          <Card key={user._id} className="overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{getUserIdentifier(user)}</CardTitle>
                  {getFullName(user) && (
                    <CardDescription>{getFullName(user)}</CardDescription>
                  )}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                  ${!user.isActive
                    ? 'bg-red-100 text-red-800'
                    : user.role === 'temporal'
                      ? user.expiresAt && new Date(user.expiresAt) > new Date()
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {!user.isActive
                    ? 'Inactivo'
                    : user.role === 'temporal'
                      ? user.expiresAt && new Date(user.expiresAt) > new Date()
                        ? 'Temporal Activo'
                        : 'Expirado'
                      : 'Activo'
                  }
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 pb-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Rol:</span>
                  <span className="ml-1 capitalize">{user.role}</span>
                </div>
                <div>
                  <span className="text-gray-500">Secciones:</span>
                  <span className="ml-1 capitalize">{user.secciones || 'No especificado'}</span>
                </div>
                {user.role === 'temporal' && user.expiresAt && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Expira:</span>
                    <span className="ml-1">{new Date(user.expiresAt).toLocaleString()}</span>
                  </div>
                )}
                {user.celular && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Teléfono:</span>
                    <span className="ml-1">{user.celular}</span>
                  </div>
                )}
                {user.createdBy && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Creado por:</span>
                    <span className="ml-1">{user.createdBy.email || user.createdBy.usuario || user.createdBy._id.substring(0, 8)}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-2 flex justify-end space-x-2 bg-gray-50">
              {/* Botones de acción */}
              {user.role === 'basic' && user.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAssignClient(user._id, getUserIdentifier(user))} 
                  className="text-blue-600">
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(user._id, !user.isActive)}
                className={user.isActive ? 'text-red-600' : 'text-green-600'}>
                {user.isActive ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(user)}
                className="text-blue-600">
                <UserCog className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(user._id)}
                className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Modal de Usuario */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ejemplo@correo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="usuario">Nombre de Usuario</Label>
                  <Input
                    id="usuario"
                    type="text"
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    placeholder="usuario123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    placeholder="Apellido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="celular">Teléfono</Label>
                  <Input
                    id="celular"
                    type="tel"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    placeholder="+123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: User['role']) => {
                      setFormData({
                        ...formData,
                        role: value,
                        // Resetear tiempo de expiración si se cambia a temporal
                        expirationMinutes: value === 'temporal' ? 30 : undefined
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="password">
                  {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                  placeholder={editingUser ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                  className="w-full"
                />
                {!editingUser && (
                  <p className="text-xs text-gray-500 mt-1">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                )}
              </div>

              {formData.role === 'temporal' && (
                <div>
                  <Label htmlFor="expirationMinutes">
                    Tiempo de expiración (minutos)
                  </Label>
                  <Input
                    id="expirationMinutes"
                    type="number"
                    min={1}
                    max={1440} // 24 horas máximo
                    value={formData.expirationMinutes}
                    onChange={(e) => setFormData({
                      ...formData,
                      expirationMinutes: parseInt(e.target.value)
                    })}
                    required
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tiempo máximo: 24 horas (1440 minutos)
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="secciones">Secciones</Label>
                <Select
                  value={formData.secciones}
                  onValueChange={(value: 'limpieza' | 'mantenimiento' | 'ambos') => {
                    setFormData({
                      ...formData,
                      secciones: value
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar secciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                ) : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;