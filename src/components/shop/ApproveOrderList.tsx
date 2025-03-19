import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  User, 
  Building, 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  Tag,
  Download,
  UserCheck
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderDetailsDialog } from './OrderDetailsDialog';
import ApprovalConfirmDialog from './ApprovalConfirmDialog';

// Importar estilos globales
import '@/styles/shop-global.css';

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

// Interfaces para los tipos de datos
interface PedidoProducto {
  productoId: string | {
    _id: string;
    nombre: string;
    precio: number;
    [key: string]: any;
  };
  cantidad: number;
  precio?: number;
  nombre?: string;
}

interface Pedido {
  _id: string;
  nPedido?: number;
  servicio: string;
  seccionDelServicio?: string;
  userId: string | {
    _id: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    usuario?: string;
    [key: string]: any;
  };
  fecha: string;
  productos: PedidoProducto[];
  detalle?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  metadata?: {
    creadoPorOperario: boolean;
    operarioId: string;
    operarioNombre: string;
    fechaCreacion: string;
    supervisorId: string;
    supervisorNombre: string;
    [key: string]: any;
  };
  comentarios?: string;
  fechaAprobacion?: string;
  fechaRechazo?: string;
  aprobadoPor?: string;
  rechazadoPor?: string;
  total?: number; // Calculado en frontend
}

