import React from 'react';

interface PaginationProps {
  /** Total number of items */
  totalItems: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Current page number (1-based) */
  currentPage: number;
  /** Function to handle page changes */
  onPageChange: (page: number) => void;
  /** Maximum number of page buttons to show */
  maxPageButtons?: number;
}

/**
 * Reusable pagination component using the Lyme application color scheme
 */
export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  maxPageButtons = 5,
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Don't render if only one page
  if (totalPages <= 1) return null;
  
  // Calculate the range of page buttons to display
  const calculateVisiblePages = () => {
    // If total pages is less than or equal to maxPageButtons, show all pages
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate how many pages to show before and after current page
    const halfMaxButtons = Math.floor(maxPageButtons / 2);
    let startPage = Math.max(currentPage - halfMaxButtons, 1);
    let endPage = Math.min(startPage + maxPageButtons - 1, totalPages);
    
    // Adjust if we're near the end
    if (endPage === totalPages) {
      startPage = Math.max(endPage - maxPageButtons + 1, 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  const visiblePages = calculateVisiblePages();
  
  return (
    <div className="flex items-center justify-center mt-6 space-x-1">
      {/* Previous page button */}
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${currentPage === 1 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-[#D4F5E6]/80 hover:bg-[#D4F5E6]/10 hover:text-white'
          }`}
        aria-label="Página anterior"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* First page button if not visible */}
      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-[#D4F5E6]/80 hover:bg-[#D4F5E6]/10 hover:text-white"
          >
            1
          </button>
          {visiblePages[0] > 2 && (
            <span className="px-2 py-2 text-[#D4F5E6]/60">...</span>
          )}
        </>
      )}
      
      {/* Page buttons */}
      {visiblePages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${page === currentPage 
              ? 'bg-[#00888A] text-white' 
              : 'text-[#D4F5E6]/80 hover:bg-[#D4F5E6]/10 hover:text-white'
            }`}
        >
          {page}
        </button>
      ))}
      
      {/* Last page button if not visible */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="px-2 py-2 text-[#D4F5E6]/60">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-[#D4F5E6]/80 hover:bg-[#D4F5E6]/10 hover:text-white"
          >
            {totalPages}
          </button>
        </>
      )}
      
      {/* Next page button */}
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${currentPage === totalPages 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-[#D4F5E6]/80 hover:bg-[#D4F5E6]/10 hover:text-white'
          }`}
        aria-label="Página siguiente"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default Pagination;