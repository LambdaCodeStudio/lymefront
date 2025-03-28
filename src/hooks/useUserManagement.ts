import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import userService from '@/services/userService';
import { User, CreateUserDTO, UpdateUserDTO } from '@/types/users';
import { ROLES, roleOptions } from '../types/UserRolesConfig';

/**
 * Hook personalizado para gestión de usuarios
 * Centraliza toda la lógica de operaciones CRUD de usuarios
 */
export const useUserManagement = () => {
  const { toast } = useToast();
  
  // Estados para gestión de usuarios
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  
  // Configuración inicial de formulario
  const [formData, setFormData] = useState<CreateUserDTO>({
    usuario: '',
    password: '',
    role: ROLES.OPERARIO,
    secciones: 'ambos'
  });

  // Determinar roles disponibles basado en el rol del usuario actual
  const [currentUserRole, setCurrentUserRole] = useState<string>(ROLES.OPERARIO);
  const [availableRoles, setAvailableRoles] = useState<{value: string, label: string}[]>([]);

  // Cargar usuario actual al iniciar
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const currentUserResponse = await userService.getCurrentUser();
        const currentUser = currentUserResponse.user;
        setCurrentUserRole(currentUser.role);
        
        // Establecer roles disponibles basados en el rol del usuario actual
        const rolesForCurrentUser = roleOptions[currentUser.role] || [];
        setAvailableRoles(rolesForCurrentUser);
      } catch (err) {
        console.error('Error al cargar usuario actual', err);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información del usuario actual',
          variant: 'destructive'
        });
      }
    };

    loadCurrentUser();
  }, []);

  // Cargar lista de usuarios
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedUsers = await userService.getAllUsers();
      setUsers(fetchedUsers);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
      toast({
        title: 'Error',
        description: err.message || 'No se pudieron cargar los usuarios',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Mostrar notificación
  const showNotification = (type: 'success' | 'error', message: string) => {
    toast({
      title: type === 'success' ? 'Éxito' : 'Error',
      description: message,
      variant: type === 'success' ? 'default' : 'destructive'
    });
  };

  // Función para actualizar la lista de usuarios
  const fetchUsers = async () => {
    await loadUsers();
  };
  
  // Función handleSubmit para procesar creación/actualización de usuarios
  const handleSubmit = async (userData: CreateUserDTO | UpdateUserDTO) => {
    try {
      setLoading(true);
      setError('');
      
      // Log para debugging
      console.log('Procesando usuario con datos:', userData);
      
      // Si estamos editando un usuario existente
      if (editingUser) {
        // Actualizar el usuario - el servicio ya limpia los datos por rol
        await userService.updateUser(editingUser._id, userData);
        
        // Actualizar la lista de usuarios
        await fetchUsers();
        setShowModal(false);
        resetForm();
        showNotification('success', 'Usuario actualizado correctamente');
      } else {
        // Crear un nuevo usuario
        await userService.createUser(userData);
        
        // Actualizar la lista de usuarios
        await fetchUsers();
        setShowModal(false);
        resetForm();
        showNotification('success', 'Usuario creado correctamente');
      }
    } catch (err: any) {
      console.error('Error al procesar usuario:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Manejar edición de usuario
  const handleEdit = (user: User) => {
    // Preparar datos para edición
    const preparedFormData: UpdateUserDTO = {
      usuario: user.usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role,
      secciones: user.secciones,
      celular: user.celular,
      isActive: user.isActive
    };
    
    // Solo agregar supervisorId si el usuario es operario
    if (user.role === ROLES.OPERARIO && user.supervisorId) {
      preparedFormData.supervisorId = user.supervisorId;
    }

    setEditingUser(user);
    setFormData(preparedFormData);
    setShowModal(true);
  };

  // Manejar eliminación de usuario
  const handleDelete = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      await userService.deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
        variant: 'default'
      });
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo eliminar el usuario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de estado de usuario
  const handleToggleStatus = async (userId: string, activate: boolean) => {
    setLoading(true);
    setError('');
    try {
      const updatedUser = await userService.toggleUserStatus(userId, activate);
      setUsers(prevUsers => 
        prevUsers.map(user => user._id === updatedUser._id ? updatedUser : user)
      );
      toast({
        title: 'Éxito',
        description: activate 
          ? 'Usuario activado correctamente' 
          : 'Usuario desactivado correctamente',
        variant: 'default'
      });
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del usuario');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo cambiar el estado del usuario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      usuario: '',
      password: '',
      role: ROLES.OPERARIO,
      secciones: 'ambos'
    });
  };

  return {
    users,
    loading,
    error,
    showModal,
    editingUser,
    searchTerm,
    showInactiveUsers,
    formData,
    availableRoles,
    currentUserRole,
    
    setSearchTerm,
    setShowInactiveUsers,
    setShowModal,
    setFormData,
    
    handleSubmit,
    handleDelete,
    handleToggleStatus,
    handleEdit,
    resetForm
  };
};