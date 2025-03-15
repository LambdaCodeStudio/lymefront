import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  CheckSquare,
  XSquare,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Users,
  FileCheck,
  CheckCircle2
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ShopNavbar } from './ShopNavbar';
import { Label } from "@/components/ui/label";
import { getApiUrl } from '@/utils/apiUtils';

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

// Estados de pedidos
enum OrderStatus {
  PENDING = "pendiente",
  APPROVED = "aprobado",
  REJECTED = "rechazado",
  DELIVERED = "entregado",
  CANCELED = "cancelado"
}

// Tipos de datos
interface OrderProduct {
  productoId: string | { _id: string; nombre?: string; precio?: number; [key: string]: any };
  cantidad: number;
  nombre?: string;
  precio?: number;
}

interface Order {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | { _id: string; email?: string; nombre?: string; [key: string]: any };
  fecha: string;
  productos: OrderProduct[];
  detalle?: string;
  numero?: string;
  nPedido?: number; // Campo específico para número de pedido (backend)
  displayNumber?: string; // Campo para mostrar consistentemente
  total?: number;
  estado?: OrderStatus; // Estado del pedido
  metadata?: { // Datos adicionales para pedidos creados por operarios
    creadoPorOperario?: boolean;
    operarioId?: string;
    operarioNombre?: string;
    supervisorId?: string;
    supervisorNombre?: string;
    fechaCreacion?: string;
    fechaAprobacion?: string;
    motivoRechazo?: string;
  };
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
  
