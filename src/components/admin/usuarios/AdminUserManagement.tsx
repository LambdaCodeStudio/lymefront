/**
 * Componente para gestión de usuarios en el panel de administración
 * Permite crear, editar, activar/desactivar y eliminar usuarios del sistema
 * Actualizado para manejar subservicios asignados a operarios
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus,
  AlertCircle,
  Search
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationsContainer } from '@/components/ui/Notifications';
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

// Importar componentes modularizados
import UserTable from './components/UserTable';
import UserCard from './components/UserCard';
import UserForm from './components/UserForm';
import UserFilters from './components/UserFilters';
import EnhancedPagination from '../components/Pagination';

// Importar hooks y utilidades
import { useUserManagement } from '../../../hooks/useUserManagement';
import { getUserIdentifier, getFullName } from '@/utils/userUtils';
import { User } from '@/types/users';
import { ROLES } from '@/utils/userComponentUtils';

// Estilos comunes para reutilización
const STYLES = {
  container: "p-4 md:p-6 space-y-6",
  toolbar: "flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20",
  resultCount: "bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center",
  loading: "flex justify-center items-center py-8 bg-white rounded-xl shadow-sm border border-[#91BEAD]/20 p-6",
  emptyState: "bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20",
  table: "hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20",
  mobileList: "md:hidden space-y-4",
  paginationContainer: "bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20",
  paginationInfo: "bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm"
};

// Función de filtrado actualizada para incluir el filtro por rol con tipado adecuado
export const filterUsers = (
  users: User[],
  searchTerm: string,
  showInactiveUsers: boolean,
  selectedRole: string | null
): User[] => {
  return users.filter((user) => {
    // Determinar si el usuario está expirado
    const isExpired = user.role === ROLES.OPERARIO && 
                     user.expiresAt && 
                     new Date(user.expiresAt) < new Date() &&
                     !user.isActive;
    
    // Filtrar por término de búsqueda
    const matchesSearch =
      searchTerm === '' ||
      user.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.apellido && user.apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.celular && user.celular.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtrar por estado activo/inactivo (incluir expirados cuando showInactiveUsers es true)
    const matchesActiveState = showInactiveUsers || user.isActive;

    // Filtrar por rol
    const matchesRole = !selectedRole || user.role === selectedRole;

    return matchesSearch && matchesActiveState && matchesRole;
  });
};

// Función para ordenar usuarios por jerarquía
export const sortUsersByHierarchy = (users: User[]): User[] => {
  // Definir el orden jerárquico de los roles
  const roleOrder: Record<string, number> = {
    [ROLES.ADMIN]: 1,                       // Administrador
    [ROLES.SUPERVISOR_DE_SUPERVISORES]: 2,  // Supervisor de Supervisores
    [ROLES.SUPERVISOR]: 3,                  // Supervisor
    [ROLES.OPERARIO]: 4                     // Operario
  };

  // Crear una copia del array para no mutar el original
  return [...users].sort((a, b) => {
    // Obtener el orden de cada rol, defaulteando a 999 si no existe
    const orderA = roleOrder[a.role] || 999;
    const orderB = roleOrder[b.role] || 999;
    
    // Ordenar por jerarquía (menor número = mayor jerarquía)
    return orderA - orderB;
  });
};

/**
 * Componente interno que usa el hook useUserManagement
 */
