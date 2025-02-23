import React, { useState, useEffect } from 'react';
import { 
  Package2, 
  Users, 
  Download,
  ChevronDown,
  X
} from 'lucide-react';

import InventorySection from './InventorySection';
import AdminUserManagement from './AdminUserManagement';
import DownloadsManagement from './DownloadsManagement';

interface Section {
  id: string;
  label: string;
  icon: any;
  component: React.ReactNode;
}

const AdminDashboard = () => {
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
      id: 'downloads',
      label: 'Descargas',
      icon: Download,
      component: <DownloadsManagement />
    }
  ];

  // Estado para mantener el ID de la sección actualmente expandida
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Cargar el estado guardado al montar el componente
  useEffect(() => {
    const savedSection = localStorage.getItem('adminDashboardSection');
    if (savedSection) {
      setExpandedSection(savedSection);
    }
  }, []);

  // Guardar el estado cuando cambie la sección expandida
  useEffect(() => {
    if (expandedSection) {
      localStorage.setItem('adminDashboardSection', expandedSection);
    } else {
      localStorage.removeItem('adminDashboardSection');
    }
  }, [expandedSection]);

  // Manejar el cambio de sección
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

    return (
      <div className="border-b last:border-b-0">
        <button
          onClick={() => toggleSection(section.id)}
          className={`flex items-center w-full p-4 text-left transition-colors
            ${isExpanded ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
          `}
        >
          <Icon className="w-5 h-5 mr-3" />
          <span className="font-medium">{section.label}</span>
          <div className="ml-auto flex items-center space-x-2">
            {isExpanded && (
              <button
                onClick={closeSection}
                className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown 
              className={`w-5 h-5 transition-transform duration-200
                ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </div>
        </button>

        {/* Contenido de la sección con transición suave */}
        {isExpanded && (
          <div className="border-t">
            {section.component}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Panel de Administración
        </h1>
        
        <div className="bg-white rounded-lg shadow">
          {sections.map(section => (
            <NavItem key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
};


export default AdminDashboard;