  // Filtros
  const [dateFilter, setDateFilter] = useState({
    fechaInicio: '',
    fechaFin: ''
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estado para la pestaña actual
  const [activeTab, setActiveTab] = useState<string>('todos');
  
  // Estados para la función de aprobar/rechazar pedidos
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Información del usuario
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Referencias para caché
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos
  
  // Obtener información del usuario actual
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    const storedId = localStorage.getItem('userId');
    
    if (storedRole) setUserRole(storedRole);
    if (storedId) setUserId(storedId);
    
    fetchUserData();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    fetchOrders(true);
    
    // Limpiar timeout al desmontar
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [userRole, userId]);

  // Efecto para filtrar pedidos cuando cambian los filtros
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
    
    // Filtrar por estado si se ha seleccionado un filtro
    if (statusFilter !== 'all') {
      result = result.filter(order => order.estado === statusFilter);
    }
    
    // Filtrar por pestañas
    switch (activeTab) {
      case 'pendientes':
        result = result.filter(order => order.estado === OrderStatus.PENDING);
        break;
      case 'aprobados':
        result = result.filter(order => order.estado === OrderStatus.APPROVED);
        break;
      case 'rechazados':
        result = result.filter(order => order.estado === OrderStatus.REJECTED);
        break;
      case 'porAprobar':
        // Mostrar solo pedidos pendientes creados por operarios
        result = result.filter(order => 
          order.estado === OrderStatus.PENDING && 
          order.metadata?.creadoPorOperario
        );
        break;
      // El caso 'todos' no necesita filtro
    }
    
    setFilteredOrders(result);
  }, [searchTerm, orders, statusFilter, activeTab]);

  // Obtener información del usuario actual
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch('http://179.43.118.101:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del usuario');
      }

      const userData = await response.json();
      
      // Actualizar estados y localStorage
      if (userData.role) {
        localStorage.setItem('userRole', userData.role);
        setUserRole(userData.role);
      }
      
      if (userData._id) {
        localStorage.setItem('userId', userData._id);
        setUserId(userData._id);
      }
      
      return userData._id || userData.id || null;
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      setError('Error al cargar información del usuario. Por favor, inténtelo de nuevo.');
      return null;
    }
  };

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

  // Función optimizada para cargar pedidos
  const fetchOrders = useCallback(async (forceRefresh = false) => {
    // Evitar múltiples solicitudes cercanas en el tiempo
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      console.log('Solicitud descartada: demasiado frecuente');
      return;
    }
    
    // Verificar si tenemos datos en caché recientes
    if (!forceRefresh && orders.length > 0 && now - lastFetchTimeRef.current < CACHE_DURATION) {
      console.log('Usando datos en caché');
      return;
    }
    
    try {
      setLoading(forceRefresh);
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      // Obtener todos los pedidos primero
      const response = await fetch('http://179.43.118.101:4000/api/pedido', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userId');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Error al cargar pedidos (estado: ${response.status})`);
      }
  
      const allOrders = await response.json();
      lastFetchTimeRef.current = Date.now();
      
      // Obtener información del usuario actual
      let currentUserId = userId;
      
      if (!currentUserId) {
        try {
          // Intentar obtener el ID del usuario desde la API
          const userResponse = await fetch('http://179.43.118.101:4000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!userResponse.ok) {
            throw new Error(`Error al obtener información del usuario (estado: ${userResponse.status})`);
          }
          
          const userData = await userResponse.json();
          currentUserId = userData._id || userData.id;
          
          if (!currentUserId) {
            throw new Error('No se pudo obtener un ID de usuario válido');
          }
          
          // Guardar en estado y localStorage para futuras consultas
          setUserId(currentUserId);
          localStorage.setItem('userId', currentUserId);
        } catch (userError) {
          console.error('Error al obtener información del usuario:', userError);
        }
      }
      
      // Determinar qué pedidos mostrar según el rol del usuario
      let relevantOrders: Order[] = [];
      
      if (userRole === 'supervisor') {
        // Para supervisores: mostrar pedidos propios + los creados por sus operarios
        relevantOrders = allOrders.filter((order: Order) => {
          // Pedidos propios del supervisor
          const isOwnOrder = typeof order.userId === 'object' 
            ? order.userId._id === currentUserId 
            : order.userId === currentUserId;
          
          // Pedidos creados por operarios que el supervisor supervisa
          const isOperarioOrder = order.metadata?.creadoPorOperario && 
                                 order.metadata?.supervisorId === currentUserId;
          
          return isOwnOrder || isOperarioOrder;
        });
      } else if (userRole === 'operario') {
        // Para operarios: solo mostrar sus propios pedidos
        relevantOrders = allOrders.filter((order: Order) => {
          const isDirectOrder = typeof order.userId === 'object' 
            ? order.userId._id === currentUserId 
            : order.userId === currentUserId;
          
          const isIndirectOrder = order.metadata?.creadoPorOperario && 
                                 order.metadata?.operarioId === currentUserId;
          
          return isDirectOrder || isIndirectOrder;
        });
      } else {
        // Para otros roles: mostrar todos los pedidos
        relevantOrders = allOrders;
      }
      
      // Procesar pedidos (calcular totales y ordenar)
      const processedOrders = relevantOrders.map((order: Order) => ({
        ...order,
        displayNumber: order.nPedido?.toString() || order.numero || 'S/N',
        total: calculateOrderTotal(order)
      })).sort((a: Order, b: Order) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
      
      // Crear caché de productos para cálculos de precios
      const productCache: Record<string, any> = {};
      allOrders.forEach((order: Order) => {
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
      
      // Programar la próxima actualización
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
      
      cacheTimeoutRef.current = setTimeout(() => {
        console.log('Actualizando datos por expiración de caché');
        fetchOrders(true);
      }, CACHE_DURATION);
      
      setError(null);
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
  }, [orders.length, userRole, userId]);

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

      const url = `http://179.43.118.101:4000/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al filtrar pedidos por fecha (estado: ${response.status})`);
      }

      const data = await response.json();
      
      // Filtrar según el rol del usuario
      let relevantOrders: Order[] = [];
      const currentUserId = userId;
      
      if (userRole === 'supervisor') {
        // Para supervisores: mostrar pedidos propios + los creados por sus operarios
        relevantOrders = data.filter((order: Order) => {
          const isOwnOrder = typeof order.userId === 'object' 
            ? order.userId._id === currentUserId 
            : order.userId === currentUserId;
          
          const isOperarioOrder = order.metadata?.creadoPorOperario && 
                                 order.metadata?.supervisorId === currentUserId;
          
          return isOwnOrder || isOperarioOrder;
        });
      } else if (userRole === 'operario') {
        // Para operarios: solo mostrar sus propios pedidos
        relevantOrders = data.filter((order: Order) => {
          const isDirectOrder = typeof order.userId === 'object' 
            ? order.userId._id === currentUserId 
            : order.userId === currentUserId;
          
          const isIndirectOrder = order.metadata?.creadoPorOperario && 
                                 order.metadata?.operarioId === currentUserId;
          
          return isDirectOrder || isIndirectOrder;
        });
      } else {
        // Para otros roles: mostrar todos los pedidos
        relevantOrders = data;
      }
      
      // Procesar pedidos (calcular totales y ordenar)
      const processedOrders = relevantOrders.map((order: Order) => ({
        ...order,
        displayNumber: order.nPedido?.toString() || order.numero || 'S/N',
        total: calculateOrderTotal(order)
      })).sort((a: Order, b: Order) => 
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
    setStatusFilter('all');
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
      
      const response = await fetch(`http://179.43.118.101:4000/api/downloads/remito/${orderId}`, {
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

  // Formatear hora para mostrar
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  // Abrir diálogo de aprobación de pedido
  const openApprovalDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setApprovalDialogOpen(true);
  };

  // Abrir diálogo de rechazo de pedido
  const openRejectionDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectionReason('');
    setRejectionDialogOpen(true);
  };

  // Aprobar pedido
  const approveOrder = async () => {
    if (!selectedOrderId) return;

    try {
      setIsProcessingApproval(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://179.43.118.101:4000/api/pedido/${selectedOrderId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: OrderStatus.APPROVED,
          fechaAprobacion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al aprobar pedido (${response.status})`);
      }
      
      // Actualizar la lista de pedidos
      await fetchOrders(true);
      
      // Notificar al usuario
      if (addNotification) {
        addNotification('Pedido aprobado correctamente', 'success');
      }
      
      // Cerrar el diálogo
      setApprovalDialogOpen(false);
      setSelectedOrderId(null);
    } catch (error) {
      console.error('Error al aprobar pedido:', error);
      
      if (addNotification) {
        addNotification(`Error al aprobar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Rechazar pedido
  const rejectOrder = async () => {
    if (!selectedOrderId || !rejectionReason.trim()) {
      // Validar que se proporcionó un motivo de rechazo
      if (!rejectionReason.trim()) {
        addNotification('Debe proporcionar un motivo para rechazar el pedido', 'warning');
      }
      return;
    }

    try {
      setIsProcessingApproval(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://179.43.118.101:4000/api/pedido/${selectedOrderId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: OrderStatus.REJECTED,
          motivoRechazo: rejectionReason,
          fechaRechazo: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al rechazar pedido (${response.status})`);
      }
      
      // Actualizar la lista de pedidos
      await fetchOrders(true);
      
      // Notificar al usuario
      if (addNotification) {
        addNotification('Pedido rechazado correctamente', 'success');
      }
      
      // Cerrar el diálogo
      setRejectionDialogOpen(false);
      setSelectedOrderId(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error al rechazar pedido:', error);
      
      if (addNotification) {
        addNotification(`Error al rechazar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setIsProcessingApproval(false);
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

  // Renderizar el badge de estado del pedido
  const renderStatusBadge = (status?: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case OrderStatus.APPROVED:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckSquare className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case OrderStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            <XSquare className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      case OrderStatus.DELIVERED:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Package className="w-3 h-3 mr-1" />
            Entregado
          </Badge>
        );
      case OrderStatus.CANCELED:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
            <X className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
            Desconocido
          </Badge>
        );
    }
  };

  // Renderizar la badge de pedido creado por operario
  const renderOperarioBadge = (order: Order) => {
    if (order.metadata?.creadoPorOperario) {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 ml-2">
          <Users className="w-3 h-3 mr-1" />
          Operario: {order.metadata.operarioNombre || 'Desconocido'}
        </Badge>
      );
    }
    return null;
  };

  // Obtener conteo de pedidos pendientes por aprobar (para supervisores)
  const getPendingApprovalCount = () => {
    return orders.filter(order => 
      order.estado === OrderStatus.PENDING && 
      order.metadata?.creadoPorOperario
    ).length;
  };

  // Función para actualizar manualmente
  const handleManualRefresh = () => {
    fetchOrders(true);
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

          {/* Filtros y búsqueda */}
          <div className="mb-6 space-y-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-[#2A82C7]/20">
            {/* Pestañas para filtrar por categorías principales */}
            <div className="flex justify-between items-center">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[#15497E]/50 border border-[#2A82C7]/40 w-full">
                  <TabsTrigger 
                    value="todos" 
                    className="flex-1 data-[state=active]:bg-[#15497E] data-[state=active]:text-white text-[#F8F9FA]"
                  >
                    Todos
                  </TabsTrigger>
                  
                  {/* Pestaña extra para supervisores: pedidos por aprobar */}
                  {userRole === 'supervisor' && (
                    <TabsTrigger 
                      value="porAprobar" 
                      className="flex-1 data-[state=active]:bg-[#15497E] data-[state=active]:text-white text-[#F8F9FA] relative"
                    >
                      <FileCheck className="w-4 h-4 mr-1" />
                      Por aprobar
                      {getPendingApprovalCount() > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#FF6B35] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {getPendingApprovalCount()}
                        </span>
                      )}
                    </TabsTrigger>
                  )}
                  
                  <TabsTrigger 
                    value="pendientes" 
                    className="flex-1 data-[state=active]:bg-[#15497E] data-[state=active]:text-white text-[#F8F9FA]"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Pendientes
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="aprobados" 
                    className="flex-1 data-[state=active]:bg-[#15497E] data-[state=active]:text-white text-[#F8F9FA]"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Aprobados
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="rechazados" 
                    className="flex-1 data-[state=active]:bg-[#15497E] data-[state=active]:text-white text-[#F8F9FA]"
                  >
                    <XSquare className="w-4 h-4 mr-1" />
                    Rechazados
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="ml-2 hidden sm:flex border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>

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
              <Button
                variant="outline"
                onClick={filterOrdersByDate}
                className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#15497E]/50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar por Fecha
              </Button>
              {(dateFilter.fechaInicio || dateFilter.fechaFin || searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-[#6C757D] hover:text-[#F8F9FA] hover:bg-[#15497E]/30"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#F8F9FA]" />
                <p className="mt-4 text-[#F8F9FA]">Cargando pedidos...</p>
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
                {searchTerm || dateFilter.fechaInicio || dateFilter.fechaFin || statusFilter !== 'all'
                  ? 'No hay pedidos que coincidan con los filtros seleccionados.' 
                  : activeTab === 'porAprobar'
                    ? 'No hay pedidos pendientes de aprobación.'
                    : activeTab === 'pendientes'
                      ? 'No hay pedidos en estado pendiente.'
                      : activeTab === 'aprobados'
                        ? 'No hay pedidos aprobados.'
                        : activeTab === 'rechazados'
                          ? 'No hay pedidos rechazados.'
                          : 'Aún no has realizado ningún pedido. Comienza a comprar para ver tus pedidos aquí.'}
              </p>
              {(searchTerm || dateFilter.fechaInicio || dateFilter.fechaFin || statusFilter !== 'all' || activeTab !== 'todos') && (
                <Button 
                  onClick={clearAllFilters}
                  className="mt-4 bg-[#15497E] hover:bg-[#2A82C7] text-white"
                >
                  Mostrar todos los pedidos
                </Button>
              )}
            </div>
          )}

          {/* Lista de pedidos */}
          {!loading && filteredOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-medium mb-4 flex items-center text-[#F8F9FA]">
                {activeTab === 'todos' ? 'Todos los pedidos' : 
                 activeTab === 'porAprobar' ? 'Pedidos por aprobar' :
                 activeTab === 'pendientes' ? 'Pedidos pendientes' :
                 activeTab === 'aprobados' ? 'Pedidos aprobados' :
                 activeTab === 'rechazados' ? 'Pedidos rechazados' : 'Pedidos'}
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
                          Productos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/5 divide-y divide-[#2A82C7]/20">
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
                                {formatTime(order.fecha)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Building className="w-4 h-4 text-[#6C757D] mr-2" />
                                <div>
                                  <div className="font-medium text-[#F8F9FA]">{order.servicio}</div>
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                {renderStatusBadge(order.estado)}
                                {renderOperarioBadge(order)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-[#F8F9FA]">
                              ${order.total?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end space-x-2">
                                {/* Botón para descargar remito */}
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
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                                
                                {/* Botones de aprobación para supervisores */}
                                {userRole === 'supervisor' && 
                                  order.estado === OrderStatus.PENDING && 
                                  order.metadata?.creadoPorOperario && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openApprovalDialog(order._id)}
                                      className="border-green-500 text-green-500 hover:bg-green-900/20 hover:text-green-400"
                                    >
                                      <CheckSquare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openRejectionDialog(order._id)}
                                      className="border-red-500 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                                    >
                                      <XSquare className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Detalles del pedido (expandido) */}
                          {orderDetailsOpen === order._id && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-[#15497E]/20">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-[#F8F9FA]">Detalles del Pedido #{order.displayNumber}</h3>
                                    
                                    {/* Mostrar información de operario (si aplica) */}
                                    {order.metadata?.creadoPorOperario && (
                                      <div className="bg-white/10 rounded-md p-2 text-xs text-[#F8F9FA] border border-[#2A82C7]/50">
                                        <div className="flex items-center mb-1 text-[#2A82C7]">
                                          <UserCheck className="h-3 w-3 mr-1" />
                                          <span className="font-medium">Pedido creado por operario</span>
                                        </div>
                                        <p>Operario: <span className="font-medium">{order.metadata.operarioNombre || "Desconocido"}</span></p>
                                        {order.metadata.fechaCreacion && (
                                          <p>Fecha: {formatDate(order.metadata.fechaCreacion)} {formatTime(order.metadata.fechaCreacion)}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Mostrar motivo de rechazo si aplica */}
                                  {order.estado === OrderStatus.REJECTED && order.metadata?.motivoRechazo && (
                                    <Alert className="bg-red-900/20 border border-red-400 mt-2">
                                      <AlertTriangle className="h-4 w-4 text-red-400" />
                                      <AlertDescription className="ml-2 text-red-100">
                                        <span className="font-bold">Motivo de rechazo:</span> {order.metadata.motivoRechazo}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  
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
                            {formatDate(order.fecha)} - {formatTime(order.fecha)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          {renderStatusBadge(order.estado)}
                          <div className="text-xs text-right mt-1">
                            <span className="text-[#F8F9FA] font-medium">${order.total?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 pb-2">
                      <div className="space-y-2">
                        {/* Datos de cliente */}
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
                        
                        {/* Badge de operario si aplica */}
                        {renderOperarioBadge(order)}
                        
                        {/* Motivo de rechazo si aplica */}
                        {order.estado === OrderStatus.REJECTED && order.metadata?.motivoRechazo && (
                          <div className="mt-2 bg-red-900/20 border border-red-400 rounded-md p-2 text-xs text-red-100">
                            <span className="font-bold">Motivo de rechazo:</span> {order.metadata.motivoRechazo}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm text-[#6C757D] flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Productos:
                          </div>
                          <Badge className="bg-[#2A82C7]/30 text-[#F8F9FA] border-[#2A82C7]/50">
                            {order.productos?.length || 0} items
                          </Badge>
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
                    <CardFooter className="pt-0 pb-3 flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemitoDownload(order._id)}
                        disabled={isDownloadingRemito === order._id}
                        className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#15497E]/30"
                      >
                        {isDownloadingRemito === order._id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Remito
                      </Button>
                      
                      {/* Botones de aprobación para supervisores en móvil */}
                      {userRole === 'supervisor' && 
                        order.estado === OrderStatus.PENDING && 
                        order.metadata?.creadoPorOperario && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openApprovalDialog(order._id)}
                            className="border-green-500 text-green-500 hover:bg-green-900/20 hover:text-green-400"
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRejectionDialog(order._id)}
                            className="border-red-500 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                          >
                            <XSquare className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Diálogo de confirmación de aprobación */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#15497E] border-[#2A82C7] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#F8F9FA]">Aprobar Pedido</DialogTitle>
            <DialogDescription className="text-[#6C757D]">
              Al aprobar este pedido, se generará la orden y se procesará para su entrega.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-[#F8F9FA]">
              ¿Estás seguro de que deseas aprobar este pedido?
            </p>
            
            <div className="mt-4 bg-white/10 p-3 rounded-md border border-[#2A82C7]/40">
              <p className="text-sm text-[#6C757D]">
                Una vez aprobado, el pedido se enviará a logística para su procesamiento y entrega. 
                El operario será notificado de que su pedido ha sido aprobado.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setApprovalDialogOpen(false)}
              className="border-[#2A82C7] text-[#F8F9FA]"
              disabled={isProcessingApproval}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={approveOrder}
              disabled={isProcessingApproval}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessingApproval ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Confirmar Aprobación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de rechazo de pedido */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#15497E] border-[#2A82C7] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#F8F9FA]">Rechazar Pedido</DialogTitle>
            <DialogDescription className="text-[#6C757D]">
              Por favor, proporciona un motivo para el rechazo del pedido.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="rejectionReason" className="text-[#F8F9FA] mb-2 block">
              Motivo del rechazo *
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explica por qué estás rechazando este pedido..."
              className="min-h-[120px] bg-white/10 border-[#2A82C7] text-[#F8F9FA] placeholder:text-[#6C757D]"
              required
            />
            
            <div className="mt-4 bg-red-900/20 p-3 rounded-md border border-red-500/40">
              <p className="text-sm text-red-200">
                Al rechazar un pedido, se notificará al operario con el motivo proporcionado. 
                El pedido no se procesará y los productos volverán a estar disponibles.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setRejectionDialogOpen(false)}
              className="border-[#2A82C7] text-[#F8F9FA]"
              disabled={isProcessingApproval}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={rejectOrder}
              disabled={isProcessingApproval || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessingApproval ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <XSquare className="mr-2 h-4 w-4" />
                  Confirmar Rechazo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};