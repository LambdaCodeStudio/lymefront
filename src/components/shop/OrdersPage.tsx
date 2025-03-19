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
  CheckCircle2,
  Bell
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardFooter, 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const queryClient = useQueryClient();

  // Estados
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
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
  
  // Información del usuario
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Obtener parámetros de URL al cargar
  useEffect(() => {
    // Verificar tab en URL
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, []);

  // Obtener información del usuario actual
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    const storedId = localStorage.getItem('userId');
    
    if (storedRole) setUserRole(storedRole);
    if (storedId) setUserId(storedId);
    
    fetchUserData();
  }, []);

  // Obtener información del usuario actual
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch('http://localhost:3000/api/auth/me', {
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
      return null;
    }
  };

  // Función para obtener pedidos con React Query
  const fetchOrders = async (): Promise<Order[]> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No se encontró token de autenticación');
    }
    
    // Obtener todos los pedidos
    const response = await fetch('http://localhost:3000/api/pedido', {
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
        return [];
      }
      throw new Error(`Error al cargar pedidos (estado: ${response.status})`);
    }

    const allOrders = await response.json();
    
    // Determinar qué pedidos mostrar según el rol del usuario
    let relevantOrders: Order[] = [];
    
    if (userRole === 'supervisor') {
      // Para supervisores: mostrar pedidos propios + los creados por sus operarios
      relevantOrders = allOrders.filter((order: Order) => {
        // Pedidos propios del supervisor
        const isOwnOrder = typeof order.userId === 'object' 
          ? order.userId._id === userId 
          : order.userId === userId;
        
        // Pedidos creados por operarios que el supervisor supervisa
        const isOperarioOrder = order.metadata?.creadoPorOperario && 
                               order.metadata?.supervisorId === userId;
        
        return isOwnOrder || isOperarioOrder;
      });
    } else if (userRole === 'operario') {
      // Para operarios: solo mostrar sus propios pedidos
      relevantOrders = allOrders.filter((order: Order) => {
        const isDirectOrder = typeof order.userId === 'object' 
          ? order.userId._id === userId 
          : order.userId === userId;
        
        const isIndirectOrder = order.metadata?.creadoPorOperario && 
                               order.metadata?.operarioId === userId;
        
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
    
    return processedOrders;
  };

  // Usar React Query para obtener pedidos
  const { 
    data: orders = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['orders', userId, userRole],
    queryFn: fetchOrders,
    enabled: !!userId && !!userRole,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
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

  // Mutación para aprobar un pedido
  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://localhost:3000/api/pedido/${orderId}/aprobar`, {
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
      
      return orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      addNotification('Pedido aprobado correctamente', 'success');
      setApprovalDialogOpen(false);
      setSelectedOrderId(null);
    },
    onError: (error) => {
      addNotification(`Error al aprobar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    }
  });

  // Mutación para rechazar un pedido
  const rejectMutation = useMutation({
    mutationFn: async ({orderId, motivo}: {orderId: string, motivo: string}) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://localhost:3000/api/pedido/${orderId}/rechazar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: OrderStatus.REJECTED,
          motivoRechazo: motivo,
          fechaRechazo: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al rechazar pedido (${response.status})`);
      }
      
      return orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      addNotification('Pedido rechazado correctamente', 'success');
      setRejectionDialogOpen(false);
      setSelectedOrderId(null);
      setRejectionReason('');
    },
    onError: (error) => {
      addNotification(`Error al rechazar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    }
  });

  // Filtrar pedidos por rango de fechas
  const filterOrdersByDate = async () => {
    if (!dateFilter.fechaInicio || !dateFilter.fechaFin) {
      addNotification('Por favor seleccione ambas fechas, inicio y fin', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const url = `http://localhost:3000/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al filtrar pedidos por fecha (estado: ${response.status})`);
      }

      const data = await response.json();
      
      // Filtrar según el rol del usuario
      let relevantOrders: Order[] = [];
      
      if (userRole === 'supervisor') {
        // Para supervisores: mostrar pedidos propios + los creados por sus operarios
        relevantOrders = data.filter((order: Order) => {
          const isOwnOrder = typeof order.userId === 'object' 
            ? order.userId._id === userId 
            : order.userId === userId;
          
          const isOperarioOrder = order.metadata?.creadoPorOperario && 
                                 order.metadata?.supervisorId === userId;
          
          return isOwnOrder || isOperarioOrder;
        });
      } else if (userRole === 'operario') {
        // Para operarios: solo mostrar sus propios pedidos
        relevantOrders = data.filter((order: Order) => {
          const isDirectOrder = typeof order.userId === 'object' 
            ? order.userId._id === userId 
            : order.userId === userId;
          
          const isIndirectOrder = order.metadata?.creadoPorOperario && 
                                 order.metadata?.operarioId === userId;
          
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
      
      // Actualizar la caché de React Query manualmente
      queryClient.setQueryData(['orders', userId, userRole], processedOrders);
      
      addNotification(`Se encontraron ${processedOrders.length} pedidos en el rango de fechas seleccionado`, 
        processedOrders.length === 0 ? 'info' : 'success');
      
      // Cerrar filtros móviles si están abiertos
      setShowMobileFilters(false);
    } catch (error) {
      console.error('Error al filtrar por fecha:', error);
      addNotification(`Error al filtrar por fecha: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    }
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter({ fechaInicio: '', fechaFin: '' });
    setStatusFilter('all');
    refetch();
    setShowMobileFilters(false);
    
    addNotification('Filtros eliminados. Mostrando todos los pedidos.', 'info');
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
      
      const response = await fetch(`http://localhost:3000/api/downloads/remito/${orderId}`, {
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
      
      addNotification('Remito descargado correctamente', 'success');
    } catch (error) {
      console.error('Error al descargar remito:', error);
      addNotification(`Error al descargar remito: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
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
  const handleApproveOrder = () => {
    if (selectedOrderId) {
      approveMutation.mutate(selectedOrderId);
    }
  };

  // Rechazar pedido
  const handleRejectOrder = () => {
    if (selectedOrderId && rejectionReason.trim()) {
      rejectMutation.mutate({ orderId: selectedOrderId, motivo: rejectionReason });
    } else if (!rejectionReason.trim()) {
      addNotification('Debe proporcionar un motivo para rechazar el pedido', 'warning');
    }
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
          <Badge variant="outline" className="bg-[var(--state-warning)]/20 text-[var(--state-warning)] border-[var(--state-warning)]">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case OrderStatus.APPROVED:
        return (
          <Badge variant="outline" className="bg-[var(--state-success)]/20 text-[var(--state-success)] border-[var(--state-success)]">
            <CheckSquare className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case OrderStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-[var(--state-error)]/20 text-[var(--state-error)] border-[var(--state-error)]">
            <XSquare className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      case OrderStatus.DELIVERED:
        return (
          <Badge variant="outline" className="bg-[var(--state-info)]/20 text-[var(--state-info)] border-[var(--state-info)]">
            <Package className="w-3 h-3 mr-1" />
            Entregado
          </Badge>
        );
      case OrderStatus.CANCELED:
        return (
          <Badge variant="outline" className="bg-[var(--background-secondary)] text-[var(--text-tertiary)] border-[var(--text-disabled)]">
            <X className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-[var(--background-secondary)] text-[var(--text-tertiary)] border-[var(--text-disabled)]">
            Desconocido
          </Badge>
        );
    }
  };

  // Renderizar la badge de pedido creado por operario
  const renderOperarioBadge = (order: Order) => {
    if (order.metadata?.creadoPorOperario) {
      return (
        <Badge variant="outline" className="bg-[var(--accent-tertiary)]/20 text-[var(--accent-tertiary)] border-[var(--accent-tertiary)] ml-2">
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
    refetch();
  };

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8 shop-theme">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center text-[var(--text-primary)]">
            <ShoppingCart className="mr-3 h-8 w-8 text-[var(--accent-primary)]" />
            Mis Pedidos
          </h1>
          
          {/* Alertas */}
          {error && (
            <Alert className="mb-6 bg-[var(--state-error)]/10 border border-[var(--state-error)]/30">
              <AlertCircle className="h-4 w-4 text-[var(--state-error)]" />
              <AlertDescription className="ml-2 text-[var(--text-primary)]">
                {error instanceof Error ? error.message : 'Error al cargar pedidos'}
              </AlertDescription>
            </Alert>
          )}

          {/* Pestañas para filtrar por categorías principales */}
          <div className="mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-[var(--background-secondary)] border border-[var(--accent-primary)]/20 w-full">
                <TabsTrigger 
                  value="todos" 
                  className="flex-1 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white text-[var(--text-primary)]"
                >
                  Todos
                </TabsTrigger>
                
                {/* Pestaña extra para supervisores: pedidos por aprobar */}
                {userRole === 'supervisor' && (
                  <TabsTrigger 
                    value="porAprobar" 
                    className="flex-1 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white text-[var(--text-primary)] relative"
                  >
                    <FileCheck className="w-4 h-4 mr-1" />
                    Por aprobar
                    {getPendingApprovalCount() > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[var(--state-warning)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {getPendingApprovalCount()}
                      </span>
                    )}
                  </TabsTrigger>
                )}
                
                <TabsTrigger 
                  value="pendientes" 
                  className="flex-1 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white text-[var(--text-primary)]"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Pendientes
                </TabsTrigger>
                
                <TabsTrigger 
                  value="aprobados" 
                  className="flex-1 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white text-[var(--text-primary)]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Aprobados
                </TabsTrigger>
                
                <TabsTrigger 
                  value="rechazados" 
                  className="flex-1 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white text-[var(--text-primary)]"
                >
                  <XSquare className="w-4 h-4 mr-1" />
                  Rechazados
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filtros y búsqueda */}
          <div className="mb-6 space-y-4 bg-[var(--background-component)] p-4 rounded-xl shadow-sm border border-[var(--accent-primary)]/10">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--accent-primary)] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-[var(--background-card)] border-[var(--accent-tertiary)] focus:border-[var(--accent-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading || approveMutation.isPending || rejectMutation.isPending}
                className="border-[var(--accent-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="fechaInicio" className="text-[var(--text-primary)] text-sm font-medium">
                  Fecha Inicio
                </label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={dateFilter.fechaInicio}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                  className="w-full bg-[var(--background-card)] border-[var(--accent-tertiary)] focus:border-[var(--accent-primary)] text-[var(--text-primary)] mt-1"
                />
              </div>
              <div>
                <label htmlFor="fechaFin" className="text-[var(--text-primary)] text-sm font-medium">
                  Fecha Fin
                </label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={dateFilter.fechaFin}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                  className="w-full bg-[var(--background-card)] border-[var(--accent-tertiary)] focus:border-[var(--accent-primary)] text-[var(--text-primary)] mt-1"
                />
              </div>
              <Button
                variant="outline"
                onClick={filterOrdersByDate}
                className="border-[var(--accent-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar por Fecha
              </Button>
              {(dateFilter.fechaInicio || dateFilter.fechaFin || searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Estado de carga */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-primary)]" />
                <p className="mt-4 text-[var(--text-primary)]">Cargando pedidos...</p>
              </div>
            </div>
          )}

          {/* Sin pedidos */}
          {!isLoading && filteredOrders.length === 0 && (
            <div className="bg-[var(--background-card)] rounded-xl shadow-sm p-8 text-center border border-[var(--accent-primary)]/10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-primary)]/10 rounded-full mb-4">
                <ShoppingCart className="w-8 h-8 text-[var(--accent-primary)]" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No se encontraron pedidos</h2>
              <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
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
                  className="mt-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-tertiary)] text-white"
                >
                  Mostrar todos los pedidos
                </Button>
              )}
            </div>
          )}

          {/* Lista de pedidos */}
          {!isLoading && filteredOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-medium mb-4 flex items-center text-[var(--text-primary)]">
                {activeTab === 'todos' ? 'Todos los pedidos' : 
                 activeTab === 'porAprobar' ? 'Pedidos por aprobar' :
                 activeTab === 'pendientes' ? 'Pedidos pendientes' :
                 activeTab === 'aprobados' ? 'Pedidos aprobados' :
                 activeTab === 'rechazados' ? 'Pedidos rechazados' : 'Pedidos'}
                <Badge variant="outline" className="ml-3 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-tertiary)]">
                  {filteredOrders.length} pedidos
                </Badge>
              </h2>

              {/* Vista para escritorio */}
              <div className="hidden md:block">
                <div className="bg-[var(--background-card)] rounded-xl shadow-sm overflow-hidden border border-[var(--accent-primary)]/10">
                  <table className="w-full">
                    <thead className="bg-[var(--accent-primary)]/10 text-[var(--text-primary)] border-b border-[var(--accent-primary)]/20">
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
                    <tbody className="bg-white divide-y divide-[var(--accent-tertiary)]/10">
                      {filteredOrders.map((order) => (
                        <React.Fragment key={order._id}>
                          <tr className="hover:bg-[var(--background-component)] transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center font-medium text-[var(--text-primary)]">
                                <Hash className="w-4 h-4 text-[var(--accent-primary)] mr-2" />
                                {order.displayNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-[var(--text-primary)]">{formatDate(order.fecha)}</div>
                              <div className="text-xs text-[var(--text-tertiary)]">
                                {formatTime(order.fecha)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Building className="w-4 h-4 text-[var(--accent-tertiary)] mr-2" />
                                <div>
                                  <div className="font-medium text-[var(--text-primary)]">{order.servicio}</div>
                                  {order.seccionDelServicio && (
                                    <div className="text-xs text-[var(--text-tertiary)] flex items-center mt-1">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {order.seccionDelServicio}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-tertiary)]/50">
                                {order.productos?.length || 0} items
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleOrderDetails(order._id)}
                                className="ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10"
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
                            <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-[var(--text-primary)]">
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
                                  className="border-[var(--accent-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10"
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
                                      className="border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success)]/10"
                                      disabled={approveMutation.isPending || rejectMutation.isPending}
                                    >
                                      <CheckSquare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openRejectionDialog(order._id)}
                                      className="border-[var(--state-error)] text-[var(--state-error)] hover:bg-[var(--state-error)]/10"
                                      disabled={approveMutation.isPending || rejectMutation.isPending}
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
                              <td colSpan={7} className="px-6 py-4 bg-[var(--background-component)]">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-[var(--text-primary)]">Detalles del Pedido #{order.displayNumber}</h3>
                                    
                                    {/* Mostrar información de operario (si aplica) */}
                                    {order.metadata?.creadoPorOperario && (
                                      <div className="bg-[var(--accent-tertiary)]/10 rounded-md p-2 text-xs text-[var(--text-primary)] border border-[var(--accent-tertiary)]/30">
                                        <div className="flex items-center mb-1 text-[var(--accent-primary)]">
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
                                    <Alert className="bg-[var(--state-error)]/10 border border-[var(--state-error)]/30 mt-2">
                                      <AlertTriangle className="h-4 w-4 text-[var(--state-error)]" />
                                      <AlertDescription className="ml-2 text-[var(--text-primary)]">
                                        <span className="font-bold">Motivo de rechazo:</span> {order.metadata.motivoRechazo}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  
                                  {/* Productos del pedido */}
                                  <div className="bg-[var(--background-card)] rounded-md border border-[var(--accent-tertiary)]/20 overflow-hidden">
                                    <table className="min-w-full">
                                      <thead className="bg-[var(--accent-primary)]/10 border-b border-[var(--accent-tertiary)]/20">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-primary)] uppercase">
                                            Producto
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-primary)] uppercase">
                                            Cantidad
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-primary)] uppercase">
                                            Precio
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-primary)] uppercase">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[var(--accent-tertiary)]/10">
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
                                            <tr key={index} className="hover:bg-[var(--background-component)]/50">
                                              <td className="px-4 py-3 text-[var(--text-primary)]">
                                                {productName}
                                              </td>
                                              <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                {item.cantidad}
                                              </td>
                                              <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                                ${productPrice.toFixed(2)}
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                                                ${(productPrice * item.cantidad).toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        
                                        {/* Fila de total */}
                                        <tr className="bg-[var(--accent-primary)]/5">
                                          <td colSpan={3} className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                                            Total:
                                          </td>
                                          <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                                            ${order.total?.toFixed(2) || '0.00'}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Sección de notas */}
                                  {order.detalle && order.detalle.trim() !== '' && (
                                    <div className="mt-3">
                                      <h4 className="text-sm font-medium text-[var(--text-primary)]">Notas:</h4>
                                      <p className="text-sm text-[var(--text-secondary)] bg-[var(--background-card)] p-3 rounded-md border border-[var(--accent-tertiary)]/20 mt-1">
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
                  <Card key={order._id} className="bg-[var(--background-card)] border-[var(--accent-tertiary)]/20 overflow-hidden">
                    <CardHeader className="pb-2 bg-[var(--accent-primary)]/5 border-b border-[var(--accent-tertiary)]/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm flex items-center text-[var(--text-primary)]">
                            <Hash className="w-4 h-4 text-[var(--accent-primary)] mr-1" />
                            Pedido #{order.displayNumber}
                          </CardTitle>
                          <p className="text-xs text-[var(--text-tertiary)] mt-1">
                            {formatDate(order.fecha)} - {formatTime(order.fecha)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          {renderStatusBadge(order.estado)}
                          <div className="text-xs text-right mt-1">
                            <span className="text-[var(--text-primary)] font-medium">${order.total?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 pb-2">
                      <div className="space-y-2">
                        {/* Datos de cliente */}
                        <div className="flex items-start gap-2">
                          <Building className="w-4 h-4 text-[var(--accent-tertiary)] mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{order.servicio}</p>
                            {order.seccionDelServicio && (
                              <p className="text-xs text-[var(--text-tertiary)] flex items-center mt-0.5">
                                <MapPin className="w-3 h-3 mr-1" />
                                {order.seccionDelServicio}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Badge de operario si aplica */}
                        {renderOperarioBadge(order)}
                        
                        {/* Mostrar motivo de rechazo si aplica */}
                        {order.estado === OrderStatus.REJECTED && order.metadata?.motivoRechazo && (
                          <div className="mt-2 bg-[var(--state-error)]/10 border border-[var(--state-error)]/30 rounded-md p-2 text-xs text-[var(--text-primary)]">
                            <span className="font-bold">Motivo de rechazo:</span> {order.metadata.motivoRechazo}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm text-[var(--text-secondary)] flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Productos:
                          </div>
                          <Badge className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-tertiary)]/30">
                            {order.productos?.length || 0} items
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Detalles expandibles del pedido */}
                      <Accordion type="single" collapsible className="mt-2">
                        <AccordionItem value="details" className="border-t border-[var(--accent-tertiary)]/20 pt-2">
                          <AccordionTrigger className="py-2 text-xs text-[var(--accent-primary)]">
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
                                  <div key={index} className="flex justify-between items-center py-1 border-b border-[var(--accent-tertiary)]/10">
                                    <div className="text-[var(--text-primary)]">
                                      <div className="text-sm font-medium">{productName}</div>
                                      <div className="text-xs text-[var(--text-tertiary)]">
                                        Cant: {item.cantidad} x ${productPrice.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-[var(--text-primary)]">
                                      ${(productPrice * item.cantidad).toFixed(2)}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Notas */}
                              {order.detalle && order.detalle.trim() !== '' && (
                                <div className="mt-3 pt-2">
                                  <h4 className="text-xs font-medium text-[var(--text-primary)]">Notas:</h4>
                                  <p className="text-xs text-[var(--text-secondary)] bg-[var(--background-component)] p-2 rounded border border-[var(--accent-tertiary)]/20 mt-1">
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
                        className="border-[var(--accent-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10"
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
                            className="border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success)]/10"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRejectionDialog(order._id)}
                            className="border-[var(--state-error)] text-[var(--state-error)] hover:bg-[var(--state-error)]/10"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
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
        <DialogContent className="sm:max-w-md bg-[var(--background-card)] border-[var(--accent-tertiary)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-[var(--state-success)]" />
              Aprobar Pedido
            </DialogTitle>
            <DialogDescription className="text-[var(--text-tertiary)]">
              Al aprobar este pedido, se generará la orden y se procesará para su entrega.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-[var(--text-primary)]">
              ¿Estás seguro de que deseas aprobar este pedido?
            </p>
            
            <div className="mt-4 bg-[var(--accent-primary)]/5 p-3 rounded-md border border-[var(--accent-primary)]/20">
              <p className="text-sm text-[var(--text-secondary)]">
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
              className="border-[var(--accent-tertiary)] text-[var(--text-primary)]"
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleApproveOrder}
              disabled={approveMutation.isPending}
              className="bg-[var(--state-success)] hover:bg-[var(--state-success)]/80 text-white font-medium"
            >
              {approveMutation.isPending ? (
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
        <DialogContent className="sm:max-w-md bg-[var(--background-card)] border-[var(--accent-tertiary)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center">
              <XSquare className="mr-2 h-5 w-5 text-[var(--state-error)]" />
              Rechazar Pedido
            </DialogTitle>
            <DialogDescription className="text-[var(--text-tertiary)]">
              Por favor, proporciona un motivo para el rechazo del pedido.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="rejectionReason" className="text-[var(--text-primary)] mb-2 block">
              Motivo del rechazo *
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explica por qué estás rechazando este pedido..."
              className="min-h-[120px] bg-[var(--background-component)] border-[var(--accent-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              required
            />
            
            <div className="mt-4 bg-[var(--state-error)]/10 p-3 rounded-md border border-[var(--state-error)]/20">
              <p className="text-sm text-[var(--text-secondary)]">
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
              className="border-[var(--accent-tertiary)] text-[var(--text-primary)]"
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleRejectOrder}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="bg-[var(--state-error)] hover:bg-[var(--state-error)]/80 text-white"
            >
              {rejectMutation.isPending ? (
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