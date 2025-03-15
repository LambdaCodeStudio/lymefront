import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Filter, 
  Search, 
  Eye, 
  AlertCircle,
  Loader2,
  CheckCheck,
  RefreshCw,
  Building,
  MapPin,
  FileSpreadsheet,
  UserCircle,
  PackageSearch,
  ArrowUpDown,
  Check,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Alert, 
  AlertDescription 
} from "@/components/ui/alert";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { OrderDetailsDialog } from './OrderDetailsDialog';
import ApprovalConfirmDialog  from './ApprovalConfirmDialog';
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

export const ApproveOrdersContent: React.FC = () => {
  // Hooks y estado
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  
  // Estados para diálogos
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  
  // Carga inicial de datos
  useEffect(() => {
    fetchPedidos();
  }, []);
  
  // Efecto para filtrar pedidos basados en criterios seleccionados
  useEffect(() => {
    if (!pedidos.length) return;
    
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
        (pedido.nPedido?.toString() || '').includes(searchTerm) ||
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
    
    // Filtrar por rango de fechas
    if (dateFilter.startDate || dateFilter.endDate) {
      filtered = filtered.filter(pedido => {
        const pedidoDate = new Date(pedido.fecha);
        
        if (dateFilter.startDate) {
          const startDate = new Date(dateFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (pedidoDate < startDate) return false;
        }
        
        if (dateFilter.endDate) {
          const endDate = new Date(dateFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (pedidoDate > endDate) return false;
        }
        
        return true;
      });
    }
    
    // Ordenar por fecha
    filtered.sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredPedidos(filtered);
  }, [pedidos, searchTerm, filterStatus, sortOrder, dateFilter]);
  
  // Función para cargar pedidos desde el servidor
  const fetchPedidos = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Obtener los pedidos que deben ser aprobados por este supervisor
      // Primero obtenemos el ID del usuario actual
      const userResponse = await fetch('http://179.43.118.101:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        throw new Error('Error al obtener información del usuario');
      }
      
      const userData = await userResponse.json();
      const userId = userData._id || userData.id;
      
      if (!userId) {
        throw new Error('No se pudo determinar el ID del usuario');
      }
      
      // Ahora obtenemos los pedidos pendientes para este supervisor
      const response = await fetch(`http://179.43.118.101:4000/api/pedido/supervisor/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Error al cargar pedidos (${response.status})`);
      }
      
      const data = await response.json();
      console.log(`Se cargaron ${data.length} pedidos para su aprobación`);
      
      // Procesar los pedidos para calcular totales y otros campos útiles
      const processedPedidos: Pedido[] = data.map(pedido => {
        // Calcular total del pedido
        let total = 0;
        
        if (Array.isArray(pedido.productos)) {
          pedido.productos.forEach(item => {
            const cantidad = item.cantidad || 0;
            let precio = 0;
            
            if (typeof item.precio === 'number') {
              precio = item.precio;
            } else if (typeof item.productoId === 'object' && item.productoId && typeof item.productoId.precio === 'number') {
              precio = item.productoId.precio;
            }
            
            total += precio * cantidad;
          });
        }
        
        return {
          ...pedido,
          total
        };
      });
      
      // Guardar pedidos y actualizar filtrados
      setPedidos(processedPedidos);
      
      if (forceRefresh) {
        addNotification('Pedidos actualizados correctamente', 'success');
      }
      
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar pedidos');
      
      if (addNotification) {
        addNotification('Error al cargar pedidos', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Aprobar o rechazar un pedido
  const processPedido = async (pedidoId: string, action: 'approve' | 'reject', comentarios?: string) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const endpoint = action === 'approve' 
        ? `http://179.43.118.101:4000/api/pedido/${pedidoId}/aprobar` 
        : `http://179.43.118.101:4000/api/pedido/${pedidoId}/rechazar`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comentarios })
      });
      
      if (!response.ok) {
        throw new Error(`Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} el pedido (${response.status})`);
      }
      
      // Actualizar la lista de pedidos
      fetchPedidos(true);
      
      // Notificar al usuario
      addNotification(
        `Pedido ${action === 'approve' ? 'aprobado' : 'rechazado'} correctamente`, 
        'success'
      );
      
    } catch (error) {
      console.error(`Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} pedido:`, error);
      setError(error instanceof Error ? error.message : `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} pedido`);
      
      if (addNotification) {
        addNotification(`Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} pedido`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dateString).toLocaleDateString('es-ES', options);
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  // Manejar clic en botón de aprobar
  const handleApproveClick = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setApprovalAction('approve');
    setShowApprovalDialog(true);
  };
  
  // Manejar clic en botón de rechazar
  const handleRejectClick = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setApprovalAction('reject');
    setShowApprovalDialog(true);
  };
  
  // Manejar clic en ver detalles
  const handleViewDetails = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setShowDetailsDialog(true);
  };
  
  // Manejar confirmación de aprobación/rechazo
  const handleConfirmAction = (comentarios?: string) => {
    if (!selectedPedido || !approvalAction) return;
    
    processPedido(selectedPedido._id, approvalAction, comentarios);
    setShowApprovalDialog(false);
    setSelectedPedido(null);
    setApprovalAction(null);
  };
  
  // Renderizar etiqueta de estado
  const renderStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'aprobado':
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
            {estado}
          </Badge>
        );
    }
  };
  
  // Obtener nombre de usuario o operario
  const getAuthorName = (pedido: Pedido) => {
    // Si fue creado por un operario, usar la info de metadata
    if (pedido.metadata?.creadoPorOperario) {
      return pedido.metadata.operarioNombre || 'Operario';
    }
    
    // Si no, usar la info del usuario normal
    if (typeof pedido.userId === 'object' && pedido.userId) {
      if (pedido.userId.nombre && pedido.userId.apellido) {
        return `${pedido.userId.nombre} ${pedido.userId.apellido}`;
      }
      return pedido.userId.usuario || pedido.userId.email || 'Usuario';
    }
    
    return 'Usuario desconocido';
  };
  
  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('pending');
    setSortOrder('newest');
    setDateFilter({ startDate: '', endDate: '' });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold flex items-center text-[#F8F9FA]">
            <ClipboardCheck className="mr-3 h-8 w-8" />
            Aprobación de Pedidos
          </h1>
          <p className="text-[#6C757D] mt-2">
            Gestiona los pedidos pendientes de aprobación realizados por tus operarios.
          </p>
        </header>
        
        {/* Alerta de error */}
        {error && (
          <Alert className="mb-6 bg-red-900/30 border border-red-500">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="ml-2 text-white">{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Filtros y búsqueda */}
        <Card className="mb-6 bg-gradient-to-r from-[#15497E]/40 to-[#2A82C7]/40 backdrop-blur-sm border-[#2A82C7] shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#F8F9FA] text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C757D] w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white placeholder:text-[#F8F9FA]/70"
                />
              </div>
              
              {/* Filtro por estado */}
              <Select 
                value={filterStatus} 
                onValueChange={(value: any) => setFilterStatus(value)}
              >
                <SelectTrigger className="bg-white/10 border-[#2A82C7] text-[#F8F9FA]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-[#15497E] border-[#2A82C7] text-[#F8F9FA]">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Ordenamiento */}
              <Select 
                value={sortOrder} 
                onValueChange={(value: any) => setSortOrder(value)}
              >
                <SelectTrigger className="bg-white/10 border-[#2A82C7] text-[#F8F9FA]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#15497E] border-[#2A82C7] text-[#F8F9FA]">
                  <SelectItem value="newest">Más recientes primero</SelectItem>
                  <SelectItem value="oldest">Más antiguos primero</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Fecha inicio */}
              <div>
                <label className="text-xs text-[#F8F9FA] mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-white/10 border-[#2A82C7] text-[#F8F9FA]"
                />
              </div>
              
              {/* Fecha fin */}
              <div>
                <label className="text-xs text-[#F8F9FA] mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-white/10 border-[#2A82C7] text-[#F8F9FA]"
                />
              </div>
              
              {/* Botones de acción */}
              <div className="flex items-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="text-[#F8F9FA] border-[#2A82C7] hover:bg-[#2A82C7]/20"
                >
                  Limpiar filtros
                </Button>
                <Button 
                  onClick={() => fetchPedidos(true)}
                  disabled={refreshing}
                  className="bg-[#15497E] hover:bg-[#2A82C7] text-white"
                >
                  {refreshing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Vista de carga */}
        {loading && !refreshing && (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#F8F9FA]" />
              <p className="mt-4 text-[#F8F9FA]">Cargando pedidos...</p>
            </div>
          </div>
        )}
        
        {/* Vista sin pedidos */}
        {!loading && filteredPedidos.length === 0 && (
          <Card className="bg-gradient-to-r from-[#15497E]/40 to-[#2A82C7]/40 backdrop-blur-sm border-[#2A82C7] shadow-md text-center py-12">
            <CardContent>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#15497E]/40 rounded-full mb-4">
                <PackageSearch className="w-8 h-8 text-[#F8F9FA]" />
              </div>
              <h3 className="text-xl font-medium text-[#F8F9FA] mb-2">No hay pedidos para mostrar</h3>
              <p className="text-[#6C757D] max-w-lg mx-auto">
                {filterStatus === 'pending'
                  ? 'No hay pedidos pendientes de aprobación en este momento.'
                  : `No se encontraron pedidos con los filtros seleccionados.`
                }
              </p>
              {(searchTerm || filterStatus !== 'pending' || dateFilter.startDate || dateFilter.endDate) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4 text-[#F8F9FA] border-[#2A82C7] hover:bg-[#2A82C7]/20"
                >
                  Limpiar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Lista de pedidos - Vista Desktop */}
        {!loading && filteredPedidos.length > 0 && (
          <div className="hidden md:block bg-gradient-to-r from-[#15497E]/40 to-[#2A82C7]/40 backdrop-blur-sm rounded-xl border border-[#2A82C7] shadow-md overflow-hidden">
            <Table>
              <TableHeader className="bg-[#15497E]/60">
                <TableRow>
                  <TableHead className="text-[#F8F9FA] font-medium">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Pedido #
                    </div>
                  </TableHead>
                  <TableHead className="text-[#F8F9FA] font-medium">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead className="text-[#F8F9FA] font-medium">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Servicio
                    </div>
                  </TableHead>
                  <TableHead className="text-[#F8F9FA] font-medium">
                    <div className="flex items-center">
                      <UserCircle className="h-4 w-4 mr-2" />
                      Solicitado por
                    </div>
                  </TableHead>
                  <TableHead className="text-[#F8F9FA] font-medium text-right">Total</TableHead>
                  <TableHead className="text-[#F8F9FA] font-medium">Estado</TableHead>
                  <TableHead className="text-[#F8F9FA] font-medium text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.map((pedido) => (
                  <TableRow 
                    key={pedido._id}
                    className={`
                      hover:bg-[#15497E]/20 transition-colors
                      ${pedido.estado === 'pendiente' ? 'bg-yellow-50/10' : ''}
                      ${pedido.estado === 'aprobado' ? 'bg-green-50/10' : ''}
                      ${pedido.estado === 'rechazado' ? 'bg-red-50/10' : ''}
                    `}
                  >
                    <TableCell className="font-medium text-[#F8F9FA]">
                      {pedido.nPedido || 'N/A'}
                    </TableCell>
                    <TableCell className="text-[#6C757D]">
                      {formatDate(pedido.fecha)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[#F8F9FA]">{pedido.servicio}</span>
                        {pedido.seccionDelServicio && (
                          <span className="text-xs text-[#6C757D] flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {pedido.seccionDelServicio}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#F8F9FA]">
                      {getAuthorName(pedido)}
                      {pedido.metadata?.creadoPorOperario && (
                        <span className="text-xs text-[#6C757D] block">
                          Operario
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#F8F9FA]">
                      ${pedido.total?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(pedido.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(pedido)}
                          className="text-[#F8F9FA] border-[#2A82C7] hover:bg-[#2A82C7]/20"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {pedido.estado === 'pendiente' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveClick(pedido)}
                              className="border-green-500 text-green-500 hover:bg-green-500/20"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectClick(pedido)}
                              className="border-red-500 text-red-500 hover:bg-red-500/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Lista de pedidos - Vista Móvil */}
        {!loading && filteredPedidos.length > 0 && (
          <div className="md:hidden space-y-4">
            {filteredPedidos.map((pedido) => (
              <Card 
                key={pedido._id}
                className={`
                  bg-gradient-to-r border shadow-md overflow-hidden
                  ${pedido.estado === 'pendiente' 
                    ? 'from-yellow-900/40 to-yellow-800/40 border-yellow-700' 
                    : pedido.estado === 'aprobado'
                      ? 'from-green-900/40 to-green-800/40 border-green-700'
                      : 'from-red-900/40 to-red-800/40 border-red-700'
                  }
                `}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-[#F8F9FA] flex items-center">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Pedido #{pedido.nPedido || 'N/A'}
                      </CardTitle>
                      <p className="text-xs text-[#6C757D]">
                        {formatDate(pedido.fecha)}
                      </p>
                    </div>
                    {renderStatusBadge(pedido.estado)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <div className="flex items-center text-[#F8F9FA]">
                        <Building className="h-4 w-4 mr-2 text-[#6C757D]" />
                        {pedido.servicio}
                      </div>
                      {pedido.seccionDelServicio && (
                        <div className="flex items-center text-[#6C757D] text-xs ml-6 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {pedido.seccionDelServicio}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-[#F8F9FA]">
                        ${pedido.total?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-[#6C757D]">
                        {pedido.productos?.length || 0} items
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#2A82C7]/30 pt-2 flex items-center">
                    <UserCircle className="h-4 w-4 mr-2 text-[#6C757D]" />
                    <div>
                      <span className="text-[#F8F9FA]">{getAuthorName(pedido)}</span>
                      {pedido.metadata?.creadoPorOperario && (
                        <span className="text-xs text-[#6C757D] block">
                          Operario
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(pedido)}
                      className="text-[#F8F9FA] border-[#2A82C7]/50 hover:bg-[#2A82C7]/20"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalles
                    </Button>
                    
                    {pedido.estado === 'pendiente' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveClick(pedido)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectClick(pedido)}
                          className="border-red-500 text-red-500 hover:bg-red-500/20"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Diálogo de detalles */}
      {selectedPedido && (
        <OrderDetailsDialog 
          isOpen={showDetailsDialog}
          onClose={() => setShowDetailsDialog(false)}
          pedido={selectedPedido}
        />
      )}
      
      {/* Diálogo de confirmación */}
      {selectedPedido && approvalAction && (
        <ApprovalConfirmDialog 
          isOpen={showApprovalDialog}
          onClose={() => setShowApprovalDialog(false)}
          action={approvalAction}
          pedido={selectedPedido}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
};