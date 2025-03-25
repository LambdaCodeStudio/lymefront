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
  FileSpreadsheet,
  BookCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle
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
}

// Tipos de datos
interface OrderProduct {
  productoId: string | { _id: string; nombre?: string; precio?: number;[key: string]: any };
  cantidad: number;
  nombre?: string;
  precio?: number;
  precioUnitario?: number;
}

interface Order {
  _id: string;
  servicio: string;
  seccionDelServicio?: string;
  userId: string | { _id: string; email?: string; nombre?: string;[key: string]: any };
  supervisorId?: string | { _id: string; email?: string; nombre?: string;[key: string]: any };
  fecha: string;
  productos: OrderProduct[];
  detalle?: string;
  numero?: string;
  nPedido?: number; // Campo específico para número de pedido (backend)
  displayNumber?: string; // Campo para mostrar consistentemente
  total?: number;
  estado?: OrderStatus; // Estado del pedido
  cliente?: {
    clienteId: string | { _id: string; nombre?: string;[key: string]: any };
    subServicioId?: string;
    subUbicacionId?: string;
    nombreCliente?: string;
    nombreSubServicio?: string;
    nombreSubUbicacion?: string;
  };
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
  fechaAprobacion?: string;
  fechaRechazo?: string;
  aprobadoPor?: string | { _id: string; nombre?: string;[key: string]: any };
  rechazadoPor?: string | { _id: string; nombre?: string;[key: string]: any };
  observaciones?: string;
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
  const [menuOpen, setMenuOpen] = useState(false);

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

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del usuario');
      }

      const userData = await response.json();

      // Verificar si la respuesta contiene userData.user
      const user = userData.user || userData;

      // Actualizar estados y localStorage
      if (user.role) {
        localStorage.setItem('userRole', user.role);
        setUserRole(user.role);
      }

      if (user._id || user.id) {
        const id = user._id || user.id;
        localStorage.setItem('userId', id);
        setUserId(id);
      }

      return user._id || user.id || null;
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

    let allOrders: Order[] = [];

    // Si el usuario es un supervisor, obtener pedidos específicos
    if (userRole === 'supervisor' && userId) {
      const response = await fetch(`/api/pedido/supervisor/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        handleAuthError(response);
        throw new Error(`Error al cargar pedidos (estado: ${response.status})`);
      }

      allOrders = await response.json();
    }
    // Si el usuario es operario, obtener sus pedidos regulares y los que ha creado
    else if (userRole === 'operario' && userId) {
      try {
        // Obtener los pedidos regulares del operario
        const regularOrdersResponse = await fetch(`/api/pedido/user/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!regularOrdersResponse.ok) {
          handleAuthError(regularOrdersResponse);
          throw new Error(`Error al cargar pedidos regulares (estado: ${regularOrdersResponse.status})`);
        }

        const regularOrders = await regularOrdersResponse.json();
        allOrders = [...regularOrders];

        // Obtener los pedidos creados por el operario
        try {
          const createdOrdersResponse = await fetch(`/api/pedido/operario/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            }
          });

          if (createdOrdersResponse.ok) {
            const createdOrders = await createdOrdersResponse.json();

            // Combinar ambos conjuntos de pedidos
            const orderMap = new Map<string, Order>();

            // Procesar pedidos regulares
            regularOrders.forEach(order => {
              orderMap.set(order._id, order);
            });

            // Añadir pedidos creados, sobreescribiendo si es necesario
            createdOrders.forEach(order => {
              orderMap.set(order._id, order);
            });

            // Convertir el Map de vuelta a un array
            allOrders = Array.from(orderMap.values());

            console.log(`Total de pedidos para operario: ${allOrders.length} (${regularOrders.length} regulares, ${createdOrders.length} creados)`);
          }
        } catch (createdOrdersError) {
          console.error('Error al obtener pedidos creados por el operario:', createdOrdersError);
          // Continuar con los pedidos regulares si hay un error con los pedidos creados
        }
      } catch (error) {
        console.error('Error al obtener pedidos para operario:', error);
        throw error;
      }
    }
    // Para cualquier otro rol, obtener todos los pedidos
    else {
      const response = await fetch('/api/pedido', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        handleAuthError(response);
        throw new Error(`Error al cargar pedidos (estado: ${response.status})`);
      }

      allOrders = await response.json();
    }

    // Procesar pedidos (calcular totales y ordenar)
    const processedOrders = allOrders.map((order: Order) => ({
      ...order,
      displayNumber: order.nPedido?.toString() || 'S/N',
      total: calculateOrderTotal(order)
    })).sort((a: Order, b: Order) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return processedOrders;
  };

  // Función auxiliar para manejar errores de autenticación
  const handleAuthError = (response: Response) => {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
  };

  // Calcular el total de un pedido
  const calculateOrderTotal = (order: Order): number => {
    if (!Array.isArray(order.productos)) return 0;

    return order.productos.reduce((total, item) => {
      let price = 0;

      // Primero intentamos usar el precio unitario que ya viene en el item
      if (typeof item.precioUnitario === 'number') {
        price = item.precioUnitario;
      }
      // Luego el precio del item directamente
      else if (typeof item.precio === 'number') {
        price = item.precio;
      }
      // Si el producto está poblado y tiene precio
      else if (typeof item.productoId === 'object' && item.productoId && typeof item.productoId.precio === 'number') {
        price = item.productoId.precio;
      }

      return total + (price * item.cantidad);
    }, 0);
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

  // Efecto para filtrar pedidos cuando cambian los filtros
  useEffect(() => {
    if (!orders.length) return;

    let result = [...orders];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.servicio.toLowerCase().includes(search) ||
        (order.seccionDelServicio || '').toLowerCase().includes(search) ||
        (order.displayNumber || '').toLowerCase().includes(search) ||
        (order.cliente?.nombreCliente || '').toLowerCase().includes(search) ||
        (typeof order.userId === 'object' && order.userId?.nombre
          ? order.userId.nombre.toLowerCase().includes(search)
          : false)
      );
    }

    // Filtrar por estado si se ha seleccionado un filtro
    if (statusFilter !== 'all') {
      result = result.filter(order => order.estado === statusFilter);
    }

    // Filtrar por pestañas
    switch (activeTab) {
      case 'porAprobar':
        // Mostrar todos los pedidos pendientes, unificando la funcionalidad
        result = result.filter(order => order.estado === OrderStatus.PENDING);
        break;
      case 'aprobados':
        result = result.filter(order => order.estado === OrderStatus.APPROVED);
        break;
      case 'rechazados':
        if (userRole === 'operario') {
          // Para operarios, mostrar pedidos rechazados con énfasis en los creados por ellos
          result = result.filter(order =>
            order.estado === OrderStatus.REJECTED && (
              // Pedidos rechazados creados por este operario
              (order.metadata?.creadoPorOperario && order.metadata?.operarioId === userId) ||
              // O pedidos rechazados asignados a este operario
              (typeof order.userId === 'object'
                ? order.userId?._id === userId
                : order.userId === userId)
            )
          );
        } else {
          // Para otros roles, mostrar todos los pedidos rechazados
          result = result.filter(order => order.estado === OrderStatus.REJECTED);
        }
        break;
      case 'creados':
        // Pedidos creados por operarios (solo para operarios)
        result = result.filter(order =>
          order.metadata?.creadoPorOperario &&
          order.metadata?.operarioId === userId
        );
        break;
    }

    setFilteredOrders(result);
  }, [searchTerm, orders, statusFilter, activeTab, userId, userRole]);

  // Mutación para aprobar un pedido
  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`/api/pedido/${orderId}`, {
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
    mutationFn: async ({ orderId, motivo }: { orderId: string, motivo: string }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`/api/pedido/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: OrderStatus.REJECTED,
          observaciones: motivo,
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

      let url = `/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;

      // Si es operario, añadir el parámetro de usuario
      if (userRole === 'operario' && userId) {
        url += `&userId=${userId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al filtrar pedidos por fecha (estado: ${response.status})`);
      }

      let data = await response.json();

      // Si es operario, intentar también obtener los pedidos creados
      if (userRole === 'operario' && userId) {
        try {
          const createdOrdersUrl = `/api/pedido/operario/${userId}/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;

          const createdOrdersResponse = await fetch(createdOrdersUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (createdOrdersResponse.ok) {
            const createdOrdersData = await createdOrdersResponse.json();

            // Combinar ambos conjuntos y eliminar duplicados
            const orderMap = new Map<string, Order>();

            // Añadir pedidos regulares
            data.forEach((order: Order) => {
              orderMap.set(order._id, order);
            });

            // Añadir pedidos creados
            createdOrdersData.forEach((order: Order) => {
              orderMap.set(order._id, order);
            });

            // Convertir el Map de vuelta a un array
            data = Array.from(orderMap.values());
          }
        } catch (error) {
          console.error('Error al obtener pedidos creados por fecha:', error);
          // Continuar con los pedidos regulares si hay un error
        }
      }

      // Procesar pedidos (calcular totales y ordenar)
      const processedOrders = data.map((order: Order) => ({
        ...order,
        displayNumber: order.nPedido?.toString() || 'S/N',
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
    setActiveTab('todos');
    refetch();
    setShowMobileFilters(false);

    // Actualizar URL sin recargar la página usando History API
    const url = new URL(window.location);
    url.searchParams.set('tab', 'todos');
    window.history.pushState({}, '', url);

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

      const response = await fetch(`/api/downloads/remito/${orderId}`, {
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

  // Obtener nombre del cliente desde el pedido
  const getClientName = (order: Order): string => {
    // Primero intentar con cliente.nombreCliente que es el más explícito
    if (order.cliente?.nombreCliente) {
      return order.cliente.nombreCliente;
    }

    // Luego con cliente.clienteId si es un objeto
    if (order.cliente?.clienteId && typeof order.cliente.clienteId === 'object') {
      return order.cliente.clienteId.nombre || 'Cliente sin nombre';
    }

    // Finalmente, usar el campo servicio por compatibilidad
    return order.servicio || 'Cliente sin nombre';
  };

  // Obtener sección del cliente desde el pedido
  const getClientSection = (order: Order): string | null => {
    // Primero intentar con subServicio
    if (order.cliente?.nombreSubServicio) {
      return order.cliente.nombreSubServicio;
    }

    // Luego usar seccionDelServicio por compatibilidad
    return order.seccionDelServicio || null;
  };

  // Renderizar el badge de estado del pedido
  const renderStatusBadge = (status?: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <Badge variant="outline" className="bg-[#FF9800]/20 text-[#FF9800] border-[#FF9800] transition-colors duration-200">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case OrderStatus.APPROVED:
        return (
          <Badge variant="outline" className="bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50] transition-colors duration-200">
            <CheckSquare className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case OrderStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-[#F44336]/20 text-[#F44336] border-[#F44336] transition-colors duration-200">
            <XSquare className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      case OrderStatus.DELIVERED:
        return (
          <Badge variant="outline" className="bg-[#2196F3]/20 text-[#2196F3] border-[#2196F3] transition-colors duration-200">
            <Package className="w-3 h-3 mr-1" />
            Entregado
          </Badge>
        );
      case OrderStatus.CANCELED:
        return (
          <Badge variant="outline" className="bg-[#e8f0f3] text-[#5c5c5c] border-[#878787] transition-colors duration-200">
            <X className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-[#e8f0f3] text-[#5c5c5c] border-[#878787] transition-colors duration-200">
            Desconocido
          </Badge>
        );
    }
  };

  // Renderizar la badge de pedido creado por operario
  const renderOperarioBadge = (order: Order) => {
    if (order.metadata?.creadoPorOperario) {
      return (
        <Badge variant="outline" className="bg-[#5baed1]/20 text-[#3a8fb7] border-[#5baed1] ml-2 transition-colors duration-200">
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
      (
        // Pedidos directamente asignados al supervisor
        (typeof order.supervisorId === 'object'
          ? order.supervisorId?._id === userId
          : order.supervisorId === userId) ||
        // O pedidos con subservicios asignados a este supervisor
        order.cliente?.subServicioId
      )
    ).length;
  };

  // Obtener conteo de pedidos creados por el operario
  const getCreatedOrdersCount = () => {
    return orders.filter(order =>
      order.metadata?.creadoPorOperario &&
      order.metadata?.operarioId === userId
    ).length;
  };

  // Función para actualizar manualmente
  const handleManualRefresh = () => {
    refetch();
  };

  // Comprobar si el usuario puede aprobar el pedido (solo supervisores para pedidos en su subservicio)
  const canApproveOrder = (order: Order): boolean => {
    if (userRole !== 'supervisor') return false;

    return (
      order.estado === OrderStatus.PENDING &&
      (
        // El supervisor está directamente asignado al pedido
        (typeof order.supervisorId === 'object'
          ? order.supervisorId?._id === userId
          : order.supervisorId === userId) ||
        // O el pedido tiene un subservicio asignado a este supervisor
        (order.cliente?.subServicioId)
      )
    );
  };

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8 shop-theme">
        <div className="max-w-6xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-8 flex items-center text-[#333333]"
          >
            <ShoppingCart className="mr-3 h-8 w-8 text-[#3a8fb7]" />
            Mis Pedidos
          </motion.h1>

          {/* Alertas */}
          {error && (
            <Alert className="mb-6 bg-[#F44336]/10 border border-[#F44336]/30 transition-all duration-300">
              <AlertCircle className="h-4 w-4 text-[#F44336]" />
              <AlertDescription className="ml-2 text-[#333333]">
                {error instanceof Error ? error.message : 'Error al cargar pedidos'}
              </AlertDescription>
            </Alert>
          )}

          {/* Pestañas para filtrar por categorías principales */}
          <div className="mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="relative w-full">
                <Button
                  variant="outline"
                  className="border-[#3a8fb7]/20 bg-[#e8f0f3] w-full sm:w-[220px] flex justify-between items-center shadow-sm"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className="flex items-center gap-2">
                    {activeTab === "todos" && "Todos"}
                    {activeTab === "porAprobar" && (
                      <>
                        <Clock className="h-4 w-4" />
                        <span>Pendientes</span>
                        {getPendingApprovalCount() > 0 && (
                          <span className="bg-[#FF9800] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {getPendingApprovalCount()}
                          </span>
                        )}
                      </>
                    )}
                    {activeTab === "aprobados" && (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Aprobados</span>
                      </>
                    )}
                    {activeTab === "rechazados" && (
                      <>
                        <XSquare className="h-4 w-4" />
                        <span>Rechazados</span>
                      </>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </Button>

                {menuOpen && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-full sm:w-[220px] rounded-md border border-[#3a8fb7]/20 bg-white shadow-lg">
                    <div className="p-1 flex flex-col">
                      <Button
                        variant="ghost"
                        className={`justify-start mb-1 ${activeTab === "todos" ? "bg-[#3a8fb7] text-white" : "text-[#333333]"}`}
                        onClick={() => {
                          setActiveTab("todos");
                          setMenuOpen(false);
                        }}
                      >
                        Todos
                      </Button>

                      {userRole === 'supervisor' && (
                        <Button
                          variant="ghost"
                          className={`justify-start mb-1 ${activeTab === "porAprobar" ? "bg-[#3a8fb7] text-white" : "text-[#333333]"}`}
                          onClick={() => {
                            setActiveTab("porAprobar");
                            setMenuOpen(false);
                          }}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Pendientes
                          {getPendingApprovalCount() > 0 && (
                            <span className="ml-2 bg-[#FF9800] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {getPendingApprovalCount()}
                            </span>
                          )}
                        </Button>
                      )}

                      {userRole === 'operario' && (
                        <Button
                          variant="ghost"
                          className={`justify-start mb-1 ${activeTab === "creados" ? "bg-[#3a8fb7] text-white" : "text-[#333333]"}`}
                          onClick={() => {
                            setActiveTab("creados");
                            setMenuOpen(false);
                          }}
                        >
                          <BookCheck className="w-4 h-4 mr-2" />
                          Creados
                          {getCreatedOrdersCount() > 0 && (
                            <span className="ml-2 bg-[#3a8fb7] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {getCreatedOrdersCount()}
                            </span>
                          )}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        className={`justify-start mb-1 ${activeTab === "aprobados" ? "bg-[#3a8fb7] text-white" : "text-[#333333]"}`}
                        onClick={() => {
                          setActiveTab("aprobados");
                          setMenuOpen(false);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprobados
                      </Button>

                      <Button
                        variant="ghost"
                        className={`justify-start mb-1 ${activeTab === "rechazados" ? "bg-[#3a8fb7] text-white" : "text-[#333333]"}`}
                        onClick={() => {
                          setActiveTab("rechazados");
                          setMenuOpen(false);
                        }}
                      >
                        <XSquare className="w-4 h-4 mr-2" />
                        Rechazados
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          </div>

          {/* Filtros para desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 space-y-4 bg-white p-4 rounded-xl shadow-sm border border-[#3a8fb7]/10 hover:shadow-md transition-all duration-300 hidden md:block"
          >
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3a8fb7] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-[#f2f2f2] border-[#5baed1] focus:border-[#3a8fb7] text-[#333333] placeholder:text-[#5c5c5c] transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading || approveMutation.isPending || rejectMutation.isPending}
                className="border-[#5baed1] text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
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
                <label htmlFor="fechaInicio" className="text-[#333333] text-sm font-medium">
                  Fecha Inicio
                </label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={dateFilter.fechaInicio}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                  className="w-full bg-[#f2f2f2] border-[#5baed1] focus:border-[#3a8fb7] text-[#333333] mt-1 transition-all duration-200"
                />
              </div>
              <div>
                <label htmlFor="fechaFin" className="text-[#333333] text-sm font-medium">
                  Fecha Fin
                </label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={dateFilter.fechaFin}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                  className="w-full bg-[#f2f2f2] border-[#5baed1] focus:border-[#3a8fb7] text-[#333333] mt-1 transition-all duration-200"
                />
              </div>
              <Button
                variant="outline"
                onClick={filterOrdersByDate}
                className="border-[#5baed1] text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              {(dateFilter.fechaInicio || dateFilter.fechaFin || searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="text-[#5c5c5c] hover:text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </motion.div>

          {/* Filtros móviles */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3a8fb7] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  className="pl-10 bg-[#f2f2f2] border-[#5baed1] focus:border-[#3a8fb7] text-[#333333] placeholder:text-[#5c5c5c] transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="border-[#5baed1] text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="border-[#5baed1] text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            <AnimatePresence>
              {showMobileFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 p-4 bg-white rounded-lg border border-[#5baed1]/20 shadow-sm"
                >
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="mobileFechaInicio" className="text-[#333333] text-sm font-medium">
                        Fecha Inicio
                      </label>
                      <Input
                        id="mobileFechaInicio"
                        type="date"
                        value={dateFilter.fechaInicio}
                        onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                        className="w-full bg-[#f2f2f2] border-[#5baed1] mt-1"
                      />
                    </div>

                    <div>
                      <label htmlFor="mobileFechaFin" className="text-[#333333] text-sm font-medium">
                        Fecha Fin
                      </label>
                      <Input
                        id="mobileFechaFin"
                        type="date"
                        value={dateFilter.fechaFin}
                        onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                        className="w-full bg-[#f2f2f2] border-[#5baed1] mt-1"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="default"
                        onClick={filterOrdersByDate}
                        className="flex-1 bg-[#3a8fb7] hover:bg-[#2a7a9f]"
                      >
                        Aplicar Filtros
                      </Button>

                      <Button
                        variant="outline"
                        onClick={clearAllFilters}
                        className="border-[#5baed1] text-[#333333]"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Estado de carga */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-20"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-t-[#3a8fb7] border-r-[#a8e6cf] border-b-[#d4f1f9] border-l-[#f2f2f2] rounded-full animate-spin mb-4"></div>
                <p className="mt-4 text-[#333333]">Cargando pedidos...</p>
              </div>
            </motion.div>
          )}

          {/* Sin pedidos */}
          {!isLoading && filteredOrders.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#3a8fb7]/10"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3a8fb7]/10 rounded-full mb-4">
                <ShoppingCart className="w-8 h-8 text-[#3a8fb7]" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[#333333]">No se encontraron pedidos</h2>
              <p className="text-[#4a4a4a] max-w-lg mx-auto">
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
                          : activeTab === 'creados'
                            ? 'No has creado ningún pedido como operario.'
                            : 'Aún no has realizado ningún pedido. Comienza a comprar para ver tus pedidos aquí.'}
              </p>
              {(searchTerm || dateFilter.fechaInicio || dateFilter.fechaFin || statusFilter !== 'all' || activeTab !== 'todos') && (
                <Button
                  onClick={clearAllFilters}
                  className="mt-4 bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white transition-all duration-200"
                >
                  Mostrar todos los pedidos
                </Button>
              )}
            </motion.div>
          )}

          {/* Lista de pedidos */}
          {!isLoading && filteredOrders.length > 0 && (
            <div className="space-y-6">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl font-medium mb-4 flex items-center text-[#333333]"
              >
                {activeTab === 'todos' ? 'Todos los pedidos' :
                  activeTab === 'porAprobar' ? 'Pedidos pendientes' :
                    activeTab === 'aprobados' ? 'Pedidos aprobados' :
                      activeTab === 'rechazados' ? 'Pedidos rechazados' :
                        activeTab === 'creados' ? 'Pedidos creados por mí' :
                          'Pedidos'}
                <Badge variant="outline" className="ml-3 bg-[#3a8fb7]/10 text-[#3a8fb7] border-[#5baed1]">
                  {filteredOrders.length} pedidos
                </Badge>
              </motion.h2>

              {/* Vista para escritorio */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="hidden md:block"
              >
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#3a8fb7]/10 hover:shadow-md transition-all duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#3a8fb7]/10 text-[#333333] border-b border-[#3a8fb7]/20">
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
                      <tbody className="bg-white divide-y divide-[#5baed1]/10">
                        {filteredOrders.map((order) => (
                          <React.Fragment key={order._id}>
                            <tr className="hover:bg-[#e8f0f3] transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center font-medium text-[#333333]">
                                  <Hash className="w-4 h-4 text-[#3a8fb7] mr-2" />
                                  {order.displayNumber}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-[#333333]">{formatDate(order.fecha)}</div>
                                <div className="text-xs text-[#5c5c5c]">
                                  {formatTime(order.fecha)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <Building className="w-4 h-4 text-[#5baed1] mr-2" />
                                  <div>
                                    <div className="font-medium text-[#333333]">{getClientName(order)}</div>
                                    {getClientSection(order) && (
                                      <div className="text-xs text-[#5c5c5c] flex items-center mt-1">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {getClientSection(order)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className="bg-[#3a8fb7]/10 text-[#3a8fb7] border-[#5baed1]/50">
                                  {order.productos?.length || 0} items
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleOrderDetails(order._id)}
                                  className="ml-2 text-[#4a4a4a] hover:text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
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
                              <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-[#333333]">
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
                                    className="border-[#5baed1] text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
                                  >
                                    {isDownloadingRemito === order._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>

                                  {/* Botones de aprobación para supervisores */}
                                  {canApproveOrder(order) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openApprovalDialog(order._id)}
                                        className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10 transition-all duration-200"
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                      >
                                        <CheckSquare className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openRejectionDialog(order._id)}
                                        className="border-[#F44336] text-[#F44336] hover:bg-[#F44336]/10 transition-all duration-200"
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
                                <td colSpan={7} className="px-6 py-4 bg-[#e8f0f3]">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                      <h3 className="font-medium text-[#333333]">Detalles del Pedido #{order.displayNumber}</h3>

                                      {/* Mostrar información de operario (si aplica) */}
                                      {order.metadata?.creadoPorOperario && (
                                        <div className="bg-[#5baed1]/10 rounded-md p-2 text-xs text-[#333333] border border-[#5baed1]/30">
                                          <div className="flex items-center mb-1 text-[#3a8fb7]">
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
                                    {order.estado === OrderStatus.REJECTED && order.observaciones && (
                                      <Alert className="bg-[#F44336]/10 border border-[#F44336]/30 mt-2">
                                        <AlertTriangle className="h-4 w-4 text-[#F44336]" />
                                        <AlertDescription className="ml-2 text-[#333333]">
                                          <span className="font-bold">Motivo de rechazo:</span> {order.observaciones}
                                        </AlertDescription>
                                      </Alert>
                                    )}

                                    {/* Productos del pedido */}
                                    <div className="bg-white rounded-md border border-[#5baed1]/20 overflow-hidden shadow-sm">
                                      <table className="min-w-full">
                                        <thead className="bg-[#3a8fb7]/10 border-b border-[#5baed1]/20">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-[#333333] uppercase">
                                              Producto
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-[#333333] uppercase">
                                              Cantidad
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-[#333333] uppercase">
                                              Precio
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-[#333333] uppercase">
                                              Total
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#5baed1]/10">
                                          {order.productos.map((item, index) => {
                                            // Extraer información del producto
                                            const productName = typeof item.productoId === 'object' && item.productoId.nombre
                                              ? item.productoId.nombre
                                              : item.nombre || 'Producto desconocido';

                                            const productPrice = item.precioUnitario !== undefined
                                              ? item.precioUnitario
                                              : (typeof item.productoId === 'object' && item.productoId.precio !== undefined
                                                ? item.productoId.precio
                                                : item.precio || 0);

                                            return (
                                              <tr key={index} className="hover:bg-[#e8f0f3]/50 transition-colors duration-200">
                                                <td className="px-4 py-3 text-[#333333]">
                                                  {productName}
                                                </td>
                                                <td className="px-4 py-3 text-[#4a4a4a]">
                                                  {item.cantidad}
                                                </td>
                                                <td className="px-4 py-3 text-right text-[#4a4a4a]">
                                                  ${productPrice.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-[#333333]">
                                                  ${(productPrice * item.cantidad).toFixed(2)}
                                                </td>
                                              </tr>
                                            );
                                          })}

                                          {/* Fila de total */}
                                          <tr className="bg-[#3a8fb7]/5">
                                            <td colSpan={3} className="px-4 py-3 text-right font-medium text-[#333333]">
                                              Total:
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-[#333333]">
                                              ${order.total?.toFixed(2) || '0.00'}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Sección de notas */}
                                    {order.detalle && order.detalle.trim() !== '' && (
                                      <div className="mt-3">
                                        <h4 className="text-sm font-medium text-[#333333]">Notas:</h4>
                                        <p className="text-sm text-[#4a4a4a] bg-white p-3 rounded-md border border-[#5baed1]/20 mt-1 shadow-sm">
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
              </motion.div>

              {/* Vista para móvil */}
              <div className="md:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <Card className="bg-white border-[#5baed1]/20 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2 bg-[#3a8fb7]/5 border-b border-[#5baed1]/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm flex items-center text-[#333333]">
                              <Hash className="w-4 h-4 text-[#3a8fb7] mr-1" />
                              Pedido #{order.displayNumber}
                            </CardTitle>
                            <p className="text-xs text-[#5c5c5c] mt-1">
                              {formatDate(order.fecha)} - {formatTime(order.fecha)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            {renderStatusBadge(order.estado)}
                            <div className="text-xs text-right mt-1">
                              <span className="text-[#333333] font-medium">${order.total?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3 pb-2">
                        <div className="space-y-2">
                          {/* Datos de cliente */}
                          <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 text-[#5baed1] mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-[#333333]">{getClientName(order)}</p>
                              {getClientSection(order) && (
                                <p className="text-xs text-[#5c5c5c] flex items-center mt-0.5">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {getClientSection(order)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Badge de operario si aplica */}
                          {renderOperarioBadge(order)}

                          {/* Mostrar motivo de rechazo si aplica */}
                          {order.estado === OrderStatus.REJECTED && order.observaciones && (
                            <div className="mt-2 bg-[#F44336]/10 border border-[#F44336]/30 rounded-md p-2 text-xs text-[#333333]">
                              <span className="font-bold">Motivo de rechazo:</span> {order.observaciones}
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-2">
                            <div className="text-sm text-[#4a4a4a] flex items-center">
                              <FileSpreadsheet className="h-4 w-4 mr-1" />
                              Productos:
                            </div>
                            <Badge className="bg-[#3a8fb7]/10 text-[#3a8fb7] border-[#5baed1]/30">
                              {order.productos?.length || 0} items
                            </Badge>
                          </div>
                        </div>

                        {/* Detalles expandibles del pedido */}
                        <Accordion type="single" collapsible className="mt-2">
                          <AccordionItem value="details" className="border-t border-[#5baed1]/20 pt-2">
                            <AccordionTrigger className="py-2 text-xs text-[#3a8fb7] hover:text-[#2a7a9f] transition-colors duration-200">
                              Ver detalles del pedido
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2">
                                {order.productos.map((item, index) => {
                                  // Extraer información del producto
                                  const productName = typeof item.productoId === 'object' && item.productoId.nombre
                                    ? item.productoId.nombre
                                    : item.nombre || 'Producto desconocido';

                                  const productPrice = item.precioUnitario !== undefined
                                    ? item.precioUnitario
                                    : (typeof item.productoId === 'object' && item.productoId.precio !== undefined
                                      ? item.productoId.precio
                                      : item.precio || 0);

                                  return (
                                    <div key={index} className="flex justify-between items-center py-1 border-b border-[#5baed1]/10">
                                      <div className="text-[#333333]">
                                        <div className="text-sm font-medium">{productName}</div>
                                        <div className="text-xs text-[#5c5c5c]">
                                          Cant: {item.cantidad} x ${productPrice.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-[#333333]">
                                        ${(productPrice * item.cantidad).toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Notas */}
                                {order.detalle && order.detalle.trim() !== '' && (
                                  <div className="mt-3 pt-2">
                                    <h4 className="text-xs font-medium text-[#333333]">Notas:</h4>
                                    <p className="text-xs text-[#4a4a4a] bg-[#e8f0f3] p-2 rounded border border-[#5baed1]/20 mt-1">
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
                          className="border-[#5baed1] text-[#333333] hover:bg-[#3a8fb7]/10 transition-all duration-200"
                        >
                          {isDownloadingRemito === order._id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Remito
                        </Button>

                        {/* Botones de aprobación para supervisores en móvil */}
                        {canApproveOrder(order) && (
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openApprovalDialog(order._id)}
                              className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10 transition-all duration-200"
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <CheckSquare className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRejectionDialog(order._id)}
                              className="border-[#F44336] text-[#F44336] hover:bg-[#F44336]/10 transition-all duration-200"
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <XSquare className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de confirmación de aprobación */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-[#5baed1] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#333333] flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-[#4CAF50]" />
              Aprobar Pedido
            </DialogTitle>
            <DialogDescription className="text-[#5c5c5c]">
              Al aprobar este pedido, se generará la orden y se procesará para su entrega.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-[#333333]">
              ¿Estás seguro de que deseas aprobar este pedido?
            </p>

            <div className="mt-4 bg-[#3a8fb7]/5 p-3 rounded-md border border-[#3a8fb7]/20">
              <p className="text-sm text-[#4a4a4a]">
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
              className="border-[#5baed1] text-[#333333]"
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleApproveOrder}
              disabled={approveMutation.isPending}
              className="bg-[#4CAF50] hover:bg-[#43A047] text-white font-medium transition-all duration-200"
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
        <DialogContent className="sm:max-w-md bg-white border-[#5baed1] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#333333] flex items-center">
              <XSquare className="mr-2 h-5 w-5 text-[#F44336]" />
              Rechazar Pedido
            </DialogTitle>
            <DialogDescription className="text-[#5c5c5c]">
              Por favor, proporciona un motivo para el rechazo del pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="rejectionReason" className="text-[#333333] mb-2 block">
              Motivo del rechazo *
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explica por qué estás rechazando este pedido..."
              className="min-h-[120px] bg-[#f2f2f2] border-[#5baed1] text-[#333333] placeholder:text-[#5c5c5c] focus:border-[#3a8fb7] transition-all duration-200"
              required
            />

            <div className="mt-4 bg-[#F44336]/10 p-3 rounded-md border border-[#F44336]/20">
              <p className="text-sm text-[#4a4a4a]">
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
              className="border-[#5baed1] text-[#333333]"
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRejectOrder}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="bg-[#F44336] hover:bg-[#E53935] text-white transition-all duration-200"
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

<style jsx global>{`
  /* Tamaños de pantalla personalizados */
  @media (min-width: 360px) {
    .xxs\\:text-\\[11px\\] {
      font-size: 11px;
    }
    .xxs\\:px-1 {
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }
    .xxs\\:mr-1 {
      margin-right: 0.25rem;
    }
    .xxs\\:inline-block {
      display: inline-block;
    }
  }
  @media (min-width: 480px) {
    .xs\\:text-xs {
      font-size: 0.75rem;
    }
  }
`}</style>