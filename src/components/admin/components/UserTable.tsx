import React from 'react';
import { UserCog, Trash2, CheckCircle, XCircle, Clock, ShieldAlert, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from '@/types/users';
import { rolesDisplayNames } from '@/types/UserRolesConfig';

// Constante con roles para usar en el componente
const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario'
};

// Función para verificar si el usuario tiene fecha de expiración
const hasExpiration = (user: User) => {
  return user.role === ROLES.OPERARIO && user.expiresAt;
};

// Función para verificar si un usuario puede modificar a otro según jerarquía
const canModifyUser = (currentUserRole: string, targetUserRole: string) => {
  // Administrador puede modificar a cualquiera
  if (currentUserRole === ROLES.ADMIN) return true;
  
  // Supervisor de supervisores puede modificar a supervisores y roles inferiores
  if (currentUserRole === ROLES.SUPERVISOR_DE_SUPERVISORES) {
    return ![ROLES.ADMIN, ROLES.SUPERVISOR_DE_SUPERVISORES].includes(targetUserRole);
  }
  
  // Otros roles no pueden modificar usuarios
  return false;
};

// Función para verificar si un usuario puede ser desactivado o eliminado
const canDeleteOrDeactivate = (userRole: string) => userRole !== ROLES.ADMIN;

// Función para obtener el nombre del creador de un usuario
const getCreatorName = (user: User): string => {
  if (!user.createdBy) return '-';
  
  // Priorizar el nombre completo
  if (user.createdBy.nombre && user.createdBy.apellido) {
    return `${user.createdBy.nombre} ${user.createdBy.apellido}`;
  }
  
  // Si no hay nombre completo, usar el nombre de usuario
  if (user.createdBy.usuario) {
    return user.createdBy.usuario;
  }
  
  // Como último recurso, usar el ID truncado si existe
  if (user.createdBy._id) {
    return `ID: ${user.createdBy._id.toString().substring(0, 8)}`;
  }
  
  // Si no hay ID, devolver un valor por defecto
  return 'Usuario desconocido';
};

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string, activate: boolean) => void;
  getUserIdentifier: (user: User) => string;
  getFullName: (user: User) => string | null;
  currentUserRole: string;
}

/**
 * Componente de tabla para listar usuarios
 */
const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  getUserIdentifier,
  getFullName,
  currentUserRole
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secciones</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado por</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {getUserIdentifier(user)}
                </div>
                {getFullName(user) && (
                  <div className="text-xs text-gray-500 truncate max-w-[150px]">
                    {getFullName(user)}
                  </div>
                )}
                {hasExpiration(user) && user.expiresAt && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <Clock className="inline-block w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">
                      Expira: {new Date(user.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${user.role === ROLES.ADMIN ? 'border-purple-500 text-purple-700 bg-purple-50' : ''}
                            ${user.role === ROLES.SUPERVISOR_DE_SUPERVISORES ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}
                            ${user.role === ROLES.SUPERVISOR ? 'border-cyan-500 text-cyan-700 bg-cyan-50' : ''}
                            ${user.role === ROLES.OPERARIO ? 'border-green-500 text-green-700 bg-green-50' : ''}
                          `}
                        >
                          {user.role === ROLES.ADMIN && <ShieldAlert className="w-3 h-3 mr-1 flex-shrink-0" />}
                          {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES && <Shield className="w-3 h-3 mr-1 flex-shrink-0" />}
                          {/* Usar un nombre más corto para Supervisor de Supervisores en tablet */}
                          {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES ? (
                            <>
                              <span className="hidden md:inline xl:hidden">Sup. de Sups.</span>
                              <span className="inline md:hidden xl:inline">{rolesDisplayNames[user.role]}</span>
                            </>
                          ) : (
                            <span>{rolesDisplayNames[user.role] || user.role}</span>
                          )}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES && (
                      <TooltipContent>
                        <p>Supervisor de Supervisores</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                    ${!user.isActive
                      ? 'bg-red-100 text-red-800'
                      : hasExpiration(user)
                        ? user.expiresAt && new Date(user.expiresAt) > new Date()
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {!user.isActive
                      ? 'Inactivo'
                      : hasExpiration(user)
                        ? user.expiresAt && new Date(user.expiresAt) > new Date()
                          ? 'Temporal Activo'
                          : 'Expirado'
                        : 'Activo'
                    }
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {user.secciones ? (
                  <span className="capitalize">{user.secciones}</span>
                ) : (
                  <span className="text-gray-400">No especificado</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[150px]">
                {getCreatorName(user)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end space-x-2">
                  {/* Acciones basadas en permisos */}
                  {canModifyUser(currentUserRole, user.role) ? (
                    <>
                      {/* Botón de activar/desactivar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleStatus(user._id, !user.isActive)}
                        disabled={!canDeleteOrDeactivate(user.role)}
                        className={`${user.isActive 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'}
                          ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {user.isActive ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                      
                      {/* Botón de editar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(user)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                        <UserCog className="w-4 h-4" />
                      </Button>
                      
                      {/* Botón de eliminar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(user._id)}
                        disabled={!canDeleteOrDeactivate(user.role)}
                        className={`text-red-600 hover:text-red-800 hover:bg-red-50
                          ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-gray-500 italic px-2">
                            Sin permisos
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>No tienes permisos para modificar este usuario</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;