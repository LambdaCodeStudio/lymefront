import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Menu, X, LogOut, Search, Settings, ClipboardList, Users, Clock } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/providers/CartProvider';
import { CreateTemporalUserModal } from './CreateTemporalUserModal'; // Importamos el nuevo componente modal

export const ShopNavbar: React.FC = () => {
  // Removed useAuthContext to fix error
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };
  const { items } = useCartContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Estado para controlar la visibilidad del modal de creación de usuarios temporales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Get user role from localStorage
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
  }, []);

  const isAdmin = userRole === 'admin' || userRole === 'supervisor';
  const isBasic = userRole === 'basic'; // Nuevo estado para verificar si es usuario básico

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setCartItemCount(items.reduce((acc, item) => acc + item.quantity, 0));
  }, [items]);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#00888A] bg-opacity-95 backdrop-blur-lg shadow-lg py-2' 
            : 'bg-gradient-to-r from-[#00888A]/90 to-[#50C3AD]/90 backdrop-blur-md py-4'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/shop" className="flex items-center">
                <span className="text-2xl font-bold text-white">
                  LYME<span className="text-[#D4F5E6]"> S.A</span>
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/shop" 
                className="text-white hover:text-[#D4F5E6] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Inicio
              </a>
              <a 
                href="/shop?category=limpieza" 
                className="text-white hover:text-[#D4F5E6] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Limpieza
              </a>
              <a 
                href="/shop?category=mantenimiento" 
                className="text-white hover:text-[#D4F5E6] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Mantenimiento
              </a>
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[#D4F5E6] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Favoritos
              </a>
              <a 
                href="/orders" 
                className="text-white hover:text-[#D4F5E6] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                Mis Pedidos
              </a>
              
              {/* Nuevo enlace para administrar usuarios temporales - visible sólo para usuarios básicos */}
              {isBasic && (
                <a 
                  href="/temporal-users" 
                  className="text-white hover:text-[#D4F5E6] transition-colors text-sm font-medium uppercase tracking-wide"
                >
                  Usuarios Temp
                </a>
              )}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-white hover:text-[#D4F5E6] transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>

              <a 
                href="/orders" 
                className="hidden sm:flex text-white hover:text-[#D4F5E6] transition-colors"
                aria-label="Mis Pedidos"
              >
                <ClipboardList className="w-5 h-5" />
              </a>

              <a 
                href="/cart" 
                className="relative text-white hover:text-[#D4F5E6] transition-colors"
                aria-label="Carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#80CFB0] text-[#00888A] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </a>

              {/* Nuevo botón para usuarios básicos */}
              {isBasic && (
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="hidden md:flex items-center text-sm font-medium text-white rounded transition-colors"
                  aria-label="Crear Usuario Temporal"
                >
                  <Users className="w-5 h-5" />
                  <Clock className="w-3 h-3" />
                </button>
              )}

              <div className="hidden md:flex space-x-2">
                {isAdmin && (
                  <a 
                    href="/admin"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#80CFB0]/30 hover:bg-[#80CFB0]/40 rounded transition-colors"
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
            className="fixed top-[60px] left-0 right-0 bg-[#00888A] bg-opacity-95 backdrop-blur-lg z-40 p-4 border-b border-[#50C3AD]/50 shadow-lg"
          >
            <div className="container mx-auto">
              <div className="flex items-center">
                <Input 
                  type="text" 
                  placeholder="Buscar productos..." 
                  className="w-full focus:ring-2 focus:ring-[#80CFB0] bg-white/10 border-[#50C3AD] text-white placeholder-white/60"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  className="ml-2 bg-[#D4F5E6] hover:bg-white text-[#00888A]"
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
            className="fixed inset-x-0 top-[60px] bg-[#00888A] bg-opacity-95 backdrop-blur-xl z-40 md:hidden border-b border-[#50C3AD]/50"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
              <a 
                href="/shop" 
                className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </a>
              <a 
                href="/shop?category=limpieza" 
                className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Limpieza
              </a>
              <a 
                href="/shop?category=mantenimiento" 
                className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Mantenimiento
              </a>
              <a 
                href="/shop?view=favorites" 
                className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Favoritos
              </a>
              <a 
                href="/orders" 
                className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <ClipboardList className="w-5 h-5 mr-2" />
                Mis Pedidos
              </a>
              
              {/* Nuevo enlace móvil para usuarios temporales */}
              {isBasic && (
                <a 
                  href="/temporal-users" 
                  className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Usuarios Temporales
                </a>
              )}
              
              {/* Botón móvil para crear usuario temporal */}
              {isBasic && (
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="text-white hover:text-[#D4F5E6] transition-colors py-2 border-b border-[#50C3AD]/30 text-lg flex items-center"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Crear Usuario Temporal
                </button>
              )}
              
              <div className="pt-4 flex flex-col space-y-3">
                {isAdmin && (
                  <a 
                    href="/admin"
                    className="flex justify-center items-center py-2 text-white bg-[#80CFB0]/30 hover:bg-[#80CFB0]/40 rounded transition-colors"
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

      {/* Modal para crear usuario temporal */}
      <CreateTemporalUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Espacio para que el contenido no quede debajo del navbar */}
      <div className="h-16 md:h-20"></div>
    </>
  );
};