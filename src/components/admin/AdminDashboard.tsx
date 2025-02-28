import React, { useEffect } from 'react';
import { 
  Package2, 
  Users, 
  ShoppingCart 
} from 'lucide-react';

import InventorySection from './InventorySection';
import AdminUserManagement from './AdminUserManagement';
import ClientsSection from './ClientSection';
import OrdersSection from './OrdersSection';
import { DashboardContext, useDashboardState } from '@/hooks/useDashboard';
import DashboardSection from './shared/DashboardSection';
import { useAuth } from '@/hooks/useAuth';
import { InventoryProvider } from '@/context/InventoryProvider';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationsContainer from '@/components/ui/Notifications';

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
    if (auth.user && auth.user.role !== 'admin' && auth.user.role !== 'basic') {
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
    }
  ];

  // Si está cargando o no está autenticado, mostrar un mensaje
  if (auth.loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!auth.isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">No autorizado</div>;
  }

  return (
    <InventoryProvider>
      <DashboardContext.Provider value={dashboardState}>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-7xl mx-auto px-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-6 transform transition-all duration-300 ease-out hover:translate-x-2">
                Panel de Administración
              </h1>
              
              <div className="bg-white rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
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
  );
};

export default AdminDashboard;