import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Componente de paginación simplificado
 * Muestra controles para navegar entre páginas en una lista paginada
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
  
  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {/* Primera página */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        className="h-8 px-3 border-[#91BEAD]"
      >
        Primera
      </Button>
      
      {/* Página anterior */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="h-8 w-8 p-0 border-[#91BEAD]"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="h-4 w-4"
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </Button>
      
      {/* Indicador de página actual */}
      <span className="text-sm text-[#29696B] px-2">
        {page} / {totalPages}
      </span>
      
      {/* Página siguiente */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="h-8 w-8 p-0 border-[#91BEAD]"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="h-4 w-4"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </Button>
      
      {/* Última página */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        className="h-8 px-3 border-[#91BEAD]"
      >
        Última
      </Button>
    </div>
  );
};

export default Pagination;