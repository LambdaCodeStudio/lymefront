import React, { memo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileEdit,
  MapPin,
  Plus,
  Settings,
  Shield,
  Trash2,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, SupervisorData } from '../types/clients';

// Definición de tipos para el subservicio basado en el uso en ClientCard
interface Subservicio {
  _id: string;
  nombre: string;
  descripcion?: string;
  ubicaciones?: {
    _id: string;
    nombre: string;
    direccion?: string;
    descripcion?: string;
  }[];
  supervisorId?: string | { _id: string } | null;
}

interface SubservicioItemProps {
  client: Client;
  subservicio: Subservicio;
  supervisors: SupervisorData[];
  isExpanded: boolean;
  onToggleExpand: (subservicioId: string) => void;
  onEdit: () => void;
  onAddSubUbicacion: () => void;
  onEditSubUbicacion: (sububicacionId: string) => void;
  onAssignSupervisor: () => void;
  onRemoveSupervisor: () => void;
  onDelete: () => void;
  onDeleteSubUbicacion: (sububicacionId: string) => void;
}

/**
 * Componente para mostrar un subservicio y sus detalles
 */
const SubservicioItemComponent = ({
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
}: SubservicioItemProps) => {
  // Callbacks memoizados para prevenir recreación en cada renderizado
  const handleToggleExpand = useCallback(() => {
    onToggleExpand(subservicio._id);
  }, [subservicio._id, onToggleExpand]);

  // Determinar si el subservicio tiene un supervisor asignado
  const hasSupervisor = Boolean(subservicio.supervisorId);
  
  // Recuperar el ID del supervisor (puede estar en diferentes formatos)
  const supervisorId = typeof subservicio.supervisorId === 'object' && subservicio.supervisorId 
    ? subservicio.supervisorId._id 
    : subservicio.supervisorId;

  // Encuentra el supervisor en la lista (si existe)
  const supervisor = supervisorId 
    ? supervisors.find(s => s._id === supervisorId) 
    : undefined;

  return (
    <div className="relative">
      <div className={`
        p-4 bg-[#F5F9F7] border-b border-[#91BEAD]/10
        ${isExpanded ? 'border-b-0' : ''}
      `}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
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
            <h3 className="text-md font-medium text-[#29696B] ml-2">
              {subservicio.nombre}
            </h3>
            {subservicio.ubicaciones && (
              <span className="text-xs text-[#7AA79C] ml-2">
                {subservicio.ubicaciones.length} {subservicio.ubicaciones.length === 1 ? 'ubicación' : 'ubicaciones'}
              </span>
            )}
            {!hasSupervisor && (
              <Badge 
                variant="outline" 
                className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-300"
              >
                Sin Supervisor
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botón para supervisor */}
            {hasSupervisor ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemoveSupervisor}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <Shield className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                {supervisor 
                  ? getSupervisorIdentifier(supervisorId?.toString() || '', supervisors)
                  : 'Quitar Supervisor'
                }
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onAssignSupervisor}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <User className="w-4 h-4 mr-1" aria-hidden="true" />
                Asignar Supervisor
              </Button>
            )}

            {/* Botón para agregar ubicación */}
            <Button
              variant="outline"
              size="sm"
              onClick={onAddSubUbicacion}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            >
              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
              Agregar Ubicación
            </Button>

            {/* Menú de opciones para el subservicio */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  aria-label="Opciones del subservicio" 
                  className="text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <FileEdit className="w-4 h-4 mr-2 text-[#29696B]" aria-hidden="true" />
                  Editar Subservicio
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Eliminar Subservicio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Descripción del subservicio */}
        {subservicio.descripcion && (
          <p className="text-sm text-[#29696B] mt-2 ml-8">
            {subservicio.descripcion}
          </p>
        )}
      </div>

      {/* Lista de ubicaciones expandible */}
      {isExpanded && (
        <div className="bg-white pl-8 pr-4 py-3 border-b border-[#91BEAD]/10">
          <h4 className="text-sm font-medium text-[#29696B] mb-2">Ubicaciones</h4>
          
          {subservicio.ubicaciones && subservicio.ubicaciones.length > 0 ? (
            <div className="space-y-3">
              {subservicio.ubicaciones.map(ubicacion => (
                <div 
                  key={ubicacion._id} 
                  className="p-3 bg-[#F5F9F7] rounded-md border border-[#91BEAD]/10"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-[#7AA79C] mt-1 mr-2" aria-hidden="true" />
                      <div>
                        <h5 className="text-sm font-medium text-[#29696B]">{ubicacion.nombre}</h5>
                        {ubicacion.direccion && (
                          <p className="text-xs text-[#7AA79C] mt-1">
                            {ubicacion.direccion}
                          </p>
                        )}
                        {ubicacion.descripcion && (
                          <p className="text-xs text-[#29696B] mt-1">
                            {ubicacion.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSubUbicacion(ubicacion._id)}
                        className="h-7 w-7 p-0 text-[#7AA79C] hover:bg-[#DFEFE6]/50 hover:text-[#29696B]"
                        aria-label="Editar ubicación"
                      >
                        <FileEdit className="w-3 h-3" aria-hidden="true" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSubUbicacion(ubicacion._id)}
                        className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar ubicación"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-[#7AA79C]">No hay ubicaciones disponibles</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddSubUbicacion}
                className="mt-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Agregar Primera Ubicación
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Exportación con memoización para optimizar rendimiento
export const SubservicioItem = memo(SubservicioItemComponent);

// También exportar como default para compatibilidad
export default SubservicioItem;