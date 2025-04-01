import React, { useEffect } from 'react';
import { 
  Package2, 
  Users, 
  ShoppingCart, 
  Download
} from 'lucide-react';

import { QueryClient, QueryClientProvider } from 'react-query';
import InventorySection from './inventario/InventorySection';
import AdminUserManagement from './AdminUserManagement';
import ClientsSection from './clientes/ClientSection';
import OrdersSection from './OrdersSection';
import { DashboardContext, useDashboardState } from '@/hooks/useDashboard';
import DashboardSection from '../../shared/DashboardSection';
import { useAuth } from '@/hooks/useAuth';
import { InventoryProvider } from '@/context/InventoryProvider';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationsContainer from '@/components/ui/Notifications';
import DownloadsManagement from './DownloadsManagement';

// Crea una instancia de QueryClient (fuera del componente para que no se reinicie en cada render)
const queryClient = new QueryClient();

// Definición de las secciones
interface Section {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  component: React.ReactNode;
}

const AdminDashboard: React.FC = () => {
  // Usar el hook de dashboard
  const dashboardState = useDashboardState();
  const { currentSection, changeSection } = dashboardState;
  const auth = useAuth();

  // Efecto para cargar la sección guardada
  useEffect(() => {
    const savedSection = localStorage.getItem('currentDashboardSection');
    const savedEntityId = localStorage.getItem('selectedEntityId');
    const savedUserId = localStorage.getItem('selectedUserId');
    
    if (savedSection) {
      changeSection(savedSection, savedEntityId || undefined);
    }
    
    // Cargar el ID de usuario si existe
    if (savedUserId && dashboardState.setSelectedUserId) {
      dashboardState.setSelectedUserId(savedUserId);
    }
  }, []);

  // Verificar si es administrador
  useEffect(() => {
    if (auth.user && auth.user.role !== 'admin' && auth.user.role !== 'supervisor_de_supervisores') {
      window.location.href = '/unauthorized';
    }
  }, [auth.user]);

  // Definimos las secciones disponibles con el componente de Inventario envuelto en InventoryProvider
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
    },
    {
      id: 'downloads',
      label: 'Descargas',
      icon: Download,
      component: <DownloadsManagement />
    }
  ];

  // Si está cargando o no está autenticado, mostrar un mensaje
  if (auth.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#DFEFE6]">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-[#29696B] animate-pulse"></div>
            <div className="w-4 h-4 rounded-full bg-[#7AA79C] animate-pulse delay-300"></div>
            <div className="w-4 h-4 rounded-full bg-[#8DB3BA] animate-pulse delay-500"></div>
            <span className="text-[#29696B] font-medium ml-2">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#DFEFE6]">
        <div className="bg-white p-8 rounded-xl shadow-lg text-[#29696B] font-medium">
          No autorizado
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
    <InventoryProvider>
      <DashboardContext.Provider value={dashboardState}>
        <NotificationProvider>
          <div className="min-h-screen bg-[#DFEFE6] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-[#29696B] transition-all duration-300 ease-out hover:translate-x-2">
                  Panel de Administración
                </h1>
                <div className="hidden sm:flex items-center space-x-1">
                  {sections.map(section => (
                    <button
                      key={`nav-${section.id}`}
                      onClick={() => changeSection(
                        currentSection === section.id ? null : section.id
                      )}
                      className={`px-4 py-2 rounded-lg flex items-center transition-all ${
                        currentSection === section.id
                          ? 'bg-[#29696B] text-white'
                          : 'bg-white text-[#29696B] hover:bg-[#91BEAD]/20'
                      }`}
                    >
                      <section.icon className={`w-4 h-4 mr-2 ${
                        currentSection === section.id ? 'text-white' : 'text-[#7AA79C]'
                      }`} />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#91BEAD]/10">
                {sections.map(section => (
                  <DashboardSection 
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    icon={section.icon}
                    isExpanded={currentSection === section.id}
                    onToggle={() => changeSection(
                      currentSection === section.id ? null : section.id
                    )}
                  >
                    {section.component}
                  </DashboardSection>
                ))}
              </div>
            </div>
          </div>
          
          {/* Este es el componente que realmente muestra las notificaciones */}
          <NotificationsContainer />
        </NotificationProvider>
      </DashboardContext.Provider>
    </InventoryProvider>
    </QueryClientProvider>
  );
};

export default AdminDashboard;