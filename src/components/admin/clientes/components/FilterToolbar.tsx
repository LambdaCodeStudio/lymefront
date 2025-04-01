import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertTriangle,
  Building,
  Filter,
  Search,
  UserPlus,
} from 'lucide-react';
import { DEFAULT_VALUES } from '../constants/clients';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { FilterState, SupervisorData, UserExtended, ViewMode } from '../types/clients';

interface FilterToolbarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onCreateClient: () => void;
  toggleViewMode: (mode: ViewMode) => void;
  users: UserExtended[];
  supervisors: SupervisorData[];
  totalUnassignedSubservices: number;
}

/**
 * Componente para la barra de filtros y herramientas de los clientes
 * Versión para escritorio
 */
const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onFilterChange,
  onCreateClient,
  toggleViewMode,
  users,
  supervisors,
  totalUnassignedSubservices
}) => {
  return (
    <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C]" aria-hidden="true" />
        <Input
          type="text"
          placeholder="Buscar clientes..."
          className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
          value={filters.searchTerm}
          onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
          aria-label="Buscar clientes"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2">
        {/* Filtro por usuario */}
        <Select
          value={filters.activeUserId}
          onValueChange={(value) => onFilterChange({ activeUserId: value })}
          aria-label="Filtrar por usuario"
        >
          <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
            <SelectValue placeholder="Filtrar por usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUES.FILTER_STATE.ALL}>Todos los usuarios</SelectItem>

            {/* Agrupar por supervisores */}
            {users.filter(user => user.role === 'supervisor').length > 0 && (
              <>
                <SelectItem value="header-supervisors" disabled className="font-semibold text-[#29696B] cursor-default bg-[#DFEFE6]/30">
                  -- Supervisores --
                </SelectItem>
                {users
                  .filter(user => user.role === 'supervisor')
                  .sort((a, b) => (a.email || a.usuario || '').localeCompare(b.email || b.usuario || ''))
                  .map(user => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.email || user.usuario || `${user.nombre || ''} ${user.apellido || ''}`.trim() || user._id}
                    </SelectItem>
                  ))
                }
              </>
            )}
          </SelectContent>
        </Select>

        {/* Filtro por supervisor */}
        <Select
          value={filters.activeSupervisorId}
          onValueChange={(value) => onFilterChange({ activeSupervisorId: value })}
          aria-label="Filtrar por supervisor"
        >
          <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
            <SelectValue placeholder="Filtrar por supervisor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUES.FILTER_STATE.ALL}>Todos los supervisores</SelectItem>
            {supervisors.length > 0 ? (
              supervisors
                .sort((a, b) => (a.email || a.usuario || '').localeCompare(b.email || b.usuario || ''))
                .map(supervisor => (
                  <SelectItem key={supervisor._id} value={supervisor._id}>
                    {getSupervisorIdentifier(supervisor._id, supervisors)}
                  </SelectItem>
                ))
            ) : (
              <SelectItem value="no-supervisors" disabled>
                No hay supervisores disponibles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Botón Nuevo Cliente y Vistas */}
      <div className="flex justify-end gap-2">
        {/* Selector de vista */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              aria-haspopup="true"
            >
              <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
              {filters.viewMode === 'all' ? 'Vista normal' : 'Ver sin supervisor'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => toggleViewMode('all')}
              className={filters.viewMode === 'all' ? 'bg-[#DFEFE6]/30 font-medium' : ''}
              aria-selected={filters.viewMode === 'all'}
            >
              <Building className="w-4 h-4 mr-2 text-[#29696B]" aria-hidden="true" />
              Vista normal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toggleViewMode('unassigned')}
              className={filters.viewMode === 'unassigned' ? 'bg-[#DFEFE6]/30 font-medium' : ''}
              aria-selected={filters.viewMode === 'unassigned'}
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" aria-hidden="true" />
              Subservicios sin supervisor
              {totalUnassignedSubservices > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-300">
                  {totalUnassignedSubservices}
                </Badge>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={onCreateClient}
          className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
          Nuevo Cliente
        </Button>
      </div>
    </div>
  );
};

export default memo(FilterToolbar);