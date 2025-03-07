import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;
  
  // Calculate visible page numbers
  const getPageNumbers = () => {
    // For desktop: Show more page numbers
    const pageNumbers = [];
    const maxVisiblePages = 5; // Max number of page buttons to show
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if end page is at max
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };
  
  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {/* First page and Previous page (hidden on smallest screens) */}
      <div className="hidden sm:flex space-x-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-md border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-md border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Simplified controls for mobile */}
      <div className="flex sm:hidden items-center space-x-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-md border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm text-[#29696B] px-2">
          {currentPage} / {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-md border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Page numbers - desktop only */}
      <div className="hidden sm:flex space-x-1">
        {getPageNumbers().map(pageNumber => (
          <Button
            key={pageNumber}
            variant={currentPage === pageNumber ? "default" : "outline"}
            onClick={() => onPageChange(pageNumber)}
            className={`w-8 h-8 rounded-md ${
              currentPage === pageNumber 
                ? "bg-[#29696B] hover:bg-[#29696B]/90 text-white" 
                : "border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
            }`}
          >
            {pageNumber}
          </Button>
        ))}
      </div>
      
      {/* Next page and Last page (hidden on smallest screens) */}
      <div className="hidden sm:flex space-x-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-md border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-md border-[#91BEAD]/40 hover:bg-[#DFEFE6] hover:text-[#29696B]"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;