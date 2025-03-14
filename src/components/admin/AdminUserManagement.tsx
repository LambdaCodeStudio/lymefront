/**
 * Componente para gestión de usuarios en el panel de administración
 * Permite crear, editar, activar/desactivar y eliminar usuarios del sistema
 * Actualizado para usar la nueva estructura de roles del sistema
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  AlertCircle,
  Search
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationsContainer } from '@/components/ui/Notifications';

// Importar componentes modularizados
import UserTable from './components/UserTable';
import UserCard from './components/UserCard';
import UserForm from './components/UserForm';
import UserFilters from './components/UserFilters';
import EnhancedPagination from './components/Pagination'; 

// Importar hooks y utilidades
import { useUserManagement } from './hooks/useUserManagement';
import { getUserIdentifier, getFullName } from './utils/userUtils';

// Función de filtrado actualizada para incluir el filtro por rol
export const filterUsers = (
  users,
  searchTerm,
  showInactiveUsers,
  selectedRole
) => {
  return users.filter((user) => {
    // Filtrar por término de búsqueda
    const matchesSearch =
      searchTerm === '' ||
      user.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.apellido && user.apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.celular && user.celular.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtrar por estado activo/inactivo
    const matchesActiveState = showInactiveUsers || user.isActive;

    // Filtrar por rol
    const matchesRole = !selectedRole || user.role === selectedRole;

    return matchesSearch && matchesActiveState && matchesRole;
  });
};

/**
 * Componente interno que usa el hook useUserManagement
 */
const UserManagementContent: React.FC = () => {
  // Referencia al contenedor de usuarios móviles
  const mobileListRef = useRef(null);
  
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
    currentUserRole
  } = useUserManagement();

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  
  // Nuevo estado para el filtro de roles
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  // IMPORTANTE: Tamaño fijo para móviles - siempre 5 elementos por página
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;
  
  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
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
    return filterUsers(users, searchTerm, showInactiveUsers, selectedRole);
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

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    
    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Mostrar información detallada sobre la paginación
  const showingFromTo = filteredUsers.length > 0 
    ? `${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, filteredUsers.length)} de ${filteredUsers.length}`
    : '0 de 0';

  return (
    <div className="p-4 md:p-6 space-y-6">
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
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
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#29696B] hover:bg-[#29696B]/90 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Nuevo Usuario</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Contador de resultados con información detallada */}
      {!loading && filteredUsers.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
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
        <div className="flex justify-center items-center py-8 bg-white rounded-xl shadow-sm border border-[#91BEAD]/20 p-6">
          <div className="w-8 h-8 border-4 border-[#8DB3BA] border-t-[#29696B] rounded-full animate-spin"></div>
          <span className="ml-3 text-[#29696B]">Cargando usuarios...</span>
        </div>
      )}

      {/* Mensaje cuando no hay usuarios */}
      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Search className="w-6 h-6 text-[#29696B]" />
          </div>
          <p className="text-[#7AA79C] font-medium">No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
        {!loading && currentUsers.length > 0 && (
          <>
            <UserTable 
              users={currentUsers}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
      <div ref={mobileListRef} id="mobile-users-list" className="md:hidden space-y-4">
        {/* Paginación visible en la parte superior para móvil */}
        {!loading && filteredUsers.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
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
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              getUserIdentifier={getUserIdentifier}
              getFullName={getFullName}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
        
        {/* Mensaje que muestra la página actual y el total */}
        {!loading && filteredUsers.length > itemsPerPage && (
          <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
            <span className="text-[#29696B] font-medium">
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}
        
        {/* Paginación duplicada al final de la lista para mayor visibilidad */}
        {!loading && filteredUsers.length > itemsPerPage && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
            <EnhancedPagination 
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal de Usuario */}
      <UserForm 
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        availableRoles={availableRoles}
        formData={formData}
        setFormData={setFormData}
        editingUser={editingUser}
        loading={loading}
        error={error}
        currentUserRole={currentUserRole}
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