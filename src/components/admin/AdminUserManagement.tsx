/**
 * Componente para gestión de usuarios en el panel de administración
 * Permite crear, editar, activar/desactivar y eliminar usuarios del sistema
 */
import React, { useState, useEffect, useRef } from 'react';
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
import { filterUsers, getUserIdentifier, getFullName } from './utils/userUtils';

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
    resetForm
  } = useUserManagement();

  // Filtrar usuarios según criterios de búsqueda
  const filteredUsers = filterUsers(users, searchTerm, showInactiveUsers);

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Estado para controlar el ancho de la ventana
  const [isMobile, setIsMobile] = useState(false);

  // Detectar cambios en el tamaño de la ventana
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setItemsPerPage(mobile ? 5 : 10);
    };
    
    // Comprobar al cargar
    checkIfMobile();
    
    // Comprobar al redimensionar
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Resetear la página actual cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactiveUsers, itemsPerPage]);

  // Obtener usuarios para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Hacer scroll al inicio de la lista en móvil
    if (isMobile && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

      {/* Contador de resultados - Visible en todos los dispositivos */}
      {!loading && filteredUsers.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B]">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
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
      <div ref={mobileListRef} id="mobile-users-list" className="md:hidden space-y-6">
        {/* Paginación visible en la parte superior para móvil */}
        {!loading && filteredUsers.length > 0 && (
          <EnhancedPagination 
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        )}
        
        {/* Lista de tarjetas de usuario con altura fija y scroll */}
        <div className="space-y-4 mobile-user-cards-container">
          {!loading && currentUsers.map(user => (
            <UserCard 
              key={user._id}
              user={user}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              getUserIdentifier={getUserIdentifier}
              getFullName={getFullName}
            />
          ))}
          
          {/* Generar tarjetas vacías para asegurar que siempre se muestren 5 espacios */}
          {!loading && currentUsers.length < itemsPerPage && isMobile && Array(itemsPerPage - currentUsers.length).fill(0).map((_, index) => (
            <div 
              key={`placeholder-${index}`} 
              className="h-4 opacity-0"
              aria-hidden="true"
            />
          ))}
        </div>
        
        {/* Paginación duplicada al final de la lista para mayor visibilidad */}
        {!loading && filteredUsers.length > itemsPerPage && (
          <EnhancedPagination 
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
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
      />
      
      {/* Estilos específicos para móvil para asegurar que se vean todas las tarjetas */}
      <style jsx>{`
        @media (max-width: 767px) {
          .mobile-user-cards-container {
            padding-bottom: 0.5rem;
          }
        }
      `}</style>
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