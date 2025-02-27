/**
 * Componente para filtrar y buscar usuarios
 * Incluye campo de búsqueda y opciones de visualización
 */
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showInactiveUsers: boolean;
  setShowInactiveUsers: (show: boolean) => void;
}

/**
 * Barra de filtros para la gestión de usuarios
 */
const UserFilters: React.FC<UserFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showInactiveUsers,
  setShowInactiveUsers
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="showInactive" 
            checked={showInactiveUsers} 
            onCheckedChange={(checked) => setShowInactiveUsers(checked as boolean)}
          />
          <Label htmlFor="showInactive" className="text-sm cursor-pointer">
            Mostrar inactivos
          </Label>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;