export const ApproveOrderList: React.FC = () => {
  // Hooks y estado
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [approvalLoading, setApprovalLoading] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectionDialog, setShowRejectionDialog] = useState<boolean>(false);
  const [isDownloadingRemito, setIsDownloadingRemito] = useState<boolean>(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState<boolean>(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  
  // Carga inicial de datos
  useEffect(() => {
    fetchPedidos();
  }, []);
  
  // Efecto para filtrar pedidos basados en criterios seleccionados
  useEffect(() => {
    if (pedidos.length === 0) return;
    
    let filtered = [...pedidos];
    
    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(pedido => {
        if (filterStatus === 'pending') return pedido.estado === 'pendiente';
        if (filterStatus === 'approved') return pedido.estado === 'aprobado';
        if (filterStatus === 'rejected') return pedido.estado === 'rechazado';
        return true;
      });
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pedido => 
        // Buscar en número de pedido
        (pedido.nPedido?.toString() || '').includes(searchLower) ||
        // Buscar en servicio
        pedido.servicio.toLowerCase().includes(searchLower) ||
        // Buscar en sección
        (pedido.seccionDelServicio || '').toLowerCase().includes(searchLower) ||
        // Buscar en datos de usuario
        (typeof pedido.userId === 'object' && pedido.userId?.nombre && 
         pedido.userId.nombre.toLowerCase().includes(searchLower)) ||
        // Buscar en metadata de operario
        (pedido.metadata?.operarioNombre || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    
    setFilteredPedidos(filtered);
  }, [pedidos, searchTerm, filterStatus]);
  
  // Cargar pedidos
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Obtener todos los pedidos
      const response = await fetch('http://localhost:3000/api/pedido', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al cargar pedidos (${response.status})`);
      }
      
      const data = await response.json();
      
      // Calcular total para cada pedido
      const ordersWithTotal = data.map((order: Pedido) => ({
        ...order,
        total: calculateOrderTotal(order)
      }));
      
      setPedidos(ordersWithTotal);
      
      // Por defecto, filtrar solo pendientes
      const pendingOrdersOnly = ordersWithTotal.filter(order => order.estado === 'pendiente');
      setFilteredPedidos(pendingOrdersOnly);
      
      setError(null);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      setError(`Error al cargar pedidos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      if (addNotification) {
        addNotification(`Error al cargar pedidos: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Calcular total del pedido
  const calculateOrderTotal = (order: Pedido): number => {
    if (!order.productos || !Array.isArray(order.productos)) return 0;
    
    return order.productos.reduce((total, item) => {
      let price = 0;
      
      // Si el precio ya viene en el item
      if (typeof item.precio === 'number') {
        price = item.precio;
      } 
      // Si el producto está poblado
      else if (typeof item.productoId === 'object' && item.productoId && typeof item.productoId.precio === 'number') {
        price = item.productoId.precio;
      }
      
      return total + (price * item.cantidad);
    }, 0);
  };
  
  // Actualizar manualmente productos
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPedidos();
    setRefreshing(false);
  };
  
  // Aprobar pedido
  const approveOrder = async (orderId: string, comentarios: string = '') => {
    try {
      setApprovalLoading(true);
      
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
          estado: 'aprobado',
          comentarios,
          fechaAprobacion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al aprobar pedido (${response.status})`);
      }
      
      // Actualizar estado localmente
      setPedidos(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { 
                ...order, 
                estado: 'aprobado',
                comentarios,
                fechaAprobacion: new Date().toISOString() 
              } 
            : order
        )
      );
      
      if (addNotification) {
        addNotification('Pedido aprobado correctamente', 'success');
      }
      
      // Si el pedido de detalle está abierto, cerrarlo
      if (selectedOrder && selectedOrder._id === orderId) {
        setOrderDetailOpen(false);
      }
      
    } catch (error) {
      console.error('Error al aprobar pedido:', error);
      
      if (addNotification) {
        addNotification(`Error al aprobar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setApprovalLoading(false);
      setShowApprovalDialog(false);
    }
  };
  
  // Rechazar pedido
  const rejectOrder = async (orderId: string, motivo: string) => {
    try {
      setApprovalLoading(true);
      
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
          estado: 'rechazado',
          motivo: motivo,
          fechaRechazo: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al rechazar pedido (${response.status})`);
      }
      
      // Actualizar estado localmente
      setPedidos(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { 
                ...order, 
                estado: 'rechazado',
                metadata: { 
                  ...(order.metadata || {}), 
                  motivoRechazo: motivo 
                },
                fechaRechazo: new Date().toISOString() 
              } 
            : order
        )
      );
      
      // Cerrar diálogo y limpiar
      setShowRejectionDialog(false);
      setRejectionReason('');
      
      if (addNotification) {
        addNotification('Pedido rechazado correctamente', 'success');
      }
      
      // Si el pedido de detalle está abierto, cerrarlo
      if (selectedOrder && selectedOrder._id === orderId) {
        setOrderDetailOpen(false);
      }
      
    } catch (error) {
      console.error(`Error al rechazar pedido:`, error);
      
      if (addNotification) {
        addNotification(`Error al rechazar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setApprovalLoading(false);
      setShowApprovalDialog(false);
    }
  };
  
  // Manejar clic en botón de aprobar
  const handleApproveClick = (order: Pedido) => {
    setSelectedOrder(order);
    setApprovalAction('approve');
    setShowApprovalDialog(true);
  };
  
  // Manejar clic en botón de rechazar
  const handleRejectClick = (order: Pedido) => {
    setSelectedOrder(order);
    setApprovalAction('reject');
    setShowApprovalDialog(true);
  };
  
  // Manejar clic en ver detalles
  const handleViewDetails = (order: Pedido) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };
  
  // Manejar confirmación de aprobación/rechazo desde el diálogo
  const handleApprovalConfirm = async (notes: string) => {
    if (!selectedOrder || !approvalAction) return;
    
    if (approvalAction === 'approve') {
      await approveOrder(selectedOrder._id, notes);
    } else {
      await rejectOrder(selectedOrder._id, notes);
    }
  };
  
  // Función para descargar el remito
  const handleRemitoDownload = async (orderId: string) => {
    if (!orderId) return;
    
    try {
      setIsDownloadingRemito(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      console.log(`Iniciando descarga de remito para pedido: ${orderId}`);
      
      const response = await fetch(`http://localhost:3000/api/downloads/remito/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        method: 'GET'
      });
      
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
      const order = pedidos.find(o => o._id === orderId);
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `remito_${order?.nPedido || orderId}.pdf`);
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
      setIsDownloadingRemito(false);
    }
  };
  
  // Alternar expansión del pedido
  const toggleOrderExpansion = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Obtener la clase de color basada en el estado
  const getStatusClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-[var(--lyme-state-warning)] text-[var(--lyme-text-primary)]';
      case 'aprobado':
        return 'bg-[var(--lyme-state-success)] text-[var(--lyme-text-primary)]';
      case 'rechazado':
        return 'bg-[var(--lyme-state-danger)] text-[var(--lyme-text-primary)]';
      default:
        return 'bg-[var(--lyme-text-muted)] text-[var(--lyme-text-primary)]';
    }
  };
  
  // Obtener icono basado en el estado
  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Clock className="w-4 h-4" />;
      case 'aprobado':
        return <CheckCircle className="w-4 h-4" />;
      case 'rechazado':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  
  // Componente vacío cuando no hay pedidos
  const EmptyOrderState = () => (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--lyme-primary-dark)]/20 rounded-full mb-4">
        <Package className="h-8 w-8 text-[var(--lyme-text-primary)]" />
      </div>
      <h3 className="text-xl font-medium mb-2 text-[var(--lyme-text-primary)]">No hay pedidos pendientes</h3>
      <p className="text-[var(--lyme-text-muted)] mb-6">
        {filterStatus === 'pending'
          ? 'No hay pedidos pendientes de aprobación en este momento.'
          : filterStatus === 'approved'
          ? 'No hay pedidos aprobados para mostrar.'
          : filterStatus === 'rejected'
          ? 'No hay pedidos rechazados para mostrar.'
          : 'No hay pedidos que coincidan con tus criterios de búsqueda.'}
      </p>
    </div>
  );
  
  // Componente para mostrar detalles del usuario
  const UserDetails = ({ order }: { order: Pedido }) => {
    // Determinar si el pedido fue creado por un operario
    const isCreatedByOperario = order.metadata?.creadoPorOperario;
    const operarioName = order.metadata?.operarioNombre;
    
    let userName, userEmail, userId;
    
    if (typeof order.userId === 'object' && order.userId) {
      userName = order.userId.nombre || order.userId.usuario || 'Usuario';
      userEmail = order.userId.email || 'Sin email';
      userId = order.userId._id;
    } else {
      userName = 'Usuario desconocido';
      userEmail = 'Sin email';
      userId = order.userId?.toString() || 'N/A';
    }
    
    return (
      <div className="bg-[var(--lyme-primary-dark)]/30 p-3 rounded-md">
        {isCreatedByOperario ? (
          <div className="flex flex-col">
            <div className="flex items-center text-[var(--lyme-primary-medium)] mb-1">
              <UserCheck className="w-4 h-4 mr-1" />
              <span className="font-medium text-sm">Creado por operario</span>
            </div>
            <p className="text-sm text-[var(--lyme-text-primary)]">
              <span className="font-medium">Operario:</span> {operarioName}
            </p>
            <p className="text-sm text-[var(--lyme-text-primary)]">
              <span className="font-medium">Supervisor:</span> {userName}
            </p>
            <p className="text-xs text-[var(--lyme-text-muted)] mt-1">{userEmail}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center text-[var(--lyme-primary-medium)] mb-1">
              <User className="w-4 h-4 mr-1" />
              <span className="font-medium text-sm">Usuario</span>
            </div>
            <p className="text-sm text-[var(--lyme-text-primary)]">{userName}</p>
            <p className="text-xs text-[var(--lyme-text-muted)]">{userEmail}</p>
          </div>
        )}
      </div>
    );
  };
  
  // Vista de carga
  if (loading) {
    return (
      <div className="shop-theme flex justify-center items-center py-12">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--lyme-primary-medium)]" />
          <p className="mt-4 text-[var(--lyme-text-primary)]">Cargando pedidos pendientes...</p>
        </div>
      </div>
    );
  }
  
  // Vista de error
  if (error) {
    return (
      <Alert className="shop-theme bg-[var(--lyme-state-danger)]/30 border-[var(--lyme-state-danger)] my-4">
        <AlertCircle className="h-5 w-5 text-[var(--lyme-state-danger)]/80" />
        <AlertDescription className="ml-2 text-[var(--lyme-text-primary)]">
          {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="shop-theme">
      {/* Filtros y búsqueda */}
      <div className="mb-6 bg-[var(--lyme-primary-dark)]/40 backdrop-blur-sm p-4 rounded-lg border border-[var(--lyme-primary-dark)]/50 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--lyme-text-muted)]" />
            <Input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[var(--lyme-ui-background)]/10 border-[var(--lyme-ui-border)] focus:border-[var(--lyme-primary-dark)] text-[var(--lyme-text-primary)] placeholder:text-[var(--lyme-text-secondary)]/70"
            />
          </div>
          
          <div className="flex-shrink-0">
            <Select
              value={filterStatus}
              onValueChange={(value: any) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-[var(--lyme-ui-background)]/10 border-[var(--lyme-ui-border)] text-[var(--lyme-text-primary)]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--lyme-ui-card)] border-[var(--lyme-ui-border)]">
                <SelectItem value="pending" className="text-[var(--lyme-text-primary)]">Pendientes</SelectItem>
                <SelectItem value="approved" className="text-[var(--lyme-text-primary)]">Aprobados</SelectItem>
                <SelectItem value="rejected" className="text-[var(--lyme-text-primary)]">Rechazados</SelectItem>
                <SelectItem value="all" className="text-[var(--lyme-text-primary)]">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-[var(--lyme-text-primary)] border-[var(--lyme-ui-border)] hover:bg-[var(--lyme-primary-dark)]/20"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Filter className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
        </div>
      </div>
      
      {/* Contador de resultados */}
      {filteredPedidos.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <Badge className="bg-[var(--lyme-primary-dark)] text-[var(--lyme-text-primary)]">
            {filteredPedidos.length} pedidos encontrados
          </Badge>
          <div className="text-sm text-[var(--lyme-text-muted)]">
            {filterStatus === 'pending' 
              ? 'Pendientes de aprobación' 
              : filterStatus === 'approved'
                ? 'Pedidos aprobados'
                : filterStatus === 'rejected'
                  ? 'Pedidos rechazados'
                  : 'Todos los pedidos'}
          </div>
        </div>
      )}
      
      {/* Lista de pedidos */}
      {filteredPedidos.length === 0 ? (
        <EmptyOrderState />
      ) : (
        <div className="space-y-4">
          {filteredPedidos.map((order) => (
            <Card 
              key={order._id} 
              className={`overflow-hidden border ${
                order.estado === 'pendiente'
                  ? 'border-[var(--lyme-state-warning)] bg-[var(--lyme-ui-card)]'
                  : order.estado === 'aprobado'
                    ? 'border-[var(--lyme-state-success)] bg-[var(--lyme-ui-card)]'
                    : 'border-[var(--lyme-state-danger)] bg-[var(--lyme-ui-card)]'
              } backdrop-blur-sm shadow-md transition-all`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex gap-2 items-center">
                    <Badge className={`${getStatusClass(order.estado)} flex items-center gap-1`}>
                      {getStatusIcon(order.estado)}
                      <span className="capitalize">
                        {order.estado === 'pendiente' ? 'Pendiente' : 
                         order.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    </Badge>
                    
                    <div className="text-lg font-medium text-[var(--lyme-text-primary)] flex items-center">
                      <span>Pedido #{order.nPedido}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-[var(--lyme-text-muted)]">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(order.fecha)}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Primera columna: Detalles del cliente */}
                <div>
                  <div className="flex items-center text-[var(--lyme-primary-medium)] mb-1">
                    <Building className="w-4 h-4 mr-1" />
                    <span className="font-medium text-sm">Cliente</span>
                  </div>
                  <div className="text-sm text-[var(--lyme-text-primary)]">
                    <p>{order.servicio}</p>
                    {order.seccionDelServicio && (
                      <p className="text-[var(--lyme-text-muted)] flex items-center mt-1">
                        <span className="ml-1">{order.seccionDelServicio}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Segunda columna: Información del usuario */}
                <div>
                  <UserDetails order={order} />
                </div>
                
                {/* Tercera columna: Resumen de productos y total */}
                <div>
                  <div className="flex items-center text-[var(--lyme-primary-medium)] mb-1">
                    <Package className="w-4 h-4 mr-1" />
                    <span className="font-medium text-sm">Productos</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge className="bg-[var(--lyme-primary-dark)]/20 text-[var(--lyme-text-primary)] border-[var(--lyme-primary-medium)]">
                      {order.productos?.length || 0} items
                    </Badge>
                    <div className="text-lg font-semibold text-[var(--lyme-text-primary)]">
                      ${order.total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Botones de acción */}
              <CardFooter className="border-t border-[var(--lyme-primary-medium)]/30 p-4 flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOrderExpansion(order._id)}
                    className="border-[var(--lyme-ui-border)] text-[var(--lyme-text-primary)] hover:bg-[var(--lyme-primary-dark)]/20"
                  >
                    {expandedOrder === order._id ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Ocultar detalles
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Ver detalles
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(order)}
                    className="border-[var(--lyme-ui-border)] text-[var(--lyme-text-primary)] hover:bg-[var(--lyme-primary-dark)]/20"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Detalle completo
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemitoDownload(order._id)}
                    disabled={isDownloadingRemito}
                    className="border-[var(--lyme-ui-border)] text-[var(--lyme-text-primary)] hover:bg-[var(--lyme-primary-dark)]/20"
                  >
                    {isDownloadingRemito ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Remito
                  </Button>
                </div>
                
                {/* Botones para pedidos pendientes */}
                {order.estado === 'pendiente' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectClick(order)}
                      className="border-[var(--lyme-state-danger)] text-[var(--lyme-state-danger)] hover:bg-[var(--lyme-state-danger)]/10"
                      disabled={approvalLoading}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleApproveClick(order)}
                      className="bg-[var(--lyme-state-success)] hover:bg-[var(--lyme-primary-medium)] text-[var(--lyme-text-primary)]"
                      disabled={approvalLoading}
                    >
                      {approvalLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Aprobar
                    </Button>
                  </div>
                )}
              </CardFooter>
              
              {/* Detalles expandidos */}
              <AnimatePresence>
                {expandedOrder === order._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[var(--lyme-primary-medium)]/30 p-4 bg-[var(--lyme-ui-background)]/30">
                      <h4 className="text-sm font-medium text-[var(--lyme-text-primary)] mb-3">Productos en el pedido</h4>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {order.productos?.map((item, index) => {
                          // Determinar nombre y precio
                          let nombre, precio;
                          
                          if (typeof item.productoId === 'object' && item.productoId) {
                            nombre = item.productoId.nombre;
                            precio = item.productoId.precio;
                          } else {
                            nombre = item.nombre || 'Producto desconocido';
                            precio = item.precio || 0;
                          }
                          
                          return (
                            <div 
                              key={index} 
                              className="grid grid-cols-4 gap-2 py-2 border-b border-[var(--lyme-primary-medium)]/20 last:border-0"
                            >
                              <div className="col-span-2 text-sm text-[var(--lyme-text-primary)]">{nombre}</div>
                              <div className="text-sm text-[var(--lyme-text-muted)] text-center">{item.cantidad} x ${precio.toFixed(2)}</div>
                              <div className="text-sm text-[var(--lyme-text-primary)] text-right font-medium">${(precio * item.cantidad).toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Notas o detalles adicionales */}
                      {order.detalle && (
                        <div className="mt-4 bg-[var(--lyme-ui-background)]/40 p-3 rounded-md border border-[var(--lyme-primary-medium)]/30">
                          <h4 className="text-sm font-medium text-[var(--lyme-text-primary)] mb-1">Notas:</h4>
                          <p className="text-sm text-[var(--lyme-text-muted)]">{order.detalle}</p>
                        </div>
                      )}
                      
                      {/* Motivo de rechazo si aplica */}
                      {order.estado === 'rechazado' && order.metadata?.motivoRechazo && (
                        <div className="mt-4 bg-[var(--lyme-state-danger)]/20 p-3 rounded-md border border-[var(--lyme-state-danger)]/30">
                          <h4 className="text-sm font-medium text-[var(--lyme-state-danger)]/80 mb-1">Motivo de rechazo:</h4>
                          <p className="text-sm text-[var(--lyme-text-primary)]/80">{order.metadata.motivoRechazo}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
      
      {/* Diálogo de aprobación/rechazo */}
      {selectedOrder && approvalAction && (
        <ApprovalConfirmDialog
          isOpen={showApprovalDialog}
          onClose={() => setShowApprovalDialog(false)}
          onConfirm={handleApprovalConfirm}
          orderNumber={selectedOrder.nPedido?.toString() || ''}
          orderTotal={selectedOrder.total?.toFixed(2) || '0.00'}
          orderItems={selectedOrder.productos?.length || 0}
          type={approvalAction}
          isProcessing={approvalLoading}
        />
      )}
      
      {/* Diálogo de detalles */}
      {selectedOrder && (
        <OrderDetailsDialog
          isOpen={orderDetailOpen}
          onClose={() => setOrderDetailOpen(false)}
          pedido={selectedOrder}
          onApprove={handleApproveClick}
          onReject={handleRejectClick}
          canApprove={true}
        />
      )}
    </div>
  );
};