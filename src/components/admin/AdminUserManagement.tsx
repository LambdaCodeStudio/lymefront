/**
 * Componente para gestión de usuarios en el panel de administración
 * Permite crear, editar, activar/desactivar y eliminar usuarios del sistema
 */
import React from 'react';
import {
  Plus,
  AlertCircle,
  CheckCircle
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
    handleAssignClient,
    resetForm
  } = useUserManagement();

  // Filtrar usuarios según criterios de búsqueda
  const filteredUsers = filterUsers(users, searchTerm, showInactiveUsers);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Contenedor de notificaciones */}
      <NotificationsContainer />
      
      {/* Alertas solo para errores críticos */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Herramientas */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <UserFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showInactiveUsers={showInactiveUsers}
          setShowInactiveUsers={setShowInactiveUsers}
        />
        
        <Button onClick={() => {
          resetForm();
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Nuevo Usuario</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Vista de Carga */}
      {loading && users.length === 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Cargando usuarios...</span>
        </div>
      )}

      {/* Mensaje cuando no hay usuarios */}
      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        {!loading && filteredUsers.length > 0 && (
          <UserTable 
            users={filteredUsers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onAssignClient={handleAssignClient}
            getUserIdentifier={getUserIdentifier}
            getFullName={getFullName}
          />
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {!loading && filteredUsers.map(user => (
          <UserCard 
            key={user._id}
            user={user}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onAssignClient={handleAssignClient}
            getUserIdentifier={getUserIdentifier}
            getFullName={getFullName}
          />
        ))}
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