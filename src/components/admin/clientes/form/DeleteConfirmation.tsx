import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { AlertTriangle } from 'lucide-react';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, DeleteConfirmation as DeleteConfirmationType, SupervisorData } from '../types/clients';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemToDelete: DeleteConfirmationType | null;
  clients: Client[];
  supervisors: SupervisorData[];
  isLoading: boolean;
}

/**
 * Componente para confirmación de eliminación con información detallada
 * del elemento a eliminar
 */
const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemToDelete,
  clients,
  supervisors,
  isLoading
}) => {
  if (!itemToDelete) return null;

  // Encontrar el cliente y otros datos relacionados para mostrar información detallada
  const client = itemToDelete.parentId 
    ? clients.find(c => c._id === itemToDelete.parentId) 
    : clients.find(c => c._id === itemToDelete.id);

  // Información específica según el tipo de elemento
  let specificInfo = null;
  let warningMessage = null;

  if (itemToDelete.type === 'cliente' && client) {
    specificInfo = (
      <>
        <p className="font-medium text-red-700">Datos del cliente:</p>
        <p className="mt-1">Nombre: <strong>{client.nombre}</strong></p>
        {client.subServicios && client.subServicios.length > 0 && (
          <p className="mt-1 text-red-700">
            ⚠️ Se eliminarán también todos los subservicios ({client.subServicios.length}) y sus sububicaciones.
          </p>
        )}
      </>
    );
    warningMessage = "¿Está seguro de eliminar este cliente? Esta acción no se puede deshacer.";
  } else if (itemToDelete.type === 'subservicio' && client && itemToDelete.id) {
    const subservicio = client.subServicios.find(s => s._id === itemToDelete.id);
    specificInfo = (
      <>
        <p className="font-medium text-red-700">Datos del subservicio:</p>
        <p className="mt-1">Cliente: <strong>{client.nombre}</strong></p>
        <p className="mt-1">Subservicio: <strong>{subservicio?.nombre}</strong></p>
        {subservicio?.subUbicaciones && subservicio.subUbicaciones.length > 0 && (
          <p className="mt-1 text-red-700">
            ⚠️ Se eliminarán también todas las sububicaciones ({subservicio.subUbicaciones.length}).
          </p>
        )}
      </>
    );
    warningMessage = "¿Está seguro de eliminar este subservicio? Esta acción no se puede deshacer.";
  } else if (itemToDelete.type === 'sububicacion' && client && itemToDelete.subServicioId && itemToDelete.id) {
    const subservicio = client.subServicios.find(s => s._id === itemToDelete.subServicioId);
    const sububicacion = subservicio?.subUbicaciones.find(s => s._id === itemToDelete.id);
    specificInfo = (
      <>
        <p className="font-medium text-red-700">Datos de la sububicación:</p>
        <p className="mt-1">Cliente: <strong>{client.nombre}</strong></p>
        <p className="mt-1">Subservicio: <strong>{subservicio?.nombre}</strong></p>
        <p className="mt-1">Sububicación: <strong>{sububicacion?.nombre}</strong></p>
      </>
    );
    warningMessage = "¿Está seguro de eliminar esta sububicación? Esta acción no se puede deshacer.";
  } else if (itemToDelete.type === 'supervisor' && client && itemToDelete.subServicioId) {
    const subservicio = client.subServicios.find(s => s._id === itemToDelete.subServicioId);
    let supervisorName = 'No asignado';
    
    if (subservicio?.supervisorId) {
      if (typeof subservicio.supervisorId === 'object' && subservicio.supervisorId) {
        supervisorName = subservicio.supervisorId.email || 
                         subservicio.supervisorId.usuario || 
                         `${subservicio.supervisorId.nombre || ''} ${subservicio.supervisorId.apellido || ''}`.trim();
      } else if (typeof subservicio.supervisorId === 'string') {
        supervisorName = getSupervisorIdentifier(subservicio.supervisorId, supervisors);
      }
    }
    
    specificInfo = (
      <>
        <p className="font-medium text-amber-700">Se removerá el supervisor del siguiente subservicio:</p>
        <p className="mt-1">Cliente: <strong>{client.nombre}</strong></p>
        <p className="mt-1">Subservicio: <strong>{subservicio?.nombre}</strong></p>
        <p className="mt-1">Supervisor actual: <strong>{supervisorName}</strong></p>
      </>
    );
    warningMessage = "¿Está seguro de remover el supervisor de este subservicio? Esta acción no se puede deshacer.";
  }

  // Determinar título y estilo según el tipo de eliminación
  const title = itemToDelete.type === 'supervisor' 
    ? 'Remover Supervisor' 
    : `Eliminar ${
        itemToDelete.type === 'cliente' ? 'Cliente' :
        itemToDelete.type === 'subservicio' ? 'Subservicio' :
        'Sububicación'
      }`;
      
  const buttonStyle = itemToDelete.type === 'supervisor'
    ? "bg-amber-600 hover:bg-amber-700"
    : "bg-red-600 hover:bg-red-700";
    
  const buttonText = itemToDelete.type === 'supervisor'
    ? 'Remover Supervisor'
    : `Eliminar ${
        itemToDelete.type === 'cliente' ? 'Cliente' :
        itemToDelete.type === 'subservicio' ? 'Subservicio' :
        'Sububicación'
      }`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#7AA79C]">
            {warningMessage}
          </DialogDescription>
        </DialogHeader>

        {specificInfo && (
          <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm">
            {specificInfo}
          </div>
        )}

        <DialogFooter className="gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className={buttonStyle}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {itemToDelete.type === 'supervisor' ? 'Removiendo...' : 'Eliminando...'}
              </span>
            ) : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmation;