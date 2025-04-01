import React, { memo, useState, useCallback } from 'react';
import { 
  Building, 
  ChevronDown, 
  ChevronUp, 
  FileEdit, 
  Home, 
  Info, 
  Mail, 
  Phone, 
  Plus, 
  Settings, 
  Trash2, 
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SubservicioItem } from './SubservicioItem';
import { getSupervisorIdentifier, clientHasUnassignedSubservices } from '../utils/clientUtils';
import type { Client, SupervisorData } from '../types/clients';

interface ClientCardProps {
  client: Client;
  supervisors: SupervisorData[];
  isExpanded: boolean;
  expandedSubservicioId: string | null;
  onToggleExpand: (clientId: string) => void;
  onToggleSubservicio: (subservicioId: string) => void;
  onEdit: (client: Client) => void;
  onAddSubservicio: (client: Client) => void;
  onEditSubservicio: (client: Client, subservicioId: string) => void;
  onAddSubUbicacion: (client: Client, subservicioId: string) => void;
  onEditSubUbicacion: (client: Client, subservicioId: string, sububicacionId: string) => void;
  onAssignSupervisor: (client: Client, subservicioId: string) => void;
  onRemoveSupervisor: (clientId: string, subservicioId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onDeleteSubservicio: (clientId: string, subservicioId: string) => void;
  onDeleteSubUbicacion: (clientId: string, subservicioId: string, sububicacionId: string) => void;
}

/**
 * Componente de tarjeta para mostrar la información de un cliente
 * Optimizado con React.memo para evitar renderizados innecesarios
 */
const ClientCard: React.FC<ClientCardProps> = ({
  client,
  supervisors,
  isExpanded,
  expandedSubservicioId,
  onToggleExpand,
  onToggleSubservicio,
  onEdit,
  onAddSubservicio,
  onEditSubservicio,
  onAddSubUbicacion,
  onEditSubUbicacion,
  onAssignSupervisor,
  onRemoveSupervisor,
  onDeleteClient,
  onDeleteSubservicio,
  onDeleteSubUbicacion
}) => {
  // Callbacks memoizados para prevenir recreación en cada renderizado
  const handleToggleExpand = useCallback(() => {
    onToggleExpand(client._id);
  }, [client._id, onToggleExpand]);

  const handleEditClient = useCallback(() => {
    onEdit(client);
  }, [client, onEdit]);

  const handleAddSubservicio = useCallback(() => {
    onAddSubservicio(client);
  }, [client, onAddSubservicio]);

  const handleDeleteClient = useCallback(() => {
    onDeleteClient(client._id);
  }, [client._id, onDeleteClient]);

  return (
    <Card className="border border-[#91BEAD]/20 shadow-sm overflow-hidden">
      <CardHeader className="p-4 bg-[#DFEFE6]/30 border-b border-[#91BEAD]/20 flex justify-between items-center">
        <div className="flex items-center">
          <Building className="w-5 h-5 text-[#29696B] mr-2" aria-hidden="true" />
          <CardTitle className="text-lg font-medium text-[#29696B]">{client.nombre}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-8 w-8 p-0 text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
            onClick={handleToggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Contraer detalles" : "Expandir detalles"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>
          {client.subServicios && (
            <span className="text-xs text-[#7AA79C] ml-2">
              {client.subServicios.length} {client.subServicios.length === 1 ? 'subservicio' : 'subservicios'}
            </span>
          )}
          {client.requiereAsignacion && (
            <Badge 
              variant="outline" 
              className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-300"
            >
              Requiere Asignación
            </Badge>
          )}
          {clientHasUnassignedSubservices(client) && (
            <Badge 
              variant="outline" 
              className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-300"
            >
              Subservicios Sin Supervisor
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón para agregar nuevo subservicio */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSubservicio}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Agregar Subservicio
          </Button>

          {/* Acciones para el cliente */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                aria-label="Opciones del cliente" 
                className="text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClient}>
                <FileEdit className="w-4 h-4 mr-2 text-[#29696B]" aria-hidden="true" />
                Editar Cliente
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleDeleteClient}
              >
                <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                Eliminar Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Información del cliente y subservicios */}
      <CardContent className={`p-0 ${isExpanded ? 'block' : 'hidden'}`}>
        {/* Información del cliente */}
        <div className="p-4 border-b border-[#91BEAD]/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-start">
              <Mail className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
              <div>
                <p className="text-sm text-[#7AA79C]">Email</p>
                <p className="text-[#29696B]">{client.email || 'No especificado'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
              <div>
                <p className="text-sm text-[#7AA79C]">Teléfono</p>
                <p className="text-[#29696B]">{client.telefono || 'No especificado'}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start">
              <Home className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
              <div>
                <p className="text-sm text-[#7AA79C]">Dirección</p>
                <p className="text-[#29696B]">{client.direccion || 'No especificada'}</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-start">
                <Users className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
                <div>
                  <p className="text-sm text-[#7AA79C]">Supervisores Asignados</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(client.userId) && client.userId.length > 0 ? (
                      client.userId.map(userId => {
                        const supervisorId = typeof userId === 'object' && userId !== null ? userId._id : userId;
                        const supervisor = supervisors.find(s => s._id === supervisorId);

                        return (
                          <Badge
                            key={supervisorId}
                            variant="outline"
                            className="bg-[#DFEFE6]/80 text-[#29696B] border-[#91BEAD] text-xs"
                          >
                            {supervisor
                              ? getSupervisorIdentifier(supervisorId.toString(), supervisors)
                              : `ID: ${supervisorId.toString().substring(0, 8)}`
                            }
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-[#29696B]">No hay supervisores asignados</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {client.descripcion && (
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
                <div>
                  <p className="text-sm text-[#7AA79C]">Descripción</p>
                  <p className="text-[#29696B]">{client.descripcion}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de subservicios */}
        <div className="divide-y divide-[#91BEAD]/10">
          {client.subServicios && client.subServicios.length > 0 ? (
            client.subServicios.map(subservicio => (
              <SubservicioItem
                key={subservicio._id}
                client={client}
                subservicio={subservicio}
                supervisors={supervisors}
                isExpanded={expandedSubservicioId === subservicio._id}
                onToggleExpand={onToggleSubservicio}
                onEdit={() => onEditSubservicio(client, subservicio._id)}
                onAddSubUbicacion={() => onAddSubUbicacion(client, subservicio._id)}
                onEditSubUbicacion={(sububicacionId) => 
                  onEditSubUbicacion(client, subservicio._id, sububicacionId)
                }
                onAssignSupervisor={() => onAssignSupervisor(client, subservicio._id)}
                onRemoveSupervisor={() => onRemoveSupervisor(client._id, subservicio._id)}
                onDelete={() => onDeleteSubservicio(client._id, subservicio._id)}
                onDeleteSubUbicacion={(sububicacionId) => 
                  onDeleteSubUbicacion(client._id, subservicio._id, sububicacionId)
                }
              />
            ))
          ) : (
            <div className="p-4 text-center text-[#7AA79C]">
              <p>No hay subservicios disponibles</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSubservicio}
                className="mt-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Agregar Primer Subservicio
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Pie de tarjeta - mensaje cuando está colapsado */}
      {!isExpanded && (
        <CardFooter className="p-2 bg-[#DFEFE6]/10 border-t border-[#91BEAD]/10 flex justify-center">
          <Button
            variant="ghost"
            onClick={handleToggleExpand}
            className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
            aria-label="Ver detalles"
          >
            <ChevronDown className="w-4 h-4 mr-2" aria-hidden="true" />
            Ver detalles
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

// Optimización mediante memoización
export default memo(ClientCard);