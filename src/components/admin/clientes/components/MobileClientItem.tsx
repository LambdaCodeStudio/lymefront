import React, { memo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, ChevronDown, ChevronUp, Mail, Plus, Settings, Shield, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileSubservicioItem from './MobileSubservicioItem';
import { clientHasUnassignedSubservices, getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, SupervisorData } from '../types/clients';

interface MobileClientItemProps {
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
 * Componente para mostrar un cliente en la vista móvil
 */
const MobileClientItem: React.FC<MobileClientItemProps> = ({
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
  const handleToggleExpand = useCallback(() => {
    onToggleExpand(client._id);
  }, [client._id, onToggleExpand]);

  const handleEdit = useCallback(() => {
    onEdit(client);
  }, [client, onEdit]);

  const handleAddSubservicio = useCallback(() => {
    onAddSubservicio(client);
  }, [client, onAddSubservicio]);

  const handleDelete = useCallback(() => {
    onDeleteClient(client._id);
  }, [client._id, onDeleteClient]);

  return (
    <div className="bg-white rounded-lg border border-[#91BEAD]/20 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <Building 
              className="w-4 h-4 text-[#29696B] mt-1 mr-2"
              aria-hidden="true" 
            />
            <div>
              <h3 className="text-base text-[#29696B] font-medium">{client.nombre}</h3>
              {client.descripcion && (
                <p className="text-xs text-[#7AA79C] mt-1">{client.descripcion}</p>
              )}
              {client.requiereAsignacion && (
                <Badge 
                  variant="outline" 
                  className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
                >
                  Requiere Asignación
                </Badge>
              )}
              {clientHasUnassignedSubservices(client) && (
                <Badge 
                  variant="outline" 
                  className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
                >
                  Sin Supervisor
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="h-8 w-8 p-0"
            aria-label={isExpanded ? "Contraer cliente" : "Expandir cliente"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#7AA79C]" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#7AA79C]" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="border-t border-[#91BEAD]/20 p-3">
          <Tabs defaultValue="info">
            <TabsList className="bg-[#DFEFE6]/30 w-full">
              <TabsTrigger value="info" className="flex-1 text-xs">Info</TabsTrigger>
              <TabsTrigger value="subservicios" className="flex-1 text-xs">
                Subservicios ({client.subServicios.length})
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 text-xs">Acciones</TabsTrigger>
            </TabsList>
            
            {/* Tab de información */}
            <TabsContent value="info" className="mt-2 space-y-3">
              <div className="text-xs space-y-2">
                <div className="flex items-center">
                  <Mail className="w-3 h-3 text-[#7AA79C] mr-2" aria-hidden="true" />
                  <span className="text-[#7AA79C]">
                    Email: <span className="text-[#29696B]">{client.email || 'No especificado'}</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="w-3 h-3 text-[#7AA79C] mr-2" aria-hidden="true" />
                  <span className="text-[#7AA79C]">
                    Supervisores:
                  </span>
                </div>
                {Array.isArray(client.userId) && client.userId.length > 0 ? (
                  <div className="ml-5 flex flex-wrap gap-1">
                    {client.userId.map(userId => {
                      const supervisorId = typeof userId === 'object' && userId !== null ? userId._id : userId;
                      return (
                        <Badge
                          key={supervisorId}
                          variant="outline"
                          className="bg-[#DFEFE6]/80 text-[#29696B] border-[#91BEAD] text-xs"
                        >
                          {getSupervisorIdentifier(supervisorId.toString(), supervisors)}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-5 text-[#29696B] text-xs">
                    No hay supervisores asignados
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de subservicios */}
            <TabsContent value="subservicios" className="mt-2">
              {client.subServicios.length > 0 ? (
                <div className="space-y-3">
                  {client.subServicios.map(subservicio => (
                    <MobileSubservicioItem
                      key={subservicio._id}
                      client={client}
                      subservicio={subservicio}
                      supervisors={supervisors}
                      isExpanded={expandedSubservicioId === subservicio._id}
                      onToggleExpand={() => onToggleSubservicio(subservicio._id)}
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[#7AA79C] text-sm">
                  <p>No hay subservicios disponibles</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubservicio}
                    className="mt-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" aria-hidden="true" />
                    Agregar Primer Subservicio
                  </Button>
                </div>
              )}
            </TabsContent>
            
            {/* Tab de acciones */}
            <TabsContent value="actions" className="mt-2">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                >
                  Editar Cliente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubservicio}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                >
                  Agregar Subservicio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Eliminar Cliente
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default memo(MobileClientItem);