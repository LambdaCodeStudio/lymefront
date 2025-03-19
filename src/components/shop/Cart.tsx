import React, { useState, useEffect, useCallback } from 'react';
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
import { getApiUrl } from '@/utils/apiUtils';

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
  role?: string;
  secciones?: string;
  createdBy?: string | {
    _id?: string;
    id?: string;
    email?: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
  };
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
    servicio: '',
    seccionDelServicio: ''
  });
  
  // Estados para manejo de usuario
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);
  
  // Obtener clientes del usuario al cargar el componente
  useEffect(() => {
    async function initializeCart() {
      try {
        // Obtener información del usuario primero
        const userData = await fetchCurrentUser();
        
        if (userData) {
          // Esperar un breve período para asegurarnos de que los estados se han actualizado
          setTimeout(() => {
            fetchClientes();
          }, 100);
        }
      } catch (error) {
        console.error('Error inicializando carrito:', error);
      }
    }
    
    initializeCart();
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
      
      // Recuperar información desde localStorage primero (para agilidad)
      const storedRole = localStorage.getItem('userRole');
      const storedSecciones = localStorage.getItem('userSecciones');
      
      if (storedRole) setUserRole(storedRole);
      if (storedSecciones) setUserSecciones(storedSecciones);
      
<<<<<<< HEAD
      const response = await fetch('http://localhost:4000/api/auth/me', {
=======
      const response = await fetch('http://179.43.118.101:3000/api/auth/me', {
>>>>>>> server
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener información del usuario (${response.status})`);
      }
      
      const userData: User = await response.json();
      setCurrentUser(userData);
      
      // Guardar datos frescos en localStorage
      if (userData.role) {
        localStorage.setItem('userRole', userData.role);
        setUserRole(userData.role);
      }
      
      if (userData.secciones) {
        localStorage.setItem('userSecciones', userData.secciones);
        setUserSecciones(userData.secciones);
      }
      
      // Determinar si es operario y establecer datos del supervisor
      const isOperario = userData.role === 'operario';
      
      if (isOperario && userData.createdBy) {
        // Extraer el ID correctamente, ya sea que createdBy sea un string o un objeto
        const createdById = typeof userData.createdBy === 'object' 
          ? userData.createdBy._id || userData.createdBy.id 
          : userData.createdBy;
        
        setSupervisorId(createdById);
        
        // Verificar si ya tenemos información del supervisor en los datos actuales
        if (typeof userData.createdBy === 'object' && userData.createdBy) {
          const supervisor = userData.createdBy;
          
          // Intentar extraer el nombre del objeto createdBy si contiene la información
          if (supervisor.nombre || supervisor.apellido || supervisor.email || supervisor.usuario) {
            const displayName = 
              supervisor.nombre && supervisor.apellido 
                ? `${supervisor.nombre} ${supervisor.apellido}`
                : supervisor.usuario || supervisor.email || 'Supervisor';
            
            setSupervisorName(displayName);
            console.log('Información de supervisor obtenida de datos existentes:', displayName);
            return userData;
          }
        }
        
        // Si no tenemos la información en los datos actuales, intentar obtenerla
        try {
          console.log('Obteniendo información del supervisor...');
          
<<<<<<< HEAD
          const supervisorResponse = await fetch(`http://localhost:4000/api/auth/users/${createdById}`, {
=======
          const supervisorResponse = await fetch(`http://179.43.118.101:3000/api/auth/users/${createdById}`, {
>>>>>>> server
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (supervisorResponse.ok) {
            const supervisorData = await supervisorResponse.json();
            const displayName = 
              supervisorData.nombre && supervisorData.apellido 
                ? `${supervisorData.nombre} ${supervisorData.apellido}`
                : supervisorData.usuario || supervisorData.email || 'Supervisor';
            
            setSupervisorName(displayName);
            console.log('Información de supervisor obtenida:', displayName);
          } else {
            console.log('No se pudo obtener información detallada del supervisor');
            setSupervisorName(`Supervisor ID: ${createdById.substring(0, 8)}...`);
          }
        } catch (error) {
          console.error('Error al obtener detalles del supervisor:', error);
          setSupervisorName(`Supervisor ID: ${createdById.substring(0, 8)}...`);
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return null;
    }
  };

  // Función optimizada para obtener los clientes del usuario
  const fetchClientes = useCallback(async () => {
    try {
      setCargandoClientes(true);
      setErrorClientes(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
      }
      
      // Determinar qué ID de usuario usar para obtener clientes
      let clientsUserId;
      
      // Si es operario, usar el ID del supervisor
      if (userRole === 'operario' && supervisorId) {
        clientsUserId = supervisorId;
        console.log('Usando ID de supervisor para obtener clientes:', clientsUserId);
      } else if (currentUser) {
        // De lo contrario, usar el ID del usuario actual
        clientsUserId = currentUser._id || currentUser.id;
        console.log('Usando ID de usuario actual para obtener clientes:', clientsUserId);
      } else {
        // Si no hay usuario actual (no debería ocurrir), intentar obtenerlo de nuevo
        const userData = await fetchCurrentUser();
        
        if (!userData || (!userData._id && !userData.id)) {
          throw new Error('No se pudo determinar el ID del usuario para obtener clientes');
        }
        
        clientsUserId = userData._id || userData.id;
      }
      
      if (!clientsUserId) {
        throw new Error('No se pudo determinar el ID del usuario para obtener clientes');
      }
      
      // Realizar la solicitud de clientes
<<<<<<< HEAD
      const response = await fetch(`http://localhost:4000/api/cliente/user/${clientsUserId}`, {
=======
      const response = await fetch(`http://179.43.118.101:3000/api/cliente/user/${clientsUserId}`, {
>>>>>>> server
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Verificar respuesta HTTP
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error HTTP ${response.status}: ${errorText}`);
        throw new Error(`Error al cargar clientes (${response.status}): ${response.statusText}`);
      }
      
      // Procesar los datos
      const data = await response.json();
      console.log(`Se obtuvieron ${data.length} clientes`);
      
      // Verificar si hay clientes
      if (data.length === 0) {
        setErrorClientes('No hay clientes asignados. Por favor, contacta con administración para que asignen clientes antes de realizar pedidos.');
        return;
      }
      
      // Filtrar clientes según la sección del usuario si es necesario
      let clientesFiltrados = data;
      if (userSecciones && userSecciones !== 'ambos') {
        // Mostrar solo clientes que coincidan con la sección del usuario
        clientesFiltrados = data.filter(cliente => {
          const servicioClienteEsLimpieza = cliente.servicio?.toLowerCase() === 'limpieza';
          const servicioClienteEsMantenimiento = cliente.servicio?.toLowerCase() === 'mantenimiento';
          
          if (userSecciones === 'limpieza' && servicioClienteEsLimpieza) return true;
          if (userSecciones === 'mantenimiento' && servicioClienteEsMantenimiento) return true;
          return false;
        });
        
        console.log(`Filtrados ${clientesFiltrados.length} clientes por sección ${userSecciones}`);
      }
      
      setClientes(clientesFiltrados);
      
      // Agrupar clientes por servicio
      const agrupados = clientesFiltrados.reduce((acc, cliente) => {
        if (!acc[cliente.servicio]) {
          acc[cliente.servicio] = [];
        }
        acc[cliente.servicio].push(cliente);
        return acc;
      }, {});
      
      setClientesAgrupados(agrupados);
      
      // Si hay al menos un cliente, seleccionarlo por defecto
      if (clientesFiltrados.length > 0) {
        setClienteSeleccionado(clientesFiltrados[0]._id);
        setOrderForm(prev => ({
          ...prev,
          servicio: clientesFiltrados[0].servicio,
          seccionDelServicio: clientesFiltrados[0].seccionDelServicio
        }));
      }
      
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setErrorClientes(error instanceof Error ? error.message : 'Error al cargar clientes');
    } finally {
      setCargandoClientes(false);
    }
  }, [currentUser, userRole, supervisorId, userSecciones]);

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
      
      // Realizar la solicitud con un timeout adecuado
<<<<<<< HEAD
      const response = await fetch(`http://localhost:4000/api/downloads/remito/${createdOrderId}`, {
=======
      const response = await fetch(`http://179.43.118.101:3000/api/downloads/remito/${createdOrderId}`, {
>>>>>>> server
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
    
    // Buscar el item para verificar si es de mantenimiento (sin límite)
    const item = items.find(item => item.id === id);
    if (item && item.category === 'mantenimiento') {
      // No aplicamos límite superior para productos de mantenimiento
      updateQuantity(id, newQuantity);
      return;
    }
    
    // Para otros productos (como limpieza), mantenemos el comportamiento actual
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
  
  // Procesamiento de pedido
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
      let actualUserId = currentUser?._id || currentUser?.id;
      
      // Si es operario, usar el ID del supervisor
      if (userRole === 'operario' && supervisorId) {
        orderUserId = supervisorId;
        console.log('Usando ID de supervisor para el pedido:', orderUserId);
      } else if (currentUser) {
        orderUserId = actualUserId;
        console.log('Usando ID de usuario actual para el pedido:', orderUserId);
      } else {
        throw new Error('No se pudo determinar el ID del usuario para el pedido');
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
      
      if (!clienteObj) {
        throw new Error('Cliente seleccionado no encontrado en la lista de clientes');
      }
      
      // Estado del pedido (pendiente para operarios, aprobado para supervisores)
      const estadoPedido = userRole === 'operario' ? 'pendiente' : 'aprobado';
      
      // Crear objeto de pedido
      const orderData = {
        userId: orderUserId,
        servicio: clienteObj.servicio || orderForm.servicio || "Sin especificar",
        seccionDelServicio: clienteObj.seccionDelServicio || orderForm.seccionDelServicio || "Sin especificar",
        detalle: orderForm.notes || "Pedido creado desde la tienda web",
        productos: productsData,
        estado: estadoPedido,
        // Si es pedido realizado por operario
        metadata: userRole === 'operario' ? {
          creadoPorOperario: true,
          operarioId: actualUserId,
          operarioNombre: currentUser?.nombre || currentUser?.usuario || currentUser?.email,
          fechaCreacion: new Date().toISOString(),
          supervisorId: supervisorId,
          supervisorNombre: supervisorName
        } : undefined
      };
      
      console.log('Enviando pedido:', JSON.stringify(orderData));
      
      // Enviar pedido a la API
<<<<<<< HEAD
      const response = await fetch('http://localhost:4000/api/pedido', {
=======
      const response = await fetch('http://179.43.118.101:3000/api/pedido', {
>>>>>>> server
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
      
      // Log para confirmar que el pedido se creó correctamente
      console.log('Pedido creado exitosamente:', {
        id: pedidoCreado._id,
        asignadoA: orderUserId,
        estado: estadoPedido,
        esOperario: userRole === 'operario'
      });
      
      // Pedido creado correctamente
      setOrderComplete(true);
      clearCart();
      
      // Notificar al usuario
      if (addNotification) {
        if (userRole === 'operario' && supervisorName) {
          addNotification(`Pedido enviado para aprobación de ${supervisorName}`, 'success');
        } else {
          addNotification('Pedido realizado exitosamente', 'success');
        }
      }
    } catch (error) {
      console.error('Error al procesar pedido:', error);
      setOrderError(error instanceof Error ? error.message : 'Hubo un problema al procesar tu pedido. Por favor, intenta nuevamente.');
      
      if (addNotification) {
        addNotification('Error al procesar el pedido', 'error');
      }
    } finally {
      setProcessingOrder(false);
    }
  };
  
  // Vista de carrito vacío
  if (items.length === 0 && !orderComplete) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-8 shop-theme">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-[#1B9C96]/30 backdrop-blur-md rounded-full p-6 mb-6 shadow-lg shadow-[#1B9C96]/20">
              <ShoppingCart className="h-16 w-16 text-[#0D4E4B]" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-[#0D4E4B]">Tu carrito está vacío</h2>
            <p className="text-[#29696B] mb-8 text-center max-w-md">
              Parece que aún no has agregado productos a tu carrito. 
              Explora nuestro catálogo y encuentra lo que necesitas.
            </p>
            <Button 
              className="bg-[#1B9C96] hover:bg-[#139692] text-white shadow-md shadow-[#1B9C96]/20"
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
        <div className="container mx-auto px-4 py-8 shop-theme">
          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-[#1B9C96]/40 to-[#84D6C8]/40 backdrop-blur-md border border-[#1B9C96] p-8 rounded-2xl text-center shadow-lg shadow-[#1B9C96]/10"
            >
              <div className="bg-[#1B9C96] rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#1B9C96]/30">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-[#0D4E4B]">¡Pedido realizado con éxito!</h2>
              
              {userRole === 'operario' ? (
                <p className="text-[#29696B] mb-6">
                  Tu pedido ha sido enviado a tu supervisor para su aprobación. 
                  Te notificaremos cuando sea procesado.
                </p>
              ) : (
                <p className="text-[#29696B] mb-6">
                  Hemos recibido tu solicitud. El equipo de administración revisará tu pedido y te contactará pronto.
                </p>
              )}
              
              {/* Mostrar información del supervisor si es operario */}
              {userRole === 'operario' && supervisorName && (
                <div className="mb-6 p-3 bg-white/10 border border-[#1B9C96] rounded-lg">
                  <p className="flex items-center justify-center text-[#0D4E4B]">
                    <UserCircle2 className="h-4 w-4 mr-2" />
                    Pedido enviado a: <span className="font-bold ml-1">{supervisorName}</span>
                  </p>
                </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center mb-6">
                <Button 
                  className="bg-[#1B9C96] hover:bg-[#139692] text-white shadow-md shadow-[#1B9C96]/20"
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
                  className="border-[#1B9C96] text-[#0D4E4B] hover:bg-[#1B9C96]/20"
                  onClick={() => window.location.href = '/shop'}
                >
                  Volver a la tienda
                </Button>
              </div>
              
              {/* Contador */}
              <div className="bg-white/10 border border-[#1B9C96]/50 rounded-lg p-3 inline-flex items-center">
                <Clock className="h-4 w-4 mr-2 text-[#1B9C96]" />
                <span className="text-[#0D4E4B]">
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
      <div className="container mx-auto px-4 py-8 shop-theme">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center text-[#0D4E4B]">
            <ShoppingCart className="mr-3 h-8 w-8" />
            Tu Carrito
          </h1>
          
          {/* Mostrar banner informativo para operarios */}
          {userRole === 'operario' && supervisorName && (
            <Alert className="mb-6 bg-[#1B9C96]/30 border-[#1B9C96] shadow-md">
              <UserCircle2 className="h-5 w-5 text-[#0D4E4B]" />
              <AlertDescription className="ml-2 text-[#0D4E4B]">
                Estás realizando un pedido como operario. 
                El pedido será enviado a <span className="font-bold">{supervisorName}</span> para su aprobación.
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
                        className="bg-gradient-to-r from-[#1B9C96]/40 to-[#84D6C8]/40 backdrop-blur-sm border border-[#1B9C96] rounded-lg overflow-hidden shadow-md"
                      >
                        <div className="p-4 flex gap-4">
                          {/* Imagen del producto */}
                          <div className="w-20 h-20 bg-white rounded-md overflow-hidden flex-shrink-0 border border-[#1B9C96]/30">
                            <CartItemImage item={item} />
                          </div>
                          
                          {/* Información del producto */}
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <h3 className="font-medium text-lg text-[#0D4E4B]">{item.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#4A7C79] hover:text-[#E74C3C] hover:bg-transparent"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Categoría */}
                            {item.category && (
                              <p className="text-sm text-[#29696B] capitalize">
                                {item.category} {item.subcategory && `- ${item.subcategory}`}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center space-x-1 bg-white rounded-md border border-[#1B9C96]/30">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#0D4E4B]"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  className="w-16 h-8 text-center p-0 border-0 bg-transparent focus:ring-0 text-[#0D4E4B]"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-[#0D4E4B]"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-lg font-semibold text-[#0D4E4B]">${(item.price * item.quantity).toFixed(2)}</div>
                                <div className="text-xs text-[#4A7C79]">${item.price.toFixed(2)} por unidad</div>
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
                    <Card className="bg-gradient-to-r from-[#1B9C96]/40 to-[#84D6C8]/40 backdrop-blur-sm border-[#1B9C96] shadow-md">
                      <CardHeader className="border-b border-[#1B9C96]/50">
                        <CardTitle className="text-[#0D4E4B]">Seleccionar Cliente</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        {cargandoClientes ? (
                          <div className="py-3 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#1B9C96]" />
                          </div>
                        ) : errorClientes ? (
                          <Alert className="bg-[#E74C3C]/10 border-[#E74C3C]">
                            <AlertCircle className="h-4 w-4 text-[#E74C3C]" />
                            <AlertDescription className="ml-2 text-[#E74C3C]">
                              {errorClientes}
                            </AlertDescription>
                          </Alert>
                        ) : clientes.length === 0 ? (
                          <div>
                            <Alert className="bg-[#F2A516]/10 border-2 border-[#F2A516] mb-4">
                              <AlertTriangle className="h-4 w-4 text-[#F2A516]" />
                              <AlertDescription className="ml-2 text-[#0D4E4B] font-medium">
                                No hay clientes asignados. Por favor, contacta con administración para que te asignen clientes antes de realizar pedidos.
                              </AlertDescription>
                            </Alert>
                            
                            <div className="flex justify-center mt-6">
                              <Button 
                                onClick={() => window.location.href = '/shop'}
                                className="bg-[#1B9C96] hover:bg-[#139692] text-white"
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a la tienda
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="clienteSelector" className="text-[#0D4E4B] font-medium flex items-center">
                              Cliente Asociado
                              {cargandoClientes && <Loader2 className="ml-2 h-3 w-3 animate-spin text-[#1B9C96]" />}
                            </Label>
                            
                            {/* Indicador de operario/supervisor */}
                            {userRole === 'operario' && supervisorName && (
                              <div className="text-xs text-[#29696B] mb-2 flex items-center">
                                <UserCircle2 className="h-3 w-3 mr-1 text-[#1B9C96]" />
                                Mostrando clientes de: {supervisorName}
                              </div>
                            )}
                            
                            <div className="relative mt-1">
                              <Select 
                                value={clienteSeleccionado || ""} 
                                onValueChange={handleClienteChange}
                                disabled={cargandoClientes}
                              >
                                <SelectTrigger 
                                  className="w-full bg-white border-2 border-[#1B9C96] rounded-md text-[#0D4E4B]"
                                >
                                  <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80 overflow-y-auto bg-white border-[#1B9C96]">
                                  {Object.entries(clientesAgrupados).map(([servicio, clientesServicio]) => (
                                    <div key={servicio} className="px-1 py-1">
                                      {/* Encabezado de grupo de servicio */}
                                      <div className="flex items-center px-2 py-1.5 text-xs uppercase tracking-wider font-semibold bg-[#CFF2E4] text-[#0D4E4B] rounded mb-1">
                                        <Building className="h-3 w-3 mr-2" />
                                        {servicio}
                                      </div>
                                      
                                      {/* Secciones del servicio */}
                                      <div className="pl-2">
                                        {clientesServicio.map(cliente => (
                                          <SelectItem 
                                            key={cliente._id} 
                                            value={cliente._id}
                                            className="focus:bg-[#CFF2E4] data-[state=checked]:bg-[#1B9C96] data-[state=checked]:text-white"
                                          >
                                            <div className="flex items-center">
                                              {cliente.seccionDelServicio ? (
                                                <>
                                                  <MapPin className="h-3 w-3 mr-2 text-[#29696B]" />
                                                  <span>{cliente.seccionDelServicio}</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Check className="h-3 w-3 mr-2 text-[#29696B]" />
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
                                className="mt-4 p-3 rounded-md bg-[#CFF2E4]/40 border border-[#1B9C96]/50 backdrop-blur-sm"
                              >
                                <div className="text-sm text-[#0D4E4B]">
                                  <p className="flex items-center">
                                    <Building className="w-4 h-4 mr-2 text-[#1B9C96]" />
                                    <span className="font-medium">Servicio:</span>
                                    <span className="ml-1">{orderForm.servicio}</span>
                                  </p>
                                  {orderForm.seccionDelServicio && (
                                    <p className="flex items-center mt-1">
                                      <MapPin className="w-4 h-4 mr-2 text-[#1B9C96]" />
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
                    
                    <Card className="bg-gradient-to-r from-[#1B9C96]/40 to-[#84D6C8]/40 backdrop-blur-sm border-[#1B9C96] shadow-md">
                      <CardHeader className="border-b border-[#1B9C96]/50">
                        <CardTitle className="text-[#0D4E4B]">Información del pedido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div>
                          <Label htmlFor="notes" className="text-[#0D4E4B]">Notas adicionales</Label>
                          <Textarea
                            id="notes"
                            placeholder="Instrucciones especiales, ubicación de entrega, etc."
                            className="bg-white border-[#1B9C96] mt-1 text-[#0D4E4B] placeholder:text-[#4A7C79]"
                            value={orderForm.notes}
                            onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-r from-[#1B9C96]/40 to-[#84D6C8]/40 backdrop-blur-sm border-[#1B9C96] shadow-md">
                      <CardHeader className="border-b border-[#1B9C96]/50">
                        <CardTitle className="text-[#0D4E4B]">Resumen del pedido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-6 overflow-y-auto max-h-60">
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between py-1 text-[#0D4E4B]">
                            <span>
                              {item.name} <span className="text-[#29696B]">x{item.quantity}</span>
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <Separator className="bg-[#1B9C96]/30 my-2" />
                        <div className="flex justify-between font-bold text-[#0D4E4B]">
                          <span>Total:</span>
                          <span>${totalPrice.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {orderError && (
                      <Alert className="bg-[#E74C3C]/10 border-2 border-[#E74C3C] shadow-md">
                        <AlertCircle className="h-5 w-5 text-[#E74C3C]" />
                        <AlertDescription className="ml-2 text-[#E74C3C] font-medium">{orderError}</AlertDescription>
                      </Alert>
                    )}
                  </motion.div>
                )}
              </div>
              
              {items.length > 0 && checkoutStep === 1 && (
                <div className="mt-4 flex justify-between">
                  <Button 
                    variant="outline" 
                    className="border-[#E74C3C] text-[#E74C3C] hover:bg-[#E74C3C]/10 hover:text-[#E74C3C]"
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
                    className="border-[#1B9C96] text-[#0D4E4B] hover:bg-[#1B9C96]/20"
                    onClick={() => setCheckoutStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al carrito
                  </Button>
                  
                  <Button 
                    onClick={processOrder}
                    className="bg-[#1B9C96] hover:bg-[#139692] text-white shadow-md shadow-[#1B9C96]/20"
                    disabled={processingOrder}
                  >
                    {processingOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : userRole === 'operario' ? (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Enviar para aprobación
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
                <Card className="bg-gradient-to-br from-[#1B9C96]/60 to-[#84D6C8]/60 backdrop-blur-md border border-[#1B9C96] shadow-lg shadow-[#1B9C96]/10">
                  <CardHeader className="border-b border-[#1B9C96]/50">
                    <CardTitle className="text-[#0D4E4B]">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex justify-between text-sm text-[#0D4E4B]">
                      <span>Subtotal:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-[#0D4E4B]">
                      <span>Productos:</span>
                      <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                    </div>
                    
                    {/* Mostrar información del supervisor para operarios */}
                    {userRole === 'operario' && supervisorName && (
                      <div className="bg-white/20 rounded-md p-2 text-xs text-[#0D4E4B] border border-[#1B9C96]/50">
                        <div className="flex items-center mb-1 text-[#1B9C96]">
                          <UserCircle2 className="h-3 w-3 mr-1" />
                          <span className="font-medium">Información de pedido</span>
                        </div>
                        <p>Supervisor: <span className="font-medium">{supervisorName}</span></p>
                        <p className="text-[#29696B] text-[10px] mt-1">
                          El pedido requiere aprobación
                        </p>
                      </div>
                    )}
                    
                    <Separator className="bg-[#1B9C96]/30" />
                    
                    <div className="flex justify-between font-semibold text-lg text-[#0D4E4B]">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    {checkoutStep === 1 ? (
                      <Button 
                        onClick={() => setCheckoutStep(2)}
                        className="w-full bg-[#1B9C96] hover:bg-[#139692] text-white shadow-md shadow-[#1B9C96]/20"
                      >
                        Proceder a confirmar la orden
                      </Button>
                    ) : (
                      <div className="w-full text-center text-sm text-[#0D4E4B]">
                        <p>Revisa tu pedido y completa la información requerida.</p>
                      </div>
                    )}
                  </CardFooter>
                </Card>
                
                <div className="mt-4 p-4 bg-gradient-to-br from-[#1B9C96]/20 to-[#84D6C8]/20 backdrop-blur-sm rounded-lg border border-[#1B9C96] shadow-md">
                  <h3 className="flex items-center text-sm font-medium mb-2 text-[#0D4E4B]">
                    <Check className="text-[#1B9C96] mr-2 h-4 w-4" />
                    Política de pedidos
                  </h3>
                  {userRole === 'operario' ? (
                    <p className="text-xs text-[#29696B]">
                      Los pedidos realizados por operarios requieren aprobación del supervisor 
                      antes de ser procesados.
                    </p>
                  ) : (
                    <p className="text-xs text-[#29696B]">
                      Los pedidos realizados están sujetos a revisión y aprobación por el equipo administrativo.
                      Una vez confirmado, se coordinará la entrega de los productos.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};