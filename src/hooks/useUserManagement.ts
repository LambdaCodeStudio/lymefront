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

  // Manejar submit del formulario (crear o editar)
  const handleSubmit = async (submissionData: CreateUserDTO | UpdateUserDTO) => {
    setLoading(true);
    setError('');
    try {
      console.log('Procesando datos de formulario:', submissionData);
      
      if (editingUser) {
        // Editar usuario existente
        const updatedUser = await userService.updateUser(editingUser._id, submissionData as UpdateUserDTO);
        setUsers(prevUsers => 
          prevUsers.map(user => user._id === updatedUser._id ? updatedUser : user)
        );
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente',
          variant: 'default'
        });
        
        // Resetear formulario y cerrar modal
        resetForm();
        setShowModal(false);
      } else {
        // Crear nuevo usuario
        const newUser = await userService.createUser(submissionData as CreateUserDTO);
        
        // Recargar todos los usuarios para asegurar datos actualizados
        const refreshedUsers = await userService.getAllUsers();
        setUsers(refreshedUsers);
        
        toast({
          title: 'Éxito',
          description: 'Usuario creado correctamente',
          variant: 'default'
        });
        
        // Resetear formulario y cerrar modal
        resetForm();
        setShowModal(false);
      }
    } catch (err: any) {
      console.error('Error al procesar usuario:', err);
      
      // Mostrar mensaje de error más descriptivo
      let errorMessage = 'Error al procesar el usuario';
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
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