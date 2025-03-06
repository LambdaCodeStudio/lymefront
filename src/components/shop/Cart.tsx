import React, { useState, useEffect } from 'react';
import { useCartContext } from '@/providers/CartProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  Building,
  MapPin,
  AlertCircle,
  AlertTriangle,
  Download,
  Clock,
  Image as ImageIcon,
  PackageOpen,
  UserCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShopNavbar } from './ShopNavbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
// Import ProductImage component for better image handling
import ProductImage from '@/components/admin/components/ProductImage';

// Simple image component with error handling using React state
const CartItemImage = ({ item }) => {
  const [imageError, setImageError] = useState(false);
  
  if (imageError || !item.image) {
    return (
      <ProductImage 
        productId={item.id}
        alt={item.name}
        width={80}
        height={80}
        quality={70}
        className="w-full h-full object-cover"
        containerClassName="w-full h-full"
        fallbackClassName="w-full h-full flex items-center justify-center"
        placeholderText=""
        useBase64={true}
      />
    );
  }
  
  return (
    <img 
      src={`data:image/jpeg;base64,${item.image}`}
      alt={item.name}
      className="w-full h-full object-cover"
      onError={() => {
        console.log(`Image error for item: ${item.id}`);
        setImageError(true);
      }}
    />
  );
};

// Manejamos el caso cuando useNotification no está disponible
const useNotificationSafe = () => {
  try {
    // Importación dinámica para evitar errores si no está disponible
    const { useNotification } = require('@/context/NotificationContext');
    return useNotification();
  } catch (error) {
    // Fallback cuando no está disponible
    return {
      addNotification: (message: string, type: string) => {
        console.log(`Notification (${type}): ${message}`);
      }
    };
  }
};

// Interfaces para los clientes
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

// Interface para el usuario
interface User {
  _id: string;
  id?: string;
  email?: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
  tipo?: string;
  createdBy?: string;
  isTemporary?: boolean;
}

