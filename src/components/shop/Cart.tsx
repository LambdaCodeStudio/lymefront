import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCartContext } from '@/providers/CartProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Check, CreditCard, Loader2, Building,
  MapPin, AlertCircle, AlertTriangle, Clock, UserCircle2, PackageOpen, Info,
  ChevronDown, ChevronUp, RefreshCw, X, Package, Search
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';

// API base URL - Extraído para fácil configuración
const API_BASE_URL = 'http://localhost:3000';

// Interfaces para la estructura jerárquica de clientes
interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion?: string;
}

interface SubServicio {
  _id: string;
  nombre: string;
  descripcion?: string;
  supervisorId?: string[] | {
    _id: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    usuario?: string;
  }[];
  subUbicaciones: SubUbicacion[];
  operarios?: string[] | {
    _id: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    usuario?: string;
  }[];
  isSelected?: boolean; 
}

interface Cliente {
  _id: string;
  nombre: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string[] | {
    _id: string;
    email?: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
  }[];
  subServicios: SubServicio[];
  direccion?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
  isExpanded?: boolean;
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
  supervisorId?: string;
  createdBy?: string | {
    _id?: string;
    id?: string;
    email?: string;
    usuario?: string;
    nombre?: string;
    apellido?: string;
  };
}

// Interface para los items del carrito con soporte para combos
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  subcategory?: string;
  image?: string;
  imageUrl?: string;
  isCombo?: boolean;
  comboItems?: Array<{
    nombre?: string;
    name?: string;
    cantidad?: number;
    quantity?: number;
    productoId?: any;
  }>;
  itemsCombo?: Array<{
    nombre?: string;
    name?: string;
    cantidad?: number;
    quantity?: number;
    productoId?: any;
  }>;
}

// Interface para subservicios asignados a un operario
interface SubservicioAsignado {
  clienteId: string;
  subServicioId: string;
  nombreCliente: string;
  nombreSubServicio: string;
}

// Componente CartItemImage - Optimizado con memoización
const CartItemImage = React.memo(({ item }: { item: CartItem }) => {
  const [imageError, setImageError] = useState(false);

  // Función para obtener la URL de la imagen
  const getImageUrl = () => {
    if (item.imageUrl) return item.imageUrl;
    if (item.id) return `/images/products/${item.id}.webp`;
    return '/lyme.png';
  };

  // Manejar errores de carga de imagen
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    const target = e.currentTarget;
    target.src = "/lyme.png";
    target.className = "w-full h-full object-contain p-1";
    target.alt = "Logo Lyme";
  };

  if (imageError || (!item.image && !item.id && !item.imageUrl)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <img
          src="/lyme.png"
          alt="Logo Lyme"
          className="w-full h-full object-contain p-1"
        />
      </div>
    );
  }

  return (
    <img
      src={getImageUrl()}
      alt={item.name || 'Producto'}
      className="w-full h-full object-contain"
      onError={handleImgError}
    />
  );
});

CartItemImage.displayName = 'CartItemImage';

