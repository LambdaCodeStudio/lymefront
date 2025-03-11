import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Menu, X, LogOut, Search, Settings, ClipboardList, BookCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/providers/CartProvider';

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
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userSecciones');
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

        const response = await fetch('https://lyme-back.vercel.app/api/auth/me', {
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
        }
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
      }
    };

    fetchUserData();
  }, []);

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
  const canViewOrders = true; // Todos los roles pueden ver sus pedidos

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#15497E] bg-opacity-95 backdrop-blur-lg shadow-lg py-2' 
            : 'bg-gradient-to-r from-[#15497E]/90 to-[#2A82C7]/90 backdrop-blur-md py-4'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/shop" className="flex items-center">
                <span className="text-2xl font-bold text-white">
                  LYME<span className="text-[#F8F9FA]"> S.A</span>
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/shop" 
                className="text-white hover:text-[#F8F9FA] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Inicio
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-white hover:text-[#F8F9FA] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Limpieza
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-white hover:text-[#F8F9FA] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Mantenimiento
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[#F8F9FA] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Favoritos
              </a>
              
              {/* Todos pueden ver sus pedidos */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="text-white hover:text-[#F8F9FA] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Mis Pedidos
                </a>
              )}
              
              {/* Supervisores tienen acceso a aprobar pedidos */}
              {/* {isSupervisor && (
                <a 
                  href="/approve-orders" 
                  className="text-white hover:text-[#F8F9FA] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Aprobar Pedidos
                </a>
              )} */}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-white hover:text-[#F8F9FA] transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Mis Pedidos para móvil */}
              {canViewOrders && (
                <a 
                  href="/orders" 
                  className="hidden sm:flex text-white hover:text-[#F8F9FA] transition-colors"
                  aria-label="Mis Pedidos"
                >
                  <ClipboardList className="w-5 h-5" />
                </a>
              )}

              {/* Aprobar Pedidos para supervisores */}
              {isSupervisor && (
                <a 
                  href="/approve-orders" 
                  className="hidden sm:flex text-white hover:text-[#F8F9FA] transition-colors"
                  aria-label="Aprobar Pedidos"
                >
                  <BookCheck className="w-5 h-5" />
                </a>
              )}

              <a 
                href="/cart" 
                className="relative text-white hover:text-[#F8F9FA] transition-colors"
                aria-label="Carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF6B35] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </a>

              <div className="hidden md:flex space-x-2">
                {canAccessAdmin && (
                  <a 
                    href="/admin"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#2A82C7]/30 hover:bg-[#2A82C7]/40 rounded transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin
                  </a>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white bg-white/10 hover:bg-white/20"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
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
            className="fixed top-[60px] left-0 right-0 bg-[#15497E] bg-opacity-95 backdrop-blur-lg z-40 p-4 border-b border-[#2A82C7]/50 shadow-lg"
          >
            <div className="container mx-auto">
              <div className="flex items-center">
                <Input 
                  type="text" 
                  placeholder="Buscar productos..." 
                  className="w-full focus:ring-2 focus:ring-[#2A82C7] bg-white/10 border-[#2A82C7] text-white placeholder-white/60"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  className="ml-2 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
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
            className="fixed inset-x-0 top-[60px] bg-[#15497E] bg-opacity-95 backdrop-blur-xl z-40 md:hidden border-b border-[#2A82C7]/50"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
              <a 
                href="/shop" 
                className="text-white hover:text-[#F8F9FA] transition-colors py-2 border-b border-[#2A82C7]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </a>
              
              {/* Solo mostrar Limpieza si tiene permisos para esta sección */}
              {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=limpieza" 
                  className="text-white hover:text-[#F8F9FA] transition-colors py-2 border-b border-[#2A82C7]/30 text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Limpieza
                </a>
              )}
              
              {/* Solo mostrar Mantenimiento si tiene permisos para esta sección */}
              {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                <a 
                  href="/shop?category=mantenimiento" 
                  className="text-white hover:text-[#F8F9FA] transition-colors py-2 border-b border-[#2A82C7]/30 text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Mantenimiento
                </a>
              )}
              
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[#F8F9FA] transition-colors py-2 border-b border-[#2A82C7]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Favoritos
              </a>
              
              {/* Todos pueden ver sus pedidos */}
              <a 
                href="/orders" 
                className="text-white hover:text-[#F8F9FA] transition-colors py-2 border-b border-[#2A82C7]/30 text-lg flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <ClipboardList className="w-5 h-5 mr-2" />
                Mis Pedidos
              </a>
              
              {/* Supervisores tienen acceso a aprobar pedidos */}
              {isSupervisor && (
                <a 
                  href="/approve-orders" 
                  className="text-white hover:text-[#F8F9FA] transition-colors py-2 border-b border-[#2A82C7]/30 text-lg flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <BookCheck className="w-5 h-5 mr-2" />
                  Aprobar Pedidos
                </a>
              )}
              
              <div className="pt-4 flex flex-col space-y-3">
                {canAccessAdmin && (
                  <a 
                    href="/admin"
                    className="flex justify-center items-center py-2 text-white bg-[#2A82C7]/30 hover:bg-[#2A82C7]/40 rounded transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    Panel de Administración
                  </a>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-white bg-white/10 hover:bg-white/20"
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