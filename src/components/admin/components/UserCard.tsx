/**
 * Componente para mostrar tarjetas de usuario en dispositivos móviles
 * Muestra información compacta de usuarios con acciones
 * Actualizado para la nueva estructura de roles
 */
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
import type { AdminUser } from '../services/userService';

// Constante con roles para usar en el componente
const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario',
  TEMPORARIO: 'temporario'
};

// Función auxiliar para renderizar el rol con un formato legible
const getRoleDisplay = (role: string) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'Administrador';
    case ROLES.SUPERVISOR_DE_SUPERVISORES:
      return 'Sup. de Supervisores';
    case ROLES.SUPERVISOR:
      return 'Supervisor';
    case ROLES.OPERARIO:
      return 'Operario';
    case ROLES.TEMPORARIO:
      return 'Temporario';
    default:
      return role;
  }
};

// Función para verificar si el usuario tiene fecha de expiración
const hasExpiration = (user: AdminUser) => {
  return user.role === ROLES.TEMPORARIO || 
    (user.role === ROLES.OPERARIO && user.expiresAt);
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

interface UserCardProps {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string, activate: boolean) => void;
  getUserIdentifier: (user: AdminUser) => string;
  getFullName: (user: AdminUser) => string | null;
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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{getUserIdentifier(user)}</CardTitle>
            {getFullName(user) && (
              <CardDescription>{getFullName(user)}</CardDescription>
            )}
          </div>
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
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Rol:</span>{' '}
            <Badge 
              variant="outline" 
              className={`ml-1 py-0 h-5 
                ${user.role === ROLES.ADMIN ? 'border-purple-500 text-purple-700 bg-purple-50' : ''}
                ${user.role === ROLES.SUPERVISOR_DE_SUPERVISORES ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}
                ${user.role === ROLES.SUPERVISOR ? 'border-cyan-500 text-cyan-700 bg-cyan-50' : ''}
                ${user.role === ROLES.OPERARIO ? 'border-green-500 text-green-700 bg-green-50' : ''}
                ${user.role === ROLES.TEMPORARIO ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : ''}
              `}
            >
              {user.role === ROLES.ADMIN && <ShieldAlert className="w-3 h-3 mr-1" />}
              {user.role === ROLES.SUPERVISOR_DE_SUPERVISORES && <Shield className="w-3 h-3 mr-1" />}
              {getRoleDisplay(user.role)}
            </Badge>
          </div>
          <div>
            <span className="text-gray-500">Secciones:</span>
            <span className="ml-1 capitalize">{user.secciones || 'No especificado'}</span>
          </div>
          {hasExpiration(user) && user.expiresAt && (
            <div className="col-span-2 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-yellow-600" />
              <span className="text-gray-500">Expira:</span>
              <span className="ml-1">{new Date(user.expiresAt).toLocaleString()}</span>
            </div>
          )}
          {user.celular && (
            <div className="col-span-2">
              <span className="text-gray-500">Teléfono:</span>
              <span className="ml-1">{user.celular}</span>
            </div>
          )}
          {user.createdBy && (
            <div className="col-span-2">
              <span className="text-gray-500">Creado por:</span>
              <span className="ml-1">{user.createdBy.email || user.createdBy.usuario || user.createdBy._id.substring(0, 8)}</span>
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
              className={user.isActive ? 'text-red-600' : 'text-green-600'}
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
              className="text-blue-600"
            >
              <UserCog className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user._id)}
              className="text-red-600"
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