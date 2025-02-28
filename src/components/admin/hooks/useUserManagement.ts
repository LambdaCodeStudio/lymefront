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
import eventService from '@/services/EventService';

/**
 * Hook para la gestión completa de usuarios
 */
export function useUserManagement() {
  // Usar directamente useNotification sin sistema de fallback, como en InventorySection
  const { addNotification } = useNotification();
  
  // Registrar disponibilidad del contexto para depuración
  useEffect(() => {
    console.log('NotificationContext disponible:', addNotification ? true : false);
  }, [addNotification]);

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
      console.log('Rol recuperado del localStorage:', role);
      
      // Verificar que sea un rol válido
      if (role && ['admin', 'supervisor', 'basic', 'temporal'].includes(role)) {
        setUserRole(role);
        setAvailableRoles(getAvailableRoles(role));
        console.log(`Roles disponibles para ${role}:`, getAvailableRoles(role));
      } else {
        console.error('Rol inválido o no encontrado en localStorage:', role);
        // Si es admin, asegurar que tenga acceso completo incluso si hay un error
        if (role === 'admin') {
          setUserRole('admin');
          setAvailableRoles([
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'basic', label: 'Básico' },
            { value: 'temporal', label: 'Temporal' }
          ]);
        }
      }
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
      
      // Enviar notificación si está disponible
      if (addNotification) {
        addNotification(errorMsg, 'error');
        console.log('Notificación de error enviada:', errorMsg);
      } else {
        console.error('addNotification no disponible:', errorMsg);
      }
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
        
        // Disparar evento para que otros componentes actualicen sus datos
        if (typeof window !== 'undefined') {
          localStorage.setItem('userUpdated', 'true');
          
          // Utilizar el Event Service si está disponible
          eventService.emit('userUpdated', { 
            userId: editingUser._id, 
            action: 'update',
            role: formData.role 
          });
        }
        
        if (addNotification) {
          addNotification(message, 'success');
        }
      } else {
        // Crear nuevo usuario
        const data = await createUser(formData);
        
        // Disparar evento para que otros componentes actualicen sus datos
        if (typeof window !== 'undefined') {
          localStorage.setItem('userUpdated', 'true');
          
          // Utilizar el Event Service si está disponible
          eventService.emit('userCreated', { 
            userId: data._id, 
            role: formData.role 
          });
        }
        
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
        
        if (addNotification) {
          addNotification(message, 'success');
        }
      }

      await fetchUsers();
      setShowModal(false);
      resetForm();
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
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
      const response = await deleteUser(userId);
      await fetchUsers();
      
      // Disparar evento para que otros componentes actualicen sus datos
      if (typeof window !== 'undefined') {
        localStorage.setItem('userUpdated', 'true');
        
        // Utilizar el Event Service si está disponible
        eventService.emit('userDeleted', { 
          userId: userId,
          clientesEnStandBy: response?.clientesEnStandBy || 0
        });
      }
      
      const message = response?.clientesEnStandBy > 0 
        ? `Usuario eliminado correctamente. ${response.clientesEnStandBy} clientes quedaron pendientes de reasignación.`
        : 'Usuario eliminado correctamente';
      
      setSuccessMessage(message);
      
      if (addNotification) {
        addNotification(message, 'success');
        
        // Si hay clientes pendientes de reasignación, mostrar una notificación adicional
        if (response?.clientesEnStandBy > 0) {
          setTimeout(() => {
            addNotification(
              'Hay clientes sin usuario asignado. Por favor, vaya a la sección de clientes para reasignarlos.',
              'warning', 
              8000
            );
          }, 1000);
        }
      }
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al eliminar usuario';
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
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
      
      // Disparar evento para que otros componentes actualicen sus datos
      if (typeof window !== 'undefined') {
        localStorage.setItem('userUpdated', 'true');
        
        // Utilizar el Event Service si está disponible
        eventService.emit('userStatusChanged', { 
          userId: userId,
          isActive: activate
        });
      }

      await fetchUsers(); // Recargar todos los usuarios para asegurar sincronización
      const message = `Usuario ${activate ? 'activado' : 'desactivado'} correctamente`;
      setSuccessMessage(message);
      
      if (addNotification) {
        addNotification(message, 'success');
        
        // Si se desactivó el usuario, mostrar notificación sobre clientes
        if (!activate) {
          setTimeout(() => {
            addNotification(
              'Los clientes asignados a este usuario necesitarán ser reasignados.',
              'info', 
              6000
            );
          }, 1000);
        }
      }
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cambiar estado del usuario';
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
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
    
    // Notificación informativa opcional para edición
    if (addNotification) {
      addNotification(`Editando usuario: ${user.email || user.usuario || user._id.substring(0, 8)}`, 'info');
    }
  };

  // Ir a la gestión de clientes para este usuario
  const handleAssignClient = (userId: string, identifier: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', userId);
      localStorage.setItem('selectedUserIdentifier', identifier);
    }
    
    // Cambiar a la sección de clientes usando el contexto
    changeSection('clients', userId);
    
    // Notificación informativa opcional para asignación de clientes
    if (addNotification) {
      addNotification(`Asignando clientes a usuario: ${identifier}`, 'info');
    }
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