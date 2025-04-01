import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { FileEdit, Trash2 } from 'lucide-react';
import type { SubUbicacion } from '../types/clients';

interface SubUbicacionItemProps {
  sububicacion: SubUbicacion;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Componente para mostrar una sububicación dentro de un subservicio
 * Optimizado con React.memo para evitar renderizados innecesarios
 */
export const SubUbicacionItem: React.FC<SubUbicacionItemProps> = memo(({
  sububicacion,
  onEdit,
  onDelete
}) => {
  return (
    <div 
      className="py-2 pl-2 pr-1 flex justify-between items-center bg-[#DFEFE6]/10 rounded-md"
      data-testid={`sububicacion-${sububicacion._id}`}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-[#29696B] rounded-full mr-2" aria-hidden="true"></div>
        <div>
          <h5 className="text-sm font-medium text-[#29696B]">{sububicacion.nombre}</h5>
          {sububicacion.descripcion && (
            <p className="text-xs text-[#7AA79C]">{sububicacion.descripcion}</p>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-6 w-6 p-0 text-[#29696B] hover:bg-[#DFEFE6]/70"
          aria-label={`Editar sububicación ${sububicacion.nombre}`}
        >
          <FileEdit className="w-3 h-3" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
          aria-label={`Eliminar sububicación ${sububicacion.nombre}`}
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});

SubUbicacionItem.displayName = 'SubUbicacionItem';