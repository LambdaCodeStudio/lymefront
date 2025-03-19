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
      
      const response = await fetch(`http://localhost:4000/api/downloads/remito/${pedido._id}`, {
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
          <Badge className="bg-[#FF6B35]/20 text-[#FFCC80] border border-[#FF6B35]">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente de aprobación
          </Badge>
        );
      case 'aprobado':
        return (
          <Badge className="bg-[#2E7D32]/20 text-[#AED581] border border-[#2E7D32]">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge className="bg-[#D32F2F]/20 text-[#EF9A9A] border border-[#D32F2F]">
            <Info className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#2A82C7]/20 text-[#90CAF9] border border-[#2A82C7]">
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
      <DialogContent className="shop-theme max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-r from-[#00701A]/90 to-[#0F172A]/90 backdrop-blur-md border border-[#2A82C7] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center text-[#F8F9FA]">
            <ShoppingCart className="w-5 h-5 mr-2" />
            {!pedido ? 'Detalles del pedido' : `Pedido #${pedido.nPedido || 'Sin número'}`}
          </DialogTitle>
          <DialogDescription className="text-[#CED4DA]">
            {pedido?.metadata?.creadoPorOperario ? 
              `Creado por operario: ${pedido.metadata.operarioNombre || 'No disponible'}` : 
              'Revise los detalles completos del pedido'}
          </DialogDescription>
        </DialogHeader>

        {!pedido ? (
          <div className="py-8 text-center text-[#CED4DA]">
            No se ha seleccionado ningún pedido para ver sus detalles.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información general del pedido */}
            <div className="bg-white/10 rounded-lg p-4 space-y-3 border border-[#2A82C7]/30">
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
                      <p className="text-[#F8F9FA]">{formatDate(pedido.fecha)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Building className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[#CED4DA]">Servicio:</p>
                      <p className="text-[#F8F9FA]">{pedido.servicio}</p>
                    </div>
                  </div>
                  
                  {pedido.seccionDelServicio && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Sección:</p>
                        <p className="text-[#F8F9FA]">{pedido.seccionDelServicio}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {typeof pedido.userId === 'object' && pedido.userId && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Creado por:</p>
                        <p className="text-[#F8F9FA]">
                          {pedido.userId.nombre || pedido.userId.email || 'Usuario desconocido'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {pedido.metadata?.creadoPorOperario && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Operario:</p>
                        <p className="text-[#F8F9FA]">{pedido.metadata.operarioNombre || 'No disponible'}</p>
                      </div>
                    </div>
                  )}
                  
                  {pedido.detalle && (
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-[#CED4DA] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#CED4DA]">Notas:</p>
                        <p className="text-[#F8F9FA]">{pedido.detalle}</p>
                      </div>
                    </div>
                  )}

                  {/* Mostrar motivo de rechazo si aplica */}
                  {pedido.estado === 'rechazado' && pedido.metadata?.motivoRechazo && (
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-[#EF9A9A] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#EF9A9A]">Motivo de rechazo:</p>
                        <p className="text-[#EF9A9A]/90">{pedido.metadata.motivoRechazo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Lista de productos */}
            <div className="bg-white/10 rounded-lg p-4 border border-[#2A82C7]/30">
              <h3 className="font-semibold text-[#F8F9FA] flex items-center mb-3">
                <Package className="w-4 h-4 mr-2" />
                Productos del pedido
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#2A82C7]/30">
                    <tr>
                      <th className="py-2 px-2 text-left text-xs text-[#CED4DA]">Producto</th>
                      <th className="py-2 px-2 text-center text-xs text-[#CED4DA]">Cantidad</th>
                      <th className="py-2 px-2 text-right text-xs text-[#CED4DA]">Precio</th>
                      <th className="py-2 px-2 text-right text-xs text-[#CED4DA]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A82C7]/20">
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
                          <td className="py-3 px-2 text-[#F8F9FA]">{productName}</td>
                          <td className="py-3 px-2 text-center text-[#F8F9FA]">{item.cantidad}</td>
                          <td className="py-3 px-2 text-right text-[#F8F9FA]">${productPrice.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-medium text-[#F8F9FA]">${subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    
                    <tr className="bg-[#00701A]/20 font-semibold">
                      <td colSpan={3} className="py-3 px-2 text-right text-[#F8F9FA]">Total:</td>
                      <td className="py-3 px-2 text-right text-[#F8F9FA]">${calculateOrderTotal().toFixed(2)}</td>
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
                className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#00701A]/20"
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
              className="border-[#F8F9FA]/30 text-[#F8F9FA] hover:bg-white/10"
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
                  className="bg-[#D32F2F] hover:bg-[#D32F2F]/80"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                
                <Button
                  onClick={() => {
                    onApprove(pedido._id);
                    onClose();
                  }}
                  className="bg-[#00701A] hover:bg-[#7CB342] text-white"
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