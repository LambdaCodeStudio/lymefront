import React, { memo } from 'react';
import { UserCog, Trash2, CheckCircle, XCircle, Clock, ShieldAlert, Shield, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from '@/types/users';
import { rolesDisplayNames } from '@/types/UserRolesConfig';
import {
  ROLES,
  shortRoleNames,
  hasExpiration,
  canModifyUser,
  canDeleteOrDeactivate,
  getCreatorName,
  getUserStatusClass,
  getUserStatusText,
  getRoleBadgeClass
} from '../../../../utils/userComponentUtils';

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string, activate: boolean) => void;
  getUserIdentifier: (user: User) => string;
  getFullName: (user: User) => string | null;
  currentUserRole: string;
}

/**
 * Tarjeta para mostrar información de usuario en versión móvil
 */
const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  onToggleStatus,
  getUserIdentifier,
  getFullName,
  currentUserRole
}) => {
  // Función para determinar si un usuario ha expirado
  const isUserExpired = (user: User): boolean => {
    return user.role === ROLES.OPERARIO && 
           user.expiresAt && 
           new Date(user.expiresAt) < new Date() &&
           !user.isActive;
  };

  // Función para obtener el texto de estado específico para este componente
  const getStatusText = (user: User): string => {
    if (isUserExpired(user)) {
      return 'Expirado';
    }
    return user.isActive ? 'Activo' : 'Inactivo';
  };

  // Función para obtener la clase de estilo según el estado
  const getStatusClass = (user: User): string => {
    if (isUserExpired(user)) {
      return 'bg-amber-100 text-amber-800';
    }
    return user.isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  // Determinar si el usuario está expirado
  const isExpired = isUserExpired(user);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1"> {/* min-w-0 permite el truncado del texto */}
            <CardTitle className="text-base truncate">{getUserIdentifier(user)}</CardTitle>
            {getFullName(user) && (
              <CardDescription className="truncate">{getFullName(user)}</CardDescription>
            )}
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusClass(user)}`}>
            {getStatusText(user)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Rol:</span>{' '}
            <div className="inline-block">
              <Badge 
                variant="outline" 
                className={`ml-1 py-0 h-5 text-xs ${getRoleBadgeClass(user.role)}`}
              >
                {/* Mostrar sólo el icono en pantallas muy pequeñas */}
                {user.role === ROLES.ADMIN && <ShieldAlert className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />}
                {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES && <Shield className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />}
                
                {/* Nombre corto del rol para móviles */}
                <span className="hidden xs:inline">
                  {rolesDisplayNames[user.role] || user.role}
                </span>
                <span className="inline xs:hidden">
                  {shortRoleNames[user.role] || user.role}
                </span>
              </Badge>
            </div>
          </div>
          <div className="truncate">
            <span className="text-gray-500">Secciones:</span>
            <span className="ml-1 capitalize truncate">{user.secciones || 'No especificado'}</span>
          </div>
          {hasExpiration(user) && user.expiresAt && (
            <div className="col-span-2 flex items-center">
              <Clock className={`w-3.5 h-3.5 mr-1 flex-shrink-0 ${isExpired ? 'text-amber-600' : 'text-yellow-600'}`} aria-hidden="true" />
              <span className="text-gray-500">Expira:</span>
              <span className={`ml-1 truncate ${isExpired ? 'text-amber-600 font-medium' : ''}`}>
                {new Date(user.expiresAt).toLocaleString()}
                {isExpired && ' (Expirado)'}
              </span>
            </div>
          )}
          {user.celular && (
            <div className="col-span-2 truncate">
              <span className="text-gray-500">Teléfono:</span>
              <span className="ml-1 truncate">{user.celular}</span>
            </div>
          )}
          {user.createdBy && (
            <div className="col-span-2 truncate">
              <span className="text-gray-500">Creado por:</span>
              <span className="ml-1 truncate">{getCreatorName(user)}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-2 flex justify-end space-x-2 bg-gray-50">
        {/* Mostrar acciones sólo si tiene permisos */}
        {canModifyUser(currentUserRole, user.role) ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(user._id, !user.isActive)}
                    disabled={!canDeleteOrDeactivate(user.role)}
                    aria-label={user.isActive ? "Desactivar usuario" : isExpired ? "Reactivar usuario expirado" : "Activar usuario"}
                    className={`p-0 w-8 h-8 ${user.isActive 
                      ? 'text-red-600' 
                      : isExpired ? 'text-amber-600' : 'text-green-600'}
                      ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {user.isActive ? (
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                    ) : isExpired ? (
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {user.isActive 
                    ? "Desactivar usuario" 
                    : isExpired 
                      ? "Reactivar usuario y extender expiración" 
                      : "Activar usuario"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(user)}
              aria-label="Editar usuario"
              className="p-0 w-8 h-8 text-blue-600"
            >
              <UserCog className="w-4 h-4" aria-hidden="true" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user._id)}
              disabled={!canDeleteOrDeactivate(user.role)}
              aria-label="Eliminar usuario"
              className={`p-0 w-8 h-8 text-red-600
                ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
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
      </CardFooter>
    </Card>
  );
};

// Usar memo para evitar re-renders innecesarios
export default memo(UserCard);