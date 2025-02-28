/**
 * Componente para mostrar tarjetas de usuario en dispositivos móviles
 * Muestra información compacta de usuarios con acciones
 */
import React from 'react';
import { UserCog, Trash2, CheckCircle, XCircle, UserPlus, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { AdminUser } from '../services/userService';

interface UserCardProps {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string, activate: boolean) => void;
  onAssignClient?: (userId: string, identifier: string) => void;
  getUserIdentifier: (user: AdminUser) => string;
  getFullName: (user: AdminUser) => string | null;
}

/**
 * Tarjeta para mostrar información de usuario en versión móvil
 */
const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  onToggleStatus,
  onAssignClient,
  getUserIdentifier,
  getFullName
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
              : user.role === 'temporal'
                ? user.expiresAt && new Date(user.expiresAt) > new Date()
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {!user.isActive
              ? 'Inactivo'
              : user.role === 'temporal'
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
            <span className="text-gray-500">Rol:</span>
            <span className="ml-1 capitalize">{user.role}</span>
          </div>
          <div>
            <span className="text-gray-500">Secciones:</span>
            <span className="ml-1 capitalize">{user.secciones || 'No especificado'}</span>
          </div>
          {user.role === 'temporal' && user.expiresAt && (
            <div className="col-span-2">
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
              <span className="text-gray-500">Creado por: </span>
              <span className="ml-1">{user.createdBy.email || user.createdBy.usuario || user.createdBy._id.substring(0, 8)}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-2 flex justify-end space-x-2 bg-gray-50">
        {/* Botones de acción */}
        {user.role === 'basic' && user.isActive && onAssignClient && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAssignClient(user._id, getUserIdentifier(user))} 
            className="text-blue-600"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        )}
        
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
      </CardFooter>
    </Card>
  );
};

export default UserCard;