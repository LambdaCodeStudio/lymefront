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
  CardTitle, 
  CardFooter, 
  CardDescription 
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

// Interfaces
interface Producto {
  productoId: string | {
    _id: string;
    nombre: string;
    precio: number;
    categoria?: string;
    subCategoria?: string;
    descripcion?: string;
  };
  cantidad: number;
  nombre?: string;
  precio?: number;
}

interface Metadata {
  creadoPorOperario: boolean;
  operarioId: string;
  operarioNombre: string;
  fechaCreacion: string;
  supervisorId: string;
  supervisorNombre: string;
}

interface Pedido {
  _id: string;
  nPedido: number;
  servicio: string;
  seccionDelServicio: string;
  userId: string | {
    _id: string;
    nombre?: string;
    email?: string;
    usuario?: string;
  };
  productos: Producto[];
  fecha: string;
  detalle?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  metadata?: Metadata;
  motivo?: string;
  fechaAprobacion?: string;
  total?: number;
}

export const ApproveOrderList: React.FC = () => {
  // Estados
  const [pendingOrders, setPendingOrders] = useState<Pedido[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('pendiente');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [approvalLoading, setApprovalLoading] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectionDialog, setShowRejectionDialog] = useState<boolean>(false);
  const [isDownloadingRemito, setIsDownloadingRemito] = useState<boolean>(false);
  
  // Hook de notificaciones
  const { addNotification } = useNotification();
  
  // Cargar pedidos al montar componente
  useEffect(() => {
    fetchOrders();
  }, []);
  
  // Filtrar pedidos cuando cambia el término de búsqueda o filtro de estado
  useEffect(() => {
    if (pendingOrders.length === 0) return;
    
    let filtered = [...pendingOrders];
    
    // Filtrar por estado
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(order => order.estado === filterStatus);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        // Buscar en número de pedido
        (order.nPedido?.toString().includes(term)) ||
        // Buscar en servicio
        (order.servicio?.toLowerCase().includes(term)) ||
        // Buscar en sección
        (order.seccionDelServicio?.toLowerCase().includes(term)) ||
        // Buscar en usuario (nombre, email o usuario)
        (typeof order.userId === 'object' && (
          (order.userId.nombre?.toLowerCase().includes(term)) ||
          (order.userId.email?.toLowerCase().includes(term)) ||
          (order.userId.usuario?.toLowerCase().includes(term))
        )) ||
        // Buscar en metadata (operario)
        (order.metadata?.operarioNombre?.toLowerCase().includes(term))
      );
    }
    
    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    
    setFilteredOrders(filtered);
  }, [pendingOrders, searchTerm, filterStatus]);
  
  // Cargar pedidos
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Obtener todos los pedidos
      const response = await fetch('https://lyme-back.vercel.app/api/pedido', {
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
      
      setPendingOrders(ordersWithTotal);
      
      // Por defecto, filtrar solo pendientes
      const pendingOrdersOnly = ordersWithTotal.filter(order => order.estado === 'pendiente');
      setFilteredOrders(pendingOrdersOnly);
      
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
  
  // Aprobar pedido
  const approveOrder = async (orderId: string) => {
    try {
      setApprovalLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${orderId}/aprobar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: 'aprobado',
          fechaAprobacion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al aprobar pedido (${response.status})`);
      }
      
      // Actualizar estado localmente
      setPendingOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { 
                ...order, 
                estado: 'aprobado',
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
      
      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${orderId}/rechazar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado: 'rechazado',
          motivo: motivo,
          fechaAprobacion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al rechazar pedido (${response.status})`);
      }
      
      // Actualizar estado localmente
      setPendingOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { 
                ...order, 
                estado: 'rechazado',
                motivo: motivo,
                fechaAprobacion: new Date().toISOString() 
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
      console.error('Error al rechazar pedido:', error);
      
      if (addNotification) {
        addNotification(`Error al rechazar pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      }
    } finally {
      setApprovalLoading(false);
    }
  };
  
  // Mostrar diálogo de rechazo
  const handleShowRejectionDialog = (order: Pedido) => {
    setSelectedOrder(order);
    setRejectionReason('');
    setShowRejectionDialog(true);
  };
  
  // Abrir detalle del pedido
  const openOrderDetail = (order: Pedido) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
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
      
      const response = await fetch(`https://lyme-back.vercel.app/api/downloads/remito/${orderId}`, {
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
      const order = pendingOrders.find(o => o._id === orderId);
      
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
  
  // Obtener la clase de color basada en el estado
  const getStatusClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-600 text-white';
      case 'aprobado':
        return 'bg-green-600 text-white';
      case 'rechazado':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
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
      <div className="inline-flex items-center justify-center w-16 h-16 bg-[#15497E]/20 rounded-full mb-4">
        <Package className="h-8 w-8 text-[#F8F9FA]" />
      </div>
      <h3 className="text-xl font-medium mb-2 text-white">No hay pedidos pendientes</h3>
      <p className="text-[#6C757D] mb-6">
        {filterStatus === 'pendiente'
          ? 'No hay pedidos pendientes de aprobación en este momento.'
          : filterStatus === 'aprobado'
          ? 'No hay pedidos aprobados para mostrar.'
          : filterStatus === 'rechazado'
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
      <div className="bg-[#15497E]/30 p-3 rounded-md">
        {isCreatedByOperario ? (
          <div className="flex flex-col">
            <div className="flex items-center text-[#2A82C7] mb-1">
              <UserCheck className="w-4 h-4 mr-1" />
              <span className="font-medium text-sm">Creado por operario</span>
            </div>
            <p className="text-sm text-[#F8F9FA]">
              <span className="font-medium">Operario:</span> {operarioName}
            </p>
            <p className="text-sm text-[#F8F9FA]">
              <span className="font-medium">Supervisor:</span> {userName}
            </p>
            <p className="text-xs text-[#6C757D] mt-1">{userEmail}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center text-[#2A82C7] mb-1">
              <User className="w-4 h-4 mr-1" />
              <span className="font-medium text-sm">Usuario</span>
            </div>
            <p className="text-sm text-[#F8F9FA]">{userName}</p>
            <p className="text-xs text-[#6C757D]">{userEmail}</p>
          </div>
        )}
      </div>
    );
  };
  
  // Vista de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#2A82C7]" />
          <p className="mt-4 text-[#F8F9FA]">Cargando pedidos pendientes...</p>
        </div>
      </div>
    );
  }
  
  // Vista de error
  if (error) {
    return (
      <Alert className="bg-red-900/30 border-red-500 my-4">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <AlertDescription className="ml-2 text-white">
          {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <>
      {/* Filtros y búsqueda */}
      <div className="mb-6 bg-[#15497E]/40 backdrop-blur-sm p-4 rounded-lg border border-[#2A82C7]/50 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C757D]" />
            <Input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white placeholder:text-[#F8F9FA]/70"
            />
          </div>
          
          <div className="flex-shrink-0">
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-white/10 border-[#2A82C7] text-white">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="bg-[#15497E] border-[#2A82C7]">
                <SelectItem value="pendiente" className="text-[#F8F9FA]">Pendientes</SelectItem>
                <SelectItem value="aprobado" className="text-[#F8F9FA]">Aprobados</SelectItem>
                <SelectItem value="rechazado" className="text-[#F8F9FA]">Rechazados</SelectItem>
                <SelectItem value="todos" className="text-[#F8F9FA]">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Contador de resultados */}
      {filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <Badge className="bg-[#15497E] text-[#F8F9FA]">
            {filteredOrders.length} pedidos encontrados
          </Badge>
          <div className="text-sm text-[#6C757D]">
            {filterStatus === 'pendiente' 
              ? 'Pendientes de aprobación' 
              : filterStatus === 'aprobado'
                ? 'Pedidos aprobados'
                : filterStatus === 'rechazado'
                  ? 'Pedidos rechazados'
                  : 'Todos los pedidos'}
          </div>
        </div>
      )}
      
      {/* Lista de pedidos */}
      {filteredOrders.length === 0 ? (
        <EmptyOrderState />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card 
              key={order._id} 
              className={`overflow-hidden border ${
                order.estado === 'pendiente'
                  ? 'border-yellow-600 bg-gradient-to-r from-[#15497E]/40 to-[#2A82C7]/40'
                  : order.estado === 'aprobado'
                    ? 'border-green-600 bg-gradient-to-r from-[#15497E]/40 to-[#2A82C7]/40'
                    : 'border-red-600 bg-gradient-to-r from-[#15497E]/40 to-[#2A82C7]/40'
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
                    
                    <div className="text-lg font-medium text-[#F8F9FA] flex items-center">
                      <span>Pedido #{order.nPedido}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-[#6C757D]">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(order.fecha)}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Primera columna: Detalles del cliente */}
                <div>
                  <div className="flex items-center text-[#2A82C7] mb-1">
                    <Building className="w-4 h-4 mr-1" />
                    <span className="font-medium text-sm">Cliente</span>
                  </div>
                  <div className="text-sm text-[#F8F9FA]">
                    <p>{order.servicio}</p>
                    {order.seccionDelServicio && (
                      <p className="text-[#6C757D] flex items-center mt-1">
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
                  <div className="flex items-center text-[#2A82C7] mb-1">
                    <Package className="w-4 h-4 mr-1" />
                    <span className="font-medium text-sm">Productos</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge className="bg-[#2A82C7]/20 text-[#F8F9FA] border-[#2A82C7]">
                      {order.productos?.length || 0} items
                    </Badge>
                    <div className="text-lg font-semibold text-[#F8F9FA]">
                      ${order.total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Botones de acción */}
              <CardFooter className="border-t border-[#2A82C7]/30 p-4 flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOrderExpansion(order._id)}
                    className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
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
                    onClick={() => openOrderDetail(order)}
                    className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Detalle completo
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemitoDownload(order._id)}
                    disabled={isDownloadingRemito}
                    className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
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
                      onClick={() => handleShowRejectionDialog(order)}
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      disabled={approvalLoading}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => approveOrder(order._id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                    <div className="border-t border-[#2A82C7]/30 p-4 bg-[#15497E]/30">
                      <h4 className="text-sm font-medium text-[#F8F9FA] mb-3">Productos en el pedido</h4>
                      
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
                              className="grid grid-cols-4 gap-2 py-2 border-b border-[#2A82C7]/20 last:border-0"
                            >
                              <div className="col-span-2 text-sm text-[#F8F9FA]">{nombre}</div>
                              <div className="text-sm text-[#6C757D] text-center">{item.cantidad} x ${precio.toFixed(2)}</div>
                              <div className="text-sm text-[#F8F9FA] text-right font-medium">${(precio * item.cantidad).toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Notas o detalles adicionales */}
                      {order.detalle && (
                        <div className="mt-4 bg-[#15497E]/40 p-3 rounded-md border border-[#2A82C7]/30">
                          <h4 className="text-sm font-medium text-[#F8F9FA] mb-1">Notas:</h4>
                          <p className="text-sm text-[#6C757D]">{order.detalle}</p>
                        </div>
                      )}
                      
                      {/* Motivo de rechazo si aplica */}
                      {order.estado === 'rechazado' && order.motivo && (
                        <div className="mt-4 bg-red-900/20 p-3 rounded-md border border-red-500/30">
                          <h4 className="text-sm font-medium text-red-300 mb-1">Motivo de rechazo:</h4>
                          <p className="text-sm text-red-200">{order.motivo}</p>
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
      
      {/* Modal de detalle completo */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto bg-[#15497E] border-[#2A82C7] text-white">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#F8F9FA] flex items-center">
                  <span className="text-xl">Detalle de Pedido #{selectedOrder.nPedido}</span>
                  <Badge className={`ml-3 ${getStatusClass(selectedOrder.estado)} flex items-center gap-1`}>
                    {getStatusIcon(selectedOrder.estado)}
                    <span className="capitalize">
                      {selectedOrder.estado === 'pendiente' ? 'Pendiente' : 
                      selectedOrder.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[#6C757D]">
                  Creado el {formatDate(selectedOrder.fecha)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Cliente y servicio */}
                <div className="bg-[#15497E]/60 p-4 rounded-md border border-[#2A82C7]/30">
                  <h3 className="text-[#2A82C7] text-sm font-medium mb-2 flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    Información del cliente
                  </h3>
                  <p className="text-[#F8F9FA] mb-1">
                    <span className="font-medium">Servicio:</span> {selectedOrder.servicio}
                  </p>
                  {selectedOrder.seccionDelServicio && (
                    <p className="text-[#F8F9FA]">
                      <span className="font-medium">Sección:</span> {selectedOrder.seccionDelServicio}
                    </p>
                  )}
                </div>
                
                {/* Usuario */}
                <div className="bg-[#15497E]/60 p-4 rounded-md border border-[#2A82C7]/30">
                  <h3 className="text-[#2A82C7] text-sm font-medium mb-2">
                    Creado por
                  </h3>
                  <UserDetails order={selectedOrder} />
                </div>
              </div>
              
              <div className="mt-4 bg-[#15497E]/60 p-4 rounded-md border border-[#2A82C7]/30">
                <h3 className="text-[#2A82C7] text-sm font-medium mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  Productos
                </h3>
                
                <div className="overflow-hidden rounded-md border border-[#2A82C7]/40">
                  <table className="min-w-full divide-y divide-[#2A82C7]/30">
                    <thead className="bg-[#15497E]">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-[#F8F9FA] uppercase tracking-wider">
                          Producto
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-[#F8F9FA] uppercase tracking-wider">
                          Categoría
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-[#F8F9FA] uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-[#F8F9FA] uppercase tracking-wider">
                          Precio
                        </th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-[#F8F9FA] uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#15497E]/40 divide-y divide-[#2A82C7]/30">
                      {selectedOrder.productos?.map((item, index) => {
                        // Determinar datos del producto
                        let nombre, precio, categoria = '', subCategoria = '';
                        
                        if (typeof item.productoId === 'object' && item.productoId) {
                          nombre = item.productoId.nombre;
                          precio = item.productoId.precio;
                          categoria = item.productoId.categoria || '';
                          subCategoria = item.productoId.subCategoria || '';
                        } else {
                          nombre = item.nombre || 'Producto desconocido';
                          precio = item.precio || 0;
                        }
                        
                        return (
                          <tr key={index}>
                            <td className="px-3 py-3 text-sm text-[#F8F9FA]">
                              {nombre}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#6C757D]">
                              {categoria && (
                                <Badge className="bg-[#2A82C7]/20 text-[#F8F9FA] border-[#2A82C7] capitalize">
                                  {categoria}
                                </Badge>
                              )}
                              {subCategoria && (
                                <span className="text-xs ml-1 capitalize">{subCategoria}</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#F8F9FA] text-center">
                              {item.cantidad}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#F8F9FA] text-right">
                              ${precio.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-sm text-[#F8F9FA] font-medium text-right">
                              ${(precio * item.cantidad).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Fila del total */}
                      <tr className="bg-[#2A82C7]/20">
                        <td colSpan={4} className="px-3 py-3 text-sm text-right font-medium text-[#F8F9FA]">
                          Total:
                        </td>
                        <td className="px-3 py-3 text-sm text-right font-bold text-[#F8F9FA]">
                          ${selectedOrder.total?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Notas del pedido */}
              {selectedOrder.detalle && (
                <div className="mt-4 bg-[#15497E]/60 p-4 rounded-md border border-[#2A82C7]/30">
                  <h3 className="text-[#2A82C7] text-sm font-medium mb-2">Notas del pedido</h3>
                  <p className="text-[#F8F9FA] text-sm">{selectedOrder.detalle}</p>
                </div>
              )}
              
              {/* Información de aprobación o rechazo */}
              {selectedOrder.estado !== 'pendiente' && (
                <div className={`mt-4 p-4 rounded-md border ${
                  selectedOrder.estado === 'aprobado' 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : 'bg-red-900/20 border-red-500/30'
                }`}>
                  <h3 className={`text-sm font-medium mb-2 ${
                    selectedOrder.estado === 'aprobado' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {selectedOrder.estado === 'aprobado' ? 'Información de aprobación' : 'Información de rechazo'}
                  </h3>
                  
                  <p className={`text-sm ${
                    selectedOrder.estado === 'aprobado' ? 'text-green-200' : 'text-red-200'
                  }`}>
                    <span className="font-medium">Fecha:</span> {
                      selectedOrder.fechaAprobacion 
                        ? formatDate(selectedOrder.fechaAprobacion)
                        : 'No disponible'
                    }
                  </p>
                  
                  {selectedOrder.estado === 'rechazado' && selectedOrder.motivo && (
                    <p className="text-sm text-red-200 mt-2">
                      <span className="font-medium">Motivo:</span> {selectedOrder.motivo}
                    </p>
                  )}
                </div>
              )}
              
              <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleRemitoDownload(selectedOrder._id)}
                  disabled={isDownloadingRemito}
                  className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
                >
                  {isDownloadingRemito ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  Descargar Remito
                </Button>
                
                {selectedOrder.estado === 'pendiente' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleShowRejectionDialog(selectedOrder)}
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      disabled={approvalLoading}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                    
                    <Button
                      onClick={() => approveOrder(selectedOrder._id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={approvalLoading}
                    >
                      {approvalLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Aprobar
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de rechazo */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="bg-[#15497E] border-[#2A82C7] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#F8F9FA]">Rechazar Pedido</DialogTitle>
            <DialogDescription className="text-[#6C757D]">
              Por favor, proporciona un motivo para rechazar este pedido.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Label htmlFor="rejection-reason" className="text-[#F8F9FA] mb-2 block">
              Motivo de rechazo
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explique por qué está rechazando este pedido..."
              className="bg-[#15497E]/70 border-[#2A82C7] text-[#F8F9FA] placeholder:text-[#6C757D]"
              rows={4}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
              className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
            >
              Cancelar
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => selectedOrder && rejectOrder(selectedOrder._id, rejectionReason)}
              disabled={!rejectionReason.trim() || approvalLoading}
              className="bg-red-600 hover:bg-red-700 border-red-500"
            >
              {approvalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};