/**
 * Componente para gestión de usuarios en el panel de administración
 * Permite crear, editar, activar/desactivar y eliminar usuarios del sistema
 */
import React, { useState, useEffect } from 'react';
import {
  Plus,
  AlertCircle,
  CheckCircle,
  Search,
  Filter
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
import Pagination from './components/Pagination'; 

// Importar hooks y utilidades
import { useUserManagement } from './hooks/useUserManagement';
import { filterUsers, getUserIdentifier, getFullName } from './utils/userUtils';

/**
 * Componente interno que usa el hook useUserManagement
 */
const UserManagementContent: React.FC = () => {
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
  const itemsPerPage = 10; // Número de usuarios por página

  // Resetear la página actual cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactiveUsers]);

  // Obtener usuarios para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Opcional: hacer scroll al inicio de la tabla
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <Pagination 
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            </div>
          </>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div className="md:hidden grid grid-cols-1 gap-4">
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
        
        {/* Paginación para vista móvil */}
        {!loading && filteredUsers.length > itemsPerPage && (
          <Pagination 
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            className="mt-4"
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