// Componente ComboDetails - Optimizado con memoización
const ComboDetails = React.memo(({ item }: { item: CartItem }) => {
  const [showComboItems, setShowComboItems] = useState(false);
  const isCombo = item.isCombo;
  const comboItems = 
    (item.comboItems && item.comboItems.length > 0) ? item.comboItems : 
    (item.itemsCombo && item.itemsCombo.length > 0) ? item.itemsCombo : [];

  if (!isCombo || comboItems.length === 0) {
    return null;
  }

  const processedItems = comboItems.map(comboItem => {
    let nombre = '';
    let cantidad = 0;

    if (typeof comboItem === 'object') {
      if (comboItem.nombre) {
        nombre = comboItem.nombre;
      } else if (comboItem.name) {
        nombre = comboItem.name;
      } else if (comboItem.productoId) {
        if (typeof comboItem.productoId === 'object') {
          nombre = comboItem.productoId.nombre || comboItem.productoId.name || 'Producto';
        } else {
          nombre = 'Producto';
        }
      }
      cantidad = comboItem.cantidad || comboItem.quantity || 1;
    } else {
      nombre = 'Producto';
      cantidad = 1;
    }

    return { nombre, cantidad };
  });

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 py-0 text-xs text-[#3a8fb7] hover:bg-[#3a8fb7]/20 w-full flex justify-between items-center"
        onClick={(e) => {
          e.stopPropagation();
          setShowComboItems(!showComboItems);
        }}
      >
        <span className="flex items-center">
          <Package className="h-3 w-3 mr-1" />
          {showComboItems ? 'Ocultar productos del combo' : 'Ver productos del combo'}
        </span>
        {showComboItems ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      
      {showComboItems && (
        <div className="mt-1 text-xs text-[#4a4a4a] bg-[#d4f1f9]/80 rounded-md p-2 space-y-1 border border-[#3a8fb7]/30 shadow-sm">
          <div className="font-medium mb-1 flex items-center justify-between">
            <div className="flex items-center">
              <PackageOpen size={12} className="mr-1 text-[#3a8fb7]" />
              <span className="text-[#3a8fb7]">Este combo incluye:</span>
            </div>
            <Badge className="bg-[#3a8fb7] text-white text-[10px]">
              {processedItems.length} productos
            </Badge>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3a8fb7]/40 scrollbar-track-transparent">
            {processedItems.map((comboItem, index) => (
              <li key={index} className="flex justify-between border-b border-[#3a8fb7]/10 pb-1 last:border-0">
                <span className="truncate pr-2 font-medium">{comboItem.nombre}</span>
                <span className="text-[#3a8fb7] font-bold">x{comboItem.cantidad}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

ComboDetails.displayName = 'ComboDetails';

// Componente SearchInput - Reutilizable
const SearchInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className = "", 
  disabled = false,
  onClear
}: {
  value: string,
  onChange: (value: string) => void,
  placeholder: string,
  className?: string,
  disabled?: boolean,
  onClear: () => void
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[#3a8fb7]">
        <Search className="h-3 w-3 md:h-4 md:w-4" />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 bg-white/80 border-[#3a8fb7] text-xs md:text-sm placeholder:text-[#3a8fb7]/60 h-8 md:h-9"
        disabled={disabled}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-[#4a4a4a] hover:text-[#F44336] hover:bg-transparent"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

// Componente SelectWithClear - Reutilizable
const SelectWithClear = ({
  value,
  onValueChange,
  placeholder,
  disabled,
  children,
  className,
  canClear = true
}: {
  value: string, 
  onValueChange: (value: string) => void,
  placeholder: string,
  disabled?: boolean,
  children: React.ReactNode,
  className?: string,
  canClear?: boolean
}) => {
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
  };

  return (
    <div className="relative">
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={`w-full bg-white border-2 border-[#3a8fb7] rounded-md text-[#3a8fb7] pr-8 ${className}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto bg-white border-[#3a8fb7]">
          {children}
        </SelectContent>
      </Select>

      {canClear && value && (
        <Button
          type="button"
          variant="ghost"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-[#4a4a4a] hover:text-[#F44336] hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

// Hook para notificaciones con manejo seguro
const useNotificationSafe = () => {
  try {
    const { useNotification } = require('@/context/NotificationContext');
    return useNotification();
  } catch (error) {
    return {
      addNotification: (message: string, type: string) => {
        console.log(`Notificación (${type}): ${message}`);
      }
    };
  }
};

// Hook personalizado para la API
const useApi = () => {
  const getToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
    }
    return token;
  }, []);

  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const statusCode = response.status;
        let errorMessage = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.mensaje || errorData.message || `Error (${statusCode})`;
        } catch (e) {
          errorMessage = `Error del servidor (${statusCode})`;
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en API (${endpoint}):`, error);
      throw error;
    }
  }, []);

  return { fetchWithAuth };
};

// Hook personalizado para la gestión de usuarios
const useUser = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const { fetchWithAuth } = useApi();

  // Función para validar que un ID sea válido para la aplicación
  const isValidMongoId = useCallback((id: string | null | undefined): boolean => {
    if (!id) return false;
    
    // Extraer el ID si está en formato "$oid"
    if (typeof id === 'string' && id.includes('$oid')) {
      try {
        const parsed = JSON.parse(id);
        if (parsed && parsed.$oid) {
          id = parsed.$oid;
        }
      } catch (e) {
        // Si no se puede parsear, seguimos con la validación normal
      }
    }
    
    // Validamos el formato estándar de MongoDB (24 caracteres hexadecimales)
    // o el formato alternativo de 32 caracteres
    return /^[0-9a-fA-F]{24}$/.test(id) || /^[0-9a-fA-F]{32}$/.test(id);
  }, []);

  // Función optimizada para obtener información del usuario actual
  const fetchCurrentUser = useCallback(async () => {
    try {
      // Recuperar información desde localStorage
      const storedRole = localStorage.getItem('userRole');
      const storedUserId = localStorage.getItem('userId');
      const storedSecciones = localStorage.getItem('userSecciones');
      
      // Establecer estados con datos del localStorage inmediatamente
      if (storedRole) setUserRole(storedRole);
      if (storedSecciones) setUserSecciones(storedSecciones);
      
      if (storedUserId) {
        const basicUser = {
          _id: storedUserId,
          id: storedUserId,
          role: storedRole || '',
          secciones: storedSecciones || ''
        };
        
        setCurrentUser(basicUser);
      }
      
      // Obtener datos frescos de la API
      try {
        const userData = await fetchWithAuth('/api/auth/me');
        
        // El nuevo backend devuelve la estructura {success: true, user: {...}}
        const user = userData && userData.success && userData.user ? userData.user : userData;
        
        // Asegurarse de que el ID esté disponible en el formato correcto
        if (user._id) {
          user.id = user._id; // Compatibilidad
        } else if (user.id) {
          user._id = user.id; // Compatibilidad
        }
        
        setCurrentUser(user);
        
        // Guardar datos frescos en localStorage
        if (user._id) {
          localStorage.setItem('userId', user._id.toString());
        }
        
        if (user.role) {
          localStorage.setItem('userRole', user.role);
          setUserRole(user.role);
        }
        
        if (user.secciones) {
          localStorage.setItem('userSecciones', user.secciones);
          setUserSecciones(user.secciones);
        }
        
        return user;
      } catch (error) {
        console.warn('Error al obtener información de API, usando localStorage:', error);
        // Devolver datos de localStorage
        return storedUserId ? { _id: storedUserId, role: storedRole } : null;
      }
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      
      // Si hay datos en localStorage, seguir usándolos a pesar del error
      const storedUserId = localStorage.getItem('userId');
      const storedRole = localStorage.getItem('userRole');
      
      if (storedUserId && storedRole) {
        return { _id: storedUserId, role: storedRole };
      }
      
      throw error;
    }
  }, [fetchWithAuth]);

  return { currentUser, userRole, userSecciones, isValidMongoId, fetchCurrentUser, setCurrentUser, setUserRole, setUserSecciones };
};

export const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCartContext();
  const { addNotification } = useNotificationSafe();
  const { fetchWithAuth } = useApi();
  const { currentUser, userRole, userSecciones, isValidMongoId, fetchCurrentUser } = useUser();
  
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [orderComplete, setOrderComplete] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [orderData, setOrderData] = useState<any>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [refreshingSupervisor, setRefreshingSupervisor] = useState<boolean>(false);
  const [formValid, setFormValid] = useState<boolean>(false);

  // Estados para clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [clientesAgrupados, setClientesAgrupados] = useState<Record<string, Cliente[]>>({});
  const [subServicioSeleccionado, setSubServicioSeleccionado] = useState<string | null>(null);
  const [subUbicacionSeleccionada, setSubUbicacionSeleccionada] = useState<string | null>(null);
  const [subServiciosDisponibles, setSubServiciosDisponibles] = useState<SubServicio[]>([]);
  const [subUbicacionesDisponibles, setSubUbicacionesDisponibles] = useState<SubUbicacion[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState<boolean>(false);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);
  
  // Estado para subservicios asignados al operario
  const [subserviciosAsignados, setSubserviciosAsignados] = useState<SubservicioAsignado[]>([]);

  // Estados para búsquedas
  const [clienteSearch, setClienteSearch] = useState<string>('');
  const [subServicioSearch, setSubServicioSearch] = useState<string>('');
  const [subUbicacionSearch, setSubUbicacionSearch] = useState<string>('');

  // Estado para formulario de checkout
  const [orderForm, setOrderForm] = useState({
    notes: '',
    servicio: '',
    seccionDelServicio: '',
    nombreSubServicio: '',
    nombreSubUbicacion: ''
  });

  // Estados para manejo de supervisor
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);
  

  // Ref para controlar si ya se inicializó
  const initializedRef = useRef(false);

  // Filtrar clientes basados en búsqueda - Optimizado con useMemo
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientesAgrupados;
    
    const resultado: Record<string, Cliente[]> = {};
    const searchLower = clienteSearch.toLowerCase();
    
    Object.entries(clientesAgrupados).forEach(([servicio, clientesServicio]) => {
      const clientesFiltrados = clientesServicio.filter(cliente => 
        cliente.nombre.toLowerCase().includes(searchLower)
      );
      
      if (clientesFiltrados.length > 0) {
        resultado[servicio] = clientesFiltrados;
      }
    });
    
    return resultado;
  }, [clientesAgrupados, clienteSearch]);

  // Filtrar subservicios basados en búsqueda - Optimizado con useMemo
  const subServiciosFiltrados = useMemo(() => {
    if (!subServicioSearch.trim()) return subServiciosDisponibles;
    
    const searchLower = subServicioSearch.toLowerCase();
    return subServiciosDisponibles.filter(subServicio => 
      subServicio.nombre.toLowerCase().includes(searchLower)
    );
  }, [subServiciosDisponibles, subServicioSearch]);

  // Filtrar sububicaciones basados en búsqueda - Optimizado con useMemo
  const subUbicacionesFiltradas = useMemo(() => {
    if (!subUbicacionSearch.trim()) return subUbicacionesDisponibles;
    
    const searchLower = subUbicacionSearch.toLowerCase();
    return subUbicacionesDisponibles.filter(subUbicacion => 
      subUbicacion.nombre.toLowerCase().includes(searchLower)
    );
  }, [subUbicacionesDisponibles, subUbicacionSearch]);

  // Validación del formulario - Optimizada con useCallback
  const validarFormulario = useCallback(() => {
    const clienteValido = clienteSeleccionado || localStorage.getItem('lastClienteSeleccionado');
    const subservicioValido = subServicioSeleccionado || localStorage.getItem('lastSubServicioSeleccionado');
    
    if (clienteValido && subservicioValido && items.length > 0) {
      setFormValid(true);
    } else {
      setFormValid(false);
    }
  }, [clienteSeleccionado, subServicioSeleccionado, items]);

  // Actualizar la validación del formulario cuando cambien los valores relevantes
  useEffect(() => {
    validarFormulario();
  }, [clienteSeleccionado, subServicioSeleccionado, items, validarFormulario]);

  // Inicializar carrito al montar el componente
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      // Verificar si hay userID en localStorage y si es válido
      const storedUserId = localStorage.getItem('userId');
      
      initializeCart();
    }
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

  /**
   * Método optimizado para inicializar el carrito con filtrado por roles
   */
  const initializeCart = async () => {
    try {
      console.log('Inicializando carrito...');
      setCargandoClientes(true);
      setErrorClientes(null);
      
      // Obtener información del usuario
      const userData = await fetchCurrentUser();
      
      // Verificar si tenemos un usuario con rol definido
      const role = userRole || userData?.role || localStorage.getItem('userRole');
      
      if (!role) {
        console.error('No se pudo determinar el rol del usuario');
        setErrorClientes('No se pudo determinar tu rol. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      // Verificar que tenemos un ID de usuario válido
      const userId = currentUser?._id || currentUser?.id || localStorage.getItem('userId');
      if (!userId || !isValidMongoId(userId)) {
        console.error('No se encontró un ID de usuario válido');
        setErrorClientes('No se pudo determinar tu identidad. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      console.log(`Inicializando flujo para rol: ${role} con userId: ${userId}`);
      
      try {
        switch (role) {
          case 'operario':
            // Para operarios: obtener supervisor y subservicios asignados
            if (currentUser) {
              await fetchSupervisorInfo(currentUser);
            }
            await fetchSubserviciosAsignadosOperario(userId); // Pasar el userId validado
            break;
            
          case 'supervisor':
            // Para supervisores: obtener sólo clientes y subservicios asignados
            await fetchClientesAsignadosSupervisor();
            break;
            
          case 'admin':
          case 'supervisor_de_supervisores':
          default:
            // Para admin y otros roles: obtener todos los clientes
            await fetchTodosLosClientes();
            break;
        }
      } catch (fetchError: any) {
        console.error('Error obteniendo datos para el rol:', fetchError);
        setErrorClientes(`Error cargando datos: ${fetchError.message}`);
        alert('Error cargando datos. Por favor, recarga la página o contacta con soporte técnico.');
      }
    } catch (error: any) {
      console.error('Error inicializando carrito:', error);
      setErrorClientes(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setCargandoClientes(false);
    }
  };

  /**
   * Función para obtener clientes y subservicios asignados a un supervisor
   */
  const fetchClientesAsignadosSupervisor = async () => {
    try {
      setErrorClientes(null);
      // Intentamos obtener el ID de todas las fuentes posibles
      const userId = currentUser?._id || currentUser?.id || localStorage.getItem('userId');
      
      // Si no hay ID, mostramos un mensaje claro
      if (!userId) {
        setErrorClientes('No se pudo determinar tu identificación. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      // Validamos que el userId tenga un formato válido
      if (!isValidMongoId(userId)) {
        console.warn(`ID de usuario con formato no válido: ${userId}`);
        setErrorClientes('Tu sesión parece estar desactualizada. Por favor, cierra sesión e inicia nuevamente.');
        return;
      }
      
      console.log(`Obteniendo clientes asignados al supervisor: ${userId}`);
      
      // Usar la API optimizada que filtra clientes por supervisorId en el backend
      const clientesData = await fetchWithAuth(`/api/cliente/supervisor/${userId}`);
      
      console.log(`Recibidos ${Array.isArray(clientesData) ? clientesData.length : 'N/A'} clientes del supervisor`);
      
      if (!clientesData || (Array.isArray(clientesData) && clientesData.length === 0)) {
        setErrorClientes('No tienes clientes asignados como supervisor.');
        return;
      }
      
      // Procesar los clientes obtenidos
      processClientesData(clientesData);
      
    } catch (error: any) {
      console.error('Error al obtener clientes del supervisor:', error);
      setErrorClientes(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  /**
   * Función para obtener información del supervisor asignado al operario
   */
  // Esta función se redefine más adelante con una implementación mejorada

  /**
   * Función para obtener subservicios asignados a un operario (optimizada)
   */
  const fetchSubserviciosAsignadosOperario = async (userId: string) => { // El parámetro userId se mantiene por compatibilidad
    try {
      setErrorClientes(null);
      
      console.log(`Solicitando subservicios asignados al operario: ${userId}`);
      
      // En lugar de usar /mis-subservicios que depende del token, usamos la ruta directa
      // que acepta un ID explícito como parámetro
      const subserviciosData = await fetchWithAuth(`/api/cliente/subservicios/operario/${userId}`); 
      
      console.log(`Recibidos ${Array.isArray(subserviciosData) ? subserviciosData.length : 'N/A'} subservicios del operario`);
      
      if (!subserviciosData || (Array.isArray(subserviciosData) && subserviciosData.length === 0)) {
        setErrorClientes('No tienes subservicios asignados. Contacta con tu supervisor.');
        return;
      }
      
      // Construir estructura de clientes a partir de subservicios asignados
      const clientesMap = new Map<string, Cliente>();
      setSubserviciosAsignados([]);
      
      // Procesar cada asignación
      subserviciosData.forEach((entry: any) => {
        if (!entry.clienteId || (!entry.nombreCliente && !entry.nombre)) {
          console.warn('Datos de asignación incompletos:', entry);
          return;
        }
        
        const clienteId = entry.clienteId;
        const nombreCliente = entry.nombreCliente || entry.nombre || 'Cliente sin nombre';
        
        // Crear o actualizar cliente en el mapa
        if (!clientesMap.has(clienteId)) {
          clientesMap.set(clienteId, {
            _id: clienteId,
            nombre: nombreCliente,
            servicio: entry.servicio || nombreCliente,
            seccionDelServicio: entry.seccionDelServicio || '',
            userId: [],
            subServicios: [],
            isExpanded: true
          });
        }
        
        // Añadir subservicios al cliente
        const subServiciosArray = Array.isArray(entry.subServicios) ? entry.subServicios : 
                              entry.subservicios && Array.isArray(entry.subservicios) ? entry.subservicios : [];
        
        if (subServiciosArray.length > 0) {
          const clienteObj = clientesMap.get(clienteId)!;
          
          subServiciosArray.forEach((subserv: any) => {
            if (!subserv || !subserv._id) {
              console.warn('Subservicio inválido:', subserv);
              return;
            }
            
            // Verificar que el subservicio no esté ya añadido
            const subservExists = clienteObj.subServicios.some(s => s._id === subserv._id);
            if (!subservExists) {
              clienteObj.subServicios.push({
                _id: subserv._id,
                nombre: subserv.nombre || 'Subservicio sin nombre',
                descripcion: subserv.descripcion || '',
                supervisorId: subserv.supervisorId || undefined,
                subUbicaciones: Array.isArray(subserv.subUbicaciones) ? subserv.subUbicaciones : [],
                operarios: Array.isArray(subserv.operarios) ? subserv.operarios : [],
                isSelected: true // Marcar como seleccionado para la UI
              });
              
              // Añadir a la lista de asignaciones
              setSubserviciosAsignados(prev => [...prev, {
                clienteId: clienteId,
                subServicioId: subserv._id,
                nombreCliente: nombreCliente,
                nombreSubServicio: subserv.nombre || 'Subservicio sin nombre'
              }]);
            }
          });
        }
      });
      
      // Convertir el mapa a array de clientes
      const clientesArray = Array.from(clientesMap.values());
      console.log(`Construidos ${clientesArray.length} clientes a partir de subservicios asignados`);
      
      if (clientesArray.length === 0) {
        setErrorClientes('No se encontraron clientes con subservicios asignados para tu usuario.');
        return;
      }
      
      // Procesar los clientes construidos
      processClientesData(clientesArray);
      
    } catch (error: any) {
      console.error('Error al obtener subservicios asignados al operario:', error);
      setErrorClientes(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  /**
   * Función para obtener todos los clientes (admin y supervisor de supervisores)
   */
  const fetchTodosLosClientes = async () => {
    try {
      setErrorClientes(null);
      
      console.log('Obteniendo todos los clientes (admin/supervisor de supervisores)');
      
      const clientesData = await fetchWithAuth('/api/cliente');
      
      console.log(`Recibidos ${Array.isArray(clientesData) ? clientesData.length : 'N/A'} clientes totales`);
      
      if (!clientesData || (Array.isArray(clientesData) && clientesData.length === 0)) {
        setErrorClientes('No hay clientes disponibles en el sistema.');
        return;
      }
      
      // Procesar los clientes obtenidos (sin filtrado adicional)
      processClientesData(clientesData);
      
    } catch (error: any) {
      console.error('Error al obtener todos los clientes:', error);
      setErrorClientes(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  // Función optimizada para obtener información del supervisor
  /**
   * Función optimizada para obtener información del supervisor
   */
  const fetchSupervisorInfo = async (userData: User) => {
    try {
      setRefreshingSupervisor(true);
      console.log('Obteniendo información del supervisor para:', userData);

      // Verificar si el usuario tiene un supervisorId asignado
      const supervisorIdStr = typeof userData.supervisorId === 'string' ? userData.supervisorId : null;
      
      if (supervisorIdStr) {
        console.log('SupervisorId encontrado:', supervisorIdStr);

        // Verificar si el ID es válido
        if (!isValidMongoId(supervisorIdStr)) {
          console.warn('ID de supervisor no válido:', supervisorIdStr);
          setSupervisorName('Supervisor desconocido');
          setSupervisorId(null);
          return null;
        }
        
        // Usar el endpoint de usuarios para obtener información del supervisor
        try {
          // Llamada directa a la API de usuarios con el ID del supervisor
          const supervisorData = await fetchWithAuth(`/api/usuarios/${supervisorIdStr}`);
          
          if (supervisorData) {
            console.log('Datos del supervisor obtenidos:', supervisorData);
            
            // Construir el nombre para mostrar
            const displayName =
              supervisorData.nombre 
                ? `${supervisorData.nombre} ${supervisorData.apellido || ''}`.trim()
                : supervisorData.usuario || supervisorData.email || 'Supervisor';

            console.log('Nombre del supervisor establecido:', displayName);
            
            setSupervisorName(displayName);
            setSupervisorId(supervisorIdStr);
            return supervisorData;
          }
        } catch (error) {
          console.error('Error al obtener información del supervisor:', error);
        }
      } else {
        console.warn('Usuario no tiene supervisorId asignado');
      }

      // Si llegamos aquí, no se encontró información del supervisor
      setSupervisorName('Supervisor');
      setSupervisorId(null);
      return null;
    } catch (error) {
      console.error('Error al obtener información del supervisor:', error);
      setSupervisorName('Supervisor');
      setSupervisorId(null);
      return null;
    } finally {
      setRefreshingSupervisor(false);
    }
  };

  /**
   * Función para refrescar la información del supervisor
   */
  const handleRefreshSupervisor = useCallback(async () => {
    if (!currentUser || userRole !== 'operario') return;

    try {
      setRefreshingSupervisor(true);
      setErrorClientes(null);

      await fetchSupervisorInfo(currentUser);
      await fetchSubserviciosAsignadosOperario(currentUser._id); // Pasar el userId validado

      addNotification('Información actualizada correctamente', 'success');
    } catch (error: any) {
      console.error('Error al actualizar información:', error);
      setErrorClientes('Error al actualizar la información. Por favor, intenta nuevamente.');
      addNotification('Error al actualizar la información', 'error');
    } finally {
      setRefreshingSupervisor(false);
    }
  }, [fetchCurrentUser, addNotification, currentUser, userRole, fetchSubserviciosAsignadosOperario]);

  /**
   * Versión optimizada de processClientesData que maneja correctamente
   * el filtrado por secciones y la preselección de elementos
   */
  const processClientesData = (data: Cliente[]) => {
    if (!data || data.length === 0) {
      console.warn('No hay clientes disponibles para procesar');
      setErrorClientes('No hay clientes disponibles. Por favor, contacta con administración.');
      return;
    }

    console.log(`Procesando ${data.length} clientes`);

    // Filtrar clientes según la sección del usuario si es necesario
    let clientesFiltrados = data;
    if (userSecciones && userSecciones !== 'ambos') {
      clientesFiltrados = data.filter(cliente => {
        const categoriaCliente = (cliente.servicio || cliente.nombre || '').toLowerCase();

        if (categoriaCliente.includes('limpieza') && userSecciones === 'limpieza') return true;
        if (categoriaCliente.includes('mantenimiento') && userSecciones === 'mantenimiento') return true;

        return !categoriaCliente.includes('limpieza') && !categoriaCliente.includes('mantenimiento');
      });

      console.log(`Filtrados ${clientesFiltrados.length} clientes por sección ${userSecciones}`);
    }

    // Verificar si tenemos clientes después del filtrado
    if (clientesFiltrados.length === 0) {
      setErrorClientes(`No hay clientes disponibles para la sección ${userSecciones}. Contacte con administración.`);
      return;
    }

    // Asegurar estructuras de datos correctas
    clientesFiltrados = clientesFiltrados.map(cliente => {
      // Validar subServicios
      if (!cliente.subServicios) {
        cliente.subServicios = [];
      } else if (!Array.isArray(cliente.subServicios)) {
        console.warn(`Cliente ${cliente._id}: subServicios en formato incorrecto`);
        cliente.subServicios = [];
      }
      
      // Asegurar campos requeridos
      if (!cliente.nombre) cliente.nombre = 'Cliente sin nombre';
      if (!cliente.servicio) cliente.servicio = cliente.nombre;
      
      return cliente;
    });

    // Actualizar estado con los clientes filtrados
    setClientes(clientesFiltrados);

    // Agrupar clientes por servicio
    const agrupados = clientesFiltrados.reduce((acc, cliente) => {
      const servicioKey = cliente.servicio || cliente.nombre || 'Sin categoría';
      if (!acc[servicioKey]) {
        acc[servicioKey] = [];
      }
      acc[servicioKey].push(cliente);
      return acc;
    }, {} as Record<string, Cliente[]>);

    // Ordenar servicios
    const serviciosOrdenados = Object.keys(agrupados).sort((a, b) => {
      const orden = ['limpieza', 'mantenimiento', 'Sin categoría'];
      const idxA = orden.findIndex(o => a.toLowerCase().includes(o));
      const idxB = orden.findIndex(o => b.toLowerCase().includes(o));

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Crear objeto ordenado
    const agrupadosOrdenados: Record<string, Cliente[]> = {};
    serviciosOrdenados.forEach(servicio => {
      agrupadosOrdenados[servicio] = agrupados[servicio].sort((a, b) => {
        return (a.seccionDelServicio || '').localeCompare(b.seccionDelServicio || '');
      });
    });

    setClientesAgrupados(agrupadosOrdenados);

    // Si hay clientes, preseleccionar el primero y sus datos relacionados
    if (clientesFiltrados.length > 0) {
      const primerCliente = clientesFiltrados[0];
      setClienteSeleccionado(primerCliente._id);
      setOrderForm(prev => ({
        ...prev,
        servicio: primerCliente.servicio || primerCliente.nombre,
        seccionDelServicio: primerCliente.seccionDelServicio || ''
      }));

      console.log(`Preseleccionando cliente: ${primerCliente.nombre} (${primerCliente._id})`);

      // Preseleccionar subservicios según el rol
      if (primerCliente.subServicios && primerCliente.subServicios.length > 0) {
        if (userRole === 'operario') {
          // Para operarios, mostrar solo subservicios asignados (marcados como isSelected)
          const subserviciosFiltrados = primerCliente.subServicios.filter(ss => ss.isSelected === true);
          console.log(`Operario: ${subserviciosFiltrados.length} subservicios asignados`);
          
          setSubServiciosDisponibles(subserviciosFiltrados);
          
          // Preseleccionar el primer subservicio asignado
          if (subserviciosFiltrados.length > 0) {
            const primerSubservicioAsignado = subserviciosFiltrados[0];
            setSubServicioSeleccionado(primerSubservicioAsignado._id);
            setOrderForm(prev => ({
              ...prev,
              nombreSubServicio: primerSubservicioAsignado.nombre
            }));

            // Cargar sububicaciones
            if (primerSubservicioAsignado.subUbicaciones && primerSubservicioAsignado.subUbicaciones.length > 0) {
              setSubUbicacionesDisponibles(primerSubservicioAsignado.subUbicaciones);
            } else {
              setSubUbicacionesDisponibles([]);
            }
          } else {
            setSubServiciosDisponibles([]);
            setSubServicioSeleccionado(null);
          }
        } else {
          // Para supervisores y admins, mostrar todos los subservicios
          console.log(`${userRole}: ${primerCliente.subServicios.length} subservicios disponibles`);
          setSubServiciosDisponibles(primerCliente.subServicios);
          
          // Preseleccionar el primer subservicio
          if (primerCliente.subServicios.length > 0) {
            const primerSubservicio = primerCliente.subServicios[0];
            setSubServicioSeleccionado(primerSubservicio._id);
            setOrderForm(prev => ({
              ...prev,
              nombreSubServicio: primerSubservicio.nombre
            }));

            // Cargar sububicaciones
            if (primerSubservicio.subUbicaciones && primerSubservicio.subUbicaciones.length > 0) {
              setSubUbicacionesDisponibles(primerSubservicio.subUbicaciones);
            } else {
              setSubUbicacionesDisponibles([]);
            }
          }
        }
      } else {
        console.log(`Cliente sin subservicios`);
        setSubServiciosDisponibles([]);
        setSubServicioSeleccionado(null);
      }
    }
  };

  // Actualizar cantidad con validación mejorada para manejar combos
  const handleQuantityChange = (id: string, newQuantity: number) => {
    // Sólo aseguramos que la cantidad sea positiva
    if (newQuantity < 1) newQuantity = 1;
  
    // Buscar el item para verificar si es un combo o de mantenimiento
    const item = items.find(item => item.id === id);
    
    // Verificar si es combo
    const isCombo = item && item.isCombo;
  
    // Si es un combo, siempre mantener la cantidad en 1
    if (isCombo) {
      // Si intentan cambiar la cantidad de un combo, mostrar mensaje informativo
      if (newQuantity > 1) {
        addNotification("Los combos están limitados a 1 unidad por pedido", "info");
      }
      updateQuantity(id, 1);
      return;
    }
    
    // Para productos de mantenimiento (sin límite)
    if (item && item.category === 'mantenimiento') {
      // No aplicamos límite superior para productos de mantenimiento
      updateQuantity(id, newQuantity);
      return;
    }
  
    // Para otros productos (como limpieza), mantenemos el comportamiento actual
    updateQuantity(id, newQuantity);
  };

  // Función para manejar cambio de cliente con filtrado correcto de subservicios
  const handleClienteChange = (clienteId: string) => {
    console.log(`Seleccionando cliente: ${clienteId}`);
    setClienteSeleccionado(clienteId);
    
    // Limpiar campos dependientes
    setSubServicioSeleccionado(null);
    setSubUbicacionSeleccionada(null);
    setSubUbicacionesDisponibles([]);
    
    // Resetear búsquedas
    setSubServicioSearch('');
    setSubUbicacionSearch('');

    // Buscar el cliente seleccionado
    const clienteSeleccionadoObj = clientes.find(c => c._id === clienteId);
    if (!clienteSeleccionadoObj) {
      console.warn(`Cliente ${clienteId} no encontrado en la lista`);
      return;
    }

    // Actualizar formulario
    setOrderForm(prev => ({
      ...prev,
      servicio: clienteSeleccionadoObj.nombre || clienteSeleccionadoObj.servicio,
      seccionDelServicio: clienteSeleccionadoObj.seccionDelServicio || '',
      nombreSubServicio: '',
      nombreSubUbicacion: ''
    }));

    // Actualizar subservicios según el rol
    if (clienteSeleccionadoObj.subServicios && clienteSeleccionadoObj.subServicios.length > 0) {
      if (userRole === 'operario') {
        // Para operarios, solo mostrar subservicios asignados
        const subserviciosFiltrados = clienteSeleccionadoObj.subServicios.filter(ss => ss.isSelected === true);
        console.log(`Filtrando para operario: ${subserviciosFiltrados.length} subservicios asignados`);
        setSubServiciosDisponibles(subserviciosFiltrados);
        
        // Preseleccionar el primer subservicio si hay alguno
        if (subserviciosFiltrados.length > 0) {
          setSubServicioSeleccionado(subserviciosFiltrados[0]._id);
          setOrderForm(prev => ({
            ...prev,
            nombreSubServicio: subserviciosFiltrados[0].nombre
          }));
          
          // Cargar sububicaciones si existen
          if (subserviciosFiltrados[0].subUbicaciones && subserviciosFiltrados[0].subUbicaciones.length > 0) {
            setSubUbicacionesDisponibles(subserviciosFiltrados[0].subUbicaciones);
          }
        }
      } else {
        // Para otros roles, mostrar todos los subservicios
        console.log(`Mostrando ${clienteSeleccionadoObj.subServicios.length} subservicios para ${userRole}`);
        setSubServiciosDisponibles(clienteSeleccionadoObj.subServicios);
        
        // Preseleccionar el primer subservicio
        if (clienteSeleccionadoObj.subServicios.length > 0) {
          setSubServicioSeleccionado(clienteSeleccionadoObj.subServicios[0]._id);
          setOrderForm(prev => ({
            ...prev,
            nombreSubServicio: clienteSeleccionadoObj.subServicios[0].nombre
          }));
          
          // Cargar sububicaciones si existen
          if (clienteSeleccionadoObj.subServicios[0].subUbicaciones && 
              clienteSeleccionadoObj.subServicios[0].subUbicaciones.length > 0) {
            setSubUbicacionesDisponibles(clienteSeleccionadoObj.subServicios[0].subUbicaciones);
          }
        }
      }
    } else {
      console.log(`Cliente ${clienteId} no tiene subservicios`);
      setSubServiciosDisponibles([]);
    }
  };

  // Manejar cambio de subservicio seleccionado
  const handleSubServicioChange = (subServicioId: string) => {
    setSubServicioSeleccionado(subServicioId);
    setSubUbicacionSeleccionada(null);
    // Resetear la búsqueda de sububicación
    setSubUbicacionSearch('');

    // Encontrar el subservicio seleccionado
    const subServicio = subServiciosDisponibles.find(s => s._id === subServicioId);
    if (subServicio) {
      // Actualizar formulario
      setOrderForm(prev => ({
        ...prev,
        nombreSubServicio: subServicio.nombre
      }));

      // Actualizar sububicaciones disponibles
      if (subServicio.subUbicaciones && subServicio.subUbicaciones.length > 0) {
        setSubUbicacionesDisponibles(subServicio.subUbicaciones);
      } else {
        setSubUbicacionesDisponibles([]);
      }
    }
  };

  // Manejar cambio de sububicación seleccionada
  const handleSubUbicacionChange = (subUbicacionId: string) => {
    setSubUbicacionSeleccionada(subUbicacionId);

    // Encontrar la sububicación seleccionada
    const subUbicacion = subUbicacionesDisponibles.find(u => u._id === subUbicacionId);
    if (subUbicacion) {
      // Actualizar formulario
      setOrderForm(prev => ({
        ...prev,
        nombreSubUbicacion: subUbicacion.nombre
      }));
    }
  };

  // Procesamiento de pedido - Optimizado
  const processOrder = async () => {
    // Validaciones previas
    if (items.length === 0) {
      setOrderError('No hay productos en el carrito. Añada productos para realizar un pedido.');
      return;
    }

    if (!formValid) {
      setOrderError('Por favor complete todos los campos requeridos (Cliente y Subservicio) antes de realizar el pedido.');
      return;
    }

    if (clientes.length === 0) {
      setOrderError('No hay clientes asignados. No puedes realizar pedidos hasta que administración asigne clientes.');
      return;
    }

    if (!clienteSeleccionado) {
      setOrderError('Por favor, seleccione un cliente para el pedido');
      return;
    }

    if (!subServicioSeleccionado) {
      setOrderError('Por favor, seleccione un subservicio para el pedido');
      return;
    }

    // Para operarios, verificar que el subservicio seleccionado esté asignado
    if (userRole === 'operario') {
      const isAssigned = subserviciosAsignados.some(
        asignacion => 
          asignacion.clienteId === clienteSeleccionado && 
          asignacion.subServicioId === subServicioSeleccionado
      );

      if (!isAssigned) {
        setOrderError('No tienes permiso para realizar pedidos con este subservicio. Por favor, selecciona uno que te haya sido asignado.');
        return;
      }
    }

    setProcessingOrder(true);
    setOrderError(null);

    try {
      // Determinar el ID de usuario para el pedido y el ID real del usuario
      let orderUserId;
      let actualUserId = currentUser?._id || currentUser?.id;

      // Si es operario, usar el ID del supervisor
      if (userRole === 'operario' && supervisorId) {
        orderUserId = supervisorId;
      } else if (currentUser) {
        orderUserId = actualUserId;
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

      // Encontrar el subservicio seleccionado
      const subServicio = subServiciosDisponibles.find(s => s._id === subServicioSeleccionado);

      // Crear objeto de pedido con estructura jerárquica
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

      // Estructura jerárquica de cliente
      orderData.cliente = {
        clienteId: clienteObj._id,
        nombreCliente: clienteObj.nombre || clienteObj.servicio
      };

      // Agregar subservicio si está seleccionado
      if (subServicio) {
        orderData.cliente.subServicioId = subServicio._id;
        orderData.cliente.nombreSubServicio = subServicio.nombre;

        // Siempre usar el supervisor asignado al subservicio (si existe)
        if (subServicio.supervisorId) {
          // Verificación mejorada para array de supervisores
          if (Array.isArray(subServicio.supervisorId) && subServicio.supervisorId.length > 0) {
            // Usar el primer supervisor del array
            const firstSupervisor = subServicio.supervisorId[0];
            if (typeof firstSupervisor === 'string') {
              orderData.supervisorId = firstSupervisor;
            } else if (typeof firstSupervisor === 'object' && firstSupervisor._id) {
              orderData.supervisorId = firstSupervisor._id;
            }
          } else if (typeof subServicio.supervisorId === 'string') {
            orderData.supervisorId = subServicio.supervisorId;
          } else if (typeof subServicio.supervisorId === 'object' && subServicio.supervisorId._id) {
            orderData.supervisorId = subServicio.supervisorId._id;
          }
        }
      }

      // Agregar sububicación si está seleccionada
      if (subUbicacionSeleccionada) {
        const subUbicacion = subUbicacionesDisponibles.find(u => u._id === subUbicacionSeleccionada);
        if (subUbicacion) {
          orderData.cliente.subUbicacionId = subUbicacionSeleccionada;
          orderData.cliente.nombreSubUbicacion = subUbicacion.nombre;
        }
      }

      // Guardar datos del pedido para mostrar en confirmación
      setOrderData(orderData);

      // Enviar pedido a la API
      const pedidoCreado = await fetchWithAuth('/api/pedido', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      // Obtener datos del pedido creado para guardar el ID
      setCreatedOrderId(pedidoCreado._id);

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
    } catch (error: any) {
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
        <div className="container mx-auto px-4 py-6 shop-theme">
          <div className="flex flex-col items-center justify-center py-8 md:py-16">
            <div className="bg-[#3a8fb7]/30 backdrop-blur-md rounded-full p-4 md:p-6 mb-4 md:mb-6 shadow-lg shadow-[#3a8fb7]/20">
              <ShoppingCart className="h-12 w-12 md:h-16 md:w-16 text-[#3a8fb7]" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-[#3a8fb7] text-center">Tu carrito está vacío</h2>
            <p className="text-[#4a4a4a] mb-6 md:mb-8 text-center max-w-md text-sm md:text-base px-4">
              Parece que aún no has agregado productos a tu carrito.
              Explora nuestro catálogo y encuentra lo que necesitas.
            </p>
            <Button
              className="bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white shadow-md shadow-[#3a8fb7]/20 text-sm md:text-base"
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
        <div className="container mx-auto px-4 py-6 shop-theme">
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-[#3a8fb7]/40 to-[#a8e6cf]/40 backdrop-blur-md border border-[#3a8fb7] p-4 md:p-6 rounded-2xl text-center shadow-lg shadow-[#3a8fb7]/10"
            >
              <div className="bg-[#3a8fb7] rounded-full h-14 w-14 md:h-16 md:w-16 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#3a8fb7]/30">
                <Check className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-[#3a8fb7]">¡Pedido realizado con éxito!</h2>

              {userRole === 'operario' ? (
                <p className="text-[#4a4a4a] mb-3 md:mb-4 text-sm md:text-base">
                  Tu pedido ha sido enviado a tu supervisor para su aprobación.
                  Te notificaremos cuando sea procesado.
                </p>
              ) : (
                <p className="text-[#4a4a4a] mb-3 md:mb-4 text-sm md:text-base">
                  Hemos recibido tu solicitud. El pedido ha sido procesado correctamente.
                </p>
              )}

              {/* Mostrar información del supervisor si es operario */}
              {userRole === 'operario' && supervisorName && (
                <div className="mb-3 md:mb-4 p-2 bg-white/10 border border-[#3a8fb7] rounded-lg">
                  <p className="flex items-center justify-center text-[#3a8fb7] text-xs md:text-sm">
                    <UserCircle2 className="h-3 w-3 mr-1" />
                    Pedido enviado a: <span className="font-bold ml-1">{supervisorName}</span>
                  </p>
                </div>
              )}

              {/* Mostrar información del cliente, subservicio y sububicación */}
              {orderData && orderData.cliente && (
                <div className="mb-3 md:mb-4 bg-white/10 border border-[#3a8fb7] rounded-lg p-3 text-left">
                  <h3 className="text-[#3a8fb7] font-semibold flex items-center mb-2 text-xs md:text-sm">
                    <Info className="h-3 w-3 mr-1" />
                    Información del pedido
                  </h3>

                  <div className="space-y-1 text-xs md:text-sm text-[#4a4a4a]">
                    <div className="flex items-start">
                      <Building className="h-3 w-3 mr-1 text-[#3a8fb7]" />
                      <div>
                        <p className="font-medium">Cliente:</p>
                        <p>{orderData.cliente.nombreCliente}</p>
                      </div>
                    </div>

                    {orderData.cliente.nombreSubServicio && (
                      <div className="flex items-start">
                        <PackageOpen className="h-3 w-3 mr-1 text-[#3a8fb7]" />
                        <div>
                          <p className="font-medium">Sub-Servicio:</p>
                          <p>{orderData.cliente.nombreSubServicio}</p>
                        </div>
                      </div>
                    )}

                    {orderData.cliente.nombreSubUbicacion && (
                      <div className="flex items-start">
                        <MapPin className="h-3 w-3 mr-1 text-[#3a8fb7]" />
                        <div>
                          <p className="font-medium">Sub-Ubicación:</p>
                          <p>{orderData.cliente.nombreSubUbicacion}</p>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-[#3a8fb7] mt-1 italic">
                      ID de pedido: {createdOrderId}
                    </p>
                  </div>
                </div>
              )}

              {/* Botón de volver a la tienda */}
              <Button
                variant="outline"
                className="border-[#3a8fb7] text-[#3a8fb7] hover:bg-[#3a8fb7]/20 text-xs md:text-sm h-9 mb-3"
                onClick={() => window.location.href = '/shop'}
              >
                Volver a la tienda
              </Button>

              {/* Contador */}
              <div className="bg-white/10 border border-[#3a8fb7]/50 rounded-lg p-2 inline-flex items-center text-xs">
                <Clock className="h-3 w-3 mr-1 text-[#3a8fb7]" />
                <span className="text-[#4a4a4a]">
                  Volviendo a la tienda en <span className="font-bold">{countdown}</span> segundos
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  // Vista principal del carrito
  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-6 md:py-8 shop-theme">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center text-[#3a8fb7]">
            <ShoppingCart className="mr-2 md:mr-3 h-6 w-6 md:h-7 md:w-7" />
            Tu Carrito
          </h1>

          {/* Mostrar banner informativo para operarios */}
          {userRole === 'operario' && (
            <Alert className="mb-4 bg-[#d4f1f9] border border-[#3a8fb7] shadow-md">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <UserCircle2 className="h-4 w-4 text-[#3a8fb7] flex-shrink-0" />
                  <AlertDescription className="ml-2 text-[#3a8fb7] text-xs md:text-sm">
                    Estás realizando un pedido como operario. El pedido será enviado a
                    <span className="font-semibold mx-1">{supervisorName || 'supervisor'}</span>
                    para su aprobación.
                  </AlertDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 h-8 text-xs border-[#3a8fb7] text-[#3a8fb7] flex-shrink-0"
                  onClick={handleRefreshSupervisor}
                  disabled={refreshingSupervisor}
                >
                  {refreshingSupervisor ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  <span className="ml-1 hidden md:inline">Actualizar</span>
                </Button>
              </div>
            </Alert>
          )}

          <div className="md:flex md:flex-col lg:flex-row gap-4 md:gap-6">
            {/* Lista de productos */}
            <div className="flex-grow mb-4 md:mb-0">
              <div className="space-y-4">
                {checkoutStep === 1 ? (
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="bg-gradient-to-r from-[#d4f1f9]/40 to-[#a8e6cf]/40 backdrop-blur-sm border border-[#3a8fb7] rounded-lg overflow-hidden shadow-md"
                      >
                        <div className="p-3 md:p-4 flex gap-3 md:gap-4">
                          {/* Imagen del producto */}
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-md overflow-hidden flex-shrink-0 border border-[#3a8fb7]/30">
                            <CartItemImage item={item} />
                          </div>

                          {/* Información del producto */}
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <h3 className="font-medium text-base md:text-lg text-[#3a8fb7] line-clamp-1">
                                {item.name}
                                {item.isCombo && (
                                  <Badge className="ml-2 bg-[#ffffff] text-[#3a8fb7] border border-[#3a8fb7] text-xs">
                                    <Package size={10} className="mr-1" />
                                    Combo
                                  </Badge>
                                )}
                              </h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 md:h-8 md:w-8 p-0 text-[#4a4a4a] hover:text-[#F44336] hover:bg-transparent"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </div>

                            {/* Categoría */}
                            {item.category && (
                              <p className="text-xs md:text-sm text-[#4a4a4a] capitalize">
                                {item.category} {item.subcategory && `- ${item.subcategory}`}
                              </p>
                            )}

                            {/* Detalles del combo */}
                            {item.isCombo && <ComboDetails item={item} />}

                            <div className="flex justify-between items-center mt-2">
                              {item.isCombo ? (
                                <div className="flex items-center">
                                  <div className="flex items-center space-x-1 bg-white/70 rounded-md border border-[#3a8fb7]/30">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 md:h-8 md:w-8 p-0 text-[#3a8fb7]/50"
                                      disabled={true}
                                      title="Los combos están limitados a 1 unidad"
                                    >
                                      <Minus className="h-2 w-2 md:h-3 md:w-3 opacity-50" />
                                    </Button>
                                    <Input
                                      type="number"
                                      value="1"
                                      readOnly
                                      disabled
                                      className="w-10 md:w-16 h-7 md:h-8 text-center p-0 border-0 bg-transparent focus:ring-0 text-[#3a8fb7] text-xs md:text-sm font-bold"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 md:h-8 md:w-8 p-0 text-[#3a8fb7]/50"
                                      disabled={true}
                                      title="Los combos están limitados a 1 unidad"
                                    >
                                      <Plus className="h-2 w-2 md:h-3 md:w-3 opacity-50" />
                                    </Button>
                                  </div>
                                  <Badge className="ml-2 text-xs bg-[#d4f1f9] text-[#3a8fb7] border border-[#3a8fb7]/30">
                                    <AlertCircle className="h-2 w-2 mr-1" />
                                    Limitado a 1 unidad
                                  </Badge>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 bg-white rounded-md border border-[#3a8fb7]/30">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 md:h-8 md:w-8 p-0 text-[#3a8fb7]"
                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  >
                                    <Minus className="h-2 w-2 md:h-3 md:w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                    className="w-10 md:w-16 h-7 md:h-8 text-center p-0 border-0 bg-transparent focus:ring-0 text-[#3a8fb7] text-xs md:text-sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 md:h-8 md:w-8 p-0 text-[#3a8fb7]"
                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  >
                                    <Plus className="h-2 w-2 md:h-3 md:w-3" />
                                  </Button>
                                </div>
                              )}

                              <div className="text-right">
                                <div className="text-base md:text-lg font-semibold text-[#3a8fb7]">${(item.price * item.quantity).toFixed(2)}</div>
                                <div className="text-xs text-[#4a4a4a]">${item.price.toFixed(2)} por unidad</div>
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
                    className="space-y-4 md:space-y-5"
                  >
                    {/* Versión móvil - Acordeón */}
                    <div className="md:hidden">
                      <Accordion type="single" collapsible defaultValue="cliente">
                        {/* Selector de clientes */}
                        <AccordionItem value="cliente" className="border-b-0">
                          <AccordionTrigger className="py-2 px-3 bg-gradient-to-r from-[#d4f1f9]/40 to-[#a8e6cf]/40 backdrop-blur-sm border border-[#3a8fb7] rounded-lg shadow-md mb-2 text-[#3a8fb7] font-medium hover:no-underline hover:bg-[#d4f1f9]/60">
                            <div className="flex items-center">
                              <Building className="mr-2 h-4 w-4" />
                              Seleccionar Cliente
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-white/70 backdrop-blur-sm border border-[#3a8fb7] rounded-lg p-3 mb-2">
                            <div className="space-y-3">
                              {cargandoClientes ? (
                                <div className="py-3 flex justify-center">
                                  <Loader2 className="h-5 w-5 animate-spin text-[#3a8fb7]" />
                                </div>
                              ) : errorClientes ? (
                                <Alert className="bg-[#F44336]/10 border-[#F44336]">
                                  <AlertCircle className="h-3 w-3 text-[#F44336]" />
                                  <AlertDescription className="ml-2 text-[#F44336] text-xs">
                                    {errorClientes}
                                  </AlertDescription>
                                </Alert>
                              ) : clientes.length === 0 ? (
                                <div>
                                  <Alert className="bg-[#FF9800]/10 border-2 border-[#FF9800] mb-3 p-2">
                                    <AlertTriangle className="h-3 w-3 text-[#FF9800]" />
                                    <AlertDescription className="ml-2 text-[#3a8fb7] font-medium text-xs">
                                      No hay clientes asignados.
                                    </AlertDescription>
                                  </Alert>

                                  <div className="flex justify-center mt-4">
                                    <Button
                                      onClick={() => window.location.href = '/shop'}
                                      className="bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white text-xs h-8"
                                    >
                                      <ArrowLeft className="mr-1 h-3 w-3" />
                                      Volver a la tienda
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label htmlFor="clienteSelector" className="text-[#3a8fb7] font-medium flex items-center text-xs">
                                    <Building className="mr-1 h-3 w-3" />
                                    Cliente Asociado
                                    {cargandoClientes && <Loader2 className="ml-1 h-3 w-3 animate-spin text-[#3a8fb7]" />}
                                  </Label>

                                  {/* Buscador de clientes (móvil) */}
                                  <SearchInput
                                    value={clienteSearch}
                                    onChange={setClienteSearch}
                                    onClear={() => setClienteSearch('')}
                                    placeholder="Buscar cliente..."
                                    disabled={cargandoClientes}
                                    className="mb-2"
                                  />

                                  {/* Indicador de operario/supervisor */}
                                  {userRole === 'operario' && supervisorName && (
                                    <div className="text-xs text-[#4a4a4a] mb-2 flex items-center">
                                      <UserCircle2 className="h-3 w-3 mr-1 text-[#3a8fb7]" />
                                      Clientes de: {supervisorName}
                                    </div>
                                  )}

                                  {/* Select de cliente */}
                                  <SelectWithClear
                                    value={clienteSeleccionado || ""}
                                    onValueChange={handleClienteChange}
                                    disabled={cargandoClientes}
                                    placeholder="Selecciona un cliente"
                                    className="h-9 text-xs"
                                  >
                                    {Object.entries(clientesFiltrados).map(([servicio, clientesServicio]) => (
                                      <div key={servicio} className="px-1 py-1">
                                        <div className="flex items-center px-2 py-1 text-xs uppercase tracking-wider font-semibold bg-[#d4f1f9] text-[#3a8fb7] rounded mb-1">
                                          <Building className="h-3 w-3 mr-1" />
                                          {servicio}
                                        </div>

                                        <div className="pl-1">
                                          {clientesServicio.map(cliente => (
                                            <SelectItem
                                              key={cliente._id}
                                              value={cliente._id}
                                              className="focus:bg-[#d4f1f9] data-[state=checked]:bg-[#3a8fb7] data-[state=checked]:text-white"
                                            >
                                              <div className="flex items-center">
                                                <Building className="h-3 w-3 mr-2 text-[#4a4a4a]" />
                                                <span>{cliente.nombre}</span>
                                                {cliente.seccionDelServicio && (
                                                  <span className="ml-1 text-xs text-[#7AA79C]">({cliente.seccionDelServicio})</span>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </SelectWithClear>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Selector de SubServicio */}
                        {clienteSeleccionado && (
                          <AccordionItem value="subservicio" className="border-b-0">
                            <AccordionTrigger className="py-2 px-3 bg-gradient-to-r from-[#d4f1f9]/40 to-[#a8e6cf]/40 backdrop-blur-sm border border-[#3a8fb7] rounded-lg shadow-md mb-2 text-[#3a8fb7] font-medium hover:no-underline hover:bg-[#d4f1f9]/60">
                              <div className="flex items-center">
                                <PackageOpen className="mr-2 h-4 w-4" />
                                Seleccionar Sub-Servicio
                                {subServiciosDisponibles.length === 0 ? (
                                  <Badge className="ml-2 bg-[#FF9800] text-white text-xs font-normal">No disponible</Badge>
                                ) : null}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="bg-white/70 backdrop-blur-sm border border-[#3a8fb7] rounded-lg p-3 mb-2">
                              {subServiciosDisponibles.length === 0 ? (
                                <div className="text-xs text-[#4a4a4a] italic p-2 border border-[#3a8fb7]/20 rounded bg-white/30">
                                  {userRole === 'operario' 
                                    ? 'No tienes subservicios asignados para este cliente.'
                                    : 'El cliente seleccionado no tiene sub-servicios asignados.'}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label htmlFor="subServicioSelector" className="text-[#3a8fb7] font-medium flex items-center text-xs">
                                    <PackageOpen className="mr-1 h-3 w-3" />
                                    Selecciona un sub-servicio
                                  </Label>

                                  {/* Buscador de subservicios (móvil) */}
                                  <SearchInput
                                    value={subServicioSearch}
                                    onChange={setSubServicioSearch}
                                    onClear={() => setSubServicioSearch('')}
                                    placeholder="Buscar sub-servicio..."
                                    disabled={cargandoClientes}
                                    className="mb-2"
                                  />

                                  {/* Select de subservicio */}
                                  <SelectWithClear
                                    value={subServicioSeleccionado || ""}
                                    onValueChange={handleSubServicioChange}
                                    disabled={cargandoClientes}
                                    placeholder="Selecciona un sub-servicio"
                                    className="h-9 text-xs"
                                  >
                                    {subServiciosFiltrados.map(subServicio => (
                                      <SelectItem
                                        key={subServicio._id}
                                        value={subServicio._id}
                                        className="focus:bg-[#d4f1f9] data-[state=checked]:bg-[#3a8fb7] data-[state=checked]:text-white text-xs py-1"
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span>{subServicio.nombre}</span>

                                          {subServicio.subUbicaciones && subServicio.subUbicaciones.length > 0 && (
                                            <Badge className="ml-1 bg-[#3a8fb7] text-white text-xs px-1 py-0 h-4">
                                              {subServicio.subUbicaciones.length}
                                              </Badge>
                                          )}

                                          {/* Indicador de asignación para operarios */}
                                          {userRole === 'operario' && subServicio.isSelected && (
                                            <Check className="ml-1 h-3 w-3 text-green-600" />
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectWithClear>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {/* Selector de SubUbicación */}
                        {subServicioSeleccionado && (
                          <AccordionItem value="sububicacion" className="border-b-0">
                            <AccordionTrigger className="py-2 px-3 bg-gradient-to-r from-[#d4f1f9]/40 to-[#a8e6cf]/40 backdrop-blur-sm border border-[#3a8fb7] rounded-lg shadow-md mb-2 text-[#3a8fb7] font-medium hover:no-underline hover:bg-[#d4f1f9]/60">
                              <div className="flex items-center">
                                <MapPin className="mr-2 h-4 w-4" />
                                Seleccionar Sub-Ubicación
                                {subUbicacionesDisponibles.length === 0 ? (
                                  <Badge className="ml-2 bg-[#FF9800] text-white text-xs font-normal">No disponible</Badge>
                                ) : null}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="bg-white/70 backdrop-blur-sm border border-[#3a8fb7] rounded-lg p-3 mb-2">
                              {subUbicacionesDisponibles.length === 0 ? (
                                <div className="text-xs text-[#4a4a4a] italic p-2 border border-[#3a8fb7]/20 rounded bg-white/30">
                                  El sub-servicio seleccionado no tiene sub-ubicaciones asignadas.
                                </div> ) : (
                                <div className="space-y-2">
                                  <Label htmlFor="subUbicacionSelector" className="text-[#3a8fb7] font-medium flex items-center text-xs">
                                    <MapPin className="mr-1 h-3 w-3" />
                                    Selecciona una sub-ubicación
                                  </Label>

                                  {/* Buscador de sububicaciones (móvil) */}
                                  <SearchInput
                                    value={subUbicacionSearch}
                                    onChange={setSubUbicacionSearch}
                                    onClear={() => setSubUbicacionSearch('')}
                                    placeholder="Buscar sub-ubicación..."
                                    disabled={cargandoClientes}
                                    className="mb-2"
                                  />

                                  {/* Select de sububicación */}
                                  <SelectWithClear
                                    value={subUbicacionSeleccionada || ""}
                                    onValueChange={handleSubUbicacionChange}
                                    disabled={cargandoClientes}
                                    placeholder="Selecciona una sub-ubicación"
                                    className="h-9 text-xs"
                                  >
                                    {subUbicacionesFiltradas.map(subUbicacion => (
                                      <SelectItem
                                        key={subUbicacion._id}
                                        value={subUbicacion._id}
                                        className="focus:bg-[#d4f1f9] data-[state=checked]:bg-[#3a8fb7] data-[state=checked]:text-white text-xs py-1"
                                      >
                                        {subUbicacion.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectWithClear>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {/* Información adicional */}
                        <AccordionItem value="notas" className="border-b-0">
                          <AccordionTrigger className="py-2 px-3 bg-gradient-to-r from-[#d4f1f9]/40 to-[#a8e6cf]/40 backdrop-blur-sm border border-[#3a8fb7] rounded-lg shadow-md mb-2 text-[#3a8fb7] font-medium hover:no-underline hover:bg-[#d4f1f9]/60">
                            <div className="flex items-center">
                              <Info className="mr-2 h-4 w-4" />
                              Información del pedido
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-white/70 backdrop-blur-sm border border-[#3a8fb7] rounded-lg p-3 mb-2">
                            <div>
                              <Label htmlFor="notes" className="text-[#3a8fb7] text-xs font-medium">Notas adicionales</Label>
                              <Textarea
                                id="notes"
                                placeholder="Instrucciones especiales, ubicación, etc."
                                className="bg-white border-[#3a8fb7] mt-1 text-[#4a4a4a] placeholder:text-[#4a4a4a]/60 text-xs h-20"
                                value={orderForm.notes}
                                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {/* Información del cliente seleccionado (móvil) */}
                      {clienteSeleccionado && !cargandoClientes && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-3 rounded-md bg-[#d4f1f9]/40 border border-[#3a8fb7]/50 backdrop-blur-sm"
                        >
                          <div className="text-xs text-[#3a8fb7]">
                            <p className="flex items-center">
                              <Building className="w-3 h-3 mr-1 text-[#3a8fb7]" />
                              <span className="font-medium">Cliente:</span>
                              <span className="ml-1 truncate">{orderForm.servicio}</span>
                            </p>

                            {orderForm.nombreSubServicio && (
                              <p className="flex items-center mt-1">
                                <PackageOpen className="w-3 h-3 mr-1 text-[#3a8fb7]" />
                                <span className="font-medium">Sub-Servicio:</span>
                                <span className="ml-1 truncate">{orderForm.nombreSubServicio}</span>
                              </p>
                            )}

                            {orderForm.nombreSubUbicacion && (
                              <p className="flex items-center mt-1">
                                <MapPin className="w-3 h-3 mr-1 text-[#3a8fb7]" />
                                <span className="font-medium">Sub-Ubicación:</span>
                                <span className="ml-1 truncate">{orderForm.nombreSubUbicacion}</span>
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Versión Desktop */}
                    <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Selector de clientes */}
                      <Card className="bg-gradient-to-r from-[#d4f1f9]/40 to-[#a8e6cf]/40 backdrop-blur-sm border-[#3a8fb7] shadow-md lg:col-span-2">
                        <CardHeader className="border-b border-[#3a8fb7]/50 py-3">
                          <CardTitle className="text-[#3a8fb7] flex items-center text-lg">
                            <Building className="mr-2 h-5 w-5" />
                            Seleccionar Cliente
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 pb-4">
                          {cargandoClientes ? (
                            <div className="py-3 flex justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-[#3a8fb7]" />
                            </div>
                          ) : errorClientes ? (
                            <Alert className="bg-[#FF9800]/10 border-[#FF9800] shadow-sm">
                              <AlertTriangle className="h-4 w-4 text-[#FF9800]" />
                              <AlertDescription className="ml-2 text-[#3a8fb7]">
                                {errorClientes}
                              </AlertDescription>
                            </Alert>
                          ) : clientes.length === 0 ? (
                            <div>
                              <Alert className="bg-[#FF9800]/10 border-2 border-[#FF9800] mb-4">
                                <AlertTriangle className="h-4 w-4 text-[#FF9800]" />
                                <AlertDescription className="ml-2 text-[#3a8fb7] font-medium">
                                  No hay clientes asignados. Por favor, contacta con administración para que te asignen clientes antes de realizar pedidos.
                                </AlertDescription>
                              </Alert>

                              <div className="flex justify-center mt-6">
                                <Button
                                  onClick={() => window.location.href = '/shop'}
                                  className="bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white"
                                >
                                  <ArrowLeft className="mr-2 h-4 w-4" />
                                  Volver a la tienda
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Selector de cliente */}
                              <div className="space-y-2">
                                <Label htmlFor="clienteSelector" className="text-[#3a8fb7] font-medium flex items-center">
                                  <Building className="mr-2 h-4 w-4" />
                                  Cliente Asociado
                                  {cargandoClientes && <Loader2 className="ml-2 h-3 w-3 animate-spin text-[#3a8fb7]" />}
                                </Label>

                                {/* Buscador de clientes (desktop) */}
                                <SearchInput
                                  value={clienteSearch}
                                  onChange={setClienteSearch}
                                  onClear={() => setClienteSearch('')}
                                  placeholder="Buscar cliente..."
                                  disabled={cargandoClientes}
                                  className="mb-2"
                                />

                                {/* Indicador de operario/supervisor */}
                                {userRole === 'operario' && supervisorName && (
                                  <div className="text-xs text-[#4a4a4a] mb-2 flex items-center">
                                    <UserCircle2 className="h-3 w-3 mr-1 text-[#3a8fb7]" />
                                    Mostrando clientes de: {supervisorName}
                                  </div>
                                )}

                                <div className="relative mt-1">
                                  {/* Select de cliente */}
                                  <SelectWithClear
                                    value={clienteSeleccionado || ""}
                                    onValueChange={handleClienteChange}
                                    disabled={cargandoClientes}
                                    placeholder="Selecciona un cliente"
                                  >
                                    {Object.entries(clientesFiltrados).map(([servicio, clientesServicio]) => (
                                      <div key={servicio} className="px-1 py-1">
                                        {/* Encabezado de grupo de servicio */}
                                        <div className="flex items-center px-2 py-1.5 text-xs uppercase tracking-wider font-semibold bg-[#d4f1f9] text-[#3a8fb7] rounded mb-1">
                                          <Building className="h-3 w-3 mr-2" />
                                          {servicio}
                                        </div>

                                        {/* Modificamos para mostrar el nombre del cliente en lugar de la sección */}
                                        <div className="pl-2">
                                          {clientesServicio.map(cliente => (
                                            <SelectItem
                                              key={cliente._id}
                                              value={cliente._id}
                                              className="focus:bg-[#d4f1f9] data-[state=checked]:bg-[#3a8fb7] data-[state=checked]:text-white"
                                            >
                                              <div className="flex items-center">
                                                <Building className="h-3 w-3 mr-2 text-[#4a4a4a]" />
                                                <span>{cliente.nombre}</span>
                                                {cliente.seccionDelServicio && (
                                                  <span className="ml-1 text-xs text-[#7AA79C]">({cliente.seccionDelServicio})</span>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </SelectWithClear>
                                </div>
                              </div>

                              {/* Selector de SubServicio */}
                              <div className="space-y-2">
                                <Label htmlFor="subServicioSelector" className="text-[#3a8fb7] font-medium flex items-center">
                                  <PackageOpen className="mr-2 h-4 w-4" />
                                  Seleccionar Sub-Servicio
                                  {subServiciosDisponibles.length === 0 ? (
                                    <Badge className="ml-2 bg-[#FF9800] text-white text-xs font-normal">No disponible</Badge>
                                  ) : null}
                                </Label>

                                {/* Buscador de subservicios (desktop) */}
                                {subServiciosDisponibles.length > 0 && (
                                  <SearchInput
                                    value={subServicioSearch}
                                    onChange={setSubServicioSearch}
                                    onClear={() => setSubServicioSearch('')}
                                    placeholder="Buscar sub-servicio..."
                                    disabled={cargandoClientes}
                                    className="mb-2"
                                  />
                                )}

                                {subServiciosDisponibles.length === 0 ? (
                                  <div className="text-xs text-[#4a4a4a] mt-1 italic p-2 border border-[#3a8fb7]/20 rounded bg-white/30">
                                    {userRole === 'operario' 
                                      ? 'No tienes subservicios asignados para este cliente.' 
                                      : 'El cliente seleccionado no tiene sub-servicios asignados.'}
                                  </div>
                                ) : (
                                  <div className="relative mt-1">
                                    {/* Select de subservicio */}
                                    <SelectWithClear
                                      value={subServicioSeleccionado || ""}
                                      onValueChange={handleSubServicioChange}
                                      disabled={cargandoClientes}
                                      placeholder="Selecciona un sub-servicio"
                                    >
                                      {subServiciosFiltrados.map(subServicio => (
                                        <SelectItem
                                          key={subServicio._id}
                                          value={subServicio._id}
                                          className="focus:bg-[#d4f1f9] data-[state=checked]:bg-[#3a8fb7] data-[state=checked]:text-white"
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <span>{subServicio.nombre}</span>

                                            {/* Badge para mostrar si tiene sububicaciones */}
                                            {subServicio.subUbicaciones && subServicio.subUbicaciones.length > 0 && (
                                              <Badge className="ml-2 bg-[#3a8fb7] text-white text-xs">
                                                {subServicio.subUbicaciones.length} {subServicio.subUbicaciones.length === 1 ? 'ubicación' : 'ubicaciones'}
                                              </Badge>
                                            )}

                                            {/* Indicador de asignación para operarios */}
                                            {userRole === 'operario' && subServicio.isSelected && (
                                              <Check className="ml-1 h-3 w-3 text-green-600" />
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectWithClear>
                                  </div>
                                )}
                              </div>

                              {/* Selector de SubUbicación y notas*/}
                              <div className="space-y-2">
                                <Label className="text-[#3a8fb7] font-medium flex items-center">
                                  <MapPin className="mr-2 h-4 w-4" />
                                  Seleccionar Sub-Ubicación
                                  {subUbicacionesDisponibles.length === 0 ? (
                                    <Badge className="ml-2 bg-[#FF9800] text-white text-xs font-normal">No disponible</Badge>
                                  ) : null}
                                </Label>

                                {/* Buscador de sububicaciones (desktop) */}
                                {subUbicacionesDisponibles.length > 0 && (
                                  <SearchInput
                                    value={subUbicacionSearch}
                                    onChange={setSubUbicacionSearch}
                                    onClear={() => setSubUbicacionSearch('')}
                                    placeholder="Buscar sub-ubicación..."
                                    disabled={cargandoClientes}
                                    className="mb-2"
                                  />
                                )}

                                {!subServicioSeleccionado || subUbicacionesDisponibles.length === 0 ? (
                                  <div className="text-xs text-[#4a4a4a] mt-1 italic p-2 border border-[#3a8fb7]/20 rounded bg-white/30">
                                    {!subServicioSeleccionado ? 'Seleccione un sub-servicio primero' : 'El sub-servicio seleccionado no tiene sub-ubicaciones asignadas.'}
                                  </div>
                                ) : (
                                  <div className="relative mt-1">
                                    {/* Select de sububicación */}
                                    <SelectWithClear
                                      value={subUbicacionSeleccionada || ""}
                                      onValueChange={handleSubUbicacionChange}
                                      disabled={cargandoClientes}
                                      placeholder="Selecciona una sub-ubicación"
                                    >
                                      {subUbicacionesFiltradas.map(subUbicacion => (
                                        <SelectItem
                                          key={subUbicacion._id}
                                          value={subUbicacion._id}
                                          className="focus:bg-[#d4f1f9] data-[state=checked]:bg-[#3a8fb7] data-[state=checked]:text-white"
                                        >
                                          {subUbicacion.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectWithClear>
                                  </div>
                                )}
                              </div>

                              {/* Notas adicionales */}
                              <div className="space-y-2">
                                <Label htmlFor="notes" className="text-[#3a8fb7] font-medium flex items-center">
                                  <Info className="mr-2 h-4 w-4" />
                                  Notas adicionales
                                </Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Instrucciones especiales, ubicación de entrega, etc."
                                  className="bg-white border-[#3a8fb7] mt-1 text-[#4a4a4a] placeholder:text-[#4a4a4a]/60 h-[calc(100%-40px)] min-h-[110px]"
                                  value={orderForm.notes}
                                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                                />
                              </div>
                            </div>
                          )}

                          {/* Información del cliente seleccionado */}
                          {clienteSeleccionado && !cargandoClientes && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 p-3 rounded-md bg-[#d4f1f9]/40 border border-[#3a8fb7]/50 backdrop-blur-sm"
                            >
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#3a8fb7]">
                                <p className="flex items-center">
                                <Building className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                                  <span className="font-medium">Cliente:</span>
                                  <span className="ml-1">{orderForm.servicio}</span>
                                </p>

                                {orderForm.nombreSubServicio && (
                                  <p className="flex items-center">
                                    <PackageOpen className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                                    <span className="font-medium">Sub-Servicio:</span>
                                    <span className="ml-1">{orderForm.nombreSubServicio}</span>
                                  </p>
                                )}

                                {orderForm.nombreSubUbicacion && (
                                  <p className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                                    <span className="font-medium">Sub-Ubicación:</span>
                                    <span className="ml-1">{orderForm.nombreSubUbicacion}</span>
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>

                      {orderError && (
                        <Alert className="bg-[#F44336]/10 border-2 border-[#F44336] shadow-md lg:col-span-2">
                          <AlertCircle className="h-5 w-5 text-[#F44336]" />
                          <AlertDescription className="ml-2 text-[#F44336] font-medium">{orderError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Botones de acción para desktop - Step 1 */}
              {items.length > 0 && checkoutStep === 1 && (
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    className="border-[#F44336] text-[#F44336] hover:bg-[#F44336]/10 hover:text-[#F44336] h-9 md:h-10 text-xs md:text-sm"
                    onClick={clearCart}
                  >
                    <Trash2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    Vaciar carrito
                  </Button>
                </div>
              )}

              {/* Botones móviles para Step 2 */}
              <div className="md:hidden mt-4">
                {checkoutStep === 2 && (
                  <div className="flex flex-col space-y-3">
                    {/* Mostrar resumen móvil */}
                    <Button
                      variant="outline"
                      className="w-full border-[#3a8fb7] text-[#3a8fb7] flex items-center justify-between h-10"
                      onClick={() => setShowSummary(!showSummary)}
                    >
                      <span className="flex items-center">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Resumen del pedido
                      </span>
                      {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {showSummary && (
                      <Card className="bg-white/70 backdrop-blur-sm border border-[#3a8fb7] mb-3">
                        <CardContent className="p-3 space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex justify-between py-1 text-[#3a8fb7] text-xs">
                              <span className="truncate mr-2 max-w-[70%]">
                                {item.name} <span className="text-[#4a4a4a]">x{item.quantity}</span>
                                {item.isCombo && (
                                  <Badge className="ml-1 bg-[#ffffff] text-[#3a8fb7] border border-[#3a8fb7] text-[10px]">
                                    <Package size={8} className="mr-0.5" />
                                    Combo
                                  </Badge>
                                )}
                              </span>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <Separator className="bg-[#3a8fb7]/30 my-1" />
                          <div className="flex justify-between font-bold text-[#3a8fb7] text-sm">
                            <span>Total:</span>
                            <span>${totalPrice.toFixed(2)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {orderError && (
                      <Alert className="bg-[#F44336]/10 border-2 border-[#F44336] p-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-[#F44336]" />
                        <AlertDescription className="ml-2 text-[#F44336] text-xs font-medium">{orderError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-[#3a8fb7] text-[#3a8fb7] hover:bg-[#3a8fb7]/20 h-10 text-xs"
                        onClick={() => setCheckoutStep(1)}
                      >
                        <ArrowLeft className="mr-1 h-3 w-3" />
                        Volver al carrito
                      </Button>

                      <Button
                        onClick={processOrder}
                        className="flex-1 bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white shadow-md shadow-[#3a8fb7]/20 h-10 text-xs"
                        disabled={processingOrder || !formValid}
                      >
                        {processingOrder ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Procesando...
                          </>
                        ) : userRole === 'operario' ? (
                          <>
                            <CreditCard className="mr-1 h-3 w-3" />
                            Enviar pedido
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-1 h-3 w-3" />
                            Realizar pedido
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Mensaje de campos requeridos si el formulario no es válido */}
                    {!formValid && (
                      <div className="mt-2 text-sm text-[#F44336]">
                        <AlertTriangle className="inline-block w-3 h-3 mr-1" />
                        Por favor, seleccione un cliente y un subservicio para continuar.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones desktop para Step 2 */}
              <div className="hidden md:block">
                {checkoutStep === 2 && (
                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="outline"
                      className="border-[#3a8fb7] text-[#3a8fb7] hover:bg-[#3a8fb7]/20"
                      onClick={() => setCheckoutStep(1)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al carrito
                    </Button>

                    <Button
                      onClick={processOrder}
                      className="bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white shadow-md shadow-[#3a8fb7]/20"
                      disabled={processingOrder || !formValid}
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

                {/* Mensaje de campos requeridos si el formulario no es válido - desktop */}
                {checkoutStep === 2 && !formValid && (
                  <div className="mt-2 text-sm text-[#F44336] text-center">
                    <AlertTriangle className="inline-block w-4 h-4 mr-1" />
                    Por favor, seleccione un cliente y un subservicio para continuar.
                  </div>
                )}
              </div>
            </div>

            {/* Resumen de compra */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-20">
                {/* Móvil - Botón para proceder */}
                {checkoutStep === 1 && (
                  <div className="block md:hidden">
                    <Button
                      onClick={() => setCheckoutStep(2)}
                      className="w-full bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white shadow-md shadow-[#3a8fb7]/20 h-12 text-base mb-4"
                    >
                      Proceder a confirmar
                    </Button>
                  </div>
                )}

                <Card className="bg-gradient-to-br from-[#3a8fb7]/60 to-[#a8e6cf]/60 backdrop-blur-md border border-[#3a8fb7] shadow-lg shadow-[#3a8fb7]/10">
                  <CardHeader className="border-b border-[#3a8fb7]/50 py-3 md:py-4">
                    <CardTitle className="text-white text-lg">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4 pt-4 md:pt-5">
                    <div className="flex justify-between text-sm text-white">
                      <span>Subtotal:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-white">
                      <span>Productos:</span>
                      <span>{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</span>
                    </div>

                    {/* Lista de productos en resumen - Mejorado para desktop */}
                    <div className="hidden md:block">
                      <Separator className="bg-white/30 my-2" />
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-white/40 scrollbar-track-transparent">
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between py-1 text-white text-xs">
                            <span className="truncate mr-2 max-w-[70%] flex items-center">
                              {item.name} 
                              <span className="ml-1 text-white/80">x{item.quantity}</span>
                              {item.isCombo && (
                                <Badge className="ml-1 bg-white text-[#3a8fb7] border border-[#3a8fb7] text-[10px]">
                                  <Package size={8} className="mr-0.5" />
                                  Combo
                                </Badge>
                              )}
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mostrar información del supervisor para operarios */}
                    {userRole === 'operario' && supervisorName && (
                      <div className="bg-white/20 rounded-md p-2 text-xs text-white border border-white/50">
                        <div className="flex items-center mb-1 text-white">
                          <UserCircle2 className="h-3 w-3 mr-1" />
                          <span className="font-medium">Información de pedido</span>
                        </div>
                        <p>Supervisor: <span className="font-bold">{supervisorName}</span></p>
                        <p className="text-white/80 text-[10px] mt-1">
                          El pedido requiere aprobación
                        </p>
                      </div>
                    )}

                    {/* Información de subservicios asignados para operarios */}
                    {userRole === 'operario' && subserviciosAsignados.length > 0 && (
                      <div className="bg-white/20 rounded-md p-2 text-xs text-white border border-white/50">
                        <div className="flex items-center mb-1 text-white">
                          <PackageOpen className="h-3 w-3 mr-1" />
                          <span className="font-medium">Subservicios asignados</span>
                        </div>
                        <p className="text-white/80 text-[10px] mt-1">
                          {subserviciosAsignados.length} subservicios disponibles
                        </p>
                      </div>
                    )}

                    <Separator className="bg-white/30" />

                    <div className="flex justify-between font-semibold text-lg text-white">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="px-4 py-3 md:py-4">
                    {checkoutStep === 1 ? (
                      <Button
                        onClick={() => setCheckoutStep(2)}
                        className="w-full bg-white hover:bg-[#d4f1f9] text-[#3a8fb7] shadow-md transition-all duration-300 hover:shadow-lg font-medium hidden md:flex"
                        disabled={items.length === 0}
                      >
                        Proceder a confirmar el pedido
                      </Button>
                    ) : (
                      <div className="w-full text-center text-xs md:text-sm text-white">
                        <p>Revisa tu pedido y completa la información requerida.</p>
                      </div>
                    )}
                  </CardFooter>
                </Card>

                {/* Políticas de pedido - Versión móvil simplificada */}
                <div className="mt-4 p-3 md:p-4 bg-gradient-to-br from-[#d4f1f9]/20 to-[#a8e6cf]/20 backdrop-blur-sm rounded-lg border border-[#3a8fb7] shadow-md">
                  <h3 className="flex items-center text-xs md:text-sm font-medium mb-2 text-[#3a8fb7]">
                    <Check className="text-[#3a8fb7] mr-2 h-3 w-3 md:h-4 md:w-4" />
                    Política de pedidos
                  </h3>
                  {userRole === 'operario' ? (
                    <p className="text-xs text-[#4a4a4a]">
                      Los pedidos requieren aprobación del supervisor antes de ser procesados.
                      Solo puedes realizar pedidos en los subservicios que te han sido asignados.
                    </p>
                  ) : (
                    <p className="text-xs text-[#4a4a4a]">
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

export default React.memo(Cart);