export const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCartContext();
  const { addNotification } = useNotificationSafe(); // Usando versión segura
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [orderComplete, setOrderComplete] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [isDownloadingRemito, setIsDownloadingRemito] = useState<boolean>(false);
  
  // Estados para clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesAgrupados, setClientesAgrupados] = useState<Record<string, Cliente[]>>({});
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [cargandoClientes, setCargandoClientes] = useState<boolean>(false);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);
  
  // Estado para formulario de checkout
  const [orderForm, setOrderForm] = useState({
    notes: '',
    deliveryDate: '',
    servicio: '',
    seccionDelServicio: ''
  });
  
  // Estados para manejo de usuario temporal
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTemporaryUser, setIsTemporaryUser] = useState<boolean>(false);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [parentUserName, setParentUserName] = useState<string | null>(null);
  
  // Obtener clientes del usuario al cargar el componente
  useEffect(() => {
    fetchCurrentUser().then(() => {
      fetchClientes();
    });
  }, []);

  // Contador para redirección automática tras completar pedido
  useEffect(() => {
    if (orderComplete) {
      const timer = setInterval(() => {
        setCountdown(prevCount => {
          if (prevCount <= 1) {
            clearInterval(timer);
            window.location.href = '/shop';
            return 0;
          }
          return prevCount - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [orderComplete]);

  // Función para obtener información del usuario actual
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener información del usuario');
      }
      
      const userData: User = await response.json();
      setCurrentUser(userData);
      
      // Determinar si es un usuario temporal
      const isTemp = userData.isTemporary || userData.tipo === 'temporal';
      setIsTemporaryUser(isTemp);
      
      // Si es temporal y tiene createdBy, obtener información del usuario básico
      if (isTemp && userData.createdBy) {
        setParentUserId(userData.createdBy);
        
        // Opcionalmente, obtener más detalles del usuario básico si es necesario
        try {
          const basicUserResponse = await fetch(`http://localhost:4000/api/usuario/${userData.createdBy}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (basicUserResponse.ok) {
            const basicUserData = await basicUserResponse.json();
            const displayName = 
              basicUserData.nombre && basicUserData.apellido 
                ? `${basicUserData.nombre} ${basicUserData.apellido}`
                : basicUserData.usuario || basicUserData.email || 'Usuario Básico';
            
            setParentUserName(displayName);
          }
        } catch (error) {
          console.error('Error al obtener detalles del usuario básico:', error);
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return null;
    }
  };

  // Función para obtener los clientes del usuario adecuado (usuario actual o básico)
  const fetchClientes = async () => {
    try {
      setCargandoClientes(true);
      setErrorClientes(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
      }
      
      // Determinar qué ID de usuario usar para obtener clientes
      let clientsUserId;
      
      if (isTemporaryUser && parentUserId) {
        // Si es usuario temporal, usar el ID del usuario básico
        clientsUserId = parentUserId;
        console.log('Usando ID de usuario básico para obtener clientes:', clientsUserId);
      } else if (currentUser) {
        // De lo contrario, usar el ID del usuario actual
        clientsUserId = currentUser._id || currentUser.id;
        console.log('Usando ID de usuario actual para obtener clientes:', clientsUserId);
      } else {
        // Si no hay usuario actual (no debería ocurrir), intentar obtenerlo
        const userData = await fetchCurrentUser();
        clientsUserId = userData?._id || userData?.id;
        
        if (!clientsUserId) {
          throw new Error('No se pudo determinar el ID del usuario para obtener clientes');
        }
      }
      
      // Obtener clientes asociados al usuario
      const response = await fetch(`http://localhost:4000/api/cliente/user/${clientsUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al cargar clientes: ${response.status}`);
      }
      
      const data = await response.json();
      setClientes(data);
      
      // Agrupar clientes por servicio para una mejor organización
      const agrupados = data.reduce((acc: Record<string, Cliente[]>, cliente: Cliente) => {
        if (!acc[cliente.servicio]) {
          acc[cliente.servicio] = [];
        }
        acc[cliente.servicio].push(cliente);
        return acc;
      }, {});
      
      setClientesAgrupados(agrupados);
      
      // Si hay al menos un cliente, seleccionarlo por defecto
      if (data.length > 0) {
        setClienteSeleccionado(data[0]._id);
        setOrderForm(prev => ({
          ...prev,
          servicio: data[0].servicio,
          seccionDelServicio: data[0].seccionDelServicio
        }));
      } else {
        setErrorClientes('No hay clientes asignados. Por favor, contacta con administración para que te asignen clientes antes de realizar pedidos.');
      }
      
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setErrorClientes(error instanceof Error ? error.message : 'Error al cargar clientes');
    } finally {
      setCargandoClientes(false);
    }
  };

  // Función para descargar el remito del pedido creado
  const handleRemitoDownload = async () => {
    if (!createdOrderId) {
      console.log('No se puede descargar el remito: ID de pedido no disponible');
      return;
    }
    
    try {
      setIsDownloadingRemito(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      console.log(`Iniciando descarga de remito para pedido: ${createdOrderId}`);
      
      // Realizar la solicitud con un timeout adecuado
      const response = await fetch(`http://localhost:4000/api/downloads/remito/${createdOrderId}`, {
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
      
      // Convertir la respuesta a blob
      const blob = await response.blob();
      
      // Verificar que el blob no esté vacío
      if (!blob || blob.size === 0) {
        throw new Error('La respuesta del servidor está vacía');
      }
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `remito_${createdOrderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Remito descargado correctamente');
    } catch (error) {
      console.error('Error al descargar remito:', error);
    } finally {
      setIsDownloadingRemito(false);
    }
  };
  
  // Actualizar cantidad con validación
  const handleQuantityChange = (id: string, newQuantity: number) => {
    // Sólo aseguramos que la cantidad sea positiva
    if (newQuantity < 1) newQuantity = 1;
    // Eliminamos el límite superior de 99 unidades
    updateQuantity(id, newQuantity);
  };
  
  // Manejar cambio de cliente seleccionado
  const handleClienteChange = (clienteId: string) => {
    setClienteSeleccionado(clienteId);
    
    // Encontrar el cliente seleccionado y actualizar el formulario
    const clienteSeleccionadoObj = clientes.find(c => c._id === clienteId);
    if (clienteSeleccionadoObj) {
      setOrderForm(prev => ({
        ...prev,
        servicio: clienteSeleccionadoObj.servicio,
        seccionDelServicio: clienteSeleccionadoObj.seccionDelServicio
      }));
    }
  };
  
  // Procesamiento real de pedido
  const processOrder = async () => {
    if (items.length === 0) return;
    if (clientes.length === 0) {
      setOrderError('No hay clientes asignados. No puedes realizar pedidos hasta que administración asigne clientes.');
      return;
    }
    if (!clienteSeleccionado && clientes.length > 0) {
      setOrderError('Por favor, seleccione un cliente para el pedido');
      return;
    }  
    
    setProcessingOrder(true);
    setOrderError(null);
    
    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
      }
      
      // Determinar el ID de usuario para el pedido
      let orderUserId;
      
      // Si es usuario temporal, usar el ID del usuario básico
      if (isTemporaryUser && parentUserId) {
        orderUserId = parentUserId;
        console.log('Usando ID de usuario básico para el pedido:', orderUserId);
      } else if (currentUser) {
        // Si no, usar el ID del usuario actual
        orderUserId = currentUser._id || currentUser.id;
        console.log('Usando ID de usuario actual para el pedido:', orderUserId);
      } else {
        // Si no hay usuario actual, obtenerlo
        const userData = await fetchCurrentUser();
        orderUserId = userData?._id || userData?.id;
        
        if (!orderUserId) {
          throw new Error('No se pudo determinar el ID del usuario para el pedido');
        }
      }
      
      // Formato de los productos para la API
      const productsData = items.map(item => ({
        productoId: item.id,
        cantidad: item.quantity,
        nombre: item.name,
        precio: item.price
      }));
      
      // Encontrar el cliente seleccionado
      const clienteObj = clientes.find(c => c._id === clienteSeleccionado);
      
      // Crear objeto de pedido
      const orderData = {
        userId: orderUserId,
        servicio: clienteObj ? clienteObj.servicio : orderForm.servicio || "Sin especificar",
        seccionDelServicio: clienteObj ? clienteObj.seccionDelServicio : orderForm.seccionDelServicio || "Sin especificar",
        detalle: orderForm.notes || "Pedido creado desde la tienda web",
        productos: productsData,
        // Añadir metadata si el pedido lo hizo un usuario temporal
        metadata: isTemporaryUser ? {
          creadoPorUsuarioTemporal: true,
          usuarioTemporalId: currentUser?._id || currentUser?.id
        } : undefined
      };
      
      console.log('Enviando pedido:', JSON.stringify(orderData));
      
      // Enviar pedido a la API
      const response = await fetch('http://localhost:4000/api/pedido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al crear el pedido (status: ${response.status})`);
      }

      // Obtener datos del pedido creado para guardar el ID
      const pedidoCreado = await response.json();
      setCreatedOrderId(pedidoCreado._id);
      
      // Pedido creado correctamente
      setOrderComplete(true);
      clearCart();
    } catch (error) {
      console.error('Error al procesar pedido:', error);
      setOrderError(error instanceof Error ? error.message : 'Hubo un problema al procesar tu pedido. Por favor, intenta nuevamente.');
    } finally {
      setProcessingOrder(false);
    }
  };
  
  // Vista de carrito vacío
  if (items.length === 0 && !orderComplete) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-[#50C3AD]/30 backdrop-blur-md rounded-full p-6 mb-6 shadow-lg shadow-[#00888A]/20">
              <ShoppingCart className="h-16 w-16 text-[#D4F5E6]" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-[#D4F5E6]">Tu carrito está vacío</h2>
            <p className="text-[#75D0E0] mb-8 text-center max-w-md">
              Parece que aún no has agregado productos a tu carrito. 
              Explora nuestro catálogo y encuentra lo que necesitas.
            </p>
            <Button 
              className="bg-[#00888A] hover:bg-[#50C3AD] text-white shadow-md shadow-[#00888A]/20"
              onClick={() => window.location.href = '/shop'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la tienda
            </Button>
          </div>
        </div>
      </>
    );
  }
  
  // Vista de pedido completado
  if (orderComplete) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-[#00888A]/40 to-[#50C3AD]/40 backdrop-blur-md border border-[#80CFB0] p-8 rounded-2xl text-center shadow-lg shadow-[#00888A]/10"
            >
              <div className="bg-green-500 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-[#D4F5E6]">¡Pedido realizado con éxito!</h2>
              <p className="text-[#75D0E0] mb-6">
                Hemos recibido tu solicitud. El equipo de administración revisará tu pedido y te contactará pronto.
              </p>
              
              {/* Mostrar información del usuario básico si es un usuario temporal */}
              {isTemporaryUser && parentUserName && (
                <div className="mb-6 p-3 bg-white/10 border border-[#80CFB0] rounded-lg">
                  <p className="flex items-center justify-center text-[#D4F5E6]">
                    <UserCircle2 className="h-4 w-4 mr-2" />
                    Pedido realizado a nombre de: <span className="font-bold ml-1">{parentUserName}</span>
                  </p>
                </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center mb-6">
                <Button 
                  className="bg-[#00888A] hover:bg-[#50C3AD] text-white shadow-md shadow-[#00888A]/20"
                  onClick={handleRemitoDownload}
                  disabled={isDownloadingRemito}
                >
                  {isDownloadingRemito ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar Remito
                </Button>
                
                <Button 
                  variant="outline"
                  className="border-[#80CFB0] text-[#D4F5E6] hover:bg-[#00888A]/20"
                  onClick={() => window.location.href = '/shop'}
                >
                  Volver a la tienda
                </Button>
              </div>
              
              {/* Contador */}
              <div className="bg-white/10 border border-[#80CFB0]/50 rounded-lg p-3 inline-flex items-center">
                <Clock className="h-4 w-4 mr-2 text-[#D4F5E6]" />
                <span className="text-[#D4F5E6]">
                  Volviendo a la tienda en <span className="font-bold">{countdown}</span> segundos
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center text-[#D4F5E6]">
            <ShoppingCart className="mr-3 h-8 w-8" />
            Tu Carrito
          </h1>
          
          {/* Mostrar banner informativo para usuarios temporales */}
          {isTemporaryUser && parentUserName && (
            <Alert className="mb-6 bg-[#00888A]/30 border-[#50C3AD] shadow-md">
              <UserCircle2 className="h-5 w-5 text-[#D4F5E6]" />
              <AlertDescription className="ml-2 text-[#D4F5E6]">
                Estás realizando un pedido a nombre de <span className="font-bold">{parentUserName}</span>. 
                Los clientes mostrados y el pedido se asignarán a esta cuenta.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Lista de productos */}
            <div className="flex-grow">
              <div className="space-y-4">
                {checkoutStep === 1 ? (
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="bg-gradient-to-r from-[#00888A]/40 to-[#50C3AD]/40 backdrop-blur-sm border border-[#80CFB0] rounded-lg overflow-hidden shadow-md"
                      >
                        <div className="p-4 flex gap-4">
                          {/* Imagen del producto - MEJORADO CON CARTITEMIMAGE */}
                          <div className="w-20 h-20 bg-white/10 rounded-md overflow-hidden flex-shrink-0 border border-[#80CFB0]/30">
                            <CartItemImage item={item} />
                          </div>
                          
                          {/* Información del producto */}
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <h3 className="font-medium text-lg text-[#D4F5E6]">{item.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#D4F5E6]/60 hover:text-red-400 hover:bg-transparent"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Categoría */}
                            {item.category && (
                              <p className="text-sm text-[#75D0E0] capitalize">
                                {item.category} {item.subcategory && `- ${item.subcategory}`}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center space-x-1 bg-white/10 rounded-md border border-[#80CFB0]/30">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#D4F5E6]"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  className="w-16 h-8 text-center p-0 border-0 bg-transparent focus:ring-0 text-[#D4F5E6]"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#D4F5E6]"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-lg font-semibold text-[#D4F5E6]">${(item.price * item.quantity).toFixed(2)}</div>
                                <div className="text-xs text-[#75D0E0]">${item.price.toFixed(2)} por unidad</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Selector de clientes */}
                    <Card className="bg-gradient-to-r from-[#00888A]/40 to-[#50C3AD]/40 backdrop-blur-sm border-[#80CFB0] shadow-md">
                      <CardHeader className="border-b border-[#80CFB0]/50">
                        <CardTitle className="text-[#D4F5E6]">Seleccionar Cliente</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        {cargandoClientes ? (
                          <div className="py-3 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#D4F5E6]" />
                          </div>
                        ) : errorClientes ? (
                          <Alert className="bg-red-900/30 border-red-400">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="ml-2 text-red-100">
                              {errorClientes}
                            </AlertDescription>
                          </Alert>
                        ) : clientes.length === 0 ? (
                          <div>
                            <Alert className="bg-yellow-600/30 border-2 border-yellow-500/80 mb-4">
                              <AlertTriangle className="h-4 w-4 text-yellow-300" />
                              <AlertDescription className="ml-2 text-yellow-100 font-medium">
                                No hay clientes asignados. Por favor, contacta con administración para que te asignen clientes antes de realizar pedidos.
                              </AlertDescription>
                            </Alert>
                            
                            <div className="flex justify-center mt-6">
                              <Button 
                                onClick={() => window.location.href = '/shop'}
                                className="bg-[#00888A] hover:bg-[#50C3AD] text-white"
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a la tienda
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="clienteSelector" className="text-white font-medium flex items-center">
                              Cliente Asociado
                              {cargandoClientes && <Loader2 className="ml-2 h-3 w-3 animate-spin text-white/70" />}
                            </Label>
                            
                            {/* Indicador de usuario básico para temporales */}
                            {isTemporaryUser && parentUserName && (
                              <div className="text-xs text-[#D4F5E6] mb-2 flex items-center">
                                <UserCircle2 className="h-3 w-3 mr-1 text-[#50C3AD]" />
                                Mostrando clientes de: {parentUserName}
                              </div>
                            )}
                            
                            <div className="relative mt-1">
                              <Select 
                                value={clienteSeleccionado || ""} 
                                onValueChange={handleClienteChange}
                                disabled={cargandoClientes}
                              >
                                <SelectTrigger 
                                  className="w-full bg-white/10 border-2 border-[#50C3AD] rounded-md text-white"
                                >
                                  <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80 overflow-y-auto bg-[#00888A] border-[#50C3AD]">
                                  {Object.entries(clientesAgrupados).map(([servicio, clientesServicio]) => (
                                    <div key={servicio} className="px-1 py-1">
                                      {/* Encabezado de grupo de servicio */}
                                      <div className="flex items-center px-2 py-1.5 text-xs uppercase tracking-wider font-semibold bg-[#50C3AD]/30 text-[#D4F5E6] rounded mb-1">
                                        <Building className="h-3 w-3 mr-2" />
                                        {servicio}
                                      </div>
                                      
                                      {/* Secciones del servicio */}
                                      <div className="pl-2">
                                        {clientesServicio.map(cliente => (
                                          <SelectItem 
                                            key={cliente._id} 
                                            value={cliente._id}
                                            className="focus:bg-[#50C3AD]/50 data-[state=checked]:bg-[#50C3AD] data-[state=checked]:text-white"
                                          >
                                            <div className="flex items-center">
                                              {cliente.seccionDelServicio ? (
                                                <>
                                                  <MapPin className="h-3 w-3 mr-2 text-[#D4F5E6]/70" />
                                                  <span>{cliente.seccionDelServicio}</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Check className="h-3 w-3 mr-2 text-[#D4F5E6]/70" />
                                                  <span>Principal</span>
                                                </>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Información del cliente seleccionado */}
                            {clienteSeleccionado && !cargandoClientes && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 rounded-md bg-white/10 border border-[#50C3AD]/50 backdrop-blur-sm"
                              >
                                <div className="text-sm text-[#D4F5E6]">
                                  <p className="flex items-center">
                                    <Building className="w-4 h-4 mr-2 text-[#50C3AD]" />
                                    <span className="font-medium">Servicio:</span>
                                    <span className="ml-1">{orderForm.servicio}</span>
                                  </p>
                                  {orderForm.seccionDelServicio && (
                                    <p className="flex items-center mt-1">
                                      <MapPin className="w-4 h-4 mr-2 text-[#50C3AD]" />
                                      <span className="font-medium">Sección:</span>
                                      <span className="ml-1">{orderForm.seccionDelServicio}</span>
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-r from-[#00888A]/40 to-[#50C3AD]/40 backdrop-blur-sm border-[#80CFB0] shadow-md">
                      <CardHeader className="border-b border-[#80CFB0]/50">
                        <CardTitle className="text-[#D4F5E6]">Información del pedido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div>
                          <Label htmlFor="deliveryDate" className="text-[#D4F5E6]">Fecha de entrega deseada</Label>
                          <Input
                            id="deliveryDate"
                            type="date"
                            className="bg-white/10 border-[#50C3AD] mt-1 text-[#D4F5E6]"
                            min={new Date().toISOString().split('T')[0]}
                            value={orderForm.deliveryDate}
                            onChange={(e) => setOrderForm({...orderForm, deliveryDate: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="notes" className="text-[#D4F5E6]">Notas adicionales</Label>
                          <Textarea
                            id="notes"
                            placeholder="Instrucciones especiales, ubicación de entrega, etc."
                            className="bg-white/10 border-[#50C3AD] mt-1 text-[#D4F5E6] placeholder:text-[#D4F5E6]/50"
                            value={orderForm.notes}
                            onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-r from-[#00888A]/40 to-[#50C3AD]/40 backdrop-blur-sm border-[#80CFB0] shadow-md">
                      <CardHeader className="border-b border-[#80CFB0]/50">
                        <CardTitle className="text-[#D4F5E6]">Resumen del pedido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-6 overflow-y-auto max-h-60">
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between py-1 text-[#D4F5E6]">
                            <span>
                              {item.name} <span className="text-[#75D0E0]">x{item.quantity}</span>
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <Separator className="bg-[#80CFB0]/30 my-2" />
                        <div className="flex justify-between font-bold text-[#D4F5E6]">
                          <span>Total:</span>
                          <span>${totalPrice.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {orderError && (
                      <Alert className="bg-red-100 border-2 border-red-500 shadow-md">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <AlertDescription className="ml-2 text-red-800 font-medium">{orderError}</AlertDescription>
                      </Alert>
                    )}
                  </motion.div>
                )}
              </div>
              
              {items.length > 0 && checkoutStep === 1 && (
                <div className="mt-4 flex justify-between">
                  <Button 
                    variant="outline" 
                    className="border-red-400 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                    onClick={clearCart}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Vaciar carrito
                  </Button>
                </div>
              )}
              
              {checkoutStep === 2 && (
                <div className="mt-6 flex justify-between">
                  <Button 
                    variant="outline"
                    className="border-[#50C3AD] text-[#D4F5E6] hover:bg-[#50C3AD]/20"
                    onClick={() => setCheckoutStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al carrito
                  </Button>
                  
                  <Button 
                    onClick={processOrder}
                    className="bg-[#00888A] hover:bg-[#50C3AD] text-white shadow-md shadow-[#00888A]/20"
                    disabled={processingOrder}
                  >
                    {processingOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Realizar pedido
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Resumen de compra */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="sticky top-20">
                <Card className="bg-gradient-to-br from-[#00888A]/60 to-[#50C3AD]/60 backdrop-blur-md border border-[#80CFB0] shadow-lg shadow-[#00888A]/10">
                  <CardHeader className="border-b border-[#80CFB0]/50">
                    <CardTitle className="text-[#D4F5E6]">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex justify-between text-sm text-[#D4F5E6]">
                      <span>Subtotal:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-[#D4F5E6]">
                      <span>Productos:</span>
                      <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                    </div>
                    
                    {/* Mostrar información del usuario básico para temporales en el resumen */}
                    {isTemporaryUser && parentUserName && (
                      <div className="bg-white/10 rounded-md p-2 text-xs text-[#D4F5E6] border border-[#80CFB0]/50">
                        <div className="flex items-center mb-1 text-[#50C3AD]">
                          <UserCircle2 className="h-3 w-3 mr-1" />
                          <span className="font-medium">Información de usuario</span>
                        </div>
                        <p>Pedido a nombre de: <span className="font-medium">{parentUserName}</span></p>
                      </div>
                    )}
                    
                    <Separator className="bg-[#80CFB0]/30" />
                    
                    <div className="flex justify-between font-semibold text-lg text-[#D4F5E6]">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    {checkoutStep === 1 ? (
                      <Button 
                        onClick={() => setCheckoutStep(2)}
                        className="w-full bg-[#00888A] hover:bg-[#50C3AD] text-white shadow-md shadow-[#00888A]/20"
                      >
                        Proceder a confirmar la orden
                      </Button>
                    ) : (
                      <div className="w-full text-center text-sm text-[#D4F5E6]/90">
                        <p>Revisa tu pedido y completa la información requerida.</p>
                      </div>
                    )}
                  </CardFooter>
                </Card>
                
                <div className="mt-4 p-4 bg-gradient-to-br from-[#50C3AD]/20 to-[#75D0E0]/20 backdrop-blur-sm rounded-lg border border-[#80CFB0] shadow-md">
                  <h3 className="flex items-center text-sm font-medium mb-2 text-[#D4F5E6]">
                    <Check className="text-[#D4F5E6] mr-2 h-4 w-4" />
                    Política de pedidos
                  </h3>
                  <p className="text-xs text-[#75D0E0]">
                    Los pedidos realizados están sujetos a revisión y aprobación por el equipo administrativo.
                    Una vez confirmado, se coordinará la entrega de los productos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};