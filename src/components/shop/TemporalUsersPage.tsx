import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  ShoppingCart,
  FileText,
  EyeOff,
  Eye,
  HelpCircle,
  Save
} from 'lucide-react';
import { ShopNavbar } from './ShopNavbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CreateTemporalUserModal } from './CreateTemporalUserModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Hook seguro para notificaciones
const useNotificationSafe = () => {
  try {
    const { useNotification } = require('@/context/NotificationContext');
    return useNotification();
  } catch (error) {
    return {
      addNotification: (message, type) => {
        console.log(`Notification (${type}): ${message}`);
      }
    };
  }
};

// Componente principal
export const TemporalUsersPage = () => {
  const { addNotification } = useNotificationSafe();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabFilter, setTabFilter] = useState('all');
  
  // Estado para reactivación/desactivación
  const [processingUserId, setProcessingUserId] = useState(null);
  
  // Estado para modal de edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    usuario: '',
    email: '',
    password: '',
    nombre: '',
    apellido: ''
  });
  
  // Estado para modal de creación
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Estado para modal de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  
  // Estado para modal de pedidos
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [selectedUserOrders, setSelectedUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [userForOrders, setUserForOrders] = useState(null);

  // Cargar usuarios temporales al montar el componente
  useEffect(() => {
    fetchTemporalUsers();
  }, []);

  // Filtrar usuarios cuando cambia el término de búsqueda o la pestaña
  useEffect(() => {
    if (!users.length) return;
    
    let result = [...users];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      result = result.filter(user => 
        (user.usuario && user.usuario.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.apellido && user.apellido.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filtrar por estado (activo/inactivo)
    if (tabFilter === 'active') {
      result = result.filter(user => user.isActive);
    } else if (tabFilter === 'inactive') {
      result = result.filter(user => !user.isActive);
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, tabFilter]);

  // Función para obtener los usuarios temporales
  const fetchTemporalUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
      }
      
      // Primero obtenemos todos los usuarios
      const response = await fetch('http://localhost:4000/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Error al cargar usuarios: ${response.status}`);
      }
      
      const allUsers = await response.json();
      
      // Obtener información del usuario actual
      const userResponse = await fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        throw new Error('Error al obtener información del usuario actual');
      }
      
      const currentUser = await userResponse.json();
      
      // Filtrar para obtener solo los usuarios temporales creados por el usuario actual
      const temporalUsers = allUsers.filter(user => 
        user.role === 'temporal' && 
        user.createdBy && 
        user.createdBy._id === currentUser._id
      );
      
      setUsers(temporalUsers);
      setFilteredUsers(temporalUsers);
    } catch (err) {
      console.error('Error al cargar usuarios temporales:', err);
      setError(err.message || 'Error al cargar usuarios temporales');
      
      if (addNotification) {
        addNotification(err.message || 'Error al cargar usuarios temporales', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener pedidos realizados por un usuario específico
  const fetchUserOrders = async (userId, userName) => {
    try {
      setLoadingOrders(true);
      setOrdersModalOpen(true);
      setSelectedUserOrders([]);
      setUserForOrders({ id: userId, name: userName });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://localhost:4000/api/pedido/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al cargar pedidos: ${response.status}`);
      }
      
      const orders = await response.json();
      setSelectedUserOrders(orders);
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      
      if (addNotification) {
        addNotification(`Error al cargar pedidos: ${error.message}`, 'error');
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  // Función para activar o desactivar usuario
  const toggleUserStatus = async (userId, activate) => {
    try {
      setProcessingUserId(userId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const action = activate ? 'activate' : 'deactivate';
      console.log(`Intentando ${action} usuario con ID: ${userId}`);
      
      // Depuración: mostrar URL completa y detalles
      const url = `http://localhost:4000/api/auth/users/${userId}/${action}`;
      console.log('URL:', url);
      console.log('Método:', 'PUT');
      console.log('Headers:', { 'Authorization': 'Bearer [token]' });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' // Añadido para asegurar formato correcto
        },
        // Enviar un cuerpo vacío, algunos servidores requieren al menos un objeto JSON
        body: JSON.stringify({})
      });
      
      // Obtener texto de respuesta para análisis
      const responseText = await response.text();
      console.log('Respuesta del servidor (texto):', responseText);
      
      // Intentar parsear como JSON si es posible
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log('Respuesta del servidor (JSON):', responseData);
      } catch (e) {
        console.warn('La respuesta no es JSON válido:', e);
        responseData = {};
      }
      
      if (!response.ok) {
        throw new Error(`Error al ${activate ? 'activar' : 'desactivar'} usuario: ${response.status} ${response.statusText}. ${responseData.msg || responseText}`);
      }
      
      // Actualizar el estado local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId ? {...user, isActive: activate} : user
        )
      );
      
      if (addNotification) {
        addNotification(
          `Usuario ${activate ? 'activado' : 'desactivado'} correctamente`, 
          'success'
        );
      }
      
      // Opcional: refrescar la lista de usuarios para asegurar datos actualizados
      setTimeout(() => {
        fetchTemporalUsers();
      }, 1000);
      
    } catch (error) {
      console.error(`Error al ${activate ? 'activar' : 'desactivar'} usuario:`, error);
      
      if (addNotification) {
        addNotification(error.message, 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  // Función para eliminar usuario
  const deleteUser = async () => {
    if (!deletingUserId) return;
    
    try {
      setProcessingUserId(deletingUserId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://localhost:4000/api/auth/users/${deletingUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }
      
      // Actualizar el estado local
      setUsers(prevUsers => prevUsers.filter(user => user._id !== deletingUserId));
      
      if (addNotification) {
        addNotification('Usuario eliminado correctamente', 'success');
      }
      
      // Cerrar el modal
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      
      if (addNotification) {
        addNotification(error.message, 'error');
      }
    } finally {
      setProcessingUserId(null);
      setDeletingUserId(null);
    }
  };

  // Abrir modal de edición para un usuario
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({
      usuario: user.usuario || '',
      email: user.email || '',
      password: '', // No mostramos la contraseña actual por seguridad
      nombre: user.nombre || '',
      apellido: user.apellido || ''
    });
    setEditModalOpen(true);
  };

  // Actualizar usuario
  const updateUser = async (e) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    try {
      setProcessingUserId(editingUser._id);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Preparar datos para la actualización
      const updateData = {...editFormData};
      
      // Si no se proporciona contraseña, eliminarla del objeto
      if (!updateData.password) {
        delete updateData.password;
      }
      
      const response = await fetch(`http://localhost:4000/api/auth/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }
      
      const updatedUser = await response.json();
      
      // Actualizar el estado local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === editingUser._id ? 
          {...user, ...updateData, password: undefined} : user
        )
      );
      
      if (addNotification) {
        addNotification('Usuario actualizado correctamente', 'success');
      }
      
      // Cerrar el modal
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      
      if (addNotification) {
        addNotification(error.message, 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Calcular tiempo restante
  const getTimeRemaining = (expirationDate) => {
    if (!expirationDate) return null;
    
    try {
      const expiration = new Date(expirationDate);
      const now = new Date();
      
      if (expiration <= now) {
        return { expired: true, minutes: 0 };
      }
      
      const diffMs = expiration - now;
      const diffMinutes = Math.ceil(diffMs / 60000); // Convertir a minutos y redondear hacia arriba
      
      return { expired: false, minutes: diffMinutes };
    } catch (error) {
      return { expired: true, minutes: 0 };
    }
  };

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center text-[#D4F5E6]">
            <Users className="mr-3 h-8 w-8" />
            Gestión de Usuarios Temporales
          </h1>
          
          {/* Alertas */}
          {error && (
            <Alert className="mb-6 bg-red-900/30 border border-red-500">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="ml-2 text-white">{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Controles principales */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar usuarios..."
                  className="pl-10 bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white placeholder:text-[#D4F5E6]/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={fetchTemporalUsers}
                  className="border-[#91BEAD] text-[#D4F5E6] hover:bg-[#DFEFE6]/50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
                
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-[#00888A] hover:bg-[#50C3AD] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>
            </div>
            
            {/* Pestañas de filtrado */}
            <Tabs value={tabFilter} onValueChange={setTabFilter} className="w-full">
              <TabsList className="bg-white/10 border border-[#91BEAD]/50 w-full sm:w-auto">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-[#00888A] data-[state=active]:text-white"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-[#00888A] data-[state=active]:text-white"
                >
                  Activos
                </TabsTrigger>
                <TabsTrigger
                  value="inactive"
                  className="data-[state=active]:bg-[#00888A] data-[state=active]:text-white"
                >
                  Inactivos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Estado de carga */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#D4F5E6]" />
                <p className="mt-4 text-[#D4F5E6]">Cargando usuarios temporales...</p>
              </div>
            </div>
          )}
          
          {/* Sin usuarios */}
          {!loading && filteredUsers.length === 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00888A]/30 rounded-full mb-4">
                <Users className="w-8 h-8 text-[#D4F5E6]" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[#D4F5E6]">No se encontraron usuarios temporales</h2>
              <p className="text-[#75D0E0] max-w-lg mx-auto mb-6">
                {searchTerm 
                  ? `No hay usuarios que coincidan con "${searchTerm}"` 
                  : tabFilter !== 'all'
                    ? `No hay usuarios ${tabFilter === 'active' ? 'activos' : 'inactivos'}`
                    : "Aún no has creado ningún usuario temporal."}
              </p>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#00888A] hover:bg-[#50C3AD] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Usuario Temporal
              </Button>
            </div>
          )}
          
          {/* Lista de usuarios */}
          {!loading && filteredUsers.length > 0 && (
            <div className="space-y-6">
              {/* Vista para escritorio */}
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
                  <table className="w-full text-[#D4F5E6]">
                    <thead className="bg-[#00888A]/30 text-[#D4F5E6] border-b border-[#91BEAD]/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Creado
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#91BEAD]/20">
                      {filteredUsers.map((user) => {
                        const timeRemaining = getTimeRemaining(user.expiresAt);
                        
                        return (
                          <tr key={user._id} className="hover:bg-[#00888A]/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium">{user.usuario || 'N/A'}</div>
                              <div className="text-xs text-[#75D0E0]">{user.email || 'Sin email'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>{user.nombre || 'Sin nombre'} {user.apellido || ''}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>{formatDate(user.createdAt)}</div>
                              <div className="text-xs text-[#75D0E0]">
                                {user.expiresAt && `Expira: ${formatDate(user.expiresAt)}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              {user.isActive ? (
                                <div className="flex flex-col items-center">
                                  <Badge className="bg-green-500/30 text-green-300 border-green-500/50">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Activo
                                  </Badge>
                                  {timeRemaining && !timeRemaining.expired && (
                                    <span className="text-xs mt-1 text-[#75D0E0]">
                                      Expira en {timeRemaining.minutes} min
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Badge className="bg-red-500/30 text-red-300 border-red-500/50">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Inactivo
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex space-x-2 justify-end">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fetchUserOrders(user._id, user.usuario || 'Usuario')}
                                        className="text-[#75D0E0] hover:text-[#D4F5E6] hover:bg-[#00888A]/30"
                                      >
                                        <ShoppingCart className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Ver pedidos</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(user)}
                                        className="text-[#75D0E0] hover:text-[#D4F5E6] hover:bg-[#00888A]/30"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Editar usuario</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant={user.isActive ? "ghost" : "outline"}
                                        size="sm"
                                        onClick={() => toggleUserStatus(user._id, !user.isActive)}
                                        disabled={processingUserId === user._id}
                                        className={user.isActive 
                                          ? "text-red-400 hover:text-red-300 hover:bg-red-900/20" 
                                          : "border-green-500 text-green-400 hover:bg-green-900/20"}
                                      >
                                        {processingUserId === user._id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : user.isActive ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{user.isActive ? "Desactivar usuario" : "Activar usuario"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setDeletingUserId(user._id);
                                          setDeleteModalOpen(true);
                                        }}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Eliminar usuario</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Vista para móvil */}
              <div className="md:hidden space-y-4">
                {filteredUsers.map((user) => {
                  const timeRemaining = getTimeRemaining(user.expiresAt);
                  
                  return (
                    <Card key={user._id} className="bg-white/10 backdrop-blur-sm border-[#91BEAD]/20 overflow-hidden">
                      <CardHeader className="pb-2 bg-[#00888A]/20 border-b border-[#91BEAD]/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm flex items-center text-[#D4F5E6]">
                              {user.usuario || 'Sin nombre de usuario'}
                            </CardTitle>
                            <p className="text-xs text-[#75D0E0] mt-1">
                              {user.email || 'Sin email'}
                            </p>
                          </div>
                          {user.isActive ? (
                            <Badge className="bg-green-500/30 text-green-300 border-green-500/50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/30 text-red-300 border-red-500/50">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3 pb-2">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div>
                              <p className="text-sm font-medium text-[#D4F5E6]">
                                {user.nombre || 'Sin nombre'} {user.apellido || ''}
                              </p>
                              <p className="text-xs text-[#75D0E0] mt-1">
                                Creado: {formatDate(user.createdAt)}
                              </p>
                              {user.expiresAt && (
                                <p className="text-xs text-[#75D0E0] mt-1">
                                  Expira: {formatDate(user.expiresAt)}
                                </p>
                              )}
                              
                              {timeRemaining && !timeRemaining.expired && user.isActive && (
                                <Badge className="mt-2 bg-[#00888A]/30 text-[#D4F5E6] border-[#00888A]/50">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Expira en {timeRemaining.minutes} min
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 pb-3 flex justify-between items-center">
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchUserOrders(user._id, user.usuario || 'Usuario')}
                            className="text-[#75D0E0] hover:text-[#D4F5E6] hover:bg-[#00888A]/30"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            className="text-[#75D0E0] hover:text-[#D4F5E6] hover:bg-[#00888A]/30"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant={user.isActive ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => toggleUserStatus(user._id, !user.isActive)}
                            disabled={processingUserId === user._id}
                            className={user.isActive 
                              ? "text-red-400 hover:text-red-300 hover:bg-red-900/20" 
                              : "border-green-500 text-green-400 hover:bg-green-900/20"}
                          >
                            {processingUserId === user._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingUserId(user._id);
                              setDeleteModalOpen(true);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Información */}
          <div className="mt-6 p-4 bg-[#00888A]/20 rounded-lg border border-[#91BEAD]/30">
            <h3 className="text-md font-medium mb-2 flex items-center text-[#D4F5E6]">
              <HelpCircle className="h-4 w-4 mr-2" />
              Información sobre usuarios temporales
            </h3>
            <p className="text-sm text-[#75D0E0]">
              Los usuarios temporales expiran automáticamente después de 30 minutos de su creación. 
              Puedes reactivarlos o desactivarlos manualmente en cualquier momento. Los usuarios inactivos
              no pueden iniciar sesión en el sistema.
            </p>
          </div>
        </div>
      </div>
      
      {/* Modal para crear usuario temporal */}
      <CreateTemporalUserModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
      
      {/* Modal de edición de usuario */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#00888A] border-[#80CFB0] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#D4F5E6]">
              Editar Usuario Temporal
            </DialogTitle>
            <DialogDescription className="text-[#75D0E0]">
              Modifica la información del usuario temporal.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={updateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="editUsuario" className="text-[#D4F5E6]">Usuario</Label>
                <Input
                  id="editUsuario"
                  name="usuario"
                  value={editFormData.usuario}
                  onChange={(e) => setEditFormData({...editFormData, usuario: e.target.value})}
                  className="bg-white/10 border-[#50C3AD] text-white mt-1"
                  placeholder="nombre_usuario"
                  required
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="editEmail" className="text-[#D4F5E6]">Email (opcional)</Label>
                <Input
                  id="editEmail"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="bg-white/10 border-[#50C3AD] text-white mt-1"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="editPassword" className="text-[#D4F5E6]">
                  Nueva Contraseña (dejar en blanco para no cambiar)
                </Label>
                <Input
                  id="editPassword"
                  name="password"
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                  className="bg-white/10 border-[#50C3AD] text-white mt-1"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <Label htmlFor="editNombre" className="text-[#D4F5E6]">Nombre (opcional)</Label>
                <Input
                  id="editNombre"
                  name="nombre"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({...editFormData, nombre: e.target.value})}
                  className="bg-white/10 border-[#50C3AD] text-white mt-1"
                  placeholder="Nombre"
                />
              </div>
              
              <div>
                <Label htmlFor="editApellido" className="text-[#D4F5E6]">Apellido (opcional)</Label>
                <Input
                  id="editApellido"
                  name="apellido"
                  value={editFormData.apellido}
                  onChange={(e) => setEditFormData({...editFormData, apellido: e.target.value})}
                  className="bg-white/10 border-[#50C3AD] text-white mt-1"
                  placeholder="Apellido"
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="border-[#50C3AD] text-[#D4F5E6] hover:bg-[#50C3AD]/20"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#50C3AD] hover:bg-[#80CFB0] text-white"
                disabled={processingUserId === editingUser?._id}
              >
                {processingUserId === editingUser?._id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#00888A] border-[#80CFB0] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#D4F5E6]">Confirmar eliminación</DialogTitle>
            <DialogDescription className="text-[#75D0E0]">
              ¿Estás seguro que deseas eliminar este usuario temporal? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="border-[#50C3AD] text-[#D4F5E6] hover:bg-[#50C3AD]/20"
            >
              Cancelar
            </Button>
            <Button
              onClick={deleteUser}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={processingUserId === deletingUserId}
            >
              {processingUserId === deletingUserId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de pedidos */}
      <Dialog open={ordersModalOpen} onOpenChange={setOrdersModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#00888A] border-[#80CFB0] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#D4F5E6] flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Pedidos de {userForOrders?.name || ''}
            </DialogTitle>
            <DialogDescription className="text-[#75D0E0]">
              Listado de pedidos realizados por este usuario temporal.
            </DialogDescription>
          </DialogHeader>
          
          {loadingOrders && (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4F5E6]" />
            </div>
          )}
          
          {!loadingOrders && selectedUserOrders.length === 0 && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#50C3AD]/30 rounded-full mb-4">
                <FileText className="h-6 w-6 text-[#D4F5E6]" />
              </div>
              <h3 className="text-[#D4F5E6] font-medium mb-2">No hay pedidos</h3>
              <p className="text-[#75D0E0] text-sm">
                Este usuario aún no ha realizado ningún pedido.
              </p>
            </div>
          )}
          
          {!loadingOrders && selectedUserOrders.length > 0 && (
            <div className="max-h-96 overflow-y-auto pr-2">
              <div className="space-y-4">
                {selectedUserOrders.map((order) => (
                  <Card key={order._id} className="bg-white/10 border-[#91BEAD]/30">
                    <CardHeader className="py-3 bg-[#50C3AD]/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[#D4F5E6] font-medium">
                            Pedido #{order.numero || order._id.substring(0, 8)}
                          </p>
                          <p className="text-[#75D0E0] text-xs">
                            {formatDate(order.fecha)}
                          </p>
                        </div>
                        <Badge className="bg-[#00888A]/50 border-[#00888A] text-white">
                          {order.productos?.length || 0} productos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="text-sm text-[#D4F5E6]">
                        <div className="flex items-center mb-1">
                          <Calendar className="w-3 h-3 mr-2 text-[#75D0E0]" />
                          <span className="font-medium">Servicio:</span>
                          <span className="ml-1">{order.servicio}</span>
                        </div>
                        {order.seccionDelServicio && (
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-2 text-[#75D0E0]" />
                            <span className="font-medium">Sección:</span>
                            <span className="ml-1">{order.seccionDelServicio}</span>
                          </div>
                        )}
                      </div>
                      
                      {order.productos && order.productos.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#91BEAD]/30">
                          <p className="text-xs text-[#D4F5E6] mb-1">Productos:</p>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {order.productos.map((producto, idx) => {
                              const nombre = 
                                typeof producto.productoId === 'object' && producto.productoId?.nombre 
                                  ? producto.productoId.nombre
                                  : 'Producto';
                              
                              const cantidad = producto.cantidad || 1;
                              
                              return (
                                <div key={idx} className="flex justify-between text-xs text-[#75D0E0]">
                                  <span>{nombre}</span>
                                  <span>x{cantidad}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {order.detalle && order.detalle.trim() !== ' ' && (
                        <div className="mt-2 pt-2 border-t border-[#91BEAD]/30">
                          <p className="text-xs text-[#D4F5E6] mb-1">Notas:</p>
                          <p className="text-xs text-[#75D0E0] italic">{order.detalle}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              className="bg-[#50C3AD] hover:bg-[#80CFB0] text-white"
              onClick={() => setOrdersModalOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Componente wrapper para la página
export const TemporalUsersWrapper = () => {
  return (
    <TemporalUsersPage />
  );
};