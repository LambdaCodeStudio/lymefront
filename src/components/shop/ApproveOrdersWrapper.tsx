import React, { useState, useEffect, useCallback } from 'react';
import { ShopNavbar } from './ShopNavbar';
import { ApproveOrderList } from './ApproveOrderList';
import { 
  AlertCircle, 
  Loader2, 
  ShieldAlert, 
  RefreshCw,
  ClipboardCheck
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getApiUrl } from '@/utils/apiUtils';

// Importación segura de useNotification
let useNotification;
try {
  useNotification = require('@/context/NotificationContext').useNotification;
} catch (e) {
  console.warn('NotificationContext no disponible, las notificaciones estarán desactivadas');
  useNotification = () => ({
    addNotification: (message, type) => {
      console.log(`Notificación (${type}): ${message}`);
    }
  });
}

/**
 * Componente principal para la página de aprobación de pedidos
 * Solo accesible para supervisores
 */
const ApproveOrdersWrapper: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Hook de notificaciones
  const { addNotification } = useNotification();
  
  // Verificar autorización del usuario
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        setLoading(true);
        
        // Comprobar si hay token de autenticación
        const token = localStorage.getItem('token');
        if (!token) {
          setError("No estás autenticado. Por favor, inicia sesión.");
          window.location.href = '/login';
          return;
        }
        
        // Obtener información del usuario
        const userResponse = await fetch('http://179.43.118.101:4000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!userResponse.ok) {
          throw new Error(`Error al obtener información del usuario (${userResponse.status})`);
        }
        
        const userData = await userResponse.json();
        
        // Guardar rol del usuario
        const role = userData.role;
        setUserRole(role);
        
        // Verificar si el usuario es un supervisor
        if (role === 'supervisor') {
          setIsAuthorized(true);
        } else {
          setError("No tienes permisos para acceder a esta página. Esta función es exclusiva para supervisores.");
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Error al verificar autorización:', error);
        setError(`Error de autorización: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthorization();
  }, []);
  
  // Función para recargar los datos
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    
    // Esta función es un placeholder - se activa desde el botón de recarga
    // pero la recarga real se maneja en el componente ApproveOrderList
    // mediante su prop key o reloadTrigger
    
    setTimeout(() => {
      setRefreshing(false);
      if (addNotification) {
        addNotification('Datos actualizados correctamente', 'success');
      }
    }, 500);
  }, [addNotification]);
  
  // Si está cargando, mostrar indicador
  if (loading) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-20">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#2A82C7] mb-4" />
            <p className="text-[#F8F9FA] text-lg">Verificando permisos...</p>
          </div>
        </div>
      </>
    );
  }
  
  // Si no está autorizado, mostrar mensaje de error
  if (!isAuthorized) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <Alert className="bg-red-900/30 border-red-500 shadow-md mb-6">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <AlertDescription className="ml-2 text-white">
                {error || "No tienes permisos para acceder a esta página. Esta función es exclusiva para supervisores."}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => window.location.href = '/shop'}
                className="bg-[#15497E] hover:bg-[#2A82C7] text-white"
              >
                Volver a la tienda
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Mostrar página de aprobación de pedidos si está autorizado
  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-3xl font-bold mb-4 md:mb-0 flex items-center text-[#F8F9FA]">
              <ClipboardCheck className="mr-3 h-8 w-8" />
              Aprobación de Pedidos
            </h1>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-[#2A82C7] text-white hover:bg-[#2A82C7]/20"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>
          
          {/* Lista de pedidos para aprobar */}
          <ApproveOrderList key={refreshing ? 'refresh' : 'no-refresh'} />
        </div>
      </div>
    </>
  );
};

export default ApproveOrdersWrapper;