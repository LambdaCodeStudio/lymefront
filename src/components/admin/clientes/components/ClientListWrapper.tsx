import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ClientCard from './ClientCard';
import MobileClientList from './MobileClientList';
import Pagination from '../../components/Pagination';
import { Building, Users } from 'lucide-react';
import type { Client, SupervisorData } from '../types/clients';

interface ClientListWrapperProps {
  filteredClients: Client[];
  paginatedClients: Client[];
  supervisors: SupervisorData[];
  expandedClientId: string | null;
  expandedSubservicioId: string | null;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  searchTerm: string;
  activeUserId: string;
  activeSupervisorId: string;
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
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  mobileListRef: React.RefObject<HTMLDivElement>;
}

/**
 * Componente envoltorio para la lista de clientes
 * Maneja tanto la versión de escritorio como la móvil
 */
const ClientListWrapper: React.FC<ClientListWrapperProps> = ({
  filteredClients,
  paginatedClients,
  supervisors,
  expandedClientId,
  expandedSubservicioId,
  currentPage,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  searchTerm,
  activeUserId,
  activeSupervisorId,
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
  onDeleteSubUbicacion,
  onPageChange,
  onItemsPerPageChange,
  mobileListRef
}) => {
  // Si no hay clientes, mostrar mensaje
  if (filteredClients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
          <Users className="w-6 h-6 text-[#29696B]" aria-hidden="true" />
        </div>
        <p>
          No se encontraron clientes
          {activeUserId !== "all" && " para el usuario seleccionado"}
          {activeSupervisorId !== "all" && " con el supervisor seleccionado"}
          {searchTerm && ` que coincidan con "${searchTerm}"`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contador de resultados con información detallada */}
      {filteredClients.length > 0 && (
        <div 
          className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center"
          aria-live="polite"
        >
          <span>
            Total: {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
          </span>
          <span className="text-[#29696B] font-medium">
            Mostrando: {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems}
          </span>
        </div>
      )}

      {/* Paginación visible en la parte superior para móvil */}
      <div ref={mobileListRef} id="mobile-clients-list" className="md:hidden">
        {filteredClients.length > itemsPerPage && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mb-4">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={onPageChange}
              onItemsPerPageChange={onItemsPerPageChange}
            />
          </div>
        )}
      </div>

      {/* Lista de clientes para pantallas grandes */}
      <div className="hidden md:block space-y-6">
        {paginatedClients.map(client => (
          <ClientCard
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

      {/* Vista móvil */}
      <div className="md:hidden">
        <MobileClientList
          clients={paginatedClients}
          supervisors={supervisors}
          expandedClientId={expandedClientId}
          expandedSubservicioId={expandedSubservicioId}
          onToggleClientExpansion={onToggleClientExpansion}
          onToggleSubservicioExpansion={onToggleSubservicioExpansion}
          onEditClient={onEditClient}
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
      </div>

      {/* Paginación */}
      {filteredClients.length > itemsPerPage && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default memo(ClientListWrapper);