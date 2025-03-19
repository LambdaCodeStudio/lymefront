import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Menu, X, LogOut, Search, Settings, ClipboardList, BookCheck, Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/providers/CartProvider';
import { getApiUrl } from '@/utils/apiUtils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Interfaz para el usuario
interface UserData {
  _id?: string;
  id?: string;
  role?: string;
  secciones?: string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  email?: string;
}

export const ShopNavbar: React.FC = () => {
  const logout = () => {
    // Limpiar todo el localStorage, incluyendo el carrito
    localStorage.clear();
    window.location.href = '/login';
  };
  
  const { items } = useCartContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

<<<<<<< HEAD
        const response = await fetch('http://localhost:4000/api/auth/me', {
=======
        const response = await fetch('http://179.43.118.101:3000/api/auth/me', {
>>>>>>> server
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          
          // Actualizar localStorage con datos más recientes
          if (data.role) localStorage.setItem('userRole', data.role);
          if (data.secciones) localStorage.setItem('userSecciones', data.secciones);
          
          // Actualizar estados con datos frescos
          setUserRole(data.role);
          setUserSecciones(data.secciones);
          
          // Si es supervisor, obtener el número de pedidos pendientes
          if (data.role === 'supervisor') {
            fetchPendingApprovals();
          }
        }
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
      }
    };

    fetchUserData();
  }, []);
  
  // Cerrar menú de usuario cuando se hace clic fuera
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
  
  // Obtener el número de pedidos pendientes para supervisores
  const fetchPendingApprovals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('http://localhost:4000/api/pedido', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Filtrar pedidos pendientes creados por operarios que este supervisor supervisa
        const pendingCount = data.filter(order => 
          order.estado === 'pendiente' && 
          order.metadata?.creadoPorOperario &&
          order.metadata?.supervisorId === (userData?._id || userData?.id)
        ).length;
        
        setPendingApprovals(pendingCount);
      }
    } catch (error) {
      console.error('Error al obtener pedidos pendientes:', error);
    }
  };

  // Efecto para manejar scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Efecto para actualizar contador de carrito
  useEffect(() => {
    setCartItemCount(items.reduce((acc, item) => acc + item.quantity, 0));
  }, [items]);

  // Determinar permisos según rol
  const isAdmin = userRole === 'admin';
  const isSupervisorDeSupervisores = userRole === 'supervisor_de_supervisores';
  const isSupervisor = userRole === 'supervisor';
  const isOperario = userRole === 'operario';
  const canAccessAdmin = isAdmin || isSupervisorDeSupervisores;
  
  // Solo mostrar "Mis Pedidos" para roles específicos (no admin ni supervisor de supervisores)
  const canViewOrders = !isAdmin && !isSupervisorDeSupervisores;

  // Obtener las iniciales del usuario para el Avatar
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

  // Conseguir gradiente actual basado en los colores del Footer
  const getNavbarGradient = () => {
    return scrolled 
      ? 'bg-[#0D4E4B]' 
      : 'bg-gradient-to-r from-[#1B9C96] to-[#139692]';
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          getNavbarGradient()
        } ${scrolled ? 'shadow-lg py-2' : 'py-4'}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/shop" className="flex items-center">
                <span className="text-2xl font-bold text-white">
                  LYME<span className="text-[#F2A516]"> S.A</span>
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/shop" 
                className="text-white hover:text-[#F2A516] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Inicio
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-white hover:text-[#CFF2E4] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Limpieza
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-white hover:text-[#84D6C8] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Mantenimiento
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[#F2A516] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Favoritos
              </a>
              
              {/* Mostrar "Mis Pedidos" solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="text-white hover:text-[#CFF2E4] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Mis Pedidos
                </a>
              )}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-white hover:text-[#84D6C8] transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Mis Pedidos para móvil - solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="hidden sm:flex text-white hover:text-[#F2A516] transition-colors"
                  aria-label="Mis Pedidos"
                >
                  <ClipboardList className="w-5 h-5" />
                </a>
              )}

              {/* Mostrar badge con pedidos pendientes para supervisores */}
              {isSupervisor && pendingApprovals > 0 && (
                <a 
                  href="/orders?tab=porAprobar" 
                  className="relative text-white hover:text-[#CFF2E4] transition-colors"
                  aria-label="Pedidos por Aprobar"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-[#F2A516] text-[#0D4E4B] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                </a>
              )}

              <a 
                href="/cart" 
                className="relative text-white hover:text-[#84D6C8] transition-colors"
                aria-label="Carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#F2A516] text-[#0D4E4B] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </a>

              {/* Avatar y Menú Desplegable */}
              <div className="hidden md:block relative" ref={userMenuRef}>
                <div 
                  className="flex items-center cursor-pointer"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <Avatar className="border-2 border-[#84D6C8] hover:border-white transition-colors">
                    <AvatarFallback className="bg-[#F8FDFC] text-[#1B9C96] text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className={`ml-1 w-4 h-4 text-white transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Menú desplegable */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-[#1B9C96] ring-opacity-50 z-50"
                    >
                      <div className="py-2 bg-[#CFF2E4] text-[#0D4E4B] rounded-t-md px-4">
                        <p className="text-sm font-medium">{userData?.nombre} {userData?.apellido}</p>
                        <p className="text-xs opacity-80">{userData?.usuario || userData?.email}</p>
                      </div>
                      <div className="py-1">
                        {canAccessAdmin && (
                          <a
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-[#0D4E4B] hover:bg-[#1B9C96]/10 hover:text-[#1B9C96]"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Panel Admin
                          </a>
                        )}
                        <button
                          onClick={logout}
                          className="flex w-full items-center px-4 py-2 text-sm text-[#0D4E4B] hover:bg-[#1B9C96]/10 hover:text-[#1B9C96]"
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

      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[60px] left-0 right-0 bg-[#0D4E4B] bg-opacity-95 backdrop-blur-lg z-40 p-4 border-b border-[#1B9C96]/50 shadow-lg"
          >
            <div className="container mx-auto">
              <div className="flex items-center">
                <Input 
                  type="text" 
                  placeholder="Buscar productos..." 
                  className="w-full focus:ring-2 focus:ring-[#1B9C96] bg-white border-[#1B9C96] text-[#0D4E4B] placeholder-[#4A7C79]"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  className="ml-2 bg-[#1B9C96] hover:bg-[#139692] text-white font-medium"
                >
                  Buscar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[60px] bg-[#F8FDFC] bg-opacity-95 backdrop-blur-xl z-40 md:hidden border-b border-[#1B9C96]/50"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
              {/* Usuario móvil */}
              {userData && (
                <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-[#1B9C96]/30">
                  <Avatar className="border-2 border-[#1B9C96]">
                    <AvatarFallback className="bg-[#CFF2E4] text-[#0D4E4B]">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[#0D4E4B] font-medium">{userData.nombre} {userData.apellido}</p>
                    <p className="text-[#4A7C79] text-sm opacity-80">{userData.usuario || userData.email}</p>
                  </div>
                </div>
              )}
              
              <a 
                href="/shop" 
                className="text-[#0D4E4B] hover:text-[#1B9C96] transition-colors py-2 border-b border-[#1B9C96]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-[#0D4E4B] hover:text-[#1B9C96] transition-colors py-2 border-b border-[#1B9C96]/30 text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Limpieza
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-[#0D4E4B] hover:text-[#29696B] transition-colors py-2 border-b border-[#1B9C96]/30 text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Mantenimiento
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-[#0D4E4B] hover:text-[#F2A516] transition-colors py-2 border-b border-[#1B9C96]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Favoritos
              </a>
              
              {/* Mostrar "Mis Pedidos" solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="text-[#0D4E4B] hover:text-[#1B9C96] transition-colors py-2 border-b border-[#1B9C96]/30 text-lg flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ClipboardList className="w-5 h-5 mr-2" />
                  Mis Pedidos
                </a>
              )}
              
              {/* Mostrar "Pedidos por Aprobar" para supervisores */}
              {isSupervisor && (
                <a 
                  href="/orders?tab=porAprobar" 
                  className="text-[#0D4E4B] hover:text-[#1B9C96] transition-colors py-2 border-b border-[#1B9C96]/30 text-lg flex items-center relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Pedidos por Aprobar
                  {pendingApprovals > 0 && (
                    <Badge className="ml-2 bg-[#F2A516] text-[#0D4E4B]">{pendingApprovals}</Badge>
                  )}
                </a>
              )}
              
              <div className="pt-4 flex flex-col space-y-3">
                {canAccessAdmin && (
                  <a 
                    href="/admin"
                    className="flex justify-center items-center py-2 text-white bg-[#1B9C96] hover:bg-[#29696B] rounded transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    Panel de Administración
                  </a>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-[#0D4E4B] bg-[#1B9C96]/10 hover:bg-[#1B9C96]/20"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Espacio para que el contenido no quede debajo del navbar */}
      <div className="h-16 md:h-20"></div>
    </>
  );
};