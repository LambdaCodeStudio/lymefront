import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Hook para detectar medias queries (integrado en el mismo archivo)
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (event) => setMatches(event.matches);
    
    // Agregar listener con compatibilidad para navegadores antiguos
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);
  
  return matches;
};

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
  onItemsPerPageChange = null, // Nueva prop para permitir cambiar items por página
}) => {
  // Usar el hook para detectar dispositivos móviles (más confiable que innerWidth)
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // No mostrar paginación si hay una sola página o menos
  if (!totalItems || !itemsPerPage || totalItems <= itemsPerPage) {
    return null;
  }

  // Calcular el número total de páginas con memoización
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / itemsPerPage));
  }, [totalItems, itemsPerPage]);

  // No mostrar paginación si hay una sola página
  if (totalPages <= 1) {
    return null;
  }

  // Inicializar página actual válida
  const page = Math.min(Math.max(1, currentPage), totalPages);

  // Calcular el rango de elementos mostrados con memoización
  const { firstItemOnPage, lastItemOnPage } = useMemo(() => {
    return {
      firstItemOnPage: (page - 1) * itemsPerPage + 1,
      lastItemOnPage: Math.min(page * itemsPerPage, totalItems)
    };
  }, [page, itemsPerPage, totalItems]);

  // Generar array de páginas cercanas a la actual
  const pageNumbers = useMemo(() => {
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
  }, [page, totalPages, isMobile]);

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
            className="h-8 w-8 p-0 border-[#29696B]/70 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="h-8 w-8 p-0 border-[#29696B]/70 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Indicador de página actual */}
        <div className="flex items-center bg-[#DFEFE6] px-3 py-1 rounded-lg">
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
            className="h-8 w-8 p-0 border-[#29696B]/70 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="h-8 w-8 p-0 border-[#29696B]/70 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
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
          className="h-8 w-8 p-0 border-[#29696B]/70 rounded-r-none text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
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
          className="h-8 w-8 p-0 border-[#29696B]/70 rounded-none border-l-0 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Botones de página */}
        {pageNumbers.map((pageNum, idx) => (
          <React.Fragment key={idx}>
            {pageNum === '...' ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 w-8 p-0 border-[#29696B]/70 rounded-none border-l-0 text-[#29696B]"
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
                    : "border-[#29696B]/70 text-[#29696B] hover:bg-[#DFEFE6]"
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
          className="h-8 w-8 p-0 border-[#29696B]/70 rounded-none border-l-0 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
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
          className="h-8 w-8 p-0 border-[#29696B]/70 rounded-l-none border-l-0 text-[#29696B] hover:bg-[#DFEFE6] hover:text-[#29696B]"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Selector de items por página (nueva funcionalidad) */}
      {onItemsPerPageChange && (
        <div className="flex items-center mt-3 text-sm text-[#29696B]">
          <span className="mr-2">Items por página:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-[#29696B]/70 rounded px-2 py-1 text-[#29696B] bg-white"
            aria-label="Items por página"
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <div className={`pagination-container ${className}`}>
      {isMobile ? <MobilePagination /> : <DesktopPagination />}
    </div>
  );
};

export default React.memo(Pagination);