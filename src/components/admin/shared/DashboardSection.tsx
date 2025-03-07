/**
 * Componente de sección para el panel de administración
 * Con altura dinámica y scroll configurable
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
  // Referencia al contenido para medir su altura
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar si estamos en vista móvil
  const [isMobile, setIsMobile] = useState(false);
  
  // Controlar el cambio de tamaño de ventana
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <div 
      id={`dashboard-section-${id}`}
      className={`dashboard-section border-b border-[#91BEAD]/10 last:border-b-0 ${
        isExpanded ? 'expanded' : ''
      }`}
    >
      {/* Cabecera de la sección */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center justify-between bg-white hover:bg-[#DFEFE6]/20 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`dashboard-content-${id}`}
      >
        <div className="flex items-center">
          <Icon className="w-5 h-5 text-[#29696B] mr-2" />
          <span className="font-medium text-[#29696B]">{label}</span>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-[#7AA79C] transition-transform duration-200 ${
            isExpanded ? 'transform rotate-180' : ''
          }`} 
        />
      </button>
      
      {/* Contenido de la sección */}
      <div
        id={`dashboard-content-${id}`}
        ref={contentRef}
        className={`transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-full overflow-visible' : 'max-h-0'
        }`}
        style={{
          // Si está expandido, no aplicamos altura máxima
          ...(isExpanded ? {} : { maxHeight: '0px' })
        }}
      >
        {/* Si estamos en móvil, usamos un div con altura max definida y scroll */}
        {isExpanded && isMobile ? (
          <div className="overflow-y-auto max-h-[70vh] section-mobile-content">
            {children}
          </div>
        ) : (
          // En desktop mostramos el contenido normalmente
          isExpanded && children
        )}
      </div>
      
      {/* Estilos específicos para móvil */}
      <style jsx>{`
        @media (max-width: 767px) {
          .section-mobile-content {
            /* Aseguramos scroll visible */
            -webkit-overflow-scrolling: touch;
            padding-bottom: 80px; /* Espacio adicional al final */
          }
          
          /* Clase para mostrar un indicador de scroll */
          .section-mobile-content::after {
            content: "";
            display: block;
            height: 20px;
            background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(223,239,230,0.3));
            position: sticky;
            bottom: 0;
            margin-top: -20px;
            pointer-events: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardSection;