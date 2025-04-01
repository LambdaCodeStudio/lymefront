import React, { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import type { MultiSupervisorSelectProps } from '../types/clients';

/**
 * Componente para selección múltiple de supervisores
 * Optimizado con React.memo para evitar re-renderizados innecesarios
 */
const MultiSupervisorSelect: React.FC<MultiSupervisorSelectProps> = ({
  supervisors,
  selectedSupervisors = [],
  onChange,
  placeholder = "Seleccionar supervisores..."
}) => {
  const [open, setOpen] = useState(false);

  // Asegurarnos que selectedSupervisors es siempre un array
  const safeSelectedSupervisors = Array.isArray(selectedSupervisors) ? selectedSupervisors : [];

  // Manejador para seleccionar/deseleccionar un supervisor
  const toggleSupervisor = (supervisorId: string) => {
    const isCurrentlySelected = safeSelectedSupervisors.includes(supervisorId);
    
    const newSelectedSupervisors = isCurrentlySelected
      ? safeSelectedSupervisors.filter(id => id !== supervisorId)
      : [...safeSelectedSupervisors, supervisorId];
    
    onChange(newSelectedSupervisors);
  };

  // Manejador para eliminar un supervisor seleccionado
  const handleRemoveSupervisor = (
    e: React.MouseEvent, 
    supervisorId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(safeSelectedSupervisors.filter(id => id !== supervisorId));
  };

  return (
    <div className="flex flex-col space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Seleccionar supervisores"
            className="justify-between w-full border-[#91BEAD] focus:ring-[#29696B]/20"
          >
            <span>
              {safeSelectedSupervisors.length > 0
                ? `${safeSelectedSupervisors.length} supervisor${safeSelectedSupervisors.length > 1 ? 'es' : ''} seleccionado${safeSelectedSupervisors.length > 1 ? 's' : ''}`
                : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar supervisor..." />
            <CommandList>
              <CommandEmpty>No se encontraron supervisores.</CommandEmpty>
              <CommandGroup>
                {supervisors.map(supervisor => (
                  <CommandItem
                    key={supervisor._id}
                    onSelect={() => toggleSupervisor(supervisor._id)}
                    className="flex items-center space-x-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        id={`supervisor-${supervisor._id}`}
                        checked={safeSelectedSupervisors.includes(supervisor._id)}
                        onCheckedChange={() => toggleSupervisor(supervisor._id)}
                        className="text-[#29696B] border-[#91BEAD]"
                        aria-label={`Seleccionar supervisor ${supervisor.email || supervisor.usuario || supervisor._id}`}
                      />
                      <div className="flex flex-col">
                        <span>
                          {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisor._id}
                        </span>
                        {supervisor.role && (
                          <span className="text-xs text-muted-foreground">
                            {supervisor.role === 'supervisor' ? 'Supervisor' : supervisor.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {safeSelectedSupervisors.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Supervisores seleccionados">
          {safeSelectedSupervisors.map(id => {
            const supervisor = supervisors.find(s => s._id === id);
            const displayName = supervisor
              ? (supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || id.substring(0, 8))
              : id.substring(0, 8);
              
            return (
              <Badge 
                key={id} 
                variant="secondary" 
                className="flex items-center gap-1 bg-[#DFEFE6] text-[#29696B] border-[#91BEAD]"
                role="listitem"
              >
                {displayName}
                <button
                  onClick={(e) => handleRemoveSupervisor(e, id)}
                  className="ml-1 rounded-full hover:bg-[#91BEAD]/20 p-0.5"
                  aria-label={`Eliminar supervisor ${displayName}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(MultiSupervisorSelect);