import React, { memo } from 'react';
import MobileClientItem from './MobileClientItem';
import type { Client, SupervisorData } from '../types/clients';

interface MobileClientListProps {
  clients: Client[];
  supervisors: SupervisorData[];
  expandedClientId: string | null;
  expandedSubservicioId: string | null;
  onToggleClientExpansion: (clientId: string) => void;
  onToggleSubservicioExpansion: (subservicioId: string) => void;
  onEditClient: (client: Client) => void;
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
 * Lista de clientes optimizada para dispositivos móviles
 */
const MobileClientList: React.FC<MobileClientListProps> = ({
  clients,
  supervisors,
  expandedClientId,
  expandedSubservicioId,
  onToggleClientExpansion,
  onToggleSubservicioExpansion,
  onEditClient,
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
  return (
    <div className="space-y-4">
      {clients.map(client => (
        <MobileClientItem
          key={client._id}
          client={client}
          supervisors={supervisors}
          isExpanded={expandedClientId === client._id}
          expandedSubservicioId={expandedSubservicioId}
          onToggleExpand={onToggleClientExpansion}
          onToggleSubservicio={onToggleSubservicioExpansion}
          onEdit={onEditClient}
          onAddSubservicio={onAddSubservicio}
          onEditSubservicio={onEditSubservicio}
          onAddSubUbicacion={onAddSubUbicacion}
          onEditSubUbicacion={onEditSubUbicacion}
          onAssignSupervisor={onAssignSupervisor}
          onRemoveSupervisor={onRemoveSupervisor}
          onDeleteClient={onDeleteClient}
          onDeleteSubservicio={onDeleteSubservicio}
          onDeleteSubUbicacion={onDeleteSubUbicacion}
        />
      ))}
    </div>
  );
};

export default memo(MobileClientList);