import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Menu, X, LogOut, Settings, ClipboardList, BookCheck, Bell, ChevronDown, Home, Heart, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/providers/CartProvider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Interface for the user updated according to the new backend
interface UserData {
  id?: string;
  _id?: string;
  role?: string;
  secciones?: string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  email?: string;
  isActive?: boolean;
  isAdmin?: boolean;
  isSupervisorDeSupervisores?: boolean;
  isSupervisor?: boolean;
  isOperario?: boolean;
}

export const ShopNavbar: React.FC = () => {
  const logout = () => {
    // Clear all localStorage, including the cart
    localStorage.clear();
    window.location.href = '/login';
  };
  
  const { items } = useCartContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [rejectedOrders, setRejectedOrders] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // URL base para la API, ajustada para el nuevo backend
  const API_BASE_URL = 'http://localhost:3000/api';

  // Obtener información del usuario del localStorage y API
  useEffect(() => {
    // Recuperar datos del localStorage
    const role = localStorage.getItem('userRole');
    const secciones = localStorage.getItem('userSecciones');
    
    setUserRole(role);
    setUserSecciones(secciones);

    // Intentar obtener datos completos del usuario
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.user) {
            // El nuevo backend devuelve la estructura {success: true, user: {...}}
            setUserData(data.user);
            
            // Actualizar localStorage con datos más recientes
            if (data.user.role) localStorage.setItem('userRole', data.user.role);
            if (data.user.secciones) localStorage.setItem('userSecciones', data.user.secciones);
            if (data.user.id || data.user._id) {
              const userId = data.user.id || data.user._id;
              localStorage.setItem('userId', userId);
            }
            
            // Actualizar estados con datos frescos
            setUserRole(data.user.role);
            setUserSecciones(data.user.secciones);
            
            // Si es supervisor, obtener el número de pedidos pendientes
            if (data.user.role === 'supervisor') {
              fetchPendingApprovals(data.user.id || data.user._id, 'supervisor');
            }
            // Si es operario, obtener el número de pedidos rechazados
            else if (data.user.role === 'operario') {
              fetchPendingApprovals(data.user.id || data.user._id, 'operario');
            }
          }
        } else {
          console.warn('Error al obtener datos del usuario:', response.status);
          // Si hay un error de autenticación, redirigir al login
          if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
      }
    };

    fetchUserData();
  }, []);
  
  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);
  
  // Obtener el número de pedidos pendientes para supervisores o rechazados para operarios
  const fetchPendingApprovals = async (userId: string, role: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      let endpoint = '';
      
      // Determinar el endpoint según el rol del usuario
      if (role === 'supervisor') {
        // Para supervisores: obtener pedidos pendientes de aprobación
        endpoint = `${API_BASE_URL}/pedido/supervisor/${userId}`;
      } else if (role === 'operario') {
        // Para operarios: obtener pedidos rechazados donde el operario es el creador
        endpoint = `${API_BASE_URL}/pedido/operario/${userId}/rechazados`;
      } else {
        return;
      }
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar que tenemos un array de pedidos
        if (Array.isArray(data)) {
          if (role === 'supervisor') {
            // Filtrar explícitamente los pedidos con estado "pendiente"
            const pendingOrders = data.filter(pedido => pedido.estado === 'pendiente');
            const pendingCount = pendingOrders.length;
            
            console.log(`Total de pedidos del supervisor: ${data.length}`);
            console.log(`Pedidos pendientes por aprobar: ${pendingCount}`);
            
            // Actualizar el contador solo con los pedidos pendientes
            setPendingApprovals(pendingCount);
          } else if (role === 'operario') {
            // Filtrar explícitamente los pedidos con estado "rechazado"
            const rejected = data.filter(pedido => pedido.estado === 'rechazado');
            const rejectedCount = rejected.length;
            
            console.log(`Total de pedidos creados por el operario: ${data.length}`);
            console.log(`Pedidos rechazados: ${rejectedCount}`);
            
            // Actualizar el contador de pedidos rechazados
            setRejectedOrders(rejectedCount);
          }
        } else {
          console.warn("La respuesta no es un array de pedidos:", data);
          if (role === 'supervisor') {
            setPendingApprovals(0);
          } else if (role === 'operario') {
            setRejectedOrders(0);
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      if (role === 'supervisor') {
        setPendingApprovals(0);
      } else if (role === 'operario') {
        setRejectedOrders(0);
      }
    }
  };

  // Effect to handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to update cart counter
  useEffect(() => {
    setCartItemCount(items.reduce((acc, item) => acc + item.quantity, 0));
  }, [items]);

  // Determine permissions based on role
  const isAdmin = userRole === 'admin';
  const isSupervisorDeSupervisores = userRole === 'supervisor_de_supervisores';
  const isSupervisor = userRole === 'supervisor';
  const isOperario = userRole === 'operario';
  const canAccessAdmin = isAdmin || isSupervisorDeSupervisores;
  
  // Only show "My Orders" for supervisors
  const canViewOrders = isSupervisor;

  // Get the user's initials for the Avatar
  const getUserInitials = () => {
    if (userData?.nombre && userData?.apellido) {
      return `${userData.nombre.charAt(0)}${userData.apellido.charAt(0)}`.toUpperCase();
    } else if (userData?.nombre) {
      return userData.nombre.substring(0, 2).toUpperCase();
    } else if (userData?.usuario) {
      return userData.usuario.substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#3a8fb7] shadow-lg py-2'
            : 'bg-gradient-to-r from-[#3a8fb7] to-[#2a7a9f] py-3'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/shop" className="flex items-center">
                <span className="text-2xl font-bold text-white">
                  LYME<span className="text-[#a8e6cf]"> S.A</span>
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/shop" 
                className="text-white hover:text-[#a8e6cf] transition-colors duration-200 text-sm font-medium"
              >
                <Home className="w-4 h-4 inline-block mr-1 mb-0.5" />
                INICIO
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-white hover:text-[#d4f1f9] transition-colors duration-200 text-sm font-medium"
                >
                  LIMPIEZA
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-white hover:text-[#d4f1f9] transition-colors duration-200 text-sm font-medium"
                >
                  MANTENIMIENTO
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[#a8e6cf] transition-colors duration-200 text-sm font-medium"
              >
                <Heart className="w-4 h-4 inline-block mr-1 mb-0.5" />
                FAVORITOS
              </a>
              
              {/* Mostrar "Mis Pedidos" solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="text-white hover:text-[#d4f1f9] transition-colors duration-200 text-sm font-medium"
                >
                  <ClipboardList className="w-4 h-4 inline-block mr-1 mb-0.5" />
                  MIS PEDIDOS
                </a>
              )}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {/* My Orders for mobile - only for specific roles */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="hidden sm:flex text-white hover:text-[#a8e6cf] transition-colors duration-200"
                  aria-label="Mis Pedidos"
                >
                  <ClipboardList className="w-5 h-5" />
                </a>
              )}

              {/* Show badge with pending orders for supervisors */}
              {isSupervisor && pendingApprovals > 0 && (
                <a 
                  href="/orders?tab=porAprobar" 
                  className="relative text-white hover:text-[#d4f1f9] transition-colors duration-200"
                  aria-label="Pedidos por Aprobar"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-[#a8e6cf] text-[#3a8fb7] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                </a>
              )}

              {/* Show badge with rejected orders for operators */}
              {isSupervisor && rejectedOrders > 0 && (
                <a 
                  href="/orders?tab=rechazados" 
                  className="relative text-white hover:text-[#d4f1f9] transition-colors duration-200"
                  aria-label="Pedidos Rechazados"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-[#F44336] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {rejectedOrders}
                  </span>
                </a>
              )}

              <a 
                href="/shop?view=favorites"
                className="text-white hover:text-[#a8e6cf] transition-colors duration-200 hidden sm:block"
                aria-label="Favoritos"
              >
                <Heart className="w-5 h-5" />
              </a>

              <a 
                href="/cart" 
                className="relative text-white hover:text-[#a8e6cf] transition-colors duration-200"
                aria-label="Carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#a8e6cf] text-[#3a8fb7] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </a>

              {/* Avatar and Dropdown Menu */}
              <div className="hidden md:block relative" ref={userMenuRef}>
                <div 
                  className="flex items-center cursor-pointer"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <Avatar className="h-8 w-8 border-2 border-[#a8e6cf] hover:border-white transition-colors duration-200">
                    <AvatarFallback className="bg-[#d4f1f9] text-[#3a8fb7] text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                    <AvatarImage src={userData?.imagen || ''} />
                  </Avatar>
                  <ChevronDown className={`ml-1 w-4 h-4 text-white transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Dropdown menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-60 rounded-lg shadow-lg overflow-hidden bg-white ring-1 ring-[#3a8fb7]/10 z-50"
                    >
                      <div className="py-3 bg-gradient-to-r from-[#3a8fb7]/10 to-[#a8e6cf]/10 text-[#333333] px-4">
                        <p className="text-sm font-medium">{userData?.nombre} {userData?.apellido}</p>
                        <p className="text-xs opacity-80">{userData?.usuario || userData?.email}</p>
                      </div>
                      <div className="py-1">
                        <a
                          href="/shop"
                          className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                        >
                          <Home className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                          Inicio
                        </a>
                        <a
                          href="/shop?view=favorites"
                          className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                        >
                          <Heart className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                          Mis Favoritos
                        </a>
                        {canViewOrders && (
                          <a
                            href="/orders"
                            className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                          >
                            <ClipboardList className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                            Mis Pedidos
                          </a>
                        )}
                        {/* Show "Orders to Approve" only when there are pending orders */}
                        {isSupervisor && pendingApprovals > 0 && (
                          <a
                            href="/orders?tab=porAprobar"
                            className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                          >
                            <Bell className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                            Pedidos por Aprobar
                            <Badge className="ml-2 bg-[#a8e6cf] text-[#3a8fb7]">{pendingApprovals}</Badge>
                          </a>
                        )}
                        {/* Show "Rejected Orders" for operators */}
                        {isSupervisor && rejectedOrders > 0 && (
                          <a
                            href="/orders?tab=rechazados"
                            className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2 text-[#F44336]" />
                            Pedidos Rechazados
                            <Badge className="ml-2 bg-[#F44336] text-white">{rejectedOrders}</Badge>
                          </a>
                        )}
                        {/* Show "Created Orders" for operators and supervisors */}
                        {(isSupervisor || isSupervisor) && (
                          <a
                            href="/orders?tab=creados"
                            className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                          >
                            <BookCheck className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                            Pedidos Creados
                          </a>
                        )}
                        {canAccessAdmin && (
                          <a
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-[#333333] hover:bg-[#d4f1f9]/30"
                          >
                            <Settings className="w-4 h-4 mr-2 text-[#3a8fb7]" />
                            Panel Admin
                          </a>
                        )}
                        <div className="h-px bg-gray-200 my-1"></div>
                        <button
                          onClick={logout}
                          className="flex w-full items-center px-4 py-2 text-sm text-[#F44336] hover:bg-[#F44336]/10"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar sesión
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden text-white" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[60px] bg-white bg-opacity-98 backdrop-blur-xl z-40 md:hidden border-b border-[#3a8fb7]/20 shadow-lg"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col space-y-1">
              {/* Mobile user */}
              {userData && (
                <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-[#3a8fb7]/20">
                  <Avatar className="h-10 w-10 border-2 border-[#3a8fb7]">
                    <AvatarFallback className="bg-[#d4f1f9] text-[#3a8fb7]">
                      {getUserInitials()}
                    </AvatarFallback>
                    <AvatarImage src={userData?.imagen || ''} />
                  </Avatar>
                  <div>
                    <p className="text-[#333333] font-medium">{userData.nombre} {userData.apellido}</p>
                    <p className="text-[#7c7c7c] text-sm">{userData.usuario || userData.email}</p>
                  </div>
                </div>
              )}
              
              <a 
                href="/shop" 
                className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                <Home className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                <span>Inicio</span>
              </a>
              
              {/* Only show Cleaning if you have permissions for this section */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="w-5 h-5 mr-3 flex items-center justify-center text-[#3a8fb7]">🧹</span>
                  <span>Limpieza</span>
                </a>
              )}
              
              {/* Only show Maintenance if you have permissions for this section */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="w-5 h-5 mr-3 flex items-center justify-center text-[#3a8fb7]">🔧</span>
                  <span>Mantenimiento</span>
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                <Heart className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                <span>Favoritos</span>
              </a>
              
              <a 
                href="/cart" 
                className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                <span>Carrito</span>
                {cartItemCount > 0 && (
                  <Badge className="ml-2 bg-[#a8e6cf] text-[#3a8fb7]">{cartItemCount}</Badge>
                )}
              </a>
              
              {/* Show "My Orders" only for specific roles */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ClipboardList className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                  <span>Mis Pedidos</span>
                </a>
              )}
              
              {/* Show "Orders to Approve" only when there are pending orders */}
              {isSupervisor && pendingApprovals > 0 && (
                <a 
                  href="/orders?tab=porAprobar" 
                  className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Bell className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                  <span>Pedidos por Aprobar</span>
                  <Badge className="ml-2 bg-[#a8e6cf] text-[#3a8fb7]">{pendingApprovals}</Badge>
                </a>
              )}

              {/* Show "Rejected Orders" for operators */}
              {isSupervisor && rejectedOrders > 0 && (
                <a 
                  href="/orders?tab=rechazados" 
                  className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <AlertTriangle className="w-5 h-5 mr-3 text-[#F44336]" />
                  <span>Pedidos Rechazados</span>
                  <Badge className="ml-2 bg-[#F44336] text-white">{rejectedOrders}</Badge>
                </a>
              )}

              {/* Show "Created Orders" for operators and supervisors */}
              {(isSupervisor || isSupervisor) && (
                <a 
                  href="/orders?tab=creados" 
                  className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <BookCheck className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                  <span>Pedidos Creados</span>
                </a>
              )}
              
              <div className="pt-4 mt-2 border-t border-[#3a8fb7]/10">
                {canAccessAdmin && (
                  <a 
                    href="/admin"
                    className="flex items-center text-[#333333] hover:bg-[#d4f1f9]/30 hover:text-[#3a8fb7] transition-colors py-3 px-3 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 mr-3 text-[#3a8fb7]" />
                    <span>Panel de Administración</span>
                  </a>
                )}
                <button 
                  className="flex items-center w-full text-[#F44336] hover:bg-[#F44336]/10 transition-colors py-3 px-3 rounded-lg mt-2"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Space so content doesn't get hidden under the navbar */}
      <div className="h-16 md:h-16"></div>
    </>
  );
};