import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClipboardCheck,
  ClipboardList,
  ShoppingCart,
  Calendar,
  Building,
  MapPin,
  Package,
  User,
  Info,
  AlertCircle,
  DollarSign,
  Download,
  Loader2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipo para productos en un pedido
interface OrderProduct {
  productoId: string | {
    _id: string;
    nombre?: string;
    precio?: number;
    [key: string]: any;
  };
  cantidad: number;
  nombre?: string;
  precio?: number;
}

// Tipo para los datos completos del pedido
interface OrderDetails {
  _id: string;
  nPedido?: number;
  servicio: string;
  seccionDelServicio?: string;
  userId?: string | {
    _id: string;
    nombre?: string;
    email?: string;
    [key: string]: any;
  };
  fecha: string;
  productos: OrderProduct[];
  detalle?: string;
  estado?: string;
  metadata?: {
    creadoPorOperario?: boolean;
    operarioId?: string;
    operarioNombre?: string;
    fechaCreacion?: string;
    supervisorId?: string;
    supervisorNombre?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  isOpen,
  onClose,
  orderId,
  onApprove,
  onReject
}) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingRemito, setIsDownloadingRemito] = useState(false);

  // Cargar detalles del pedido cuando cambia el ID o se abre el diálogo
  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails(orderId);
    } else {
      // Limpiar detalles al cerrar
      setOrderDetails(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  // Función para obtener detalles del pedido
  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener detalles del pedido (${response.status})`);
      }

      const data = await response.json();
      setOrderDetails(data);
    } catch (err) {
      console.error('Error al cargar detalles del pedido:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar detalles del pedido');
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar remito del pedido
  const handleDownloadRemito = async () => {
    if (!orderId) return;
    
    try {
      setIsDownloadingRemito(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
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
      
      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error('La respuesta del servidor está vacía');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `remito_${orderDetails?.nPedido || orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error al descargar remito:', error);
      setError(error instanceof Error ? error.message : 'Error al descargar remito');
    } finally {
      setIsDownloadingRemito(false);
    }
  };

  // Obtener total del pedido
  const calculateOrderTotal = () => {
    if (!orderDetails || !Array.isArray(orderDetails.productos)) {
      return 0;
    }

    return orderDetails.productos.reduce((total, item) => {
      let price = 0;

      if (typeof item.precio === 'number') {
        price = item.precio;
      } else if (typeof item.productoId === 'object' && item.productoId && typeof item.productoId.precio === 'number') {
        price = item.productoId.precio;
      }

      return total + (price * item.cantidad);
    }, 0);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  // Estado visual del pedido
  const getStatusBadge = () => {
    switch (orderDetails?.estado?.toLowerCase()) {
      case 'pendiente':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente de aprobación
          </Badge>
        );
      case 'aprobado':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <Info className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <ClipboardList className="w-3 h-3 mr-1" />
            En procesamiento
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-r from-[#15497E]/90 to-[#2A82C7]/90 backdrop-blur-md border border-[#2A82C7] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center text-[#F8F9FA]">
            <ShoppingCart className="w-5 h-5 mr-2" />
            {loading ? 'Cargando detalles del pedido...' : 
              orderDetails ? `Pedido #${orderDetails.nPedido || 'Sin número'}` : 'Detalles del pedido'}
          </DialogTitle>
          <DialogDescription className="text-[#CED4DA]">
            {orderDetails?.metadata?.creadoPorOperario ? 
              `Creado por operario: ${orderDetails.metadata.operarioNombre || 'No disponible'}` : 
              'Revise los detalles completos del pedido'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-[#F8F9FA] border-[#2A82C7]/30 rounded-full animate-spin mb-4"></div>
              <p className="text-[#F8F9FA]">Cargando detalles del pedido...</p>
            </div>
          </div>
        ) : error ? (
          <Alert className="bg-red-900/50 border border-red-400 mt-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-100 ml-2">{error}</AlertDescription>
          </Alert>
        ) : orderDetails ? (
          <div className="space-y-6">
            {/* Información general del pedido */}
            <div className="bg-white/10 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-[#F8F9FA] flex items-center">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Información del pedido
                </h3>
                {getStatusBadge()}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Calendar className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[#CED4DA]">Fecha de creación:</p>
                      <p className="text-[#F8F9FA]">{formatDate(orderDetails.fecha)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Building className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[#CED4DA]">Servicio:</p>
                      <p className="text-[#F8F9FA]">{orderDetails.servicio}</p>
                    </div>
                  </div>
                  
                  {orderDetails.seccionDelServicio && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Sección:</p>
                        <p className="text-[#F8F9FA]">{orderDetails.seccionDelServicio}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {typeof orderDetails.userId === 'object' && orderDetails.userId && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Creado por:</p>
                        <p className="text-[#F8F9FA]">
                          {orderDetails.userId.nombre || orderDetails.userId.email || 'Usuario desconocido'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {orderDetails.metadata?.creadoPorOperario && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Operario:</p>
                        <p className="text-[#F8F9FA]">{orderDetails.metadata.operarioNombre || 'No disponible'}</p>
                      </div>
                    </div>
                  )}
                  
                  {orderDetails.detalle && (
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Notas:</p>
                        <p className="text-[#F8F9FA]">{orderDetails.detalle}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Lista de productos */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold text-[#F8F9FA] flex items-center mb-3">
                <Package className="w-4 h-4 mr-2" />
                Productos del pedido
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/20">
                    <tr>
                      <th className="py-2 px-2 text-left text-xs text-[#CED4DA]">Producto</th>
                      <th className="py-2 px-2 text-center text-xs text-[#CED4DA]">Cantidad</th>
                      <th className="py-2 px-2 text-right text-xs text-[#CED4DA]">Precio</th>
                      <th className="py-2 px-2 text-right text-xs text-[#CED4DA]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {orderDetails.productos.map((item, index) => {
                      const productName = typeof item.productoId === 'object' && item.productoId?.nombre 
                        ? item.productoId.nombre 
                        : item.nombre || 'Producto';
                      
                      const productPrice = typeof item.productoId === 'object' && item.productoId?.precio !== undefined
                        ? item.productoId.precio
                        : item.precio !== undefined 
                          ? item.precio 
                          : 0;
                      
                      const subtotal = productPrice * item.cantidad;
                      
                      return (
                        <tr key={index}>
                          <td className="py-3 px-2 text-[#F8F9FA]">{productName}</td>
                          <td className="py-3 px-2 text-center text-[#F8F9FA]">{item.cantidad}</td>
                          <td className="py-3 px-2 text-right text-[#F8F9FA]">${productPrice.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-medium text-[#F8F9FA]">${subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    
                    <tr className="bg-white/5 font-semibold">
                      <td colSpan={3} className="py-3 px-2 text-right text-[#F8F9FA]">Total:</td>
                      <td className="py-3 px-2 text-right text-[#F8F9FA]">${calculateOrderTotal().toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-[#CED4DA]">
            No se ha seleccionado ningún pedido para ver sus detalles.
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div>
            {orderDetails && (
              <Button
                variant="outline"
                onClick={handleDownloadRemito}
                disabled={isDownloadingRemito}
                className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
              >
                {isDownloadingRemito ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Descargar Remito
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#CED4DA]/30 text-[#CED4DA] hover:bg-white/10"
            >
              Cerrar
            </Button>
            
            {orderDetails && orderDetails.estado === 'pendiente' && onApprove && onReject && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReject(orderId!);
                    onClose();
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Rechazar
                </Button>
                
                <Button
                  onClick={() => {
                    onApprove(orderId!);
                    onClose();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Aprobar
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};