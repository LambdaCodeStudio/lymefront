/**
 * AdminUserManagement Component - Enhanced with pagination and showing all users
 * Permite crear, editar, activar/desactivar y eliminar usuarios del sistema
 */
import React from 'react';
import {
  Plus,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationsContainer } from '@/components/ui/Notifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Importar componentes modularizados
import UserTable from './components/UserTable';
import UserCard from './components/UserCard';
import UserForm from './components/UserForm';
import Pagination from './components/Pagination';

// Importar hook personalizado de gestión de usuarios
import { useUserManagement } from './hooks/useUserManagement';

// Componente de paginación simple para móvil
const MobilePaginationControls: React.FC = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-center gap-2 my-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="h-8 w-8 p-0 border-[#91BEAD]"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm text-[#7AA79C]">
        Página {currentPage} de {totalPages || 1}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="h-8 w-8 p-0 border-[#91BEAD]"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

/**
 * Componente interno que usa el hook useUserManagement
 */
const UserManagementContent: React.FC = () => {
  // Usar el hook de gestión de usuarios que centraliza toda la lógica
  const {
    // Datos y estados
    paginatedUsers,
    totalItems,
    loading,
    error,
    showModal,
    editingUser,
    searchTerm,
    showInactiveUsers,
    roleFilter,
    formData,
    availableRoles,
    
    // Estados de paginación
    currentPage,
    itemsPerPage,
    totalPages,
    
    // Setters
    setSearchTerm,
    setShowInactiveUsers,
    setRoleFilter,
    setShowModal,
    setFormData,
    
    // Métodos
    handlePageChange,
    handleItemsPerPageChange,
    handleSubmit,
    handleDelete,
    handleToggleStatus,
    handleEdit,
    resetForm,
    refreshUsers
  } = useUserManagement();

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

      {/* Barra de Herramientas y Filtros */}
      <div className="space-y-4">
        {/* Titulo y botón nuevo usuario */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
          <div>
            <h2 className="text-xl font-semibold text-[#29696B] flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Gestión de Usuarios
            </h2>
            <p className="text-[#7AA79C] text-sm">Administra todos los usuarios del sistema</p>
          </div>
          
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
        
        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          
          {/* Filtro por rol */}
          <div>
            <Select 
              value={roleFilter} 
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20 w-full">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-[#7AA79C]" />
                  <SelectValue placeholder="Filtrar por rol" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="supervisor">Supervisores</SelectItem>
                <SelectItem value="basic">Usuarios básicos</SelectItem>
                <SelectItem value="temporal">Usuarios temporales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro por estado */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Tabs 
              value={showInactiveUsers ? "all" : "active"} 
              onValueChange={(value) => setShowInactiveUsers(value === "all")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-[#DFEFE6]/30">
                <TabsTrigger 
                  value="active" 
                  className="data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                >
                  Activos
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                >
                  Todos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Selector de elementos por página */}
          <div className="lg:flex items-center justify-end hidden">
            <div className="flex items-center space-x-2">
              <Label className="text-[#7AA79C] whitespace-nowrap text-sm">Por página:</Label>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
              >
                <SelectTrigger className="w-16 h-8 border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Vista de Carga */}
      {loading && paginatedUsers.length === 0 && (
        <div className="flex justify-center items-center py-8 bg-white rounded-xl shadow-sm border border-[#91BEAD]/20 p-6">
          <div className="w-8 h-8 border-4 border-[#8DB3BA] border-t-[#29696B] rounded-full animate-spin"></div>
          <span className="ml-3 text-[#29696B]">Cargando usuarios...</span>
        </div>
      )}

      {/* Mensaje cuando no hay usuarios */}
      {!loading && totalItems === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Search className="w-6 h-6 text-[#29696B]" />
          </div>
          <p className="text-[#7AA79C] font-medium">No se encontraron usuarios que coincidan con la búsqueda</p>
          
          <Button 
            onClick={resetForm} 
            className="mt-4 text-[#29696B] bg-[#DFEFE6] hover:bg-[#DFEFE6]/70"
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
        {!loading && paginatedUsers.length > 0 && (
          <>
            <UserTable 
              users={paginatedUsers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
            
            {/* Información y controles de paginación */}
            <div className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20 p-4 flex justify-between items-center">
              <div className="text-sm text-[#7AA79C]">
                Mostrando {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} usuarios
              </div>
              
              {/* Paginación desktop */}
              <Pagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div className="md:hidden space-y-4">
        {!loading && paginatedUsers.length > 0 && (
          <>
            {paginatedUsers.map(user => (
              <UserCard 
                key={user._id}
                user={user}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
            
            {/* Paginación para móvil */}
            <div className="mt-4">
              <MobilePaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
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
      
      {/* Botón flotante de actualización */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={refreshUsers}
          className="rounded-full bg-[#29696B] hover:bg-[#29696B]/90 shadow-lg h-12 w-12 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <svg 
              className="h-5 w-5 text-white" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          )}
        </Button>
      </div>
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