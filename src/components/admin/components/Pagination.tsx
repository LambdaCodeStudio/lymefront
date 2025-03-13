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

  // Determinar si estamos en móvil o desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Generar array de páginas cercanas a la actual (para navegación más clara)
  const getPageNumbers = () => {
    const delta = isMobile ? 1 : 2; // En móvil mostramos menos páginas
    const range = [];

    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }

    // Añadir primera página y puntos suspensivos si es necesario
    if (range[0] > 1) {
      if (range[0] > 2) {
        range.unshift('...');
      }
      range.unshift(1);
    }

    // Añadir última página y puntos suspensivos si es necesario
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) {
        range.push('...');
      }
      range.push(totalPages);
    }

    return range;
  };

  // Versión simple para móviles
  const MobilePagination = () => (
    <div className="flex flex-col items-center space-y-2">
      {/* Información de paginación */}
      <div className="text-sm text-[#29696B] font-medium">
        {firstItemOnPage}-{lastItemOnPage} de {totalItems}
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-between w-full">
        {/* Botones anterior/primera */}
        <div className="flex items-center space-x-1">
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
        <div className="flex items-center bg-[#DFEFE6]/30 px-3 py-1 rounded-lg">
          <span className="text-sm font-medium text-[#29696B]">
            {page} / {totalPages}
          </span>
        </div>

        {/* Botones siguiente/última */}
        <div className="flex items-center space-x-1">
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

  // Versión completa para desktop
  const DesktopPagination = () => (
    <div className="flex flex-col items-center space-y-2">
      {/* Información de paginación */}
      <div className="text-sm text-[#29696B] w-full text-center">
        Mostrando {firstItemOnPage}-{lastItemOnPage} de {totalItems} resultados
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-center">
        {/* Primera página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="h-8 w-8 p-0 border-[#91BEAD] rounded-r-none"
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
          className="h-8 w-8 p-0 border-[#91BEAD] rounded-none border-l-0"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Botones de página */}
        {getPageNumbers().map((pageNum, idx) => (
          <React.Fragment key={idx}>
            {pageNum === '...' ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 w-8 p-0 border-[#91BEAD] rounded-none border-l-0"
              >
                ...
              </Button>
            ) : (
              <Button
              variant={pageNum === page ? "default" : "outline"}
              size="sm"
              onClick={() => pageNum !== page && onPageChange(pageNum)}
              className={`h-8 w-8 p-0 rounded-none border-l-0 ${
                pageNum === page
                  ? "bg-[#29696B] text-white hover:bg-[#29696B]/90"
                  : "border-[#91BEAD] text-[#29696B]/30 hover:text-[#29696B]" 
              }`}
              aria-label={`Página ${pageNum}`}
              aria-current={pageNum === page ? "page" : undefined}
            >
              {pageNum}
            </Button>
            )}
          </React.Fragment>
        ))}

        {/* Página siguiente */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0 border-[#91BEAD] rounded-none border-l-0"
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
          className="h-8 w-8 p-0 border-[#91BEAD] rounded-l-none border-l-0"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`pagination-container ${className}`}>
      {isMobile ? <MobilePagination /> : <DesktopPagination />}
    </div>
  );
};

export default Pagination;