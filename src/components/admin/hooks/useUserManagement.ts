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
import { getAvailableRoles, type RoleType } from '../shared/UserRolesConfig';
import { useDashboard } from '@/hooks/useDashboard';

/**
 * Hook para la gestión completa de usuarios
 */
export function useUserManagement() {
  // Detectar si NotificationProvider está disponible
  let notificationSystem;
  try {
    notificationSystem = useNotification();
  } catch (e) {
    // Crear un sistema de notificación falso si el proveedor no está disponible
    notificationSystem = {
      addNotification: (message: string, type: string) => {
        console.log(`Notification (${type}): ${message}`);
      }
    };
  }
  
  const { addNotification } = notificationSystem;

  // Estado para usuarios y pantalla
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactiveUsers, setShowInactiveUsers] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Estado del usuario actual y roles disponibles
  const [userRole, setUserRole] = useState<RoleType | null>(null);
  const [availableRoles, setAvailableRoles] = useState(getAvailableRoles(null));
  
  // Contexto del dashboard para navegación entre secciones
  const { changeSection } = useDashboard();

  // Estado para el formulario
  const [formData, setFormData] = useState<CreateUserData>({
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

  // Detectar el rol del usuario actual
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') as RoleType | null;
      setUserRole(role);
      setAvailableRoles(getAvailableRoles(role));
    }
  }, []);

  // Cargar usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
      setError('');
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cargar usuarios';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios inicialmente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Crear o actualizar usuario
  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (editingUser) {
        // Actualizar usuario existente
        await updateUser(editingUser._id, formData);
        const message = 'Usuario actualizado correctamente';
        setSuccessMessage(message);
        addNotification(message, 'success');
      } else {
        // Crear nuevo usuario
        const data = await createUser(formData);
        
        // Preguntar si quiere asignar un cliente si es usuario básico
        if (formData.role === 'basic' && typeof window !== 'undefined') {
          if (window.confirm('¿Desea asignar un cliente a este usuario ahora?')) {
            // Guardar temporalmente el ID para usarlo en el componente de clientes
            localStorage.setItem('lastCreatedUserId', data._id || '');
            
            // Cambiar a la sección de clientes
            changeSection('clients', data._id);
          }
        }
        
        const message = 'Usuario creado correctamente';
        setSuccessMessage(message);
        addNotification(message, 'success');
      }

      await fetchUsers();
      setShowModal(false);
      resetForm();
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = err.message || 'Error en la operación';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario
  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await deleteUser(userId);
      await fetchUsers();
      const message = 'Usuario eliminado correctamente';
      setSuccessMessage(message);
      addNotification(message, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al eliminar usuario';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Activar/desactivar usuario
  const handleToggleStatus = async (userId: string, activate: boolean) => {
    try {
      await toggleUserStatus(userId, activate);
      
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
      const message = `Usuario ${activate ? 'activado' : 'desactivado'} correctamente`;
      setSuccessMessage(message);
      addNotification(message, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cambiar estado del usuario';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Preparar edición de usuario
  const handleEdit = (user: AdminUser) => {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', userId);
      localStorage.setItem('selectedUserIdentifier', identifier);
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

  return {
    // Estado
    users,
    loading,
    error,
    showModal,
    editingUser,
    searchTerm,
    showInactiveUsers,
    successMessage,
    formData,
    availableRoles,
    
    // Setters
    setSearchTerm,
    setShowInactiveUsers,
    setShowModal,
    setFormData,
    
    // Acciones
    fetchUsers,
    handleSubmit,
    handleDelete,
    handleToggleStatus,
    handleEdit,
    handleAssignClient,
    resetForm
  };
}