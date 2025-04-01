import React, { memo } from 'react';
import { UserCog, Trash2, CheckCircle, XCircle, Clock, ShieldAlert, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from '@/types/users';
import { rolesDisplayNames } from '@/types/UserRolesConfig';
import {
  ROLES,
  hasExpiration,
  canModifyUser,
  canDeleteOrDeactivate,
  getCreatorName,
  getUserStatusClass,
  getUserStatusText,
  getRoleBadgeClass
} from '../../../utils/userComponentUtils';

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
                    <Clock className="inline-block w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />
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
                          className={`${getRoleBadgeClass(user.role)}`}
                        >
                          {user.role === ROLES.ADMIN && <ShieldAlert className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />}
                          {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES && <Shield className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />}
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
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUserStatusClass(user)}`}>
                    {getUserStatusText(user)}
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
                        aria-label={user.isActive ? "Desactivar usuario" : "Activar usuario"}
                        className={`${user.isActive 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'}
                          ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {user.isActive ? (
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        )}
                      </Button>
                      
                      {/* Botón de editar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(user)}
                        aria-label="Editar usuario"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                        <UserCog className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      
                      {/* Botón de eliminar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(user._id)}
                        disabled={!canDeleteOrDeactivate(user.role)}
                        aria-label="Eliminar usuario"
                        className={`text-red-600 hover:text-red-800 hover:bg-red-50
                          ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
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

// Usar memo para evitar re-renders innecesarios
export default memo(UserTable);