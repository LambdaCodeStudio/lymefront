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
import { 
  Plus, 
  Search, 
  UserCog, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Interfaces TypeScript para seguridad de tipos
interface User {
  _id: string;
  email: string;
  role: 'admin' | 'supervisor' | 'basic' | 'temporal';
  isActive: boolean;
  createdBy?: string;
  expiresAt?: string;
}

interface FormData {
  email: string;
  password: string;
  role: User['role'];
  expirationMinutes?: number;
}

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    role: 'basic',
    expirationMinutes: 30
  });

  // Roles disponibles basados en los permisos del usuario actual
  const availableRoles: { value: User['role'], label: string }[] = [
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'basic', label: 'Básico' },
    { value: 'temporal', label: 'Temporal' }
  ];

  // Obtener token de autenticación
  const getAuthToken = (): string | null => {
    return localStorage.getItem('token') || 
           document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || 
           null;
  };

  // Obtener usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Verificar permisos del usuario actual
      const meResponse = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          throw new Error('Sesión expirada');
        }
        throw new Error('Error al verificar permisos');
      }

      const currentUser = await meResponse.json();

      // Verificar si el usuario actual tiene privilegios de admin
      if (currentUser.role !== 'admin') {
        throw new Error('No tienes permisos para gestionar usuarios');
      }

      // Obtener todos los usuarios
      const usersResponse = await fetch('http://localhost:4000/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!usersResponse.ok) {
        throw new Error('Error al cargar usuarios');
      }
      
      const allUsers = await usersResponse.json();
      setUsers(allUsers);
    } catch (err: any) {
      setError(`Error al cargar usuarios: ${err.message}`);
      
      // Redirigir a login si la sesión expiró
      if (err.message === 'Sesión expirada') {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial de usuarios
  useEffect(() => {
    fetchUsers();
  }, []);

  // Manejador de envío para crear/editar usuarios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No hay token de autenticación');

      // Elegir endpoint basado en el rol del usuario
      const endpoint = formData.role === 'temporal'
        ? 'http://localhost:4000/api/auth/temporary'
        : 'http://localhost:4000/api/auth/register';

      const payload: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role
      };

      // Agregar expiración para usuarios temporales
      if (formData.role === 'temporal' && formData.expirationMinutes) {
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + formData.expirationMinutes);
        payload.expiresAt = expirationDate.toISOString();
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Error al crear usuario');
      }
      
      // Reiniciar formulario y actualizar usuarios
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Manejador de eliminación de usuario
  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:4000/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Error al eliminar usuario');
      }
      
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Alternar estado del usuario (activo/inactivo)
  const handleToggleStatus = async (userId: string, activate: boolean) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:4000/api/auth/users/${userId}/${activate ? 'activate' : 'deactivate'}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || `Error al ${activate ? 'activar' : 'desactivar'} usuario`);
      }
      
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Preparar usuario para editar
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // No mostrar la contraseña actual
      role: user.role,
      expirationMinutes: user.role === 'temporal' && user.expiresAt 
        ? Math.round((new Date(user.expiresAt).getTime() - Date.now()) / 60000) 
        : 30
    });
    setShowModal(true);
  };

  // Reiniciar formulario al estado inicial
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'basic',
      expirationMinutes: 30
    });
    setEditingUser(null);
  };

  const [showInactiveUsers, setShowInactiveUsers] = useState(true);

  // Filtrado
  const filteredUsers = users.filter(user =>
    (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.role.toLowerCase().includes(searchTerm.toLowerCase())) &&
    // Opción de mostrar/ocultar usuarios inactivos
    (showInactiveUsers || user.isActive)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Alerta de Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
        
        <Button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado por</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.email}
                      </div>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${!user.isActive 
                          ? 'bg-red-100 text-red-800' 
                          : user.role === 'temporal'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.createdBy?.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user._id, !user.isActive)}
                          className={user.isActive ? 'text-red-600' : 'text-green-600'}
                        >
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
                        >
                          <UserCog className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: User['role']) => setFormData({ ...formData, role: value })}
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

              {formData.role === 'temporal' && (
                <div>
                  <Label htmlFor="expirationMinutes">
                    Tiempo de expiración (minutos)
                  </Label>
                  <Input
                    id="expirationMinutes"
                    type="number"
                    min={1}
                    max={1440}
                    value={formData.expirationMinutes}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      expirationMinutes: parseInt(e.target.value) 
                    })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El usuario temporal expirará después del tiempo seleccionado
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
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
              <Button type="submit">
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;