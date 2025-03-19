import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@/utils/inventoryUtils';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Heart,
  ShoppingCart,
  Sparkles,
  Package,
  AlertCircle,
  Wrench,
  RefreshCw,
  Loader2,
  ArrowUpDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from './ProductCard';
import { useCartContext } from '@/providers/CartProvider';
import { ShopNavbar } from './ShopNavbar';
import EnhancedPagination from '../admin/components/Pagination';

// Importación segura de useNotification
let useNotification;
try {
  useNotification = require('@/context/NotificationContext').useNotification;
} catch (e) {
  console.warn('NotificationContext no disponible, las notificaciones estarán desactivadas');
  // Crear un hook de reemplazo que devuelve un objeto con una función vacía
  useNotification = () => ({
    addNotification: (message, type) => {
      console.log(`Notificación (${type}): ${message}`);
    }
  });
}

// Tipo para los productos
interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  precio: number;
  stock: number;
  proovedorInfo?: string;
  imagen?: string;
  hasImage?: boolean;
  esCombo?: boolean;
  itemsCombo?: any[];
  createdAt?: string;
  updatedAt?: string;
}

// Componente principal
export const ShopHome: React.FC = () => {
  const { addItem } = useCartContext();
  const queryClient = useQueryClient();

  // Uso seguro de notificaciones
  let notificationHook;
  try {
    notificationHook = typeof useNotification === 'function' ? useNotification() : { addNotification: null };
  } catch (e) {
    console.warn('Error al usar useNotification:', e);
    notificationHook = { addNotification: null };
  }

  const { addNotification } = notificationHook;

  // Estados principales
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortOrder, setSortOrder] = useState<'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'>('newest');
  
  // Estados para paginación local
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Estados para información del usuario
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Efecto para recuperar información de usuario y favoritos
  useEffect(() => {
    const storedSecciones = localStorage.getItem('userSecciones');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedSecciones) {
      setUserSecciones(storedSecciones);
    } else {
      // Si no está en localStorage, intentamos obtenerlo de la API
      fetchUserData();
    }
    
    if (storedRole) {
      setUserRole(storedRole);
    }
    
    // Cargar favoritos de localStorage
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (error) {
        console.error('Error al cargar favoritos:', error);
        localStorage.removeItem('favorites');
      }
    }

    // Verificar si hay filtro por categoría en la URL
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }

    const viewParam = params.get('view');
    if (viewParam === 'favorites') {
      setShowFavorites(true);
    }
  }, []);

  // Obtener datos del usuario
  const fetchUserData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Guardar en localStorage y estado
        if (userData.secciones) {
          localStorage.setItem('userSecciones', userData.secciones);
          setUserSecciones(userData.secciones);
        }
        
        if (userData.role) {
          localStorage.setItem('userRole', userData.role);
          setUserRole(userData.role);
        }
      }
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
    }
  };

  // Función para obtener TODOS los productos de una vez
  const fetchAllProducts = async () => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }
  
    // Determinar filtros de categoría según los permisos del usuario
    let categoryFilter = '';
    if (userSecciones && userSecciones !== 'ambos') {
      categoryFilter = `&category=${userSecciones}`;
    }
    
    // Usar un límite grande para intentar obtener todos los productos
    // Nota: esto podría necesitar ajustes dependiendo de la capacidad del servidor
    const limit = 1000;
    const url = `/api/producto?page=1&limit=${limit}${categoryFilter}`;
    
    console.log(`Fetching all products from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });
  
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userSecciones');
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
      throw new Error(`Error al cargar productos (${response.status})`);
    }
  
    const data = await response.json();
    
    // Procesar la respuesta según su formato
    if (data && data.items && Array.isArray(data.items)) {
      return procesarProductos(data.items);
    } else if (Array.isArray(data)) {
      return procesarProductos(data);
    } else {
      console.error('Formato de respuesta inesperado:', data);
      throw new Error('Formato de respuesta inesperado');
    }
  };

  // Usar React Query para obtener todos los productos
  const { data: allProducts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['allProducts', userSecciones],
    queryFn: fetchAllProducts,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  // Procesar productos según permisos
  const procesarProductos = (data: Product[]): Product[] => {
    // Filtrado por sección según permisos
    let productosFiltrados = data;
    
    if (userSecciones && userSecciones !== 'ambos') {
      productosFiltrados = data.filter(producto => 
        producto.categoria === userSecciones
      );
    }
    
    return productosFiltrados;
  };

  // Efecto para filtrar productos cuando cambian los filtros o los productos
  useEffect(() => {
    if (!allProducts.length) return;

    let result = [...allProducts];

    // Filtrar por búsqueda
    if (searchTerm) {
      result = result.filter(product =>
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.subCategoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      result = result.filter(product =>
        product.categoria === selectedCategory ||
        product.subCategoria === selectedCategory
      );
    }

    // Filtrar por favoritos
    if (showFavorites) {
      result = result.filter(product => favorites.includes(product._id));
    }

    // Solo productos con stock para limpieza, mantenimiento no tiene restricción
    result = result.filter(product => 
      // Para productos de mantenimiento, no filtramos por stock
      product.categoria === 'mantenimiento' || product.stock > 0
    );
    
    // Ordenar según el criterio seleccionado
    result = sortProducts(result, sortOrder);

    setFilteredProducts(result);
    setCurrentPage(1); // Reiniciar a la primera página al cambiar filtros
  }, [allProducts, searchTerm, selectedCategory, showFavorites, favorites, sortOrder]);

  // Función para ordenar productos
  const sortProducts = (items: Product[], order: string) => {
    const sorted = [...items];
    
    switch(order) {
      case 'price-asc':
        return sorted.sort((a, b) => a.precio - b.precio);
      case 'price-desc':
        return sorted.sort((a, b) => b.precio - a.precio);
      case 'name-asc':
        return sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));
      case 'name-desc':
        return sorted.sort((a, b) => b.nombre.localeCompare(a.nombre));
      case 'newest':
      default:
        return sorted.sort((a, b) => {
          // Si tenemos fechas de creación, usarlas para ordenar
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return 0; // Sin cambios si no hay fechas
        });
    }
  };

  // Actualizar manualmente los productos
  const handleManualRefresh = () => {
    // Limpiar caché y recargar
    queryClient.invalidateQueries(['allProducts']);
    refetch();
  };

  // Alternar favorito
  const toggleFavorite = (productId: string) => {
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  // Agregar al carrito
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    addItem({
      id: product._id,
      name: product.nombre,
      price: product.precio,
      image: product.imagen,
      quantity: quantity,
      category: product.categoria,
      subcategory: product.subCategoria
    });

    // Mostrar notificación si está disponible
    if (typeof addNotification === 'function') {
      try {
        addNotification(`${product.nombre} agregado al carrito`, 'success');
      } catch (error) {
        console.log(`Producto agregado: ${product.nombre}`);
      }
    }
  };

  // Determinar qué categorías debemos mostrar según permisos
  const renderCategoriasDestacadas = () => {
    if (showFavorites || selectedCategory !== 'all') return null;
    
    const categorias = [];
    
    // Categoría Limpieza (solo si tiene acceso)
    if (userSecciones === 'limpieza' || userSecciones === 'ambos') {
      categorias.push(
        <Card key="limpieza" className="bg-gradient-to-br from-[#1B9C96] to-[#84D6C8] border-[#E8F8F3] hover:shadow-lg hover:shadow-[#1B9C96]/20 transition-all cursor-pointer group overflow-hidden text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Limpieza</h3>
              <p className="text-white mb-4">Productos para mantener todo impecable</p>
              <Button
                size="sm"
                className="bg-white hover:bg-[#F8FDFC] text-[#ffffff] font-medium"
                onClick={() => setSelectedCategory('limpieza')}
              >
                Ver productos
              </Button>
            </div>
            <div className="text-white group-hover:scale-110 transition-transform">
              <Sparkles className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Categoría Mantenimiento (solo si tiene acceso)
    if (userSecciones === 'mantenimiento' || userSecciones === 'ambos') {
      categorias.push(
        <Card key="mantenimiento" className="bg-gradient-to-br from-[#29696B] to-[#1B9C96] border-[#E8F8F3] hover:shadow-lg hover:shadow-[#29696B]/20 transition-all cursor-pointer group overflow-hidden text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Mantenimiento</h3>
              <p className="text-white mb-4">Todo para reparaciones y proyectos</p>
              <Button
                size="sm"
                className="bg-white hover:bg-[#F8FDFC] text-[#ffffff] font-medium"
                onClick={() => setSelectedCategory('mantenimiento')}
              >
                Ver productos
              </Button>
            </div>
            <div className="text-white group-hover:scale-110 transition-transform">
              <Wrench className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Siempre mostrar carrito
    categorias.push(
      <Card key="carrito" className="bg-gradient-to-br from-[#F2A516] to-[#1B9C96] border-[#E8F8F3] hover:shadow-lg hover:shadow-[#F2A516]/20 transition-all cursor-pointer group overflow-hidden text-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-1">Mi carrito</h3>
            <p className="text-white mb-4">Revisa tus productos seleccionados</p>
            <Button
              size="sm"
              className="bg-white hover:bg-[#F8FDFC] text-[#f5f5f5] font-medium"
              onClick={() => window.location.href = '/cart'}
            >
              Ver carrito
            </Button>
          </div>
          <div className="text-white group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-16 w-16" />
          </div>
        </CardContent>
      </Card>
    );
    
    // Determinar layout según número de categorías
    const gridCols = categorias.length === 1 ? "grid-cols-1" :
                    categorias.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                    "grid-cols-1 md:grid-cols-3";
    
    return (
      <div className={`grid ${gridCols} gap-4 mb-8`}>
        {categorias}
      </div>
    );
  };
  
  // Calcular productos para página actual (paginación local)
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Calcular total de páginas para los productos filtrados
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8 shop-theme">
        <div className="space-y-8">

          {/* Vista de error */}
          {error && (
            <Alert variant="destructive" className="bg-[#E74C3C]/10 border border-[#E74C3C]">
              <AlertCircle className="h-4 w-4 text-[#E74C3C]" />
              <AlertDescription className="text-[#0D4E4B]">
                {error instanceof Error ? error.message : 'Error al cargar productos'}
              </AlertDescription>
            </Alert>
          )}

          {/* Vista de carga */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-t-[#1B9C96] border-r-[#84D6C8] border-b-[#F2A516] border-l-white rounded-full animate-spin mb-4"></div>
              <p className="text-[#0D4E4B]">Cargando productos...</p>
            </div>
          ) : (
            <>
              <section className="relative mb-4 sm:mb-6 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl mx-2 sm:mx-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative h-40 sm:h-48 md:h-64 lg:h-80 flex items-center z-10 p-4 sm:p-6 md:p-8"
                >
                  {/* Fondo con gradiente - mejorado para responsividad */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1B9C96] to-[#84D6C8] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-5"></div>
                    <div className="absolute -inset-[10px] bg-[#139692]/30 blur-3xl animate-pulse"></div>
                  </div>

                  <div className="relative z-10 w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-white leading-tight"
                    >
                      Bienvenido a la tienda de <span className="text-[#F2A516] font-bold">Lyme S.A</span>
                    </motion.h1>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-6 max-w-sm md:max-w-md lg:max-w-lg"
                    >
                      {userSecciones === 'limpieza' 
                        ? 'Encuentra todos los productos de limpieza que necesitas.'
                        : userSecciones === 'mantenimiento'
                        ? 'Explora nuestra selección de productos para mantenimiento.'
                        : 'Encuentra todo lo que necesitas para limpieza y mantenimiento en un solo lugar.'}
                    </motion.p>
                  </div>
                </motion.div>
              </section>

              {/* Filtros y búsqueda */}
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="w-full md:w-auto flex-1 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1B9C96]" />
                    <Input
                      type="text"
                      placeholder="Buscar productos..."
                      className="pl-10 bg-white border-[#1B9C96] focus:border-[#139692] text-[#0D4E4B] placeholder:text-[#4A7C79]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex-shrink-0">
                    <select
                      className="w-full md:w-auto bg-white border-[#1B9C96] focus:border-[#139692] rounded-md text-[#0D4E4B] py-2 px-3"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all" className='bg-white text-[#0D4E4B]'>Todas las categorías</option>
                      
                      {/* Solo mostrar categorías según permisos */}
                      {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                        <>
                          <option value="limpieza" className='bg-white text-[#0D4E4B]'>Limpieza</option>
                          <option value="aerosoles" className='bg-white text-[#0D4E4B]'>Aerosoles</option>
                          <option value="liquidos" className='bg-white text-[#0D4E4B]'>Líquidos</option>
                          <option value="papeles" className='bg-white text-[#0D4E4B]'>Papeles</option>
                          <option value="accesorios" className='bg-white text-[#0D4E4B]'>Accesorios</option>
                          <option value="indumentaria" className='bg-white text-[#0D4E4B]'>Indumentaria</option>
                        </>
                      )}
                      
                      {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                        <>
                          <option value="mantenimiento" className='bg-white text-[#0D4E4B]'>Mantenimiento</option>
                          <option value="iluminaria" className='bg-white text-[#0D4E4B]'>Iluminaria</option>
                          <option value="electricidad" className='bg-white text-[#0D4E4B]'>Electricidad</option>
                          <option value="cerraduraCortina" className='bg-white text-[#0D4E4B]'>Cerraduras</option>
                          <option value="pintura" className='bg-white text-[#0D4E4B]'>Pintura</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Selector de ordenamiento */}
                  <Select
                    value={sortOrder}
                    onValueChange={(value: any) => setSortOrder(value)}
                  >
                    <SelectTrigger className="w-full md:w-44 bg-white border-[#1B9C96] text-[#0D4E4B]">
                      <div className="flex items-center">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        <span>Ordenar por</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#1B9C96]">
                      <SelectItem value="newest" className="text-[#0D4E4B]">Más recientes</SelectItem>
                      <SelectItem value="price-asc" className="text-[#0D4E4B]">Precio: menor a mayor</SelectItem>
                      <SelectItem value="price-desc" className="text-[#0D4E4B]">Precio: mayor a menor</SelectItem>
                      <SelectItem value="name-asc" className="text-[#0D4E4B]">Nombre: A-Z</SelectItem>
                      <SelectItem value="name-desc" className="text-[#0D4E4B]">Nombre: Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isLoading}
                    className="border-[#1B9C96] text-[#1B9C96] hover:bg-[#1B9C96]/10"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant={showFavorites ? "default" : "outline"}
                    size="sm"
                    className={`${showFavorites
                      ? "bg-[#F2A516] hover:bg-[#F2A516]/90 text-white"
                      : "bg-white hover:bg-[#F2A516]/10 border-[#F2A516] text-[#F2A516]"
                      }`}
                    onClick={() => setShowFavorites(!showFavorites)}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${showFavorites ? "fill-white" : ""}`} />
                    Favoritos
                  </Button>
                </div>
              </div>

              {/* Categorías destacadas */}
              {renderCategoriasDestacadas()}

              {/* Lista de productos */}
              <div>
                {showFavorites && favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F2A516]/20 rounded-full mb-4">
                      <Heart className="h-8 w-8 text-[#F2A516]" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-[#0D4E4B]">No tienes favoritos</h3>
                    <p className="text-[#29696B] mb-6">
                      Agrega productos a tus favoritos para encontrarlos rápidamente
                    </p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1B9C96]/30 mb-6">
                      <Package className="h-10 w-10 text-[#0D4E4B]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#0D4E4B]">No se encontraron productos</h2>
                    <p className="text-[#29696B] mb-6 max-w-lg mx-auto">
                      {showFavorites
                        ? "No tienes productos favoritos guardados. Explora nuestra tienda y agrega algunos."
                        : "No hay productos que coincidan con tu búsqueda. Intenta con otros términos o categorías."}
                    </p>
                    <Button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setShowFavorites(false);
                        setSortOrder('newest');
                      }}
                      className="bg-[#1B9C96] hover:bg-[#139692] text-white"
                    >
                      Ver todos los productos
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6 flex items-center text-[#0D4E4B]">
                      {showFavorites ? (
                        <>
                          <Heart className="w-5 h-5 mr-2 text-[#F2A516] fill-[#F2A516]" />
                          Tus Favoritos
                        </>
                      ) : selectedCategory !== 'all' ? (
                        <>
                          {selectedCategory === 'limpieza' ? (
                            <Sparkles className="w-5 h-5 mr-2 text-[#1B9C96]" />
                          ) : selectedCategory === 'mantenimiento' ? (
                            <Wrench className="w-5 h-5 mr-2 text-[#29696B]" />
                          ) : (
                            <Package className="w-5 h-5 mr-2 text-[#F2A516]" />
                          )}
                          Productos: {selectedCategory === 'limpieza' ? 'Limpieza' :
                            selectedCategory === 'mantenimiento' ? 'Mantenimiento' :
                              selectedCategory}
                        </>
                      ) : (
                        <>Todos los Productos</>
                      )}
                      <Badge variant="outline" className="ml-3 bg-[#1B9C96]/10 text-[#1B9C96] border-[#1B9C96]">
                        {filteredProducts.length} productos
                      </Badge>
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
                      {getCurrentPageItems().map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          isFavorite={favorites.includes(product._id)}
                          onToggleFavorite={() => toggleFavorite(product._id)}
                          onAddToCart={(quantity) => handleAddToCart(product, quantity)}
                          compact={true}
                        />
                      ))}
                    </div>
                    
                    {/* Paginación */}
                    {filteredProducts.length > 0 && (
                      <div className="mt-8 flex flex-col items-center">
                        <EnhancedPagination
                          totalItems={filteredProducts.length}
                          itemsPerPage={itemsPerPage}
                          currentPage={currentPage}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={setItemsPerPage}
                          className="text-[#0D4E4B]"
                        />
                        
                        {/* Información sobre la visualización */}
                        <div className="mt-4 text-center text-sm text-[#4A7C79]">
                          <p>
                            Mostrando {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} 
                            - {Math.min(filteredProducts.length, currentPage * itemsPerPage)} 
                            &nbsp;de {filteredProducts.length} productos
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};