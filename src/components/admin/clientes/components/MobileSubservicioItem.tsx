import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FileEdit, MapPin, Shield, Trash2 } from 'lucide-react';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, SubServicio, SupervisorData, SubUbicacion } from '../types/clients';

interface MobileSubservicioItemProps {
  client: Client;
  subservicio: SubServicio;
  supervisors: SupervisorData[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onAddSubUbicacion: () => void;
  onEditSubUbicacion: (sububicacionId: string) => void;
  onAssignSupervisor: () => void;
  onRemoveSupervisor: () => void;
  onDelete: () => void;
  onDeleteSubUbicacion: (sububicacionId: string) => void;
}

/**
 * Componente para mostrar un subservicio en la vista móvil
 */
const MobileSubservicioItem: React.FC<MobileSubservicioItemProps> = ({
  client,
  subservicio,
  supervisors,
  isExpanded,
  onToggleExpand,
  onEdit,
  onAddSubUbicacion,
  onEditSubUbicacion,
  onAssignSupervisor,
  onRemoveSupervisor,
  onDelete,
  onDeleteSubUbicacion
}) => {
  // Determinar si hay un supervisor asignado y su información
  const hasSupervisor = Boolean(subservicio.supervisorId);
  const supervisorName = hasSupervisor ? 
    (typeof subservicio.supervisorId === 'object' && subservicio.supervisorId
      ? (subservicio.supervisorId.email || subservicio.supervisorId.usuario || `${subservicio.supervisorId.nombre || ''} ${subservicio.supervisorId.apellido || ''}`.trim())
      : typeof subservicio.supervisorId === 'string' 
        ? getSupervisorIdentifier(subservicio.supervisorId, supervisors)
        : 'No asignado'
    ) : 'No asignado';

  return (
    <div 
      className="border border-[#91BEAD]/20 rounded-md overflow-hidden"
      data-testid={`subservicio-${subservicio._id}`}
    >
      <button
        className="w-full p-2 bg-[#DFEFE6]/20 flex justify-between items-center text-left"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-controls={`subservicio-content-${subservicio._id}`}
      >
        <div className="flex items-center">
          <MapPin className="w-3 h-3 text-[#29696B] mr-2" aria-hidden="true" />
          <div className="text-left">
            <span className="text-sm font-medium text-[#29696B]">{subservicio.nombre}</span>
            {hasSupervisor ? (
              <div className="flex items-center mt-1 text-xs text-[#29696B]">
                <Shield className="w-2 h-2 mr-1" aria-hidden="true" />
                {supervisorName}
              </div>
            ) : (
              <Badge 
                variant="outline" 
                className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-300"
              >
                Sin Supervisor
              </Badge>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        )}
      </button>
      
      {/* Acciones y sububicaciones */}
      {isExpanded && (
        <div 
          id={`subservicio-content-${subservicio._id}`}
          className="p-2 space-y-2 text-xs"
        >
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onAssignSupervisor}
              className="text-xs h-7"
            >
              <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
              {hasSupervisor ? 'Cambiar' : 'Asignar'} Supervisor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-xs h-7"
            >
              <FileEdit className="w-3 h-3 mr-1" aria-hidden="true" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddSubUbicacion}
              className="text-xs h-7"
            >
              <span className="mr-1">+</span> Sububicación
            </Button>
            {hasSupervisor && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemoveSupervisor}
                className="text-amber-700 border-amber-200 hover:bg-amber-50 text-xs h-7"
              >
                Quitar Supervisor
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
            >
              <Trash2 className="w-3 h-3 mr-1" aria-hidden="true" />
              Eliminar
            </Button>
          </div>
          
          {/* Sububicaciones */}
          {subservicio.subUbicaciones?.length > 0 && (
            <div className="mt-3 pl-3 space-y-2 border-l-2 border-[#DFEFE6]">
              <div className="text-xs font-medium text-[#29696B] mb-1">
                Sububicaciones ({subservicio.subUbicaciones.length}):
              </div>
              {subservicio.subUbicaciones.map((sububicacion: SubUbicacion) => (
                <MobileSubUbicacionItem
                  key={sububicacion._id}
                  sububicacion={sububicacion}
                  onEdit={() => onEditSubUbicacion(sububicacion._id)}
                  onDelete={() => onDeleteSubUbicacion(sububicacion._id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente interno para sububicaciones
interface MobileSubUbicacionItemProps {
  sububicacion: SubUbicacion;
  onEdit: () => void;
  onDelete: () => void;
}

// Componente de sububicación en vista móvil
const MobileSubUbicacionItem: React.FC<MobileSubUbicacionItemProps> = memo(({
  sububicacion,
  onEdit,
  onDelete
}) => {
  return (
    <div 
      className="p-1 flex justify-between items-center bg-[#DFEFE6]/10 rounded-md"
      data-testid={`sububicacion-mobile-${sububicacion._id}`}
    >
      <div>
        <span className="text-xs font-medium text-[#29696B]">
          {sububicacion.nombre}
        </span>
        {sububicacion.descripcion && (
          <p className="text-xs text-[#7AA79C]">{sububicacion.descripcion}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-5 w-5 p-0 text-[#29696B]"
          aria-label={`Editar sububicación ${sububicacion.nombre}`}
        >
          <FileEdit className="w-3 h-3" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-5 w-5 p-0 text-red-600"
          aria-label={`Eliminar sububicación ${sububicacion.nombre}`}
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});

MobileSubUbicacionItem.displayName = 'MobileSubUbicacionItem';

export default memo(MobileSubservicioItem);