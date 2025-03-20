import React from 'react';
import { UserCog, Trash2, CheckCircle, XCircle, Clock, ShieldAlert, Shield } from 'lucide-react';
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

// Constante con roles para usar en el componente
const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario'
};

// Nombres cortos para roles en pantallas muy pequeñas
const shortRoleNames = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPERVISOR_DE_SUPERVISORES]: 'Sup. de Sups.',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.OPERARIO]: 'Operario'
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
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1"> {/* Añadido min-w-0 para permitir truncado del texto */}
            <CardTitle className="text-base truncate">{getUserIdentifier(user)}</CardTitle>
            {getFullName(user) && (
              <CardDescription className="truncate">{getFullName(user)}</CardDescription>
            )}
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap
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
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Rol:</span>{' '}
            <div className="inline-block">
              <Badge 
                variant="outline" 
                className={`ml-1 py-0 h-5 text-xs
                  ${user.role === ROLES.ADMIN ? 'border-purple-500 text-purple-700 bg-purple-50' : ''}
                  ${user.role === ROLES.SUPERVISOR_DE_SUPERVISORES ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}
                  ${user.role === ROLES.SUPERVISOR ? 'border-cyan-500 text-cyan-700 bg-cyan-50' : ''}
                  ${user.role === ROLES.OPERARIO ? 'border-green-500 text-green-700 bg-green-50' : ''}
                `}
              >
                {/* Mostrar sólo el icono en pantallas muy pequeñas */}
                {user.role === ROLES.ADMIN && <ShieldAlert className="w-3 h-3 mr-1 flex-shrink-0" />}
                {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES && <Shield className="w-3 h-3 mr-1 flex-shrink-0" />}
                
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
              <Clock className="w-3.5 h-3.5 mr-1 text-yellow-600 flex-shrink-0" />
              <span className="text-gray-500">Expira:</span>
              <span className="ml-1 truncate">{new Date(user.expiresAt).toLocaleString()}</span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(user._id, !user.isActive)}
              disabled={!canDeleteOrDeactivate(user.role)}
              className={`p-0 w-8 h-8 ${user.isActive ? 'text-red-600' : 'text-green-600'}
                ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {user.isActive ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(user)}
              className="p-0 w-8 h-8 text-blue-600"
            >
              <UserCog className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user._id)}
              disabled={!canDeleteOrDeactivate(user.role)}
              className={`p-0 w-8 h-8 text-red-600
                ${!canDeleteOrDeactivate(user.role) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
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
      </CardFooter>
    </Card>
  );
};

export default UserCard;