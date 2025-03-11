/**
 * Hook personalizado que centraliza la lógica de gestión de usuarios
 * Implementa la nueva estructura de roles
 */
import { useState, useEffect, useCallback } from 'react';
import userService, {  type AdminUser, type CreateUserData } from '../../../services/userService';
import { useNotification } from '@/context/NotificationContext';
import { getAvailableRoles, ROLES } from '../shared/UserRolesConfig';

/**
 * Hook para gestionar usuarios
 */
export const useUserManagement = () => {
  // Estados para la gestión de usuarios
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(ROLES.ADMIN); // Por defecto asumimos admin
  
  // Opciones de roles disponibles según el rol del usuario actual
  const availableRoles = getAvailableRoles(currentUserRole);
  
  // Contexto de notificaciones
  const { addNotification } = useNotification();

  // Estado del formulario
  const [formData, setFormData] = useState<CreateUserData>({
    usuario: '',
    password: '',
    role: ROLES.OPERARIO,
    secciones: 'ambos'
  });

  // Obtener el rol del usuario actual al cargar la página
  useEffect(() => {
    const getUserRole = () => {
      try {
        // Obtener el rol desde localStorage (almacenado al iniciar sesión)
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
          setCurrentUserRole(storedRole);
        }
      } catch (error) {
        console.error('Error al obtener el rol del usuario:', error);
        // Por seguridad, si hay un error asumimos un rol con menos privilegios
        setCurrentUserRole(ROLES.OPERARIO);
      }
    };

    getUserRole();
  }, []);

  // Cargar usuarios
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cargar usuarios';
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
      
      // Si recibimos error 401, redirigir al login
      if (err.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({
      usuario: '',
      password: '',
      role: availableRoles.length > 0 ? availableRoles[0].value : ROLES.OPERARIO,
      secciones: 'ambos'
    });
    setEditingUser(null);
  }, [availableRoles]);

  // Manejar envío del formulario
  const handleSubmit = async (formData: CreateUserData) => {
    setLoading(true);
    setError('');
    
    try {
      if (editingUser) {
        // Actualizar usuario existente
        await userService.updateUser(editingUser._id, formData);
        addNotification('Usuario actualizado con éxito', 'success');
      } else {
        // Crear nuevo usuario
        await userService.createUser(formData);
        addNotification('Usuario creado con éxito', 'success');
      }
      
      // Recargar lista y cerrar modal
      fetchUsers();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      const errorMsg = err.message || 'Error al guardar usuario';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manejar eliminación de usuario
  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      await userService.deleteUser(userId);
      addNotification('Usuario eliminado con éxito', 'success');
      
      // Actualizar lista local quitando el usuario eliminado
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
    } catch (err: any) {
      const errorMsg = err.message || 'Error al eliminar usuario';
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manejar activación/desactivación de usuario
  const handleToggleStatus = async (userId: string, activate: boolean) => {
    setLoading(true);
    
    try {
      await userService.toggleUserStatus(userId, activate);
      
      // Actualizar estado local
      setUsers(prevUsers => prevUsers.map(user => 
        user._id === userId
          ? { ...user, isActive: activate }
          : user
      ));
      
      const successMsg = activate 
        ? 'Usuario activado correctamente' 
        : 'Usuario desactivado correctamente';
      
      addNotification(successMsg, 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Error al actualizar estado del usuario';
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manejar edición de usuario
  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    
    // Preparar datos del formulario con la información del usuario
    setFormData({
      usuario: user.usuario,
      password: '', // No enviamos la contraseña actual por seguridad
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      celular: user.celular,
      role: user.role,
      secciones: user.secciones || 'ambos',
      expirationMinutes: user.expiresAt && user.role === ROLES.TEMPORARIO ? 30 : undefined
    });
    
    setShowModal(true);
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

export default useUserManagement;