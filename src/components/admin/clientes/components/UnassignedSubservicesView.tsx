import React, { memo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Building, MapPin, Shield } from 'lucide-react';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, UnassignedSubServicio, SupervisorData } from '../types/clients';

interface UnassignedSubservicesViewProps {
  unassignedSubservices: UnassignedSubServicio[];
  clients: Client[];
  supervisors: SupervisorData[];
  totalUnassignedSubservices: number;
  onAssignSupervisor: (client: Client, subservicioId: string) => void;
  onSwitchToNormalView: () => void;
}

/**
 * Vista de subservicios sin supervisor asignado
 */
const UnassignedSubservicesView: React.FC<UnassignedSubservicesViewProps> = ({
  unassignedSubservices,
  clients,
  supervisors,
  totalUnassignedSubservices,
  onAssignSupervisor,
  onSwitchToNormalView
}) => {
  if (unassignedSubservices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
          <Shield className="w-6 h-6 text-[#29696B]" aria-hidden="true" />
        </div>
        <p>No hay subservicios sin supervisor asignado</p>
        <Button
          variant="outline"
          onClick={onSwitchToNormalView}
          className="mt-4 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
        >
          <Building className="w-4 h-4 mr-2" aria-hidden="true" />
          Volver a la vista normal
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información sobre subservicios sin asignar */}
      <Alert className="bg-amber-50 border border-amber-200 text-amber-800" role="alert">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <AlertDescription className="ml-2">
          Se encontraron {totalUnassignedSubservices} subservicios sin supervisor asignado.
          Puede asignarles un supervisor utilizando el botón "Asignar Supervisor".
        </AlertDescription>
      </Alert>

      {/* Lista de clientes con subservicios sin supervisor */}
      <div className="space-y-6">
        {unassignedSubservices.map(clienteData => {
          // Buscar el cliente completo para tener acceso a toda su información
          const fullClient = clients.find(c => c._id === clienteData.clienteId);
          
          return (
            <Card 
              key={clienteData.clienteId}
              className="border border-[#91BEAD]/20 shadow-sm overflow-hidden"
            >
              <CardHeader className="p-4 bg-[#DFEFE6]/30 border-b border-[#91BEAD]/20">
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-[#29696B] mr-2" aria-hidden="true" />
                  <CardTitle className="text-lg font-medium text-[#29696B]">
                    {clienteData.nombreCliente}
                  </CardTitle>
                  <Badge className="ml-3 bg-amber-100 text-amber-700 border-amber-300">
                    {clienteData.subServicios.length} subservicios sin supervisor
                  </Badge>
                </div>
                <div className="text-sm text-[#7AA79C] mt-1">
                  Supervisores asignados: {
                    Array.isArray(clienteData.userId) ? (
                      clienteData.userId.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {clienteData.userId.map(userId => {
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
                          })}
                        </div>
                      ) : 'Ninguno'
                    ) : (
                      typeof clienteData.userId === 'object' && clienteData.userId
                        ? clienteData.userId.email || clienteData.userId.usuario || `${clienteData.userId.nombre || ''} ${clienteData.userId.apellido || ''}`.trim()
                        : typeof clienteData.userId === 'string'
                          ? getSupervisorIdentifier(clienteData.userId, supervisors)
                          : 'No asignado'
                    )
                  }
                </div>
              </CardHeader>
              
              <CardContent className="p-4 divide-y divide-[#91BEAD]/10">
                {clienteData.subServicios.map(subservicio => (
                  <div key={subservicio._id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
                        <div>
                          <h4 className="font-medium text-[#29696B]">{subservicio.nombre}</h4>
                          {subservicio.descripcion && (
                            <p className="text-sm text-[#7AA79C]">{subservicio.descripcion}</p>
                          )}
                          <Badge 
                            variant="outline" 
                            className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
                          >
                            Sin Supervisor
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (fullClient) {
                            onAssignSupervisor(fullClient, subservicio._id);
                          } else {
                            // Crear un objeto cliente mínimo si no lo encontramos
                            const minimalClient: Client = {
                              _id: clienteData.clienteId,
                              nombre: clienteData.nombreCliente,
                              descripcion: '',
                              servicio: clienteData.nombreCliente,
                              seccionDelServicio: '',
                              userId: typeof clienteData.userId === 'object' && Array.isArray(clienteData.userId)
                                ? clienteData.userId
                                : (clienteData.userId ? [clienteData.userId] : []),
                              subServicios: [],
                              direccion: '',
                              telefono: '',
                              email: '',
                              activo: true
                            };
                            onAssignSupervisor(minimalClient, subservicio._id);
                          }
                        }}
                        className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                      >
                        <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                        Asignar Supervisor
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botón para volver a la vista normal */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={onSwitchToNormalView}
          className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
        >
          <Building className="w-4 h-4 mr-2" aria-hidden="true" />
          Volver a la vista normal
        </Button>
      </div>
    </div>
  );
};

export default memo(UnassignedSubservicesView);