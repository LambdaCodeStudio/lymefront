import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@/utils/inventoryUtils';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Heart,
  ShoppingCart,
  Sparkles,
  Tag,
  Package,
  ArrowRight,
  AlertCircle,
  Wrench,
  Truck,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductCard } from './ProductCard';
import { useCartContext } from '@/providers/CartProvider';
import { ShopNavbar } from './ShopNavbar';

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

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // Efecto para cargar productos
  useEffect(() => {
    fetchProducts();

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
    result = result.filter(product => product.stock > 0);

    setFilteredProducts(result);
  }, [products, searchTerm, selectedCategory, showFavorites, favorites]);

  // Función para obtener productos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('https://lyme-back.vercel.app/api/producto', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return;
        }
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data.filter(product => product.stock > 0));
      setError(null);
    } catch (err: any) {
      setError(`Error al cargar productos: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
              <div className="w-16 h-16 border-4 border-t-[#00888A] border-r-[#50C3AD] border-b-[#75D0E0] border-l-[#D4F5E6] rounded-full animate-spin mb-4"></div>
              <p className="text-[#D4F5E6]">Cargando productos...</p>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00888A] to-[#50C3AD] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-5"></div>
                    <div className="absolute -inset-[10px] bg-[#80CFB0]/30 blur-3xl animate-pulse"></div>
                  </div>

                  <div className="relative z-10 w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-white leading-tight"
                    >
                      Bienvenido a la tienda de <span className="text-[#D4F5E6]">Lyme</span>
                    </motion.h1>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-6 max-w-sm md:max-w-md lg:max-w-lg"
                    >
                      Encuentra todo lo que necesitas para limpieza y mantenimiento en un solo lugar.
                    </motion.p>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex"
                    >
                      <Button className="bg-white hover:bg-[#D4F5E6] text-[#00888A] border-0 font-medium text-xs sm:text-sm md:text-base py-1 sm:py-2 px-3 sm:px-4">
                        Explorar productos
                        <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </section>

              {/* Filtros y búsqueda */}
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="w-full md:w-auto flex-1 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#75D0E0]" />
                    <Input
                      type="text"
                      placeholder="Buscar productos..."
                      className="pl-10 bg-white/10 border-[#50C3AD] focus:border-[#80CFB0] text-white placeholder:text-[#D4F5E6]/70"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex-shrink-0">
                    <select
                      className="w-full md:w-auto bg-white/10 border-[#50C3AD] focus:border-[#80CFB0] rounded-md text-white py-2 px-3"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all" className='bg-[#00888A] text-white'>Todas las categorías</option>
                      <option value="limpieza" className='bg-[#00888A] text-white'>Limpieza</option>
                      <option value="mantenimiento" className='bg-[#00888A] text-white'>Mantenimiento</option>
                      <option value="aerosoles" className='bg-[#00888A] text-white'>Aerosoles</option>
                      <option value="liquidos" className='bg-[#00888A] text-white'>Líquidos</option>
                      <option value="papeles" className='bg-[#00888A] text-white'>Papeles</option>
                      <option value="accesorios" className='bg-[#00888A] text-white'>Accesorios</option>
                      <option value="indumentaria" className='bg-[#00888A] text-white'>Indumentaria</option>
                      <option value="iluminaria" className='bg-[#00888A] text-white'>Iluminaria</option>
                      <option value="electricidad" className='bg-[#00888A] text-white'>Electricidad</option>
                      <option value="cerraduraCortina" className='bg-[#00888A] text-white'>Cerraduras</option>
                      <option value="pintura" className='bg-[#00888A] text-white'>Pintura</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={showFavorites ? "default" : "outline"}
                    size="sm"
                    className={`${showFavorites
                        ? "bg-[#50C3AD] hover:bg-[#00888A] text-white"
                        : "bg-white/10 hover:bg-white/20 border-[#50C3AD] text-white"
                      }`}
                    onClick={() => setShowFavorites(!showFavorites)}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${showFavorites ? "fill-white" : ""}`} />
                    Favoritos
                  </Button>
                </div>
              </div>

              {/* Categorías destacadas */}
              {!showFavorites && selectedCategory === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <Card className="bg-gradient-to-br from-[#00888A] to-[#50C3AD] border-[#80CFB0] hover:shadow-lg hover:shadow-[#00888A]/20 transition-all cursor-pointer group overflow-hidden text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Limpieza</h3>
                        <p className="text-[#D4F5E6] mb-4">Productos para mantener todo impecable</p>
                        <Button
                          size="sm"
                          className="bg-white hover:bg-[#D4F5E6] text-[#00888A]"
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

                  <Card className="bg-gradient-to-br from-[#50C3AD] to-[#75D0E0] border-[#80CFB0] hover:shadow-lg hover:shadow-[#50C3AD]/20 transition-all cursor-pointer group overflow-hidden text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Mantenimiento</h3>
                        <p className="text-[#D4F5E6] mb-4">Todo para reparaciones y proyectos</p>
                        <Button
                          size="sm"
                          className="bg-white hover:bg-[#D4F5E6] text-[#50C3AD]"
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

                  <Card className="bg-gradient-to-br from-[#75D0E0] to-[#50C3AD] border-[#80CFB0] hover:shadow-lg hover:shadow-[#75D0E0]/20 transition-all cursor-pointer group overflow-hidden text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Mi carrito</h3>
                        <p className="text-[#D4F5E6] mb-4">Revisa tus productos seleccionados</p>
                        <Button
                          size="sm"
                          className="bg-white hover:bg-[#D4F5E6] text-[#75D0E0]"
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
                </div>
              )}

              {/* Sección de información */}
              {!showFavorites && selectedCategory === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-[#80CFB0]/30 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00888A]/20 rounded-full mb-4">
                      <Package className="h-6 w-6 text-[#D4F5E6]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-white">Productos de calidad</h3>
                    <p className="text-[#D4F5E6]/80 text-sm">
                      Todos nuestros productos cumplen con los más altos estándares de calidad.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-[#80CFB0]/30 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00888A]/20 rounded-full mb-4">
                      <Truck className="h-6 w-6 text-[#D4F5E6]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-white">Entrega rápida</h3>
                    <p className="text-[#D4F5E6]/80 text-sm">
                      Coordinamos la entrega de tus productos en el menor tiempo posible.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-[#80CFB0]/30 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00888A]/20 rounded-full mb-4">
                      <Clock className="h-6 w-6 text-[#D4F5E6]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-white">Soporte técnico</h3>
                    <p className="text-[#D4F5E6]/80 text-sm">
                      Nuestro equipo está disponible para resolver cualquier duda o problema.
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de productos */}
              <div>
                {showFavorites && favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00888A]/20 rounded-full mb-4">
                      <Heart className="h-8 w-8 text-[#D4F5E6]" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-white">No tienes favoritos</h3>
                    <p className="text-[#D4F5E6]/80 mb-6">
                      Agrega productos a tus favoritos para encontrarlos rápidamente
                    </p>
                    <Button
                      onClick={() => setShowFavorites(false)}
                      className="bg-[#00888A] hover:bg-[#50C3AD] text-white"
                    >
                      Explorar productos
                    </Button>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00888A]/30 mb-6">
                      <Package className="h-10 w-10 text-[#D4F5E6]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#D4F5E6]">No se encontraron productos</h2>
                    <p className="text-[#75D0E0] mb-6 max-w-lg mx-auto">
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
                      className="bg-[#00888A] hover:bg-[#50C3AD] text-white"
                    >
                      Ver todos los productos
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6 flex items-center text-[#D4F5E6]">
                      {showFavorites ? (
                        <>
                          <Heart className="w-5 h-5 mr-2 text-red-400 fill-red-400" />
                          Tus Favoritos
                        </>
                      ) : selectedCategory !== 'all' ? (
                        <>
                          {selectedCategory === 'limpieza' ? (
                            <Sparkles className="w-5 h-5 mr-2 text-[#D4F5E6]" />
                          ) : selectedCategory === 'mantenimiento' ? (
                            <Wrench className="w-5 h-5 mr-2 text-[#D4F5E6]" />
                          ) : (
                            <Package className="w-5 h-5 mr-2 text-[#D4F5E6]" />
                          )}
                          Productos: {selectedCategory === 'limpieza' ? 'Limpieza' :
                            selectedCategory === 'mantenimiento' ? 'Mantenimiento' :
                              selectedCategory}
                        </>
                      ) : (
                        <>Todos los Productos</>
                      )}
                      <Badge variant="outline" className="ml-3 bg-white/10 text-[#D4F5E6] border-[#50C3AD]">
                        {filteredProducts.length} productos
                      </Badge>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          isFavorite={favorites.includes(product._id)}
                          onToggleFavorite={() => toggleFavorite(product._id)}
                          onAddToCart={(quantity) => handleAddToCart(product, quantity)}
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