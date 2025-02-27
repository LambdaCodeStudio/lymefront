import React, { useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface DashboardSectionProps {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  id,
  label,
  icon: Icon,
  isExpanded,
  onToggle,
  children
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Clases para el contenido con animación
  const contentClasses = `
    overflow-hidden transition-all duration-300 ease-in-out
    ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
  `;

  // Clases para el botón con hover effect
  const buttonClasses = `
    flex items-center w-full p-4 text-left
    transition-all duration-200 ease-in-out
    ${isExpanded 
      ? 'bg-blue-50 text-blue-700 shadow-sm' 
      : 'hover:bg-gray-50 hover:shadow-sm'
    }
  `;

  // Clases para el icono con rotación suave
  const iconClasses = `
    w-5 h-5 transition-all duration-300 ease-in-out transform
    ${isExpanded ? 'rotate-180 text-blue-700' : 'text-gray-500'}
  `;

  // Clases para el contenedor principal
  const containerClasses = `
    border-b last:border-b-0
    transition-all duration-200 ease-in-out
    ${isExpanded ? 'shadow-sm bg-white' : ''}
  `;

  // Función para cerrar la sección
  const closeSection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div className={containerClasses} data-section-id={id}>
      <button
        onClick={onToggle}
        className={buttonClasses}
        aria-expanded={isExpanded}
      >
        <Icon className="w-5 h-5 mr-3 transition-colors duration-200" />
        <span className="font-medium">{label}</span>
        <div className="ml-auto flex items-center space-x-2">
          {isExpanded && (
            <button
              onClick={closeSection}
              className="p-1 hover:bg-blue-100 rounded-full 
                transition-all duration-200 ease-in-out 
                transform hover:scale-110"
              aria-label="Cerrar sección"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={iconClasses} />
        </div>
      </button>

      {/* Contenedor animado para el contenido */}
      <div className={contentClasses} ref={contentRef}>
        <div className={`
          border-t transition-all duration-300
          ${isExpanded ? 'opacity-100' : 'opacity-0'}
        `}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;