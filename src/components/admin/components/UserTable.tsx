/**
 * Componente de tabla para mostrar usuarios en pantallas medianas y grandes
 * Incluye todas las acciones disponibles para administración de usuarios
 */
import React from 'react';
import { UserCog, Trash2, CheckCircle, XCircle, UserPlus, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { AdminUser } from '../services/userService';

interface UserTableProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string, activate: boolean) => void;
  onAssignClient?: (userId: string, identifier: string) => void;
  getUserIdentifier: (user: AdminUser) => string;
  getFullName: (user: AdminUser) => string | null;
}

/**
 * Componente de tabla para listar usuarios
 */
const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  onAssignClient,
  getUserIdentifier,
  getFullName
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
                <div className="text-sm font-medium text-gray-900">
                  {getUserIdentifier(user)}
                </div>
                {getFullName(user) && (
                  <div className="text-xs text-gray-500">
                    {getFullName(user)}
                  </div>
                )}
                {user.role === 'temporal' && user.expiresAt && (
                  <div className="text-xs text-gray-500">
                    <Clock className="inline-block w-3 h-3 mr-1" />
                    Expira: {new Date(user.expiresAt).toLocaleString()}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="capitalize text-sm text-gray-700">
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
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
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {user.secciones ? (
                  <span className="capitalize">{user.secciones}</span>
                ) : (
                  <span className="text-gray-400">No especificado</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {user.createdBy ? 
                  (user.createdBy.email || user.createdBy.usuario || `ID: ${user.createdBy._id.substring(0, 8)}`) 
                  : '-'}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end space-x-2">
                  {/* Botón de Asignar Cliente (solo para usuarios básicos activos) */}
                  {user.role === 'basic' && user.isActive && onAssignClient && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssignClient(user._id, getUserIdentifier(user))} 
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {/* Botón de activar/desactivar */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(user._id, !user.isActive)}
                    className={user.isActive 
                      ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                      : 'text-green-600 hover:text-green-800 hover:bg-green-50'}>
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
                    className="text-red-600 hover:text-red-800 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
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