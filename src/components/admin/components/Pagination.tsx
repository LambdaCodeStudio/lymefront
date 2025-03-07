import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Componente de paginación mejorado
 * Incluye indicador de resultados y controles más visibles para dispositivos móviles
 */
const Pagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  className = '',
}) => {
  // No mostrar paginación si hay una sola página o menos
  if (!totalItems || !itemsPerPage || totalItems <= itemsPerPage) {
    return null;
  }
  
  // Calcular el número total de páginas
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // No mostrar paginación si hay una sola página
  if (totalPages <= 1) {
    return null;
  }
  
  // Inicializar página actual válida
  const page = Math.min(Math.max(1, currentPage), totalPages);
  
  // Calcular el rango de elementos mostrados
  const firstItemOnPage = (page - 1) * itemsPerPage + 1;
  const lastItemOnPage = Math.min(page * itemsPerPage, totalItems);
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Indicador de resultados */}
      <div className="text-center text-sm text-[#29696B] bg-[#DFEFE6]/50 py-2 px-4 rounded-lg mb-2">
        Mostrando {firstItemOnPage}-{lastItemOnPage} de {totalItems} usuarios
      </div>
      
      <div className="flex items-center justify-between">
        {/* Controles de paginación */}
        <div className="flex items-center space-x-1">
          {/* Primera página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="h-8 w-8 p-0 border-[#91BEAD]"
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          {/* Página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="h-8 w-8 p-0 border-[#91BEAD]"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Indicador de página actual */}
        <div className="flex items-center">
          <span className="px-2 py-1 bg-[#29696B] text-white text-sm font-medium rounded-md">
            {page}
          </span>
          <span className="mx-2 text-sm text-[#29696B]">
            de {totalPages}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Página siguiente */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="h-8 w-8 p-0 border-[#91BEAD]"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Última página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="h-8 w-8 p-0 border-[#91BEAD]"
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;