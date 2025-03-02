import React from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showInactiveUsers: boolean;
  setShowInactiveUsers: (value: boolean) => void;
}

const UserFilters: React.FC<UserFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showInactiveUsers,
  setShowInactiveUsers
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      {/* Barra de búsqueda */}
      <div className="relative w-full sm:w-64">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#7AA79C]" />
        </div>
        <input
          type="text"
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#DFEFE6]/30 border border-[#91BEAD]/20 rounded-lg py-2 pl-10 pr-4 
                     focus:outline-none focus:ring-2 focus:ring-[#29696B]/20 focus:border-[#29696B]
                     placeholder-[#7AA79C] text-[#29696B]"
        />
      </div>

      {/* Toggle para mostrar usuarios inactivos */}
      <button
        onClick={() => setShowInactiveUsers(!showInactiveUsers)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm
                    transition-colors duration-200 w-full sm:w-auto justify-center
                    ${showInactiveUsers 
                      ? 'bg-[#29696B]/10 text-[#29696B] border border-[#29696B]/20' 
                      : 'bg-[#DFEFE6]/30 text-[#7AA79C] border border-[#91BEAD]/20 hover:bg-[#DFEFE6]/50'}`}
      >
        {showInactiveUsers ? (
          <>
            <Eye className="h-4 w-4" />
            <span>Mostrando inactivos</span>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4" />
            <span>Ocultos inactivos</span>
          </>
        )}
      </button>
    </div>
  );
};

export default UserFilters;