import React, { memo, useCallback } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Constantes de estilos para reutilización
const STYLES = {
  container: "flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto",
  searchContainer: "relative w-full sm:w-64",
  searchInput: "w-full bg-[#DFEFE6]/30 border border-[#91BEAD]/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#29696B]/20 focus:border-[#29696B] placeholder-[#7AA79C] text-[#29696B]",
  selectContainer: "w-full sm:w-auto mb-3 sm:mb-0",
  selectTrigger: "w-full bg-[#DFEFE6]/30 border border-[#91BEAD]/20 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-[#29696B]/20 focus:border-[#29696B] placeholder-[#7AA79C] text-[#29696B]",
  toggleButton: "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors duration-200 w-full sm:w-auto justify-center",
  toggleActive: "bg-[#29696B]/10 text-[#29696B] border border-[#29696B]/20",
  toggleInactive: "bg-[#DFEFE6]/30 text-[#7AA79C] border border-[#91BEAD]/20 hover:bg-[#DFEFE6]/50"
};

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showInactiveUsers: boolean;
  setShowInactiveUsers: (value: boolean) => void;
  selectedRole: string | null;
  setSelectedRole: (value: string | null) => void;
  availableRoles: { value: string; label: string }[];
}

/**
 * Componente para filtrar la lista de usuarios
 */
const UserFilters: React.FC<UserFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showInactiveUsers,
  setShowInactiveUsers,
  selectedRole,
  setSelectedRole,
  availableRoles
}) => {
  // Usar useCallback para memoizar los manejadores de eventos
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  const handleRoleChange = useCallback((value: string) => {
    setSelectedRole(value === "all" ? null : value);
  }, [setSelectedRole]);

  const toggleInactiveUsers = useCallback(() => {
    setShowInactiveUsers(!showInactiveUsers);
  }, [showInactiveUsers, setShowInactiveUsers]);

  return (
    <div className={STYLES.container}>
      {/* Barra de búsqueda */}
      <div className={STYLES.searchContainer}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#7AA79C]" aria-hidden="true" />
        </div>
        <input
          type="text"
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={handleSearchChange}
          className={STYLES.searchInput}
          aria-label="Buscar usuarios por nombre o teléfono"
        />
      </div>

      {/* Filtro por rol */}
      <div className={STYLES.selectContainer}>
        <Select
          value={selectedRole || "all"}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className={STYLES.selectTrigger} aria-label="Filtrar por rol">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {availableRoles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toggle para mostrar usuarios inactivos */}
      <button
        onClick={toggleInactiveUsers}
        className={`${STYLES.toggleButton} ${showInactiveUsers ? STYLES.toggleActive : STYLES.toggleInactive}`}
        aria-pressed={showInactiveUsers}
        aria-label={showInactiveUsers ? "Ocultar usuarios inactivos" : "Mostrar usuarios inactivos"}
      >
        {showInactiveUsers ? (
          <>
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Mostrando inactivos</span>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            <span>Ocultos inactivos</span>
          </>
        )}
      </button>
    </div>
  );
};

// Usar memo para evitar re-renders innecesarios
export default memo(UserFilters);