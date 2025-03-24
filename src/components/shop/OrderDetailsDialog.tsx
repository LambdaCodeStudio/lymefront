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
import { motion } from 'framer-motion';

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
          <Badge className="bg-[#FF9800]/20 text-[#FF9800] border border-[#FF9800] text-sm px-2 py-1 rounded-full transition-all duration-300">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente de aprobación
          </Badge>
        );
      case 'aprobado':
        return (
          <Badge className="bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50] text-sm px-2 py-1 rounded-full transition-all duration-300">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'rechazado':
        return (
          <Badge className="bg-[#F44336]/20 text-[#F44336] border border-[#F44336] text-sm px-2 py-1 rounded-full transition-all duration-300">
            <Info className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#2196F3]/20 text-[#2196F3] border border-[#2196F3] text-sm px-2 py-1 rounded-full transition-all duration-300">
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

  // Animaciones para los elementos del diálogo
  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-[#3a8fb7]/20 shadow-lg rounded-xl text-[#333333]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center text-[#333333]">
            <ShoppingCart className="w-5 h-5 mr-2 text-[#3a8fb7]" />
            {!pedido ? 'Detalles del pedido' : `Pedido #${pedido.nPedido || 'Sin número'}`}
          </DialogTitle>
          <DialogDescription className="text-[#5c5c5c]">
            {pedido?.metadata?.creadoPorOperario ? 
              `Creado por operario: ${pedido.metadata.operarioNombre || 'No disponible'}` : 
              'Revise los detalles completos del pedido'}
          </DialogDescription>
        </DialogHeader>

        {!pedido ? (
          <div className="py-8 text-center text-[#5c5c5c]">
            No se ha seleccionado ningún pedido para ver sus detalles.
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="space-y-6"
          >
            {/* Información general del pedido */}
            <motion.div 
              variants={fadeIn}
              className="bg-white rounded-lg p-4 space-y-3 border border-[#3a8fb7]/20 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-[#333333] flex items-center">
                  <ClipboardList className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                  Información del pedido
                </h3>
                {getStatusBadge()}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Calendar className="w-4 h-4 text-[#5baed1] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[#5c5c5c]">Fecha de creación:</p>
                      <p className="text-[#333333]">{formatDate(pedido.fecha)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Building className="w-4 h-4 text-[#5baed1] mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-[#5c5c5c]">Servicio:</p>
                      <p className="text-[#333333]">{pedido.servicio}</p>
                    </div>
                  </div>
                  
                  {pedido.seccionDelServicio && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-[#5baed1] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#5c5c5c]">Sección:</p>
                        <p className="text-[#333333]">{pedido.seccionDelServicio}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {typeof pedido.userId === 'object' && pedido.userId && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[#5baed1] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#5c5c5c]">Creado por:</p>
                        <p className="text-[#333333]">
                          {pedido.userId.nombre || pedido.userId.email || 'Usuario desconocido'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {pedido.metadata?.creadoPorOperario && (
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-[#5baed1] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#5c5c5c]">Operario:</p>
                        <p className="text-[#333333]">{pedido.metadata.operarioNombre || 'No disponible'}</p>
                      </div>
                    </div>
                  )}
                  
                  {pedido.detalle && (
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-[#5baed1] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#5c5c5c]">Notas:</p>
                        <p className="text-[#333333]">{pedido.detalle}</p>
                      </div>
                    </div>
                  )}

                  {/* Mostrar motivo de rechazo si aplica */}
                  {pedido.estado === 'rechazado' && pedido.metadata?.motivoRechazo && (
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-[#F44336] mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-[#F44336]">Motivo de rechazo:</p>
                        <p className="text-[#F44336]/90">{pedido.metadata.motivoRechazo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Lista de productos */}
            <motion.div 
              variants={fadeIn}
              className="bg-white rounded-lg p-4 border border-[#3a8fb7]/20 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <h3 className="font-semibold text-[#333333] flex items-center mb-3">
                <Package className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                Productos del pedido
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#3a8fb7]/20 bg-[#e8f0f3]">
                    <tr>
                      <th className="py-2 px-2 text-left text-xs text-[#333333] font-medium">Producto</th>
                      <th className="py-2 px-2 text-center text-xs text-[#333333] font-medium">Cantidad</th>
                      <th className="py-2 px-2 text-right text-xs text-[#333333] font-medium">Precio</th>
                      <th className="py-2 px-2 text-right text-xs text-[#333333] font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3a8fb7]/10">
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
                        <tr key={index} className="hover:bg-[#e8f0f3] transition-colors duration-200">
                          <td className="py-3 px-2 text-[#333333]">{productName}</td>
                          <td className="py-3 px-2 text-center text-[#333333]">{item.cantidad}</td>
                          <td className="py-3 px-2 text-right text-[#333333]">${productPrice.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-medium text-[#333333]">${subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    
                    <tr className="bg-[#3a8fb7]/10 font-semibold">
                      <td colSpan={3} className="py-3 px-2 text-right text-[#333333]">Total:</td>
                      <td className="py-3 px-2 text-right text-[#333333]">${calculateOrderTotal().toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between mt-4">
          <div>
            {pedido && (
              <Button
                variant="outline"
                onClick={handleDownloadRemito}
                disabled={isDownloadingRemito}
                className="border-[#3a8fb7] text-[#333333] hover:bg-[#3a8fb7]/10 hover:text-[#3a8fb7] transition-all duration-200"
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
              className="border-[#5baed1] text-[#333333] hover:bg-[#e8f0f3] transition-all duration-200"
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
                  className="bg-[#F44336] hover:bg-[#E53935] text-white transition-all duration-200"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                
                <Button
                  onClick={() => {
                    onApprove(pedido._id);
                    onClose();
                  }}
                  className="bg-[#4CAF50] hover:bg-[#43A047] text-white transition-all duration-200"
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