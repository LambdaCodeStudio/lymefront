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
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de interfaces (sin cambios)
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
    motivoRechazo?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: OrderDetails | null;
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  canApprove?: boolean;
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  isOpen,
  onClose,
  pedido,
  onApprove,
  onReject,
  canApprove = false
}) => {
  const [isDownloadingRemito, setIsDownloadingRemito] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Obtener rol del usuario al montar componente
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    }
  }, []);

  // Función para descargar remito del pedido
  const handleDownloadRemito = async () => {
    if (!pedido) return;
    
    try {
      setIsDownloadingRemito(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }
      
      const response = await fetch(`http://localhost:3000/api/downloads/remito/${pedido._id}`, {
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
      link.setAttribute('download', `remito_${pedido.nPedido || pedido._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error al descargar remito:', error);
    } finally {
      setIsDownloadingRemito(false);
    }
  };

  // Obtener total del pedido
  const calculateOrderTotal = () => {
    if (!pedido || !Array.isArray(pedido.productos)) {
      return 0;
    }

    return pedido.productos.reduce((total, item) => {
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
    switch (pedido?.estado?.toLowerCase()) {
      case 'pendiente':
        return (
          <Badge 
            className="bg-[--state-warning]/20 text-[--state-warning] 
                       border border-[--state-warning] 
                       text-sm px-2 py-1 rounded-full"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pendiente de aprobación
          </Badge>
        );
      case 'aprobado':
        return (
          <Badge 
            className="bg-[--state-success]/20 text-[--state-success] 
                       border border-[--state-success] 
                       text-sm px-2 py-1 rounded-full"
          >
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge 
            className="bg-[--state-error]/20 text-[--state-error] 
                       border border-[--state-error] 
                       text-sm px-2 py-1 rounded-full"
          >
            <Info className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge 
            className="bg-[--state-info]/20 text-[--state-info] 
                       border border-[--state-info] 
                       text-sm px-2 py-1 rounded-full"
          >
            <ClipboardList className="w-3 h-3 mr-1" />
            En procesamiento
          </Badge>
        );
    }
  };

  // Determinar si el usuario puede aprobar/rechazar este pedido
  const canApproveReject = () => {
    // Solo supervisores pueden aprobar/rechazar
    if (userRole !== 'supervisor') return false;
    
    // Solo se pueden aprobar/rechazar pedidos pendientes
    if (pedido?.estado !== 'pendiente') return false;
    
    // Verificar si es un pedido de operario para este supervisor
    if (pedido?.metadata?.creadoPorOperario) {
      return canApprove; 
    }
    
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="shop-theme max-w-3xl max-h-[90vh] overflow-y-auto 
                   bg-[--background-component] 
                   border border-[--accent-primary] 
                   text-[--text-primary]"
      >
        <DialogHeader>
          <DialogTitle 
            className="text-xl flex items-center text-[--text-primary]"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {!pedido ? 'Detalles del pedido' : `Pedido #${pedido.nPedido || 'Sin número'}`}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            {pedido?.metadata?.creadoPorOperario ? 
              `Creado por operario: ${pedido.metadata.operarioNombre || 'No disponible'}` : 
              'Revise los detalles completos del pedido'}
          </DialogDescription>
        </DialogHeader>

        {!pedido ? (
          <div className="py-8 text-center text-[--text-tertiary]">
            No se ha seleccionado ningún pedido para ver sus detalles.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información general del pedido */}
            <div 
              className="bg-[--background-card] 
                         rounded-lg p-4 space-y-3 
                         border border-[--accent-secondary]/30"
            >
              <div className="flex justify-between items-start">
                <h3 
                  className="font-semibold text-[--text-primary] 
                             flex items-center"
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Información del pedido
                </h3>
                {getStatusBadge()}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Calendar className="w-4 h-4 text-[--text-tertiary] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[--text-tertiary]">Fecha de creación:</p>
                      <p className="text-[--text-primary]">{formatDate(pedido.fecha)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Building className="w-4 h-4 text-[--text-tertiary] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[--text-tertiary]">Servicio:</p>
                      <p className="text-[--text-primary]">{pedido.servicio}</p>
                    </div>
                  </div>
                  
                  {pedido.seccionDelServicio && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-[--text-tertiary] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[--text-tertiary]">Sección:</p>
                        <p className="text-[--text-primary]">{pedido.seccionDelServicio}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {typeof pedido.userId === 'object' && pedido.userId && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[--text-tertiary] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[--text-tertiary]">Creado por:</p>
                        <p className="text-[--text-primary]">
                          {pedido.userId.nombre || pedido.userId.email || 'Usuario desconocido'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {pedido.metadata?.creadoPorOperario && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[--text-tertiary] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[--text-tertiary]">Operario:</p>
                        <p className="text-[--text-primary]">{pedido.metadata.operarioNombre || 'No disponible'}</p>
                      </div>
                    </div>
                  )}
                  
                  {pedido.detalle && (
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-[--text-tertiary] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[--text-tertiary]">Notas:</p>
                        <p className="text-[--text-primary]">{pedido.detalle}</p>
                      </div>
                    </div>
                  )}

                  {/* Mostrar motivo de rechazo si aplica */}
                  {pedido.estado === 'rechazado' && pedido.metadata?.motivoRechazo && (
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-[--state-error] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[--state-error]">Motivo de rechazo:</p>
                        <p className="text-[--state-error]/90">{pedido.metadata.motivoRechazo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Lista de productos */}
            <div 
              className="bg-[--background-card] 
                         rounded-lg p-4 
                         border border-[--accent-secondary]/30"
            >
              <h3 
                className="font-semibold text-[--text-primary] 
                           flex items-center mb-3"
              >
                <Package className="w-4 h-4 mr-2" />
                Productos del pedido
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[--accent-secondary]/30">
                    <tr>
                      <th className="py-2 px-2 text-left text-xs text-[--text-tertiary]">Producto</th>
                      <th className="py-2 px-2 text-center text-xs text-[--text-tertiary]">Cantidad</th>
                      <th className="py-2 px-2 text-right text-xs text-[--text-tertiary]">Precio</th>
                      <th className="py-2 px-2 text-right text-xs text-[--text-tertiary]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--accent-secondary]/20">
                    {pedido.productos.map((item, index) => {
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
                          <td className="py-3 px-2 text-[--text-primary]">{productName}</td>
                          <td className="py-3 px-2 text-center text-[--text-primary]">{item.cantidad}</td>
                          <td className="py-3 px-2 text-right text-[--text-primary]">${productPrice.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-medium text-[--text-primary]">${subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    
                    <tr className="bg-[--accent-primary]/20 font-semibold">
                      <td colSpan={3} className="py-3 px-2 text-right text-[--text-primary]">Total:</td>
                      <td className="py-3 px-2 text-right text-[--text-primary]">${calculateOrderTotal().toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div>
            {pedido && (
              <Button
                variant="outline"
                onClick={handleDownloadRemito}
                disabled={isDownloadingRemito}
                className="border-[--accent-primary] 
                           text-[--text-primary] 
                           hover:bg-[--accent-primary]/10 
                           hover:text-[--text-primary]"
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
              className="border-[--accent-secondary]/30 
                         text-[--text-primary] 
                         hover:bg-[--background-secondary]/20"
            >
              Cerrar
            </Button>
            
            {/* Mostrar botones de aprobación/rechazo para supervisores */}
            {pedido && canApproveReject() && onApprove && onReject && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReject(pedido._id);
                    onClose();
                  }}
                  className="bg-[--state-error] 
                             hover:bg-[--state-error]/80 
                             text-white"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                
                <Button
                  onClick={() => {
                    onApprove(pedido._id);
                    onClose();
                  }}
                  className="bg-[--state-success] 
                             hover:bg-[--state-success]/80 
                             text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
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