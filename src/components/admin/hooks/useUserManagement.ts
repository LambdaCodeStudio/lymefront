/**
 * Hook personalizado para la gestión de usuarios en el panel administrativo
 * Centraliza la lógica de manejo de usuarios, estados y operaciones CRUD
 */
import { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  type AdminUser,
  type CreateUserData
} from '../services/userService';
import type { RoleOption } from '../shared/UserRolesConfig';

export function useUserManagement() {
  // Estado para usuarios y UI
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  
  // Roles disponibles según el backend
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([
    { value: 'supervisor_de_supervisores', label: 'Supervisor de Supervisores' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'operario', label: 'Operario' },
    { value: 'temporario', label: 'Temporario' }
  ]);

  // Estado para el formulario
  const [formData, setFormData] = useState<CreateUserData>({
    usuario: '',
    password: '',
    role: 'operario',
    nombre: '',
    apellido: '',
    email: '',
    celular: '',
    secciones: 'limpieza',
    isTemporary: false,
    expirationMinutes: 30
  });

  // Detectar rol de usuario actual y ajustar roles disponibles
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userRole = localStorage.getItem('userRole');
      
      // Si es admin, añadir ese rol a las opciones
      if (userRole === 'admin') {
        setAvailableRoles(prev => [
          { value: 'admin', label: 'Administrador' },
          ...prev
        ]);
      }
    }
  }, []);

  // Cargar lista de usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
      setError('');
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cargar usuarios';
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Crear o actualizar usuario
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (editingUser) {
        // Actualizar usuario existente
        await updateUser(editingUser._id, formData);
        
        // Notificar a otros componentes sobre el cambio
        if (typeof window !== 'undefined') {
          localStorage.setItem('userUpdated', 'true');
        }
        
        if (addNotification) {
          addNotification('Usuario actualizado correctamente', 'success');
        }
      } else {
        // Crear nuevo usuario
        const result = await createUser(formData);
        
        // Notificar a otros componentes sobre el cambio
        if (typeof window !== 'undefined') {
          localStorage.setItem('userUpdated', 'true');
          
          // Si se está usando en otro componente (como ClientsSection)
          if (result && result._id) {
            localStorage.setItem('lastCreatedUserId', result._id);
          }
        }
        
        if (addNotification) {
          addNotification('Usuario creado correctamente', 'success');
        }
      }

      await fetchUsers();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      const errorMsg = err.message || 'Error en la operación';
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario
  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      setLoading(true);
      const response = await deleteUser(userId);
      await fetchUsers();
      
      // Notificar a otros componentes
      if (typeof window !== 'undefined') {
        localStorage.setItem('userUpdated', 'true');
      }
      
      const message = response?.clientesEnStandBy > 0 
        ? `Usuario eliminado. ${response.clientesEnStandBy} clientes quedaron pendientes de reasignación.`
        : 'Usuario eliminado correctamente';
      
      if (addNotification) {
        addNotification(message, 'success');
        
        // Notificación adicional si hay clientes para reasignar
        if (response?.clientesEnStandBy > 0) {
          setTimeout(() => {
            addNotification(
              'Hay clientes sin usuario asignado. Vaya a la sección de clientes para reasignarlos.',
              'warning',
              8000
            );
          }, 1000);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error al eliminar usuario';
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Activar/desactivar usuario
  const handleToggleStatus = async (userId: string, activate: boolean) => {
    try {
      setLoading(true);
      await toggleUserStatus(userId, activate);
      
      // Actualizar el estado local inmediatamente
      setUsers(prevUsers => prevUsers.map(user => {
        if (user._id === userId) {
          return { ...user, isActive: activate };
        }
        return user;
      }));
      
      // Notificar a otros componentes
      if (typeof window !== 'undefined') {
        localStorage.setItem('userUpdated', 'true');
      }

      await fetchUsers(); // Recargar para sincronizar
      
      if (addNotification) {
        addNotification(
          `Usuario ${activate ? 'activado' : 'desactivado'} correctamente`, 
          'success'
        );
      }
    } catch (err: any) {
      const errorMsg = err.message || `Error al ${activate ? 'activar' : 'desactivar'} usuario`;
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Preparar edición de usuario
  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    
    // Detectar si es operario temporal
    const isTemporaryOperario = user.role === 'operario' && user.expiresAt;
    
    setFormData({
      usuario: user.usuario,
      password: '', // No incluir contraseña actual en edición
      role: user.role,
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      email: user.email || '',
      celular: user.celular || '',
      secciones: user.secciones || 'limpieza',
      isTemporary: user.role === 'temporario' || isTemporaryOperario,
      // Calcular minutos restantes para usuarios temporales
      expirationMinutes: user.expirationInfo?.minutesRemaining || 30
    });
    
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      usuario: '',
      password: '',
      role: 'operario',
      nombre: '',
      apellido: '',
      email: '',
      celular: '',
      secciones: 'limpieza',
      isTemporary: false,
      expirationMinutes: 30
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
    setSearchTerm,
    setShowInactiveUsers,
    setShowModal,
    setFormData,
    handleSubmit,
    handleDelete,
    handleToggleStatus,
    handleEdit,
    resetForm,
    fetchUsers
  };
}

// Funciones de utilidad para filtrado y visualización
export const filterUsers = (
  users: AdminUser[], 
  searchTerm: string, 
  showInactiveUsers: boolean
): AdminUser[] => {
  return users.filter(user => {
    // Filtrar por estado de activación
    if (!showInactiveUsers && !user.isActive) {
      return false;
    }

    // Buscar en varios campos
    const searchString = searchTerm.toLowerCase();
    return (
      user.usuario.toLowerCase().includes(searchString) ||
      (user.nombre || '').toLowerCase().includes(searchString) ||
      (user.apellido || '').toLowerCase().includes(searchString) ||
      (user.email || '').toLowerCase().includes(searchString) ||
      (user.celular || '').toLowerCase().includes(searchString) ||
      user.role.toLowerCase().includes(searchString)
    );
  });
};

// Obtener identificador principal para mostrar
export const getUserIdentifier = (user: AdminUser): string => {
  if (user.email) return user.email;
  if (user.usuario) return user.usuario;
  return `ID: ${user._id.substring(0, 8)}...`;
};

// Obtener nombre completo si está disponible
export const getFullName = (user: AdminUser): string | null => {
  if (user.nombre || user.apellido) {
    return [user.nombre, user.apellido].filter(Boolean).join(' ');
  }
  return null;
};