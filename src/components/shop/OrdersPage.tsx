import React, { useState, useEffect } from 'react';
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
  DollarSign
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
  total?: number;
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

export const OrdersPage: React.FC = () => {
  // Usar el hook de notificaciones de forma segura
  const { addNotification } = useNotification();

  // Estados
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDetailsOpen, setOrderDetailsOpen] = useState<string | null>(null);
  const [isDownloadingRemito, setIsDownloadingRemito] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [cachedProducts, setCachedProducts] = useState<Record<string, any>>({});
  
  // Filtro de fechas
  const [dateFilter, setDateFilter] = useState({
    fechaInicio: '',
    fechaFin: ''
  });

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
    fetchUser()
      .then(userId => {
        if (userId) {
          Promise.all([
            fetchOrders(),
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

  // Filtrar pedidos cuando cambia el término de búsqueda o los pedidos
  useEffect(() => {
    if (!orders.length) return;
    
    let result = [...orders];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      result = result.filter(order => 
        order.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.seccionDelServicio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof order.userId === 'object' && order.userId.email 
          ? order.userId.email.toLowerCase().includes(searchTerm.toLowerCase())
          : false)
      );
    }
    
    setFilteredOrders(result);
  }, [searchTerm, orders]);

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

  // Cargar pedidos
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      // Obtener el ID del usuario actual
      let currentUserId;
      try {
        currentUserId = localStorage.getItem('selectedUserId');
        
        if (!currentUserId) {
          console.warn('ID de usuario no encontrado en localStorage, obteniéndolo desde la API');
          // Si no está en localStorage, intentamos obtenerlo desde la API
          const userResponse = await fetch('https://lyme-back.vercel.app/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!userResponse.ok) {
            throw new Error(`Error al obtener información del usuario (estado: ${userResponse.status})`);
          }
          
          const userData = await userResponse.json();
          // Usar el ID de usuario de la respuesta de la API
          currentUserId = userData._id || userData.id;
          
          if (!currentUserId) {
            throw new Error('No se pudo determinar el ID del usuario');
          }
          
          // Guardar en localStorage para futuras consultas
          localStorage.setItem('selectedUserId', currentUserId);
        }
      } catch (error) {
        console.error('Error al obtener ID de usuario:', error);
        // Si no podemos obtener el ID, cargamos todos los pedidos sin filtrar
        currentUserId = null;
      }
  
      // Primero obtenemos todos los pedidos
      const response = await fetch('https://lyme-back.vercel.app/api/pedido', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Error al cargar pedidos (estado: ${response.status})`);
      }
  
      const data = await response.json();
      
      // Si no tenemos un ID de usuario, mostramos todos los pedidos
      if (!currentUserId) {
        const processedOrders = data.map((order) => ({
          ...order,
          total: calculateOrderTotal(order)
        }));
        
        processedOrders.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
        setError(null);
        return;
      }
      
      try {
        // Ahora obtenemos los clientes del usuario para filtrar los pedidos
        const clientsResponse = await fetch(`https://lyme-back.vercel.app/api/cliente/user/${currentUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!clientsResponse.ok) {
          throw new Error(`Error al cargar clientes (estado: ${clientsResponse.status})`);
        }
        
        const clientsData = await clientsResponse.json();
        setClients(clientsData);
        
        // Crear un objeto de búsqueda para filtrado más eficiente
        const userClientLookup = {};
        clientsData.forEach((client) => {
          const key = `${client.servicio}-${client.seccionDelServicio || ''}`;
          userClientLookup[key] = true;
        });
        
        // Filtrar pedidos para incluir solo aquellos de los clientes del usuario
        const userOrders = data.filter((order) => {
          // Crear una clave para comparar con el objeto de búsqueda
          const orderClientKey = `${order.servicio}-${order.seccionDelServicio || ''}`;
          return userClientLookup[orderClientKey] === true;
        });
        
        // Calcular totales para los pedidos del usuario
        const processedOrders = userOrders.map((order) => ({
          ...order,
          total: calculateOrderTotal(order)
        }));
        
        // Ordenar por fecha (más recientes primero)
        processedOrders.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
      } catch (error) {
        console.error("Error al procesar clientes, mostrando todos los pedidos:", error);
        
        // En caso de error con los clientes, mostrar todos los pedidos
        const processedOrders = data.map((order) => ({
          ...order,
          total: calculateOrderTotal(order)
        }));
        
        processedOrders.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
        
        // Establecer un mensaje de error pero seguir mostrando datos
        setError("No se pudieron cargar los clientes. Mostrando todos los pedidos disponibles.");
      }
        
      // Crear caché de productos para cálculos de precios
      const productCache = {};
      orders.forEach(order => {
        if (Array.isArray(order.productos)) {
          order.productos.forEach(item => {
            // Si el producto está poblado con datos
            if (typeof item.productoId === 'object' && item.productoId) {
              productCache[item.productoId._id] = {
                nombre: item.productoId.nombre || item.nombre || 'Producto desconocido',
                precio: item.productoId.precio || item.precio || 0
              };
            } 
            // Si tenemos precio y nombre en el item
            else if (item.nombre && typeof item.precio === 'number') {
              productCache[typeof item.productoId === 'string' ? item.productoId : 'unknown'] = {
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
      setError(errorMsg);
      
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

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
      
      // Obtener el ID del usuario actual
      const currentUserId = localStorage.getItem('selectedUserId');
      
      if (!currentUserId) {
        throw new Error('ID de usuario no encontrado en localStorage');
      }

      const url = `https://lyme-back.vercel.app/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al filtrar pedidos por fecha (estado: ${response.status})`);
      }

      const data = await response.json();
      
      // Necesitamos filtrar los resultados para incluir solo pedidos de los clientes del usuario
      if (clients.length === 0) {
        // Si los clientes no están cargados aún, los obtenemos
        const clientsResponse = await fetch(`https://lyme-back.vercel.app/api/cliente/user/${currentUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!clientsResponse.ok) {
          throw new Error(`Error al cargar clientes (estado: ${clientsResponse.status})`);
        }
        
        const clientsData = await clientsResponse.json();
        setClients(clientsData);
        
        // Crear objeto de búsqueda para filtrado
        const userClientLookup = {};
        clientsData.forEach((client: Cliente) => {
          const key = `${client.servicio}-${client.seccionDelServicio || ''}`;
          userClientLookup[key] = true;
        });
        
        // Filtrar pedidos por clientes del usuario
        const userOrders = data.filter((order: Order) => {
          const orderClientKey = `${order.servicio}-${order.seccionDelServicio || ''}`;
          return userClientLookup[orderClientKey] === true;
        });
        
        // Calcular totales para los pedidos del usuario
        const processedOrders = userOrders.map((order: Order) => ({
          ...order,
          total: calculateOrderTotal(order)
        }));
        
        // Ordenar por fecha (más recientes primero)
        processedOrders.sort((a: Order, b: Order) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
      } else {
        // Si los clientes ya están cargados, los usamos para filtrar
        // Crear objeto de búsqueda para filtrado
        const userClientLookup = {};
        clients.forEach((client: Cliente) => {
          const key = `${client.servicio}-${client.seccionDelServicio || ''}`;
          userClientLookup[key] = true;
        });
        
        // Filtrar pedidos por clientes del usuario
        const userOrders = data.filter((order: Order) => {
          const orderClientKey = `${order.servicio}-${order.seccionDelServicio || ''}`;
          return userClientLookup[orderClientKey] === true;
        });
        
        // Calcular totales para los pedidos del usuario
        const processedOrders = userOrders.map((order: Order) => ({
          ...order,
          total: calculateOrderTotal(order)
        }));
        
        // Ordenar por fecha (más recientes primero)
        processedOrders.sort((a: Order, b: Order) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
      }
      
      setError(null);
      
      const successMsg = `Se encontraron ${filteredOrders.length} pedidos en el rango de fechas seleccionado`;
      
      if (addNotification) {
        addNotification(successMsg, filteredOrders.length === 0 ? 'info' : 'success');
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
    fetchOrders();
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
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `remito_${orderId}.pdf`);
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

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center text-[#D4F5E6]">
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
          <div className="mb-6 space-y-4 hidden md:block bg-white/10 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white placeholder:text-[#D4F5E6]/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="fechaInicio" className="text-[#D4F5E6] text-sm font-medium">
                  Fecha Inicio
                </label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={dateFilter.fechaInicio}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                  className="w-full bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="fechaFin" className="text-[#D4F5E6] text-sm font-medium">
                  Fecha Fin
                </label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={dateFilter.fechaFin}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                  className="w-full bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white mt-1"
                />
              </div>
              <Button
                variant="outline"
                onClick={filterOrdersByDate}
                className="border-[#91BEAD] text-[#D4F5E6] hover:bg-[#DFEFE6]/50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar por Fecha
              </Button>
              {(dateFilter.fechaInicio || dateFilter.fechaFin || searchTerm) && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-[#7AA79C] hover:text-[#D4F5E6] hover:bg-[#DFEFE6]/30"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Filtros para móvil */}
          <div className="mb-6 space-y-4 md:hidden">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-[#91BEAD]/20">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white placeholder:text-[#D4F5E6]/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex-shrink-0 border-[#91BEAD] text-[#D4F5E6] hover:bg-[#DFEFE6]/50"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {showMobileFilters && (
              <div className="p-4 bg-[#DFEFE6]/10 rounded-lg border border-[#91BEAD]/20 space-y-4">
                <h3 className="font-medium text-sm text-[#D4F5E6]">Filtrar por fecha</h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="mFechaInicio" className="text-xs text-[#D4F5E6]">
                      Fecha Inicio
                    </label>
                    <Input
                      id="mFechaInicio"
                      type="date"
                      value={dateFilter.fechaInicio}
                      onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                      className="w-full text-sm bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="mFechaFin" className="text-xs text-[#D4F5E6]">
                      Fecha Fin
                    </label>
                    <Input
                      id="mFechaFin"
                      type="date"
                      value={dateFilter.fechaFin}
                      onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                      className="w-full text-sm bg-white/10 border-[#91BEAD] focus:border-[#80CFB0] text-white mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs border-[#91BEAD] text-[#D4F5E6] hover:bg-[#DFEFE6]/50"
                  >
                    Limpiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={filterOrdersByDate}
                    className="text-xs bg-[#00888A] hover:bg-[#50C3AD] text-white"
                  >
                    Aplicar Filtros
                  </Button>
                </div>
              </div>
            )}

            {(dateFilter.fechaInicio || dateFilter.fechaFin) && (
              <div className="px-3 py-2 bg-[#DFEFE6]/20 rounded-md text-xs text-[#D4F5E6] flex items-center justify-between border border-[#91BEAD]/20">
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
                  className="h-6 text-xs px-2 text-[#7AA79C] hover:text-[#D4F5E6] hover:bg-[#DFEFE6]/30"
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
                <Loader2 className="h-10 w-10 animate-spin text-[#D4F5E6]" />
                <p className="mt-4 text-[#D4F5E6]">Cargando tus pedidos...</p>
              </div>
            </div>
          )}

          {/* Sin pedidos */}
          {!loading && filteredOrders.length === 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00888A]/30 rounded-full mb-4">
                <ShoppingCart className="w-8 h-8 text-[#D4F5E6]" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[#D4F5E6]">No se encontraron pedidos</h2>
              <p className="text-[#75D0E0] max-w-lg mx-auto">
                {searchTerm 
                  ? `No hay pedidos que coincidan con "${searchTerm}"` 
                  : dateFilter.fechaInicio || dateFilter.fechaFin
                    ? "No se encontraron pedidos en el rango de fechas seleccionado" 
                    : "Aún no has realizado ningún pedido. Comienza a comprar para ver tus pedidos aquí."}
              </p>
              {(searchTerm || dateFilter.fechaInicio || dateFilter.fechaFin) && (
                <Button 
                  onClick={clearAllFilters}
                  className="mt-4 bg-[#00888A] hover:bg-[#50C3AD] text-white"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}

          {/* Lista de pedidos */}
          {!loading && filteredOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-medium mb-4 flex items-center text-[#D4F5E6]">
                Tus Pedidos
                <Badge variant="outline" className="ml-3 bg-white/10 text-[#D4F5E6] border-[#50C3AD]">
                  {filteredOrders.length} pedidos
                </Badge>
              </h2>

              {/* Vista para escritorio */}
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
                  <table className="w-full text-[#D4F5E6]">
                    <thead className="bg-[#00888A]/30 text-[#D4F5E6] border-b border-[#91BEAD]/30">
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
                    <tbody className="divide-y divide-[#91BEAD]/20">
                      {filteredOrders.map((order) => (
                        <React.Fragment key={order._id}>
                          <tr className="hover:bg-[#00888A]/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium">{order.numero || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>{formatDate(order.fecha)}</div>
                              <div className="text-xs text-[#75D0E0]">
                                {new Date(order.fecha).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Building className="w-4 h-4 text-[#75D0E0] mr-2" />
                                <div>
                                  <div className="font-medium">{order.servicio}</div>
                                  {order.seccionDelServicio && (
                                    <div className="text-xs text-[#75D0E0] flex items-center mt-1">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {order.seccionDelServicio}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className="bg-[#50C3AD]/30 text-[#D4F5E6] border-[#50C3AD]/50">
                                {order.productos?.length || 0} items
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleOrderDetails(order._id)}
                                className="ml-2 text-[#75D0E0] hover:text-[#D4F5E6] hover:bg-[#00888A]/20"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-bold">
                              ${order.total?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemitoDownload(order._id)}
                                disabled={isDownloadingRemito === order._id}
                                className="border-[#50C3AD] text-[#D4F5E6] hover:bg-[#00888A]/30"
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
                            </td>
                          </tr>
                          
                          {/* Detalles del pedido (expandido) */}
                          {orderDetailsOpen === order._id && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-[#00888A]/20">
                                <div className="space-y-3">
                                  <h3 className="font-medium text-[#D4F5E6]">Detalles del Pedido</h3>
                                  
                                  {/* Productos del pedido */}
                                  <div className="bg-white/5 rounded-md border border-[#91BEAD]/20 overflow-hidden">
                                    <table className="min-w-full">
                                      <thead className="bg-[#00888A]/30 border-b border-[#91BEAD]/20">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-[#D4F5E6] uppercase">
                                            Producto
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-[#D4F5E6] uppercase">
                                            Cantidad
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-[#D4F5E6] uppercase">
                                            Precio
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-[#D4F5E6] uppercase">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#91BEAD]/20">
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
                                              <td className="px-4 py-3 text-[#D4F5E6]">
                                                {productName}
                                              </td>
                                              <td className="px-4 py-3 text-[#75D0E0]">
                                                {item.cantidad}
                                              </td>
                                              <td className="px-4 py-3 text-right text-[#75D0E0]">
                                                ${productPrice.toFixed(2)}
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium text-[#D4F5E6]">
                                                ${(productPrice * item.cantidad).toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        
                                        {/* Fila de total */}
                                        <tr className="bg-[#00888A]/20">
                                          <td colSpan={3} className="px-4 py-3 text-right font-medium text-[#D4F5E6]">
                                            Total:
                                          </td>
                                          <td className="px-4 py-3 text-right font-bold text-[#D4F5E6]">
                                            ${order.total?.toFixed(2) || '0.00'}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Sección de notas */}
                                  {order.detalle && order.detalle.trim() !== '' && (
                                    <div className="mt-3">
                                      <h4 className="text-sm font-medium text-[#D4F5E6]">Notas:</h4>
                                      <p className="text-sm text-[#75D0E0] bg-white/5 p-3 rounded-md border border-[#91BEAD]/20 mt-1">
                                        {order.detalle}
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
                  <Card key={order._id} className="bg-white/10 backdrop-blur-sm border-[#91BEAD]/20 overflow-hidden">
                    <CardHeader className="pb-2 bg-[#00888A]/20 border-b border-[#91BEAD]/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm flex items-center text-[#D4F5E6]">
                            Pedido #{order.numero || 'N/A'}
                          </CardTitle>
                          <p className="text-xs text-[#75D0E0] mt-1">
                            {formatDate(order.fecha)}
                          </p>
                        </div>
                        <Badge className="bg-[#50C3AD]/30 text-[#D4F5E6] border-[#50C3AD]/50">
                          {order.productos?.length || 0} items
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 pb-2">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Building className="w-4 h-4 text-[#75D0E0] mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-[#D4F5E6]">{order.servicio}</p>
                            {order.seccionDelServicio && (
                              <p className="text-xs text-[#75D0E0] flex items-center mt-0.5">
                                <MapPin className="w-3 h-3 mr-1" />
                                {order.seccionDelServicio}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm text-[#75D0E0] flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Total:
                          </div>
                          <div className="text-sm font-bold text-[#D4F5E6]">
                            ${order.total?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Detalles expandibles del pedido */}
                      <Accordion type="single" collapsible className="mt-2">
                        <AccordionItem value="details" className="border-t border-[#91BEAD]/20 pt-2">
                          <AccordionTrigger className="py-2 text-xs text-[#D4F5E6]">
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
                                  <div key={index} className="flex justify-between items-center py-1 border-b border-[#91BEAD]/10">
                                    <div className="text-[#D4F5E6]">
                                      <div className="text-sm font-medium">{productName}</div>
                                      <div className="text-xs text-[#75D0E0]">
                                        Cant: {item.cantidad} x ${productPrice.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-[#D4F5E6]">
                                      ${(productPrice * item.cantidad).toFixed(2)}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Notas */}
                              {order.detalle && order.detalle.trim() !== '' && (
                                <div className="mt-3 pt-2">
                                  <h4 className="text-xs font-medium text-[#D4F5E6]">Notas:</h4>
                                  <p className="text-xs text-[#75D0E0] bg-white/5 p-2 rounded border border-[#91BEAD]/20 mt-1">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemitoDownload(order._id)}
                        disabled={isDownloadingRemito === order._id}
                        className="w-full border-[#50C3AD] text-[#D4F5E6] hover:bg-[#00888A]/30"
                      >
                        {isDownloadingRemito === order._id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Descargar Remito
                      </Button>
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