import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '@/utils/inventoryUtils';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Heart,
  ShoppingCart,
  Sparkles,
  Package,
  AlertCircle,
  Wrench,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductCard } from './ProductCard';
import { useCartContext } from '@/providers/CartProvider';
import { ShopNavbar } from './ShopNavbar';
import { getApiUrl } from '@/utils/apiUtils';

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
  // Usar exactamente el mismo hook que funciona
  const { addItem } = useCartContext();

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
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para información del usuario
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Estado para cache
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en ms

  // Efecto para recuperar información de usuario
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
  }, []);

  // Obtener datos del usuario
  const fetchUserData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://179.43.118.101:4000/api/auth/me', {
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

  // Efecto para cargar productos inicialmente
  useEffect(() => {
    loadInitialData();

    // Limpiar timeout al desmontar
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [userSecciones]);

  // Carga inicial de datos
  const loadInitialData = async () => {
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

    // Cargar productos
    await fetchProducts(true);
  };

  // Efecto para filtrar productos
  useEffect(() => {
    if (!products.length) return;

    let result = [...products];

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

    // Solo productos con stock
    result = result.filter(product => 
      // Para productos de mantenimiento, no filtramos por stock
      product.categoria === 'mantenimiento' || product.stock > 0
    );

    setFilteredProducts(result);
  }, [products, searchTerm, selectedCategory, showFavorites, favorites]);

  // Función optimizada para obtener productos
  const fetchProducts = useCallback(async (forceRefresh = false) => {
    // Evitar múltiples solicitudes cercanas en el tiempo
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      console.log('Solicitud descartada: demasiado frecuente');
      return;
    }

    // Verificar si tenemos datos en caché recientes
    if (!forceRefresh && products.length > 0 && now - lastFetchTimeRef.current < CACHE_DURATION) {
      console.log('Usando datos en caché');
      return;
    }

    try {
      setLoading(forceRefresh);
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
  
      // Determinar filtros de categoría según los permisos del usuario
      let categoryFilter = '';
      if (userSecciones && userSecciones !== 'ambos') {
        categoryFilter = `?category=${userSecciones}`;
      }
  
      const response = await fetch(`http://179.43.118.101:4000/api/producto${categoryFilter}`, {
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
          return;
        }
        throw new Error(`Error al cargar productos (${response.status})`);
      }
  
      const data = await response.json();
      lastFetchTimeRef.current = Date.now();
      
      // Verificar formato de la respuesta
      if (!Array.isArray(data)) {
        // Si data.items existe, usar eso (formato paginado)
        if (data && data.items && Array.isArray(data.items)) {
          procesarProductos(data.items);
        } else {
          console.error('Formato de respuesta inesperado:', data);
          throw new Error('Formato de respuesta inesperado: los datos no son un array');
        }
      } else {
        // La respuesta ya es un array
        procesarProductos(data);
      }
      
      // Programar la próxima actualización
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
      
      cacheTimeoutRef.current = setTimeout(() => {
        console.log('Actualizando datos por expiración de caché');
        fetchProducts(true);
      }, CACHE_DURATION);
      
      setError(null);
    } catch (err) {
      console.error('Error en fetchProducts:', err);
      setError(`Error al cargar productos: ${err instanceof Error ? err.message : String(err)}`);
      
      // Reintento automático después de un error, solo si fue la carga inicial
      if (products.length === 0) {
        setTimeout(() => {
          console.log('Reintentando carga de productos...');
          fetchProducts(true);
        }, 5000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [products.length, userSecciones]);

  // Procesar productos según permisos
  const procesarProductos = (data: Product[]) => {
    // Filtrado por sección según permisos
    let productosFiltrados = data;
    
    if (userSecciones && userSecciones !== 'ambos') {
      productosFiltrados = data.filter(producto => 
        producto.categoria === userSecciones
      );
    }
    
    setProducts(productosFiltrados);
    
    // También actualizamos filteredProducts inicialmente
    // (será refinado por otros filtros en el efecto)
    const productosConStock = productosFiltrados.filter(product => 
      product.categoria === 'mantenimiento' || product.stock > 0
    );
    
    setFilteredProducts(productosConStock);
  };

  // Actualizar manualmente los productos
  const handleManualRefresh = () => {
    fetchProducts(true);
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
        <Card key="limpieza" className="bg-gradient-to-br from-[#15497E] to-[#2A82C7] border-[#2A82C7] hover:shadow-lg hover:shadow-[#15497E]/20 transition-all cursor-pointer group overflow-hidden text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Limpieza</h3>
              <p className="text-[#F8F9FA] mb-4">Productos para mantener todo impecable</p>
              <Button
                size="sm"
                className="bg-white hover:bg-[#F8F9FA] text-[#15497E]"
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
        <Card key="mantenimiento" className="bg-gradient-to-br from-[#2A82C7] to-[#15497E] border-[#2A82C7] hover:shadow-lg hover:shadow-[#2A82C7]/20 transition-all cursor-pointer group overflow-hidden text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Mantenimiento</h3>
              <p className="text-[#F8F9FA] mb-4">Todo para reparaciones y proyectos</p>
              <Button
                size="sm"
                className="bg-white hover:bg-[#F8F9FA] text-[#2A82C7]"
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
      <Card key="carrito" className="bg-gradient-to-br from-[#2A82C7] to-[#15497E] border-[#2A82C7] hover:shadow-lg hover:shadow-[#2A82C7]/20 transition-all cursor-pointer group overflow-hidden text-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-1">Mi carrito</h3>
            <p className="text-[#F8F9FA] mb-4">Revisa tus productos seleccionados</p>
            <Button
              size="sm"
              className="bg-white hover:bg-[#F8F9FA] text-[#2A82C7]"
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

  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">

          {/* Vista de error */}
          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border border-red-500">
              <AlertCircle className="h-4 w-4 text-white" />
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}

          {/* Vista de carga */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-t-[#15497E] border-r-[#2A82C7] border-b-[#15497E] border-l-[#F8F9FA] rounded-full animate-spin mb-4"></div>
              <p className="text-[#F8F9FA]">Cargando productos...</p>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-[#15497E] to-[#2A82C7] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-5"></div>
                    <div className="absolute -inset-[10px] bg-[#2A82C7]/30 blur-3xl animate-pulse"></div>
                  </div>

                  <div className="relative z-10 w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-white leading-tight"
                    >
                      Bienvenido a la tienda de <span className="text-[#F8F9FA]">Lyme</span>
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C757D]" />
                    <Input
                      type="text"
                      placeholder="Buscar productos..."
                      className="pl-10 bg-white/10 border-[#2A82C7] focus:border-[#15497E] text-white placeholder:text-[#F8F9FA]/70"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex-shrink-0">
                    <select
                      className="w-full md:w-auto bg-white/10 border-[#2A82C7] focus:border-[#15497E] rounded-md text-white py-2 px-3"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all" className='bg-[#15497E] text-white'>Todas las categorías</option>
                      
                      {/* Solo mostrar categorías según permisos */}
                      {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                        <>
                          <option value="limpieza" className='bg-[#15497E] text-white'>Limpieza</option>
                          <option value="aerosoles" className='bg-[#15497E] text-white'>Aerosoles</option>
                          <option value="liquidos" className='bg-[#15497E] text-white'>Líquidos</option>
                          <option value="papeles" className='bg-[#15497E] text-white'>Papeles</option>
                          <option value="accesorios" className='bg-[#15497E] text-white'>Accesorios</option>
                          <option value="indumentaria" className='bg-[#15497E] text-white'>Indumentaria</option>
                        </>
                      )}
                      
                      {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                        <>
                          <option value="mantenimiento" className='bg-[#15497E] text-white'>Mantenimiento</option>
                          <option value="iluminaria" className='bg-[#15497E] text-white'>Iluminaria</option>
                          <option value="electricidad" className='bg-[#15497E] text-white'>Electricidad</option>
                          <option value="cerraduraCortina" className='bg-[#15497E] text-white'>Cerraduras</option>
                          <option value="pintura" className='bg-[#15497E] text-white'>Pintura</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="border-[#2A82C7] text-white hover:bg-[#2A82C7]/20"
                  >
                    {refreshing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    Actualizar
                  </Button>
                  
                  <Button
                    variant={showFavorites ? "default" : "outline"}
                    size="sm"
                    className={`${showFavorites
                      ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                      : "bg-white/10 hover:bg-white/20 border-[#FF6B35] text-white"
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
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#15497E]/20 rounded-full mb-4">
                      <Heart className="h-8 w-8 text-[#F8F9FA]" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-white">No tienes favoritos</h3>
                    <p className="text-[#F8F9FA]/80 mb-6">
                      Agrega productos a tus favoritos para encontrarlos rápidamente
                    </p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#15497E]/30 mb-6">
                      <Package className="h-10 w-10 text-[#F8F9FA]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#F8F9FA]">No se encontraron productos</h2>
                    <p className="text-[#6C757D] mb-6 max-w-lg mx-auto">
                      {showFavorites
                        ? "No tienes productos favoritos guardados. Explora nuestra tienda y agrega algunos."
                        : "No hay productos que coincidan con tu búsqueda. Intenta con otros términos o categorías."}
                    </p>
                    <Button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setShowFavorites(false);
                      }}
                      className="bg-[#15497E] hover:bg-[#2A82C7] text-white"
                    >
                      Ver todos los productos
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6 flex items-center text-[#F8F9FA]">
                      {showFavorites ? (
                        <>
                          <Heart className="w-5 h-5 mr-2 text-[#FF6B35] fill-[#FF6B35]" />
                          Tus Favoritos
                        </>
                      ) : selectedCategory !== 'all' ? (
                        <>
                          {selectedCategory === 'limpieza' ? (
                            <Sparkles className="w-5 h-5 mr-2 text-[#F8F9FA]" />
                          ) : selectedCategory === 'mantenimiento' ? (
                            <Wrench className="w-5 h-5 mr-2 text-[#F8F9FA]" />
                          ) : (
                            <Package className="w-5 h-5 mr-2 text-[#F8F9FA]" />
                          )}
                          Productos: {selectedCategory === 'limpieza' ? 'Limpieza' :
                            selectedCategory === 'mantenimiento' ? 'Mantenimiento' :
                              selectedCategory}
                        </>
                      ) : (
                        <>Todos los Productos</>
                      )}
                      <Badge variant="outline" className="ml-3 bg-white/10 text-[#F8F9FA] border-[#2A82C7]">
                        {filteredProducts.length} productos
                      </Badge>
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
                      {filteredProducts.map((product) => (
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