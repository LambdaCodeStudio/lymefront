import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import userService from '@/services/userService';
import { clientService } from '@/services/clientService';
import { User, CreateUserDTO, UpdateUserDTO, SubservicioAsignado, Cliente, SubServicio } from '@/types/users';
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

  // Estados para gestión de clientes y subservicios
  const [clientesDelSupervisor, setClientesDelSupervisor] = useState<Cliente[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesError, setClientesError] = useState('');
  const [selectedSubservicios, setSelectedSubservicios] = useState<SubservicioAsignado[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<User[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  
  // Estado para rastrear el supervisor anterior (para detectar cambios)
  const [previousSupervisorId, setPreviousSupervisorId] = useState<string | null>(null);
  
  // Estado para rastrear si ya se cargaron los subservicios del operario
  const [subserviciosLoaded, setSubserviciosLoaded] = useState(false);

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

  // Función para cargar supervisores
  const loadSupervisors = useCallback(async () => {
    setSupervisorsLoading(true);
    try {
      const supervisors = await userService.getSupervisors();
      setAvailableSupervisors(supervisors);
    } catch (err: any) {
      console.error('Error al cargar supervisores:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los supervisores',
        variant: 'destructive'
      });
    } finally {
      setSupervisorsLoading(false);
    }
  }, []);

  // Función para aplicar selecciones de subservicios a los clientes cargados
  const applySubservicioSelections = useCallback(() => {
    if (selectedSubservicios.length === 0 || clientesDelSupervisor.length === 0) return;
    
    console.log('Aplicando selecciones de subservicios a clientes cargados...');
    console.log('Subservicios seleccionados:', selectedSubservicios.length);
    console.log('Clientes cargados:', clientesDelSupervisor.length);
    
    setClientesDelSupervisor(prevClientes => {
      return prevClientes.map(cliente => {
        // Convertir ID a string para comparaciones seguras
        const clienteIdStr = cliente._id.toString();
        
        // Marcar subservicios como seleccionados
        const subServiciosActualizados = cliente.subServicios.map(subserv => {
          // Convertir ID a string para comparaciones seguras
          const subServIdStr = subserv._id.toString();
          
          // Verificar si este subservicio está en la lista de seleccionados
          const isSelected = selectedSubservicios.some(
            item => 
              (item.clienteId.toString() === clienteIdStr) && 
              (item.subServicioId.toString() === subServIdStr)
          );
          
          return { ...subserv, isSelected };
        });
        
        // Verificar si hay subservicios seleccionados en este cliente
        const tieneSeleccionados = subServiciosActualizados.some(s => s.isSelected);
        
        // Expandir automáticamente solo al cargar inicialmente, 
        // pero no forzar el estado de expansión en actualizaciones posteriores
        // para permitir que el usuario pueda contraer/expandir a voluntad
        const shouldExpand = !subserviciosLoaded && tieneSeleccionados;
        
        // Devolver cliente actualizado
        return {
          ...cliente,
          // Si es la carga inicial y tiene seleccionados, expandir
          // Si no, mantener el estado actual de expansión
          isExpanded: shouldExpand ? true : cliente.isExpanded,
          subServicios: subServiciosActualizados
        };
      });
    });
  }, [selectedSubservicios, clientesDelSupervisor, subserviciosLoaded]);

// Efecto para mantener sincronizadas las selecciones
useEffect(() => {
  if (clientesDelSupervisor.length > 0 && selectedSubservicios.length > 0) {
    applySubservicioSelections();
  }
}, [subserviciosLoaded, clientesDelSupervisor.length, selectedSubservicios.length, applySubservicioSelections]);

  // Función para cargar clientes y subservicios de un supervisor
  const loadClientesDelSupervisor = useCallback(async (supervisorId: string) => {
    if (!supervisorId) return;
    
    setClientesLoading(true);
    setClientesError('');
    setClientesDelSupervisor([]);
    
    try {
      const response = await clientService.getClientesBySupervisorId(supervisorId);
      
      // Mapear los clientes y añadir propiedades de UI
      const clientesConEstado = response.map((cliente: Cliente) => ({
        ...cliente,
        isExpanded: false,
        subServicios: cliente.subServicios.map((subServ: SubServicio) => ({
          ...subServ,
          isSelected: false,
          isExpanded: false
        }))
      }));
      
      setClientesDelSupervisor(clientesConEstado);
      
      if (clientesConEstado.length === 0) {
        setClientesError('Este supervisor no tiene clientes asignados');
      }
      
      // Si ya se habían cargado los subservicios, aplicamos las selecciones
      if (subserviciosLoaded) {
        // Damos tiempo para que se actualice el estado
        setTimeout(() => {
          applySubservicioSelections();
        }, 0);
      }
    } catch (err: any) {
      console.error('Error al cargar clientes del supervisor:', err);
      setClientesError('No se pudieron cargar los clientes del supervisor');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes del supervisor',
        variant: 'destructive'
      });
    } finally {
      setClientesLoading(false);
    }
  }, [applySubservicioSelections, subserviciosLoaded]);

  // Cargar subservicios de un operario existente
  const loadOperarioSubservicios = useCallback(async (operarioId: string) => {
    if (!operarioId) return;
    
    setLoading(true);
    setSubserviciosLoaded(false);
    
    try {
      // Intentar obtener los subservicios del operario
      const response = await clientService.getSubserviciosByOperarioId(operarioId);
      console.log('Respuesta de API - subservicios del operario:', response);
      
      // Si no hay respuesta o es un array vacío, inicializamos vacío
      if (!response || !Array.isArray(response) || response.length === 0) {
        setSelectedSubservicios([]);
        setSubserviciosLoaded(true);
        return;
      }
      
      // Extraer los IDs de subservicios asignados
      const subserviciosAsignados: SubservicioAsignado[] = [];
      
      response.forEach((cliente: any) => {
        // Verificar la estructura de los datos
        const clienteId = cliente.clienteId || cliente._id;
        
        // Asegurarnos de que subServicios sea un array
        const subServicios = Array.isArray(cliente.subServicios) ? cliente.subServicios : [];
        
        subServicios.forEach((subserv: any) => {
          if (subserv && subserv._id) {
            subserviciosAsignados.push({
              clienteId,
              subServicioId: subserv._id
            });
          }
        });
      });
      
      console.log('Subservicios cargados:', subserviciosAsignados.length);
      
      // Actualizar selecciones
      setSelectedSubservicios(subserviciosAsignados);
      
      // Actualizar clientes para reflejar selecciones
      // Esto es importante para la carga inicial
      if (clientesDelSupervisor.length > 0 && subserviciosAsignados.length > 0) {
        setClientesDelSupervisor(prevClientes => {
          return prevClientes.map(cliente => {
            // Convertir ID a string para comparaciones seguras
            const clienteIdStr = cliente._id.toString();
            
            // Actualizar subservicios
            const updatedSubservicios = cliente.subServicios.map(subserv => {
              const subServIdStr = subserv._id.toString();
              
              // Verificar si este subservicio está seleccionado
              const isSelected = subserviciosAsignados.some(
                item => 
                  (item.clienteId.toString() === clienteIdStr) && 
                  (item.subServicioId.toString() === subServIdStr)
              );
              
              return { ...subserv, isSelected };
            });
            
            // Verificar si este cliente tiene selecciones
            const hasSelections = updatedSubservicios.some(s => s.isSelected);
            
            // Expandir automáticamente en la carga inicial si tiene subservicios seleccionados
            return {
              ...cliente,
              // Solo expandir automáticamente en la carga inicial
              isExpanded: hasSelections ? true : cliente.isExpanded,
              subServicios: updatedSubservicios
            };
          });
        });
      }
      
      // Marcar como cargado
      setSubserviciosLoaded(true);
    } catch (err) {
      console.error('No se pudieron cargar los subservicios del operario:', err);
      // Inicializamos con array vacío
      setSelectedSubservicios([]);
      setSubserviciosLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [clientesDelSupervisor]);

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
  
  // Función para expandir/colapsar cliente
  const toggleClienteExpanded = useCallback((clienteId: string) => {
    setClientesDelSupervisor(prev => 
      prev.map(cliente => 
        cliente._id === clienteId
          ? { ...cliente, isExpanded: !cliente.isExpanded }
          : cliente
      )
    );
  }, []);

  // Función para seleccionar/deseleccionar subservicio
  const toggleSubservicioSelected = useCallback((clienteId: string, subservicioId: string) => {
    // Convertir a strings para comparación segura
    const clienteIdStr = clienteId.toString();
    const subservicioIdStr = subservicioId.toString();
    
    // Actualizar la lista de clientes para mostrar la selección
    setClientesDelSupervisor(prev => 
      prev.map(cliente => {
        // Si no es este cliente, dejarlo igual
        if (cliente._id.toString() !== clienteIdStr) return cliente;
        
        return {
          ...cliente,
          subServicios: cliente.subServicios.map(subserv => {
            // Si no es este subservicio, dejarlo igual
            if (subserv._id.toString() !== subservicioIdStr) return subserv;
            // Cambiar estado de selección
            return { ...subserv, isSelected: !subserv.isSelected };
          })
        };
      })
    );
    
    // Actualizar la lista de subservicios seleccionados
    setSelectedSubservicios(prev => {
      const existeItem = prev.some(
        item => item.clienteId.toString() === clienteIdStr && 
               item.subServicioId.toString() === subservicioIdStr
      );
      
      if (existeItem) {
        // Si ya existe, quitarlo
        return prev.filter(
          item => !(item.clienteId.toString() === clienteIdStr && 
                  item.subServicioId.toString() === subservicioIdStr)
        );
      } else {
        // Si no existe, agregarlo
        return [...prev, { clienteId, subServicioId: subservicioId }];
      }
    });
  }, []);
  
  // Función handleSubmit para procesar creación/actualización de usuarios
  const handleSubmit = async (userData: CreateUserDTO | UpdateUserDTO) => {
    try {
      setLoading(true);
      setError('');
      
      // Log para debugging
      console.log('Procesando usuario con datos:', userData);
      
      // Si estamos editando un usuario existente
      if (editingUser) {
        console.log('Actualizando usuario existente:', editingUser._id);
        
        // SOLUCIÓN: Manejo explícito de la eliminación del estado temporal
        if (editingUser.role === ROLES.OPERARIO && 
            editingUser.expiresAt && 
            userData.isTemporary === false) {
          // Asegurar que se elimine explícitamente la fecha de expiración
          // cuando se desactiva el estado temporal
          userData = {
            ...userData,
            expiresAt: null,               // Eliminar la fecha de expiración
            expirationMinutes: undefined   // Eliminar los minutos de expiración
          };
          console.log('Eliminando estado temporal del usuario');
        }
        
        // Actualizar el usuario
        const updatedUser = await userService.updateUser(editingUser._id, userData);
        
        // Si es operario, actualizar asignación de subservicios
        if (userData.role === ROLES.OPERARIO && userData.supervisorId) {
          console.log('Actualizando subservicios para operario:', selectedSubservicios.length);
          
          // Si cambió el supervisor o no, necesitamos obtener los subservicios actuales
          // para eliminar los que ya no están seleccionados
          console.log('Obteniendo subservicios actuales del operario para actualizar');
          
          // 1. Cargar los subservicios actuales del operario
          const currentSubservicios = await clientService.getSubserviciosByOperarioId(editingUser._id);
          
          // 2. Crear un mapa de los subservicios seleccionados actualmente para búsqueda rápida
          const seleccionadosMap = new Map();
          selectedSubservicios.forEach(item => {
            const key = `${item.clienteId.toString()}_${item.subServicioId.toString()}`;
            seleccionadosMap.set(key, true);
          });
          
          // 3. Eliminar las asignaciones de subservicios que ya no están seleccionados
          if (currentSubservicios && Array.isArray(currentSubservicios)) {
            for (const cliente of currentSubservicios) {
              const clienteId = cliente.clienteId || cliente._id;
              for (const subserv of cliente.subServicios || []) {
                const key = `${clienteId.toString()}_${subserv._id.toString()}`;
                // Si este subservicio ya no está en los seleccionados, eliminarlo
                if (!seleccionadosMap.has(key)) {
                  try {
                    await clientService.removeOperarioFromSubservicio(
                      clienteId, 
                      subserv._id, 
                      editingUser._id
                    );
                    console.log(`Eliminada asignación deseleccionada: ${clienteId}/${subserv._id}`);
                  } catch (err) {
                    console.error('Error al eliminar asignación:', err);
                  }
                }
              }
            }
          }
          
          // 4. Asignar los subservicios seleccionados actuales
          let asignacionesExitosas = 0;
          let errores = 0;
          
          for (const item of selectedSubservicios) {
            try {
              await clientService.assignOperarioToSubservicio(
                item.clienteId, 
                item.subServicioId, 
                editingUser._id
              );
              asignacionesExitosas++;
              console.log(`Asignado subservicio: ${item.clienteId}/${item.subServicioId}`);
            } catch (err) {
              console.error('Error al asignar subservicio:', err);
              errores++;
              // Continuamos con el siguiente para no interrumpir todo el proceso
            }
          }
          
          console.log(`Subservicios actualizados - Éxitos: ${asignacionesExitosas}, Errores: ${errores}`);
        }
        
        // Actualizar la lista de usuarios
        await fetchUsers();
        setShowModal(false);
        resetForm();
        showNotification('success', 'Usuario actualizado correctamente');
      } else {
        // Crear un nuevo usuario
        console.log('Creando nuevo usuario');
        const result = await userService.createUser(userData);
        
        // Si es operario y hay subservicios seleccionados, asignarlos
        if (userData.role === ROLES.OPERARIO && result && result.user && result.user.id && selectedSubservicios.length > 0) {
          const userId = result.user.id;
          console.log('Asignando subservicios al nuevo operario:', userId);
          
          let asignacionesExitosas = 0;
          let errores = 0;
          
          // Asignar todos los subservicios seleccionados
          for (const item of selectedSubservicios) {
            try {
              await clientService.assignOperarioToSubservicio(
                item.clienteId, 
                item.subServicioId, 
                userId
              );
              asignacionesExitosas++;
              console.log(`Asignado subservicio: ${item.clienteId}/${item.subServicioId}`);
            } catch (err) {
              console.error('Error al asignar subservicio:', err);
              errores++;
              // Continuamos con el siguiente para no interrumpir todo el proceso
            }
          }
          
          console.log(`Subservicios asignados - Éxitos: ${asignacionesExitosas}, Errores: ${errores}`);
        }
        
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

  // Manejar cambio de rol en el formulario
  const handleRoleChange = useCallback((role: string) => {
    setFormData(prev => ({
      ...prev,
      role: role as UserRole,
      // Resetear supervisorId si cambia el rol
      ...(role !== ROLES.OPERARIO ? { supervisorId: undefined } : {})
    }));
    
    // Si cambia a operario, cargar supervisores
    if (role === ROLES.OPERARIO) {
      loadSupervisors();
    } else {
      // Limpiar datos de subservicios si no es operario
      setClientesDelSupervisor([]);
      setSelectedSubservicios([]);
      setPreviousSupervisorId(null);
      setSubserviciosLoaded(false);
    }
  }, [loadSupervisors]);

  // Manejar cambio de supervisor en el formulario
  const handleSupervisorChange = useCallback((supervisorId: string) => {
    // Guardar el supervisor anterior para detectar cambios
    setPreviousSupervisorId(formData.supervisorId || null);
    
    setFormData(prev => ({
      ...prev,
      supervisorId
    }));
    
    // Cargar clientes y subservicios del supervisor
    loadClientesDelSupervisor(supervisorId);
    
    // Resetear subservicios seleccionados solo si es un cambio de supervisor
    // y no la selección inicial
    if (formData.supervisorId && formData.supervisorId !== supervisorId) {
      setSelectedSubservicios([]);
      setSubserviciosLoaded(false);
    }
  }, [loadClientesDelSupervisor, formData.supervisorId]);

  // Manejar edición de usuario
  const handleEdit = useCallback((user: User) => {
    // Preparar datos para edición
    const preparedFormData: UpdateUserDTO = {
      usuario: user.usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role,
      secciones: user.secciones,
      celular: user.celular,
      isActive: user.isActive,
      // SOLUCIÓN: Añadir explícitamente el estado temporal para edición
      isTemporary: !!user.expiresAt
    };
    
    // Limpiar selecciones previas
    setSelectedSubservicios([]);
    setClientesDelSupervisor([]);
    setSubserviciosLoaded(false);
    
    // Guardar referencia al supervisorId actual
    if (user.role === ROLES.OPERARIO && user.supervisorId) {
      preparedFormData.supervisorId = user.supervisorId;
      setPreviousSupervisorId(user.supervisorId);
      
      // Secuencia de carga coordinada:
      // 1. Cargar supervisores disponibles
      loadSupervisors().then(() => {
        // 2. Si el usuario tiene supervisor, cargar sus clientes
        if (user.supervisorId) {
          // 3. Cargar clientes del supervisor
          loadClientesDelSupervisor(user.supervisorId);
          // 4. Cargar subservicios asignados al operario
          // (debe ejecutarse después para que se apliquen las selecciones)
          loadOperarioSubservicios(user._id);
        }
      });
    } else {
      setPreviousSupervisorId(null);
    }

    setEditingUser(user);
    setFormData(preparedFormData);
    setShowModal(true);
  }, [loadSupervisors, loadClientesDelSupervisor, loadOperarioSubservicios]);

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
    setClientesDelSupervisor([]);
    setSelectedSubservicios([]);
    setPreviousSupervisorId(null);
    setSubserviciosLoaded(false);
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
    
    // Estados para clientes y subservicios
    clientesDelSupervisor,
    clientesLoading,
    clientesError,
    selectedSubservicios,
    availableSupervisors,
    supervisorsLoading,
    previousSupervisorId,
    
    // Funciones básicas
    setSearchTerm,
    setShowInactiveUsers,
    setShowModal,
    setFormData,
    
    // Funciones principales
    handleSubmit,
    handleDelete,
    handleToggleStatus,
    handleEdit,
    resetForm,
    
    // Funciones para clientes y subservicios
    toggleClienteExpanded,
    toggleSubservicioSelected,
    handleRoleChange,
    handleSupervisorChange,
    loadClientesDelSupervisor,
    loadSupervisors,
    loadOperarioSubservicios
  };
};