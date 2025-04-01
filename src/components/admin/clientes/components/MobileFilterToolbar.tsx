import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Search,
  X
} from 'lucide-react';
import { DEFAULT_VALUES } from '../constants/clients';
import { getSupervisorIdentifier, getUserIdentifierWithRole } from '../utils/clientUtils';
import type { FilterState, SupervisorData, UserExtended, ViewMode } from '../types/clients';

interface MobileFilterToolbarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onCreateClient: () => void;
  toggleViewMode: (mode: ViewMode) => void;
  clearActiveUserId: () => void;
  clearActiveSupervisorId: () => void;
  collapseAll: () => void;
  users: UserExtended[];
  supervisors: SupervisorData[];
  totalUnassignedSubservices: number;
  totalFilteredClients: number;
}

/**
 * Componente de barra de filtros para vista móvil
 */
const MobileFilterToolbar: React.FC<MobileFilterToolbarProps> = ({
  filters,
  onFilterChange,
  onCreateClient,
  toggleViewMode,
  clearActiveUserId,
  clearActiveSupervisorId,
  collapseAll,
  users,
  supervisors,
  totalUnassignedSubservices,
  totalFilteredClients
}) => {
  return (
    <div className="md:hidden mb-6 space-y-3 bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" 
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Buscar clientes..."
            className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            value={filters.searchTerm}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
            aria-label="Buscar clientes"
          />
        </div>
        <Button
          variant="outline"
          className="flex-shrink-0 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          onClick={() => onFilterChange({ isMobileFilterOpen: !filters.isMobileFilterOpen })}
          aria-expanded={filters.isMobileFilterOpen}
          aria-controls="mobile-filters"
          aria-label="Mostrar filtros"
        >
          <Filter className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
          onClick={onCreateClient}
          size="sm"
          aria-label="Nuevo cliente"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {filters.isMobileFilterOpen && (
        <div id="mobile-filters" className="p-3 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/30">
          {/* Vista */}
          <div className="mb-3">
            <Label className="text-sm font-medium mb-1 block text-[#29696B]">
              Vista
            </Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                variant={filters.viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleViewMode('all')}
                className={filters.viewMode === 'all'
                  ? 'bg-[#29696B] text-white hover:bg-[#29696B]/90'
                  : 'border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50'}
                aria-pressed={filters.viewMode === 'all'}
              >
                <Building className="w-3 h-3 mr-1" aria-hidden="true" />
                Vista normal
              </Button>
              <Button
                variant={filters.viewMode === 'unassigned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleViewMode('unassigned')}
                className={filters.viewMode === 'unassigned'
                  ? 'bg-[#29696B] text-white hover:bg-[#29696B]/90'
                  : 'border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50'}
                aria-pressed={filters.viewMode === 'unassigned'}
              >
                <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
                Sin supervisor
                {totalUnassignedSubservices > 0 && (
                  <Badge className="ml-1 text-xs bg-amber-100 text-amber-700 border-amber-300">
                    {totalUnassignedSubservices}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="mobileUserFilter" className="text-sm font-medium mb-1 block text-[#29696B]">
                Filtrar por usuario
              </Label>
              <Select
                value={filters.activeUserId}
                onValueChange={(value) => onFilterChange({ activeUserId: value })}
              >
                <SelectTrigger id="mobileUserFilter" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_VALUES.FILTER_STATE.ALL}>Todos los usuarios</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user._id} value={user._id}>
                      {getUserIdentifierWithRole(user._id, users)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filters.activeUserId !== DEFAULT_VALUES.FILTER_STATE.ALL && (
                <div className="mt-2 flex items-center justify-between py-1 px-2 bg-[#DFEFE6]/40 rounded border border-[#91BEAD]/20">
                  <div className="text-xs text-[#29696B]">
                    Usuario seleccionado: <strong>{getUserIdentifierWithRole(filters.activeUserId, users)}</strong>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearActiveUserId}
                    className="h-6 w-6 p-0"
                    aria-label="Limpiar filtro de usuario"
                  >
                    <X className="h-3 w-3 text-[#29696B]" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="mobileSupervisorFilter" className="text-sm font-medium mb-1 block text-[#29696B]">
                Filtrar por supervisor
              </Label>
              <Select
                value={filters.activeSupervisorId}
                onValueChange={(value) => onFilterChange({ activeSupervisorId: value })}
              >
                <SelectTrigger id="mobileSupervisorFilter" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_VALUES.FILTER_STATE.ALL}>Todos los supervisores</SelectItem>
                  {supervisors.map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {getSupervisorIdentifier(supervisor._id, supervisors)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filters.activeSupervisorId !== DEFAULT_VALUES.FILTER_STATE.ALL && (
                <div className="mt-2 flex items-center justify-between py-1 px-2 bg-[#DFEFE6]/40 rounded border border-[#91BEAD]/20">
                  <div className="text-xs text-[#29696B]">
                    Supervisor seleccionado: <strong>{getSupervisorIdentifier(filters.activeSupervisorId, supervisors)}</strong>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearActiveSupervisorId}
                    className="h-6 w-6 p-0"
                    aria-label="Limpiar filtro de supervisor"
                  >
                    <X className="h-3 w-3 text-[#29696B]" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {totalFilteredClients > 0 && filters.viewMode === 'all' && (
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
                aria-label={filters.expandedClientId ? "Contraer todos los clientes" : "Expandir cliente"}
              >
                {filters.expandedClientId ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" aria-hidden="true" />
                    Contraer Cliente
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" aria-hidden="true" />
                    Expandir Cliente
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(MobileFilterToolbar);