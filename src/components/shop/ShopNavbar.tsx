import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Menu, X, LogOut, Search, Settings, ClipboardList, BookCheck, Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/providers/CartProvider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Interfaz para el usuario actualizada según el nuevo backend
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
            
            // Actualizar estados con datos frescos
            setUserRole(data.user.role);
            setUserSecciones(data.user.secciones);
            
            // Si es supervisor, obtener el número de pedidos pendientes
            if (data.user.role === 'supervisor') {
              fetchPendingApprovals(data.user.id || data.user._id);
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
  const fetchPendingApprovals = async (supervisorId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Usar el endpoint específico para pedidos por supervisor
      const response = await fetch(`${API_BASE_URL}/pedido/supervisor/${supervisorId}?estado=pendiente`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Actualizar con el conteo de pedidos pendientes
        setPendingApprovals(Array.isArray(data) ? data.length : 0);
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

  // Conseguir gradiente actual basado en los colores definidos en variables CSS
  const getNavbarGradient = () => {
    return scrolled 
      ? 'bg-[var(--accent-secondary)]' 
      : 'bg-[var(--gradient-main)]';
  };

  // Manejar la búsqueda
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const searchInput = form.querySelector('input') as HTMLInputElement;
    const query = searchInput.value.trim();
    
    if (query) {
      window.location.href = `/shop?search=${encodeURIComponent(query)}`;
      setSearchOpen(false);
    }
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
                  LYME<span className="text-[var(--accent-quaternary)]"> S.A</span>
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/shop" 
                className="text-white hover:text-[var(--accent-quaternary)] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Inicio
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-white hover:text-[var(--background-secondary)] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Limpieza
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-white hover:text-[var(--accent-tertiary)] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Mantenimiento
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[var(--accent-quaternary)] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Favoritos
              </a>
              
              {/* Mostrar "Mis Pedidos" solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="text-white hover:text-[var(--background-secondary)] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Mis Pedidos
                </a>
              )}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-white hover:text-[var(--accent-tertiary)] transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Mis Pedidos para móvil - solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="hidden sm:flex text-white hover:text-[var(--accent-quaternary)] transition-colors"
                  aria-label="Mis Pedidos"
                >
                  <ClipboardList className="w-5 h-5" />
                </a>
              )}

              {/* Mostrar badge con pedidos pendientes para supervisores */}
              {isSupervisor && pendingApprovals > 0 && (
                <a 
                  href="/orders?tab=porAprobar" 
                  className="relative text-white hover:text-[var(--background-secondary)] transition-colors"
                  aria-label="Pedidos por Aprobar"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-[var(--accent-quaternary)] text-[var(--text-primary)] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                </a>
              )}

              <a 
                href="/cart" 
                className="relative text-white hover:text-[var(--accent-tertiary)] transition-colors"
                aria-label="Carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--accent-quaternary)] text-[var(--text-primary)] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
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
                  <Avatar className="border-2 border-[var(--accent-tertiary)] hover:border-white transition-colors">
                    <AvatarFallback className="bg-[var(--background-primary)] text-[var(--accent-primary)] text-sm font-medium">
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
                      className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-[var(--accent-primary)] ring-opacity-50 z-50"
                    >
                      <div className="py-2 bg-[var(--background-secondary)] text-[var(--text-primary)] rounded-t-md px-4">
                        <p className="text-sm font-medium">{userData?.nombre} {userData?.apellido}</p>
                        <p className="text-xs opacity-80">{userData?.usuario || userData?.email}</p>
                      </div>
                      <div className="py-1">
                        {canAccessAdmin && (
                          <a
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Panel Admin
                          </a>
                        )}
                        <button
                          onClick={logout}
                          className="flex w-full items-center px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
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
            className="fixed top-[60px] left-0 right-0 bg-[var(--accent-secondary)] bg-opacity-95 backdrop-blur-lg z-40 p-4 border-b border-[var(--accent-primary)]/50 shadow-lg"
          >
            <div className="container mx-auto">
              <form onSubmit={handleSearch} className="flex items-center">
                <Input 
                  type="text" 
                  placeholder="Buscar productos..." 
                  className="w-full focus:ring-2 focus:ring-[var(--accent-primary)] bg-white border-[var(--accent-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                  autoFocus
                />
                <Button 
                  type="submit"
                  size="sm" 
                  className="ml-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-tertiary)] text-white font-medium"
                >
                  Buscar
                </Button>
              </form>
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
            className="fixed inset-x-0 top-[60px] bg-[var(--background-primary)] bg-opacity-95 backdrop-blur-xl z-40 md:hidden border-b border-[var(--accent-primary)]/50"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
              {/* Usuario móvil */}
              {userData && (
                <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-[var(--accent-primary)]/30">
                  <Avatar className="border-2 border-[var(--accent-primary)]">
                    <AvatarFallback className="bg-[var(--background-secondary)] text-[var(--text-primary)]">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">{userData.nombre} {userData.apellido}</p>
                    <p className="text-[var(--text-tertiary)] text-sm opacity-80">{userData.usuario || userData.email}</p>
                  </div>
                </div>
              )}
              
              <a 
                href="/shop" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors py-2 border-b border-[var(--accent-primary)]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors py-2 border-b border-[var(--accent-primary)]/30 text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Limpieza
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-[var(--text-primary)] hover:text-[var(--accent-secondary)] transition-colors py-2 border-b border-[var(--accent-primary)]/30 text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Mantenimiento
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-quaternary)] transition-colors py-2 border-b border-[var(--accent-primary)]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Favoritos
              </a>
              
              {/* Mostrar "Mis Pedidos" solo para roles específicos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors py-2 border-b border-[var(--accent-primary)]/30 text-lg flex items-center"
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
                  className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors py-2 border-b border-[var(--accent-primary)]/30 text-lg flex items-center relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Pedidos por Aprobar
                  {pendingApprovals > 0 && (
                    <Badge className="ml-2 bg-[var(--accent-quaternary)] text-[var(--text-primary)]">{pendingApprovals}</Badge>
                  )}
                </a>
              )}
              
              <div className="pt-4 flex flex-col space-y-3">
                {canAccessAdmin && (
                  <a 
                    href="/admin"
                    className="flex justify-center items-center py-2 text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] rounded transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    Panel de Administración
                  </a>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-[var(--text-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20"
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