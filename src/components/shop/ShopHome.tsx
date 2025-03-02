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
  AlertCircle
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
  createdAt: string;
  updatedAt: string;
}

// Componente principal
export const ShopHome: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  
  const { addItem } = useCartContext();

  // Efecto para cargar productos
  useEffect(() => {
    fetchProducts();
    
    // Cargar favoritos de localStorage
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
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
        product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.subCategoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.categoria === selectedCategory);
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

      const response = await fetch('http://localhost:4000/api/producto', {
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
  const handleAddToCart = (product: Product) => {
    addItem({
      id: product._id,
      name: product.nombre,
      price: product.precio,
      image: product.imagen,
      quantity: 1,
      category: product.categoria,
      subcategory: product.subCategoria
    });
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

          {/* Vista principal (no loading, no error) */}
          {!loading && !error && (
            <>
              {/* Hero section */}
              <section className="relative mb-6 overflow-hidden rounded-2xl">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative h-48 md:h-64 lg:h-80 flex items-center z-10 p-8"
                >
                  {/* Fondo con gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00888A] to-[#50C3AD] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-5"></div>
                    <div className="absolute -inset-[10px] bg-[#80CFB0]/30 blur-3xl animate-pulse"></div>
                  </div>
                  
                  <div className="relative z-10 max-w-3xl">
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white"
                    >
                      Bienvenido a la tienda de <span className="text-[#D4F5E6]">Lyme</span>
                    </motion.h1>
                    <motion.p 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90 text-lg mb-6"
                    >
                      Encuentra todo lo que necesitas para limpieza y mantenimiento en un solo lugar.
                    </motion.p>
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button className="bg-white hover:bg-[#D4F5E6] text-[#00888A] border-0 font-medium">
                        Explorar productos
                        <ArrowRight className="ml-2 h-4 w-4" />
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
                  
                  <Tabs 
                    defaultValue="all" 
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    className="w-full md:w-auto"
                  >
                    <TabsList className="bg-white/10 border border-[#50C3AD]">
                      <TabsTrigger value="all" className="data-[state=active]:bg-[#00888A] data-[state=active]:text-white">Todos</TabsTrigger>
                      <TabsTrigger value="limpieza" className="data-[state=active]:bg-[#00888A] data-[state=active]:text-white">Limpieza</TabsTrigger>
                      <TabsTrigger value="mantenimiento" className="data-[state=active]:bg-[#00888A] data-[state=active]:text-white">Mantenimiento</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant={showFavorites ? "default" : "outline"} 
                    size="sm"
                    className={`${
                      showFavorites 
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
                          className="bg-white hover:bg-[#D4F5E6] text-[#00888A]"
                          onClick={() => setSelectedCategory('mantenimiento')}
                        >
                          Ver productos
                        </Button>
                      </div>
                      <div className="text-white group-hover:scale-110 transition-transform">
                        <Package className="h-16 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-[#75D0E0] to-[#80CFB0] border-[#80CFB0] hover:shadow-lg hover:shadow-[#75D0E0]/20 transition-all cursor-pointer group overflow-hidden text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Ofertas</h3>
                        <p className="text-[#D4F5E6] mb-4">Los mejores precios y descuentos</p>
                        <Button 
                          size="sm" 
                          className="bg-white hover:bg-[#D4F5E6] text-[#00888A]"
                        >
                          Ver ofertas
                        </Button>
                      </div>
                      <div className="text-white group-hover:scale-110 transition-transform">
                        <Tag className="h-16 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Lista de productos */}
              <div>
                {filteredProducts.length === 0 ? (
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
                          ) : (
                            <Package className="w-5 h-5 mr-2 text-[#D4F5E6]" />
                          )}
                          Productos de {selectedCategory === 'limpieza' ? 'Limpieza' : 'Mantenimiento'}
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
                          onAddToCart={() => handleAddToCart(product)}
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