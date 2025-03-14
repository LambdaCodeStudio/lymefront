import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Hook for media query detection
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (event) => setMatches(event.matches);
    
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

// Componentes separados fuera del componente principal
const MobilePagination = ({ page, totalPages, firstItemOnPage, lastItemOnPage, totalItems, onPageChange }) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="text-sm text-blue-700 font-medium">
      {firstItemOnPage}-{lastItemOnPage} de {totalItems}
    </div>

    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="h-8 w-8 p-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 p-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center bg-blue-100 px-3 py-1 rounded-lg">
        <span className="text-sm font-medium text-blue-800">
          {page} / {totalPages}
        </span>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
);

const DesktopPagination = ({ page, totalPages, pageNumbers, firstItemOnPage, lastItemOnPage, totalItems, onPageChange, itemsPerPage, onItemsPerPageChange }) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="text-sm text-blue-700 w-full text-center">
      Mostrando {firstItemOnPage}-{lastItemOnPage} de {totalItems} resultados
    </div>

    <div className="flex items-center justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        className="h-8 w-8 p-0 rounded-r-none border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        aria-label="Primera página"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="h-8 w-8 p-0 rounded-none border-l-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageNumbers.map((pageNum, idx) => (
        <React.Fragment key={idx}>
          {pageNum === '...' ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-8 w-8 p-0 rounded-none border-l-0 border-blue-700 text-blue-700"
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
                  ? "bg-blue-700 text-white hover:bg-blue-600"
                  : "border-blue-700 text-blue-700 hover:bg-blue-50"
              }`}
              aria-label={`Página ${pageNum}`}
              aria-current={pageNum === page ? "page" : undefined}
            >
              {pageNum}
            </Button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="h-8 w-8 p-0 rounded-none border-l-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        className="h-8 w-8 p-0 rounded-l-none border-l-0 border-blue-700 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        aria-label="Última página"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>

    {onItemsPerPageChange && (
      <div className="flex items-center mt-3 text-sm text-blue-700">
        <span className="mr-2">Items por página:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-blue-700 rounded px-2 py-1 text-blue-700 bg-white"
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

const EnhancedPagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  className = '',
  onItemsPerPageChange = null,
}) => {
  // Detectar si es móvil SIEMPRE debe ser el primer hook
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // TODOS los cálculos con useMemo deben ejecutarse siempre, 
  // sin importar si se mostrará o no la paginación
  
  // Calcular el número total de páginas
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / itemsPerPage || 1));
  }, [totalItems, itemsPerPage]);
  
  // Ajustar la página actual para que esté dentro de los límites
  const page = useMemo(() => {
    return Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  }, [currentPage, totalPages]);
  
  // Calcular límites de items que se muestran
  const { firstItemOnPage, lastItemOnPage } = useMemo(() => {
    return {
      firstItemOnPage: totalItems > 0 ? (page - 1) * itemsPerPage + 1 : 0,
      lastItemOnPage: Math.min(page * itemsPerPage, totalItems)
    };
  }, [page, itemsPerPage, totalItems]);
  
  // Calcular números de página a mostrar
  const pageNumbers = useMemo(() => {
    const delta = isMobile ? 1 : 2;
    const range = [];

    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (range.length > 0 && range[0] > 1) {
      if (range[0] > 2) {
        range.unshift('...');
      }
      range.unshift(1);
    }

    if (range.length > 0 && range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) {
        range.push('...');
      }
      range.push(totalPages);
    }

    return range;
  }, [page, totalPages, isMobile]);
  
  // Decidir si mostrar la paginación o no
  // DESPUÉS de todos los hooks, podemos retornar null si no hay suficientes items
  if (!totalItems || !itemsPerPage || totalItems <= itemsPerPage || totalPages <= 1) {
    return null;
  }

  return (
    <div className={`pagination-container ${className}`}>
      {isMobile ? (
        <MobilePagination 
          page={page} 
          totalPages={totalPages} 
          firstItemOnPage={firstItemOnPage} 
          lastItemOnPage={lastItemOnPage} 
          totalItems={totalItems} 
          onPageChange={onPageChange} 
        />
      ) : (
        <DesktopPagination 
          page={page} 
          totalPages={totalPages} 
          pageNumbers={pageNumbers} 
          firstItemOnPage={firstItemOnPage} 
          lastItemOnPage={lastItemOnPage} 
          totalItems={totalItems} 
          onPageChange={onPageChange} 
          itemsPerPage={itemsPerPage} 
          onItemsPerPageChange={onItemsPerPageChange} 
        />
      )}
    </div>
  );
};

export default React.memo(EnhancedPagination);