const UserManagementContent: React.FC = () => {
  // Referencia al contenedor de usuarios móviles
  const mobileListRef = useRef<HTMLDivElement>(null);
  
  // Usar el hook de gestión de usuarios que centraliza toda la lógica
  const {
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
    currentUserRole,
    
    // Nuevos estados para clientes y subservicios
    clientesDelSupervisor,
    clientesLoading,
    clientesError,
    selectedSubservicios,
    availableSupervisors,
    supervisorsLoading,
    
    // Nuevas funciones para clientes y subservicios
    toggleClienteExpanded,
    toggleSubservicioSelected,
    handleRoleChange,
    handleSupervisorChange
  } = useUserManagement();

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estado para el filtro de roles
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  // Estados para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // Constantes para la paginación
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;
  
  // Estado para controlar el ancho de la ventana con inicialización segura para SSR
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Calculamos dinámicamente itemsPerPage basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Efecto para detectar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      
      // Si cambiamos entre móvil y escritorio, volvemos a la primera página
      if ((newWidth < 768 && windowWidth >= 768) || (newWidth >= 768 && windowWidth < 768)) {
        setCurrentPage(1);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [windowWidth]);

  // Resetear la página actual cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactiveUsers, selectedRole]);

  // Filtrar usuarios con useMemo para evitar recálculos innecesarios
  const filteredUsers = useMemo(() => {
    // Primero filtramos los usuarios según criterios
    const filtered = filterUsers(users, searchTerm, showInactiveUsers, selectedRole);
    // Luego ordenamos por jerarquía
    return sortUsersByHierarchy(filtered);
  }, [users, searchTerm, showInactiveUsers, selectedRole]);

  // Calcular los índices para el slice con useMemo
  const { indexOfFirstItem, indexOfLastItem, currentUsers, totalPages } = useMemo(() => {
    const lastItem = currentPage * itemsPerPage;
    const firstItem = lastItem - itemsPerPage;
    const current = filteredUsers.slice(firstItem, lastItem);
    const total = Math.ceil(filteredUsers.length / itemsPerPage);
    
    return {
      indexOfFirstItem: firstItem,
      indexOfLastItem: lastItem,
      currentUsers: current,
      totalPages: total
    };
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Asegurarnos de que la página actual no exceda el número total de páginas
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Función para cambiar de página utilizando useCallback para evitar recreaciones innecesarias
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    
    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [windowWidth]);

  // Mostrar información detallada sobre la paginación
  const showingFromTo = useMemo(() => {
    if (filteredUsers.length === 0) return '0 de 0';
    return `${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredUsers.length)} de ${filteredUsers.length}`;
  }, [filteredUsers.length, indexOfFirstItem, indexOfLastItem]);

  // Función para mostrar el diálogo de confirmación de eliminación
  const confirmDelete = useCallback((userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  }, []);

  // Ejecutar la eliminación cuando se confirma
  const executeDelete = useCallback(() => {
    if (userToDelete) {
      handleDelete(userToDelete);
      setUserToDelete(null);
    }
    setDeleteDialogOpen(false);
  }, [userToDelete, handleDelete]);

  // Función para abrir el modal de nuevo usuario
  const openNewUserModal = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm, setShowModal]);

  // Función para cerrar el modal
  const closeUserModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, [resetForm, setShowModal]);

  // Función modificada para manejar el envío del formulario sin validación de subservicios
  const handleFormSubmission = useCallback(async (data) => {
    // Si estamos en modo modificación usamos el método del hook directamente
    await handleSubmit(data);
  }, [handleSubmit]);

  return (
    <div className={STYLES.container}>
      {/* Contenedor de notificaciones */}
      <NotificationsContainer />
      
      {/* Alertas solo para errores críticos */}
      {error && (
        <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Herramientas */}
      <div className={STYLES.toolbar}>
        <UserFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showInactiveUsers={showInactiveUsers}
          setShowInactiveUsers={setShowInactiveUsers}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          availableRoles={availableRoles}
        />
        
        <Button 
          onClick={openNewUserModal}
          className="bg-[#29696B] hover:bg-[#29696B]/90 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
          aria-label="Crear nuevo usuario"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Nuevo Usuario</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Contador de resultados con información detallada */}
      {!loading && filteredUsers.length > 0 && (
        <div className={STYLES.resultCount}>
          <span>
            Total: {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
          </span>
          <span className="text-[#29696B] font-medium">
            Mostrando: {showingFromTo}
          </span>
        </div>
      )}

      {/* Vista de Carga */}
      {loading && users.length === 0 && (
        <div className={STYLES.loading}>
          <div className="w-8 h-8 border-4 border-[#8DB3BA] border-t-[#29696B] rounded-full animate-spin" aria-hidden="true"></div>
          <span className="ml-3 text-[#29696B]">Cargando usuarios...</span>
        </div>
      )}

      {/* Mensaje cuando no hay usuarios */}
      {!loading && filteredUsers.length === 0 && (
        <div className={STYLES.emptyState}>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Search className="w-6 h-6 text-[#29696B]" aria-hidden="true" />
          </div>
          <p className="text-[#7AA79C] font-medium">No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className={STYLES.table}>
        {!loading && currentUsers.length > 0 && (
          <>
            <UserTable 
              users={currentUsers}
              onEdit={handleEdit}
              onDelete={confirmDelete}
              onToggleStatus={handleToggleStatus}
              getUserIdentifier={getUserIdentifier}
              getFullName={getFullName}
              currentUserRole={currentUserRole}
            />
            
            {/* Paginación debajo de la tabla */}
            <div className="py-4 border-t border-[#91BEAD]/20">
              <EnhancedPagination 
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                className="px-6"
              />
            </div>
          </>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles con ID para scroll */}
      <div ref={mobileListRef} id="mobile-users-list" className={STYLES.mobileList}>
        {/* Paginación visible en la parte superior para móvil */}
        {!loading && filteredUsers.length > 0 && (
          <div className={STYLES.paginationContainer}>
            <EnhancedPagination 
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
        {/* Lista de tarjetas de usuario */}
        <div className="space-y-3">
          {!loading && currentUsers.map(user => (
            <UserCard 
              key={user._id}
              user={user}
              onEdit={handleEdit}
              onDelete={confirmDelete}
              onToggleStatus={handleToggleStatus}
              getUserIdentifier={getUserIdentifier}
              getFullName={getFullName}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
        
        {/* Mensaje que muestra la página actual y el total */}
        {!loading && filteredUsers.length > itemsPerPage && (
          <div className={STYLES.paginationInfo}>
            <span className="text-[#29696B] font-medium">
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}
        
        {/* Paginación duplicada al final de la lista para mayor visibilidad */}
        {!loading && filteredUsers.length > itemsPerPage && (
          <div className={STYLES.paginationContainer + " mt-2"}>
            <EnhancedPagination 
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal de Usuario con nuevas props para manejar subservicios */}
      <UserForm 
        isOpen={showModal}
        onClose={closeUserModal}
        onSubmit={handleFormSubmission}
        availableRoles={availableRoles}
        formData={formData}
        setFormData={setFormData}
        editingUser={editingUser}
        loading={loading}
        error={error}
        currentUserRole={currentUserRole}
        
        // Nuevas props para clientes y subservicios
        clientesDelSupervisor={clientesDelSupervisor}
        clientesLoading={clientesLoading}
        clientesError={clientesError}
        selectedSubservicios={selectedSubservicios}
        availableSupervisors={availableSupervisors}
        supervisorsLoading={supervisorsLoading}
        
        // Funciones para manejar clientes y subservicios
        toggleClienteExpanded={toggleClienteExpanded}
        toggleSubservicioSelected={toggleSubservicioSelected}
        handleRoleChange={handleRoleChange}
        handleSupervisorChange={handleSupervisorChange}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar usuario"
        description="¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={executeDelete}
        variant="destructive"
      />
    </div>
  );
};

/**
 * Componente principal que envuelve el contenido con NotificationProvider
 */
const AdminUserManagement: React.FC = () => {
  return (
    <NotificationProvider>
      <UserManagementContent />
    </NotificationProvider>
  );
};

export default AdminUserManagement;