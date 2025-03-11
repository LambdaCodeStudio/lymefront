import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Building, 
  MapPin, 
  Eye, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock,
  Package,
  CalendarRange,
  X,
  DollarSign,
  Hash,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShopNavbar } from './ShopNavbar';

// Intentar usar el contexto de notificaciones de forma segura
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

// Tipos de datos
interface OrderProduct {
  productoId: string | { _id: string; [key: string]: any };
  cantidad: number;
  nombre?: string;
  precio?: number;
}

interface Order {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | { _id: string; email?: string; [key: string]: any };
  fecha: string;
  productos: OrderProduct[];
  detalle?: string;
  numero?: string;
  nPedido?: number; // Campo específico para número de pedido (backend)
  displayNumber?: string; // Campo para mostrar consistentemente
  total?: number;
  estado?: 'pendiente' | 'aprobado' | 'rechazado'; // Estado del pedido
  metadata?: any; // Metadatos adicionales
}

interface Cliente {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | {
    _id: string;
    email?: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
  };
}

// Componente principal
export const OrdersPage: React.FC = () => {
  // Usar el hook de notificaciones de forma segura
  const { addNotification } = useNotification();

  // Estados
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDetailsOpen, setOrderDetailsOpen] = useState<string | null>(null);
  const [isDownloadingRemito, setIsDownloadingRemito] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [cachedProducts, setCachedProducts] = useState<Record<string, any>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Filtro de fechas
  const [dateFilter, setDateFilter] = useState({
    fechaInicio: '',
    fechaFin: ''
  });

  // Filtro por estado
  const [stateFilter, setStateFilter] = useState<string>('all');

  // Para almacenar la hora de última carga
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  // Calcular el total de un pedido
  const calculateOrderTotal = (order: Order): number => {
    if (!Array.isArray(order.productos)) return 0;
    
    return order.productos.reduce((total, item) => {
      let price = 0;
      
      // Primero intentamos usar el precio que ya viene en el item
      if (typeof item.precio === 'number') {
        price = item.precio;
      } else if (typeof item.productoId === 'object' && item.productoId && typeof item.productoId.precio === 'number') {
        // Si el producto está poblado y tiene precio
        price = item.productoId.precio;
      } else {
        // Extraer ID del producto para buscar en caché
        const productId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
        
        // Verificar en caché
        if (cachedProducts[productId] && typeof cachedProducts[productId].precio === 'number') {
          price = cachedProducts[productId].precio;
        }
      }
      
      return total + (price * item.cantidad);
    }, 0);
  };

  // Cargar datos iniciales cuando el componente se monta
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    
    fetchUser()
      .then(userId => {
        if (userId) {
          Promise.all([
            fetchOrders(true),
            fetchClients(userId)
          ]);
        }
      })
      .catch(error => {
        console.error('Error al cargar datos iniciales:', error);
        setError('Error al cargar datos iniciales. Por favor, inténtelo de nuevo.');
        setLoading(false);
      });
  }, []);

  // Filtrar pedidos cuando cambia el término de búsqueda, estado o los pedidos
  useEffect(() => {
    if (!orders.length) return;
    
    let result = [...orders];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      result = result.filter(order => 
        order.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.seccionDelServicio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.displayNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof order.userId === 'object' && order.userId.email 
          ? order.userId.email.toLowerCase().includes(searchTerm.toLowerCase())
          : false)
      );
    }

    // Filtrar por estado
    if (stateFilter !== 'all') {
      result = result.filter(order => 
        order.estado === stateFilter
      );
    }
    
    setFilteredOrders(result);
  }, [searchTerm, stateFilter, orders]);

  // Obtener información del usuario actual
  const fetchUser = async (): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch('https://lyme-back.vercel.app/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del usuario');
      }

      const userData = await response.json();
      return userData._id || userData.id || null;
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      setError('Error al cargar información del usuario. Por favor, inténtelo de nuevo.');
      return null;
    }
  };

  // Cargar pedidos - con lógica mejorada de caché
  const fetchOrders = useCallback(async (forceRefresh = false) => {
    // Verificar si estamos en tiempo de caché y no se forzó actualización
    const now = Date.now();
    if (!forceRefresh && orders.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      console.log('Usando datos en caché para pedidos');
      return;
    }
    
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      const response = await fetch('https://lyme-back.vercel.app/api/pedido', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userSecciones');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Error al cargar pedidos (estado: ${response.status})`);
      }
  
      const allOrders = await response.json();
      
      // Obtener información del usuario actual
      const userResponse = await fetch('https://lyme-back.vercel.app/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        throw new Error(`Error al obtener información del usuario (estado: ${userResponse.status})`);
      }
      
      const userData = await userResponse.json();
      const userId = userData._id || userData.id;
      const userRole = userData.role;
      const userSecciones = userData.secciones;
      
      // Almacenar el rol de usuario
      setUserRole(userRole);
      localStorage.setItem('userRole', userRole);
      
      // Obtener clientes para filtrar pedidos
      const clientsResponse = await fetch(`https://lyme-back.vercel.app/api/cliente/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!clientsResponse.ok) {
        throw new Error(`Error al cargar clientes (estado: ${clientsResponse.status})`);
      }
      
      const clientsData = await clientsResponse.json();
      setClients(clientsData);
      
      // Filtrar pedidos según el rol y la sección del usuario
      let userOrders = allOrders;
      
      // Si es supervisor, mostrar los pedidos de sus operarios (pendientes)
      // más sus propios pedidos
      if (userRole === 'supervisor') {
        userOrders = allOrders.filter(order => {
          // Mostrar pedidos pendientes creados por sus operarios
          if (order.estado === 'pendiente' && order.metadata?.supervisorId === userId) {
            return true;
          }
          
          // Mostrar pedidos propios
          if (typeof order.userId === 'object') {
            return order.userId._id === userId;
          } else {
            return order.userId === userId;
          }
        });
      } 
      // Si es operario, solo mostrar sus pedidos
      else if (userRole === 'operario') {
        // Buscar pedidos donde el operario aparece en los metadatos
        userOrders = allOrders.filter(order => {
          // Mostrar pedidos donde el operario es el creador en metadatos
          if (order.metadata?.operarioId === userId) {
            return true;
          }
          
          // También mostrar si está directamente asignado
          if (typeof order.userId === 'object') {
            return order.userId._id === userId;
          } else {
            return order.userId === userId;
          }
        });
      }
      // Si es otro rol, filtrar solo por asignación directa y sección
      else {
        // Crear un mapa de clientes para filtrado eficiente
        const userClientMap = {};
        clientsData.forEach(client => {
          if (client.servicio) {
            const key = `${client.servicio}-${client.seccionDelServicio || ''}`;
            userClientMap[key] = true;
          }
        });
        
        userOrders = allOrders.filter(order => {
          // Si es asignado directo
          let isDirectlyAssigned = false;
          if (typeof order.userId === 'object') {
            isDirectlyAssigned = order.userId._id === userId;
          } else {
            isDirectlyAssigned = order.userId === userId;
          }
          
          // Si coincide con algún cliente por servicio/sección
          let matchesClientServices = false;
          if (order.servicio) {
            const orderKey = `${order.servicio}-${order.seccionDelServicio || ''}`;
            matchesClientServices = userClientMap[orderKey] === true;
          }
          
          // Filtrar por sección del usuario
          let matchesUserSection = true;
          if (userSecciones && userSecciones !== 'ambos') {
            const esLimpieza = order.servicio?.toLowerCase() === 'limpieza';
            const esMantenimiento = order.servicio?.toLowerCase() === 'mantenimiento';
            
            if (userSecciones === 'limpieza' && !esLimpieza) {
              matchesUserSection = false;
            }
            if (userSecciones === 'mantenimiento' && !esMantenimiento) {
              matchesUserSection = false;
            }
          }
          
          return (isDirectlyAssigned || matchesClientServices) && matchesUserSection;
        });
      }
      
      // Procesar pedidos (calcular totales y ordenar)
      const processedOrders = userOrders.map((order) => ({
        ...order,
        displayNumber: order.nPedido?.toString() || order.numero || 'S/N',
        total: calculateOrderTotal(order),
        // Asegurar que todos los pedidos tengan un estado
        estado: order.estado || 'aprobado' // Por defecto, considerar aprobado
      })).sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
      setLastFetchTime(Date.now());
      setError(null);
      
      // Crear caché de productos para cálculos de precios
      const productCache = {};
      userOrders.forEach(order => {
        if (Array.isArray(order.productos)) {
          order.productos.forEach(item => {
            if (typeof item.productoId === 'object' && item.productoId) {
              const productId = item.productoId._id;
              if (productId) {
                productCache[productId] = {
                  nombre: item.productoId.nombre || item.nombre || 'Producto desconocido',
                  precio: item.productoId.precio || item.precio || 0
                };
              }
            } else if (item.nombre && typeof item.precio === 'number' && typeof item.productoId === 'string') {
              productCache[item.productoId] = {
                nombre: item.nombre,
                precio: item.precio
              };
            }
          });
        }
      });
      
      setCachedProducts(productCache);
      
    } catch (err) {
      const errorMsg = 'Error al cargar pedidos: ' +
        (err instanceof Error ? err.message : String(err));
      console.error(errorMsg);
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orders.length, lastFetchTime]);

  // Función para refrescar manualmente
  const handleManualRefresh = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  // Cargar clientes para el usuario actual
  const fetchClients = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch(`https://lyme-back.vercel.app/api/cliente/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar clientes (estado: ${response.status})`);
      }

      const data = await response.json();
      setClients(data);
      
      console.log(`Cargados ${data.length} clientes`);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      // Esto no es crítico, así que no establecemos el estado de error principal
    }
  };

  // Filtrar pedidos por rango de fechas
  const filterOrdersByDate = async () => {
    if (!dateFilter.fechaInicio || !dateFilter.fechaFin) {
      setError('Por favor seleccione ambas fechas, inicio y fin');
      
      if (addNotification) {
        addNotification('Por favor seleccione ambas fechas, inicio y fin', 'warning');
      }
      
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const url = `https://lyme-back.vercel.app/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al filtrar pedidos por fecha (estado: ${response.status})`);
      }

      const data = await response.json();
      
      // Procesar como en la carga inicial, pero con los resultados filtrados por fecha
      const userId = localStorage.getItem('userId') || '';
      
      // Filtrar por cliente/usuario actual
      const userOrders = data.filter(order => {
        // Si el usuario es el creador directo
        let isDirectlyAssigned = false;
        if (typeof order.userId === 'object') {
          isDirectlyAssigned = order.userId._id === userId;
        } else {
          isDirectlyAssigned = order.userId === userId;
        }
        
        // Si es un operario en los metadatos
        let isOperatorInMeta = order.metadata?.operarioId === userId;
        
        // Si es un supervisor en los metadatos
        let isSupervisorInMeta = order.metadata?.supervisorId === userId;
        
        return isDirectlyAssigned || isOperatorInMeta || isSupervisorInMeta;
      });
      
      // Procesar pedidos (añadir displayNumber y calcular total)
      const processedOrders = userOrders.map((order) => ({
        ...order,
        displayNumber: order.nPedido?.toString() || order.numero || 'S/N',
        total: calculateOrderTotal(order),
        estado: order.estado || 'aprobado' // Valor por defecto
      }));
      
      // Ordenar por fecha (más recientes primero)
      processedOrders.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
      setError(null);
      
      const successMsg = `Se encontraron ${processedOrders.length} pedidos en el rango de fechas seleccionado`;
      
      if (addNotification) {
        addNotification(successMsg, processedOrders.length === 0 ? 'info' : 'success');
      }
      
      // Cerrar filtros móviles si están abiertos
      setShowMobileFilters(false);
    } catch (err) {
      const errorMsg = 'Error al filtrar por fecha: ' +
        (err instanceof Error ? err.message : String(err));
      console.error(errorMsg, err);
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter({ fechaInicio: '', fechaFin: '' });
    setStateFilter('all');
    fetchOrders(true);
    setShowMobileFilters(false);
    
    if (addNotification) {
      addNotification('Filtros eliminados. Mostrando todos los pedidos.', 'info');
    }
  };

  // Alternar detalles del pedido
  const toggleOrderDetails = (orderId: string) => {
    if (orderDetailsOpen === orderId) {
      setOrderDetailsOpen(null);
    } else {
      setOrderDetailsOpen(orderId);
    }
  };

  // Descargar remito
  const handleRemitoDownload = async (orderId: string) => {
    if (!orderId) return;
    
    try {
      setIsDownloadingRemito(orderId);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      console.log(`Iniciando descarga de remito para pedido: ${orderId}`);
      
      const response = await fetch(`https://lyme-back.vercel.app/api/downloads/remito/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        method: 'GET'
      });
      
      // Verificar si la respuesta es válida
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      // Convertir respuesta a blob
      const blob = await response.blob();
      
      // Verificar que el blob no esté vacío
      if (!blob || blob.size === 0) {
        throw new Error('La respuesta del servidor está vacía');
      }
      
      // Obtener información del pedido para el nombre del archivo
      const order = orders.find(o => o._id === orderId);
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Usar el displayNumber para el nombre del archivo
      link.setAttribute('download', `remito_${order?.displayNumber || orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Remito descargado correctamente');
      
      if (addNotification) {
        addNotification('Remito descargado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error al descargar remito:', error);
      
      if (addNotification) {
        addNotification(`Error al descargar remito: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setIsDownloadingRemito(null);
    }
  };

  // Funciones para aprobar/rechazar pedido (solo para supervisores)
  const handleApproveOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'aprobado' })
      });
      
      if (!response.ok) {
        throw new Error(`Error al aprobar pedido (estado: ${response.status})`);
      }
      
      // Actualizar pedido en el estado local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { ...order, estado: 'aprobado' } 
            : order
        )
      );
      
      if (addNotification) {
        addNotification('Pedido aprobado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error al aprobar pedido:', error);
      
      if (addNotification) {
        addNotification(`Error al aprobar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }
  };
  
  const handleRejectOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'rechazado' })
      });
      
      if (!response.ok) {
        throw new Error(`Error al rechazar pedido (estado: ${response.status})`);
      }
      
      // Actualizar pedido en el estado local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { ...order, estado: 'rechazado' } 
            : order
        )
      );
      
      if (addNotification) {
        addNotification('Pedido rechazado', 'warning');
      }
    } catch (error) {
      console.error('Error al rechazar pedido:', error);
      
      if (addNotification) {
        addNotification(`Error al rechazar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Obtener nombre del cliente por servicio y sección
  const getClientName = (servicio: string, seccion?: string): string => {
    const client = clients.find(
      c => c.servicio === servicio && c.seccionDelServicio === (seccion || '')
    );
    
    if (client) {
      return seccion 
        ? `${servicio} - ${seccion}`
        : servicio;
    }
    
    return seccion 
      ? `${servicio} - ${seccion}` 
      : servicio;
  };

  // Obtener email del usuario desde el pedido
  const getUserEmail = (userId: any): string => {
    if (typeof userId === 'object' && userId !== null && userId.email) {
      return userId.email;
    }
    
    return 'N/A';
  };

  // Obtener una clase CSS para el badge de estado
  const getStatusBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'aprobado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rechazado':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Obtener icono para estado
  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <HelpCircle className="w-3 h-3 mr-1" />;
      case 'aprobado':
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'rechazado':
        return <XCircle className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center text-[#F8F9FA]">
            <ShoppingCart className="mr-3 h-8 w-8" />
            Mis Pedidos
          </h1>
          
          {/* Alertas */}
          {error && (
            <Alert className="mb-6 bg-red-900/30 border border-red-500">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="ml-2 text-white">{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Filtros para escritorio */}
          <div className="mb-6 space-y-4 hidden md:block bg-white/10 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-[#2A82C7]/20">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C757D] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white placeholder:text-[#F8F9FA]/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button
                variant="outline"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="fechaInicio" className="text-[#F8F9FA] text-sm font-medium">
                  Fecha Inicio
                </label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={dateFilter.fechaInicio}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                  className="w-full bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="fechaFin" className="text-[#F8F9FA] text-sm font-medium">
                  Fecha Fin
                </label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={dateFilter.fechaFin}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                  className="w-full bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white mt-1"
                />
              </div>
              
              {/* Filtro por estado */}
              <div>
                <label htmlFor="estadoFilter" className="text-[#F8F9FA] text-sm font-medium">
                  Estado
                </label>
                <select
                  id="estadoFilter"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full bg-white/10 border-[#2A82C7] focus:border-[#15497E] rounded-md text-white py-2 px-3 mt-1"
                >
                  <option value="all" className="bg-[#15497E] text-white">Todos</option>
                  <option value="pendiente" className="bg-[#15497E] text-white">Pendientes</option>
                  <option value="aprobado" className="bg-[#15497E] text-white">Aprobados</option>
                  <option value="rechazado" className="bg-[#15497E] text-white">Rechazados</option>
                </select>
              </div>
              
              <Button
                variant="outline"
                onClick={filterOrdersByDate}
                className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar por Fecha
              </Button>
              
              {(dateFilter.fechaInicio || dateFilter.fechaFin || searchTerm || stateFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-[#6C757D] hover:text-[#F8F9FA] hover:bg-[#2A82C7]/30"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Filtros para móvil */}
          <div className="mb-6 space-y-4 md:hidden">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-[#2A82C7]/20">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C757D] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white placeholder:text-[#F8F9FA]/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex-shrink-0 border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex-shrink-0 border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            {showMobileFilters && (
              <div className="p-4 bg-[#2A82C7]/10 rounded-lg border border-[#2A82C7]/20 space-y-4">
                {/* Fechas */}
                <h3 className="font-medium text-sm text-[#F8F9FA]">Filtrar por fecha</h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="mFechaInicio" className="text-xs text-[#F8F9FA]">
                      Fecha Inicio
                    </label>
                    <Input
                      id="mFechaInicio"
                      type="date"
                      value={dateFilter.fechaInicio}
                      onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                      className="w-full text-sm bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="mFechaFin" className="text-xs text-[#F8F9FA]">
                      Fecha Fin
                    </label>
                    <Input
                      id="mFechaFin"
                      type="date"
                      value={dateFilter.fechaFin}
                      onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                      className="w-full text-sm bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white mt-1"
                    />
                  </div>
                </div>
                
                {/* Estado */}
                <div>
                  <label htmlFor="mEstadoFilter" className="text-xs text-[#F8F9FA]">
                    Estado
                  </label>
                  <select
                    id="mEstadoFilter"
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full bg-white/10 border-[#2A82C7] focus:border-[#15497E] rounded-md text-white py-2 px-3 mt-1 text-sm"
                  >
                    <option value="all" className="bg-[#15497E] text-white">Todos</option>
                    <option value="pendiente" className="bg-[#15497E] text-white">Pendientes</option>
                    <option value="aprobado" className="bg-[#15497E] text-white">Aprobados</option>
                    <option value="rechazado" className="bg-[#15497E] text-white">Rechazados</option>
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
                  >
                    Limpiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={filterOrdersByDate}
                    className="text-xs bg-[#15497E] hover:bg-[#2A82C7] text-white"
                  >
                    Aplicar Filtros
                  </Button>
                </div>
              </div>
            )}

            {(dateFilter.fechaInicio || dateFilter.fechaFin) && (
              <div className="px-3 py-2 bg-[#2A82C7]/20 rounded-md text-xs text-[#F8F9FA] flex items-center justify-between border border-[#2A82C7]/20">
                <div>
                  <CalendarRange className="w-3 h-3 inline mr-1" />
                  <span>
                    {dateFilter.fechaInicio && new Date(dateFilter.fechaInicio).toLocaleDateString()}
                    {dateFilter.fechaInicio && dateFilter.fechaFin && ' al '}
                    {dateFilter.fechaFin && new Date(dateFilter.fechaFin).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 text-xs px-2 text-[#6C757D] hover:text-[#F8F9FA] hover:bg-[#2A82C7]/30"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            {stateFilter !== 'all' && (
              <div className="px-3 py-2 bg-[#2A82C7]/20 rounded-md text-xs text-[#F8F9FA] flex items-center justify-between border border-[#2A82C7]/20">
                <div>
                  <span>
                    Estado: {stateFilter === 'pendiente' ? 'Pendientes' : stateFilter === 'aprobado' ? 'Aprobados' : 'Rechazados'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStateFilter('all')}
                  className="h-6 text-xs px-2 text-[#6C757D] hover:text-[#F8F9FA] hover:bg-[#2A82C7]/30"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#F8F9FA]" />
                <p className="mt-4 text-[#F8F9FA]">Cargando tus pedidos...</p>
              </div>
            </div>
          )}

          {/* Sin pedidos */}
          {!loading && filteredOrders.length === 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm p-8 text-center border border-[#2A82C7]/20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#15497E]/30 rounded-full mb-4">
                <ShoppingCart className="w-8 h-8 text-[#F8F9FA]" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[#F8F9FA]">No se encontraron pedidos</h2>
              <p className="text-[#6C757D] max-w-lg mx-auto">
                {searchTerm || stateFilter !== 'all'
                  ? `No hay pedidos que coincidan con tu búsqueda` 
                  : dateFilter.fechaInicio || dateFilter.fechaFin
                    ? "No se encontraron pedidos en el rango de fechas seleccionado" 
                    : "Aún no has realizado ningún pedido. Comienza a comprar para ver tus pedidos aquí."}
              </p>
              {(searchTerm || dateFilter.fechaInicio || dateFilter.fechaFin || stateFilter !== 'all') && (
                <Button 
                  onClick={clearAllFilters}
                  className="mt-4 bg-[#15497E] hover:bg-[#2A82C7] text-white"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}

          {/* Lista de pedidos */}
          {!loading && filteredOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-medium mb-4 flex items-center text-[#F8F9FA]">
                Tus Pedidos
                <Badge variant="outline" className="ml-3 bg-white/10 text-[#F8F9FA] border-[#2A82C7]">
                  {filteredOrders.length} pedidos
                </Badge>
              </h2>

              {/* Vista para escritorio */}
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[#2A82C7]/20">
                  <table className="w-full">
                    <thead className="bg-[#15497E]/30 text-[#F8F9FA] border-b border-[#2A82C7]/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Pedido #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Productos
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A82C7]/20">
                      {filteredOrders.map((order) => (
                        <React.Fragment key={order._id}>
                          <tr className="hover:bg-[#15497E]/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center font-medium">
                                <Hash className="w-4 h-4 text-[#6C757D] mr-2" />
                                {order.displayNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>{formatDate(order.fecha)}</div>
                              <div className="text-xs text-[#6C757D]">
                                {new Date(order.fecha).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Building className="w-4 h-4 text-[#6C757D] mr-2" />
                                <div>
                                  <div className="font-medium">{order.servicio}</div>
                                  {order.seccionDelServicio && (
                                    <div className="text-xs text-[#6C757D] flex items-center mt-1">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {order.seccionDelServicio}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getStatusBadgeClass(order.estado || 'aprobado')}>
                                {getStatusIcon(order.estado || 'aprobado')}
                                {order.estado === 'pendiente' ? 'Pendiente' : 
                                  order.estado === 'aprobado' ? 'Aprobado' : 
                                  order.estado === 'rechazado' ? 'Rechazado' : 
                                  'Desconocido'}
                              </Badge>
                              
                              {/* Información del operario si existe */}
                              {order.metadata?.operarioNombre && (
                                <div className="text-xs text-[#6C757D] mt-1">
                                  Creado por: {order.metadata.operarioNombre}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className="bg-[#2A82C7]/30 text-[#F8F9FA] border-[#2A82C7]/50">
                                {order.productos?.length || 0} items
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleOrderDetails(order._id)}
                                className="ml-2 text-[#6C757D] hover:text-[#F8F9FA] hover:bg-[#15497E]/20"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-bold">
                              ${order.total?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end">
                                {/* Acciones de aprobación para supervisores y estado pendiente */}
                                {userRole === 'supervisor' && order.estado === 'pendiente' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApproveOrder(order._id)}
                                      className="mr-2 border-green-500 text-green-500 hover:bg-green-500/20"
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Aprobar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRejectOrder(order._id)}
                                      className="mr-2 border-red-500 text-red-500 hover:bg-red-500/20"
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Rechazar
                                    </Button>
                                  </>
                                )}
                                
                                {/* Descargar remito - solo para aprobados */}
                                {order.estado !== 'rechazado' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemitoDownload(order._id)}
                                    disabled={isDownloadingRemito === order._id}
                                    className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#15497E]/30"
                                  >
                                    {isDownloadingRemito === order._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Download className="h-4 w-4 mr-1.5" />
                                        Remito
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Detalles del pedido (expandido) */}
                          {orderDetailsOpen === order._id && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-[#15497E]/20">
                                <div className="space-y-3">
                                  <h3 className="font-medium text-[#F8F9FA]">Detalles del Pedido #{order.displayNumber}</h3>
                                  
                                  {/* Productos del pedido */}
                                  <div className="bg-white/5 rounded-md border border-[#2A82C7]/20 overflow-hidden">
                                    <table className="min-w-full">
                                      <thead className="bg-[#15497E]/30 border-b border-[#2A82C7]/20">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-[#F8F9FA] uppercase">
                                            Producto
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-[#F8F9FA] uppercase">
                                            Cantidad
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-[#F8F9FA] uppercase">
                                            Precio
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-[#F8F9FA] uppercase">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#2A82C7]/20">
                                        {order.productos.map((item, index) => {
                                          // Extraer información del producto
                                          const productId = typeof item.productoId === 'object'
                                            ? item.productoId._id
                                            : item.productoId;
                                            
                                          const productName = typeof item.productoId === 'object' && item.productoId.nombre
                                            ? item.productoId.nombre
                                            : item.nombre || 'Producto desconocido';
                                            
                                          const productPrice = typeof item.productoId === 'object' && item.productoId.precio
                                            ? item.productoId.precio
                                            : item.precio || 0;
                                          
                                          return (
                                            <tr key={index} className="hover:bg-white/5">
                                              <td className="px-4 py-3 text-[#F8F9FA]">
                                                {productName}
                                              </td>
                                              <td className="px-4 py-3 text-[#6C757D]">
                                                {item.cantidad}
                                              </td>
                                              <td className="px-4 py-3 text-right text-[#6C757D]">
                                                ${productPrice.toFixed(2)}
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium text-[#F8F9FA]">
                                                ${(productPrice * item.cantidad).toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        
                                        {/* Fila de total */}
                                        <tr className="bg-[#15497E]/20">
                                          <td colSpan={3} className="px-4 py-3 text-right font-medium text-[#F8F9FA]">
                                            Total:
                                          </td>
                                          <td className="px-4 py-3 text-right font-bold text-[#F8F9FA]">
                                            ${order.total?.toFixed(2) || '0.00'}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Sección de notas */}
                                  {order.detalle && order.detalle.trim() !== '' && (
                                    <div className="mt-3">
                                      <h4 className="text-sm font-medium text-[#F8F9FA]">Notas:</h4>
                                      <p className="text-sm text-[#6C757D] bg-white/5 p-3 rounded-md border border-[#2A82C7]/20 mt-1">
                                        {order.detalle}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Información adicional de operario si existe */}
                                  {order.metadata?.operarioNombre && (
                                    <div className="mt-3">
                                      <h4 className="text-sm font-medium text-[#F8F9FA]">Creado por:</h4>
                                      <p className="text-sm text-[#6C757D] bg-white/5 p-3 rounded-md border border-[#2A82C7]/20 mt-1">
                                        Operario: {order.metadata.operarioNombre}<br />
                                        Fecha: {new Date(order.metadata.fechaCreacion).toLocaleString()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista para móvil */}
              <div className="md:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order._id} className="bg-white/10 backdrop-blur-sm border-[#2A82C7]/20 overflow-hidden">
                    <CardHeader className="pb-2 bg-[#15497E]/20 border-b border-[#2A82C7]/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm flex items-center text-[#F8F9FA]">
                            <Hash className="w-4 h-4 text-[#6C757D] mr-1" />
                            Pedido #{order.displayNumber}
                          </CardTitle>
                          <p className="text-xs text-[#6C757D] mt-1">
                            {formatDate(order.fecha)}
                          </p>
                        </div>
                        <div className="flex gap-1 items-center">
                          <Badge className={getStatusBadgeClass(order.estado || 'aprobado')}>
                            {getStatusIcon(order.estado || 'aprobado')}
                            {order.estado === 'pendiente' ? 'Pendiente' : 
                              order.estado === 'aprobado' ? 'Aprobado' : 
                              order.estado === 'rechazado' ? 'Rechazado' : 
                              'Desconocido'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 pb-2">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Building className="w-4 h-4 text-[#6C757D] mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-[#F8F9FA]">{order.servicio}</p>
                            {order.seccionDelServicio && (
                              <p className="text-xs text-[#6C757D] flex items-center mt-0.5">
                                <MapPin className="w-3 h-3 mr-1" />
                                {order.seccionDelServicio}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Información del operario si existe */}
                        {order.metadata?.operarioNombre && (
                          <div className="text-xs text-[#6C757D] bg-[#15497E]/10 px-2 py-1 rounded">
                            Creado por: {order.metadata.operarioNombre}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm text-[#6C757D] flex items-center">
                            <Package className="h-4 w-4 mr-1" />
                            {order.productos?.length || 0} productos
                          </div>
                          <div className="text-sm font-bold text-[#F8F9FA] flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-[#6C757D]" />
                            ${order.total?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Detalles expandibles del pedido */}
                      <Accordion type="single" collapsible className="mt-2">
                        <AccordionItem value="details" className="border-t border-[#2A82C7]/20 pt-2">
                          <AccordionTrigger className="py-2 text-xs text-[#F8F9FA]">
                            Ver detalles del pedido
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              {order.productos.map((item, index) => {
                                // Extraer información del producto
                                const productName = typeof item.productoId === 'object' && item.productoId.nombre
                                  ? item.productoId.nombre
                                  : item.nombre || 'Producto desconocido';
                                  
                                const productPrice = typeof item.productoId === 'object' && item.productoId.precio
                                  ? item.productoId.precio
                                  : item.precio || 0;
                                
                                return (
                                  <div key={index} className="flex justify-between items-center py-1 border-b border-[#2A82C7]/10">
                                    <div className="text-[#F8F9FA]">
                                      <div className="text-sm font-medium">{productName}</div>
                                      <div className="text-xs text-[#6C757D]">
                                        Cant: {item.cantidad} x ${productPrice.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-[#F8F9FA]">
                                      ${(productPrice * item.cantidad).toFixed(2)}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Notas */}
                              {order.detalle && order.detalle.trim() !== '' && (
                                <div className="mt-3 pt-2">
                                  <h4 className="text-xs font-medium text-[#F8F9FA]">Notas:</h4>
                                  <p className="text-xs text-[#6C757D] bg-white/5 p-2 rounded border border-[#2A82C7]/20 mt-1">
                                    {order.detalle}
                                  </p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                    <CardFooter className="pt-0 pb-3">
                      {/* Acciones según rol y estado */}
                      <div className="w-full flex gap-2">
                        {/* Acciones de aprobación para supervisores y estado pendiente */}
                        {userRole === 'supervisor' && order.estado === 'pendiente' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveOrder(order._id)}
                              className="flex-1 border-green-500 text-green-500 hover:bg-green-500/20"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectOrder(order._id)}
                              className="flex-1 border-red-500 text-red-500 hover:bg-red-500/20"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        ) : (
                          // Botón de descarga de remito - solo para aprobados
                          order.estado !== 'rechazado' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemitoDownload(order._id)}
                              disabled={isDownloadingRemito === order._id}
                              className="w-full border-[#2A82C7] text-[#F8F9FA] hover:bg-[#15497E]/30"
                            >
                              {isDownloadingRemito === order._id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Descargar Remito
                            </Button>
                          )
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};