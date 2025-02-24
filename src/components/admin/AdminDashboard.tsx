import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  Package2, 
  Users, 
  Download,
  ChevronDown,
  ShoppingCart,
  X
} from 'lucide-react';

import InventorySection from './InventorySection';
import AdminUserManagement from './AdminUserManagement';
import ClientsSection from './ClientSection';
import OrdersSection from './OrdersSection';

// Crear un contexto para compartir la función de cambio de sección
export const DashboardContext = createContext<{
  changeSection: (sectionId: string, userId?: string) => void;
  selectedUserId: string | null;
}>({
  changeSection: () => {},
  selectedUserId: null
});

// Hook personalizado para usar el contexto
export const useDashboard = () => useContext(DashboardContext);

interface Section {
  id: string;
  label: string;
  icon: any;
  component: React.ReactNode;
}

const AdminDashboard = () => {
  // Estado para mantener el ID de la sección expandida
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Estado para almacenar el ID del usuario seleccionado (para pasar entre secciones)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Ref para mantener el estado previo para animaciones
  const previousSection = useRef<string | null>(null);

  // Función para cambiar de sección (será compartida vía contexto)
  const changeSection = (sectionId: string, userId?: string) => {
    setExpandedSection(sectionId);
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // Definimos las secciones disponibles del dashboard
  const sections: Section[] = [
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Package2,
      component: <InventorySection />
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: Users,
      component: <AdminUserManagement />
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      component: <ClientsSection />
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: ShoppingCart,
      component: <OrdersSection />
    }
  ];

  // Cargar el estado guardado al montar el componente
  useEffect(() => {
    const savedSection = localStorage.getItem('adminDashboardSection');
    if (savedSection) {
      setExpandedSection(savedSection);
      previousSection.current = savedSection;
    }
  }, []);

  // Guardar el estado cuando cambie la sección expandida
  useEffect(() => {
    if (expandedSection) {
      localStorage.setItem('adminDashboardSection', expandedSection);
    } else {
      localStorage.removeItem('adminDashboardSection');
    }
    previousSection.current = expandedSection;
  }, [expandedSection]);

  // Manejar el cambio de sección con animación
  const toggleSection = (sectionId: string) => {
    setExpandedSection(currentSection => 
      currentSection === sectionId ? null : sectionId
    );
  };

  // Cerrar la sección activa
  const closeSection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSection(null);
  };

  const NavItem = ({ section }: { section: Section }) => {
    const isExpanded = expandedSection === section.id;
    const Icon = section.icon;
    const contentRef = useRef<HTMLDivElement>(null);

    // Determinar las clases de animación
    const contentClasses = `
      overflow-hidden transition-all duration-300 ease-in-out
      ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
    `;

    // Clases para el botón con hover effect mejorado
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

    // Clases para el contenedor principal con efecto de elevación
    const containerClasses = `
      border-b last:border-b-0
      transition-all duration-200 ease-in-out
      ${isExpanded ? 'shadow-sm bg-white' : ''}
    `;

    return (
      <div className={containerClasses}>
        <button
          onClick={() => toggleSection(section.id)}
          className={buttonClasses}
        >
          <Icon className="w-5 h-5 mr-3 transition-colors duration-200" />
          <span className="font-medium">{section.label}</span>
          <div className="ml-auto flex items-center space-x-2">
            {isExpanded && (
              <button
                onClick={closeSection}
                className="p-1 hover:bg-blue-100 rounded-full 
                  transition-all duration-200 ease-in-out 
                  transform hover:scale-110"
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
            {section.component}
          </div>
        </div>
      </div>
    );
  };

  // Valor del contexto que será compartido
  const dashboardContextValue = {
    changeSection,
    selectedUserId
  };

  return (
    <DashboardContext.Provider value={dashboardContextValue}>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 
            transform transition-all duration-300 ease-out
            hover:translate-x-2"
          >
            Panel de Administración
          </h1>
          
          <div className="bg-white rounded-lg shadow-md 
            transition-all duration-300 ease-in-out
            hover:shadow-lg"
          >
            {sections.map(section => (
              <NavItem 
                key={section.id} 
                section={section}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardContext.Provider>
  );
};

export default AdminDashboard;