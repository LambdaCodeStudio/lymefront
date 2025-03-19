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
  ArrowUpDown,
  Filter,
  X
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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
  marca?: string;
  proveedor?: {
    nombre: string;
  };
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
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortOrder, setSortOrder] = useState<'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'>('newest');
  
  // Estados para filtros avanzados
  const [marcas, setMarcas] = useState<string[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [selectedProveedores, setSelectedProveedores] = useState<string[]>([]);
  const [precioRange, setPrecioRange] = useState<[number, number]>([0, 100000]);
  const [maxPrecio, setMaxPrecio] = useState<number>(100000);
  const [showOnlyStock, setShowOnlyStock] = useState<boolean>(false);
  
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

    const subcategoryParam = params.get('subcategory');
    if (subcategoryParam) {
      setSelectedSubcategory(subcategoryParam);
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

      const response = await fetch('http://localhost:3000/api/auth/me', {
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
    const limit = 1000;
    const url = `http://localhost:3000/api/producto?page=1&limit=${limit}${categoryFilter}`;
    
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

  // Extraer marcas y proveedores únicos para filtros
  useEffect(() => {
    if (allProducts.length) {
      // Extraer marcas únicas
      const uniqueMarcas = Array.from(
        new Set(
          allProducts
            .filter(p => p.marca)
            .map(p => p.marca)
        )
      ) as string[];
      
      setMarcas(uniqueMarcas.sort());
      
      // Extraer proveedores únicos
      const uniqueProveedores = Array.from(
        new Set(
          allProducts
            .filter(p => p.proveedor?.nombre)
            .map(p => p.proveedor?.nombre)
        )
      ) as string[];
      
      setProveedores(uniqueProveedores.sort());
      
      // Determinar precio máximo para el slider
      const maxPrice = Math.max(
        ...allProducts.map(p => p.precio), 
        100 // Valor mínimo por defecto
      );
      
      setMaxPrecio(maxPrice);
      setPrecioRange([0, maxPrice]);
    }
  }, [allProducts]);

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
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.nombre.toLowerCase().includes(searchLower) ||
        (product.descripcion?.toLowerCase().includes(searchLower)) ||
        (product.subCategoria.toLowerCase().includes(searchLower)) ||
        (product.marca?.toLowerCase().includes(searchLower)) ||
        (product.proveedor?.nombre?.toLowerCase().includes(searchLower))
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.categoria === selectedCategory);
    }
    
    // Filtrar por subcategoría
    if (selectedSubcategory !== 'all') {
      result = result.filter(product => product.subCategoria === selectedSubcategory);
    }
    
    // Filtrar por marcas seleccionadas
    if (selectedMarcas.length > 0) {
      result = result.filter(product => 
        product.marca && selectedMarcas.includes(product.marca)
      );
    }
    
    // Filtrar por proveedores seleccionados
    if (selectedProveedores.length > 0) {
      result = result.filter(product => 
        product.proveedor?.nombre && selectedProveedores.includes(product.proveedor.nombre)
      );
    }
    
    // Filtrar por rango de precio
    result = result.filter(product => 
      product.precio >= precioRange[0] && product.precio <= precioRange[1]
    );
    
    // Filtrar por stock disponible
    if (showOnlyStock) {
      result = result.filter(product => product.stock > 0);
    }

    // Filtrar por favoritos
    if (showFavorites) {
      result = result.filter(product => favorites.includes(product._id));
    }

    // Solo productos con stock para limpieza, mantenimiento no tiene restricción
    if (!showOnlyStock) {
      result = result.filter(product => 
        // Para productos de mantenimiento, no filtramos por stock
        product.categoria === 'mantenimiento' || product.stock > 0
      );
    }
    
    // Ordenar según el criterio seleccionado
    result = sortProducts(result, sortOrder);

    setFilteredProducts(result);
    setCurrentPage(1); // Reiniciar a la primera página al cambiar filtros
  }, [
    allProducts, 
    searchTerm, 
    selectedCategory, 
    selectedSubcategory,
    selectedMarcas,
    selectedProveedores,
    precioRange,
    showOnlyStock,
    showFavorites, 
    favorites, 
    sortOrder
  ]);

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
  
  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedMarcas([]);
    setSelectedProveedores([]);
    setPrecioRange([0, maxPrecio]);
    setShowOnlyStock(false);
    setSearchTerm('');
    setShowFavorites(false);
    setSortOrder('newest');
  };

  // Determinar qué categorías debemos mostrar según permisos
  const renderCategoriasDestacadas = () => {
    if (showFavorites || selectedCategory !== 'all') return null;
    
    const categorias = [];
    
    // Categoría Limpieza (solo si tiene acceso)
    if (userSecciones === 'limpieza' || userSecciones === 'ambos') {
      categorias.push(
        <Card key="limpieza" className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-tertiary)] border-[var(--background-secondary)] hover:shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all cursor-pointer group overflow-hidden text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Limpieza</h3>
              <p className="text-white mb-4">Productos para mantener todo impecable</p>
              <Button
                size="sm"
                className="bg-white hover:bg-[var(--background-secondary)] text-[var(--accent-primary)] font-medium"
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
        <Card key="mantenimiento" className="bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent-tertiary)] border-[var(--background-secondary)] hover:shadow-lg hover:shadow-[var(--accent-secondary)]/20 transition-all cursor-pointer group overflow-hidden text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Mantenimiento</h3>
              <p className="text-white mb-4">Todo para reparaciones y proyectos</p>
              <Button
                size="sm"
                className="bg-white hover:bg-[var(--background-secondary)] text-[var(--accent-secondary)] font-medium"
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
      <Card key="carrito" className="bg-gradient-to-br from-[var(--accent-quaternary)] to-[var(--accent-tertiary)] border-[var(--background-secondary)] hover:shadow-lg hover:shadow-[var(--accent-quaternary)]/20 transition-all cursor-pointer group overflow-hidden text-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-1">Mi carrito</h3>
            <p className="text-white mb-4">Revisa tus productos seleccionados</p>
            <Button
              size="sm"
              className="bg-white hover:bg-[var(--background-secondary)] text-[var(--accent-quaternary)] font-medium"
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
  
  // Obtener subcategorías para la categoría seleccionada
  const getSubcategories = () => {
    if (selectedCategory === 'all') return [];
    
    const subcategories = Array.from(
      new Set(
        allProducts
          .filter(p => p.categoria === selectedCategory)
          .map(p => p.subCategoria)
      )
    );
    
    return subcategories.sort();
  };
  
  // Calcular productos para página actual (paginación local)
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Calcular total de páginas para los productos filtrados
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  // Número de filtros activos
  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedSubcategory !== 'all',
    selectedMarcas.length > 0,
    selectedProveedores.length > 0,
    precioRange[0] > 0 || precioRange[1] < maxPrecio,
    showOnlyStock,
    showFavorites,
  ].filter(Boolean).length;

  return (
    <div className="shop-theme">
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">

          {/* Vista de error */}
          {error && (
            <Alert variant="destructive" className="bg-[var(--state-error)]/10 border border-[var(--state-error)]">
              <AlertCircle className="h-4 w-4 text-[var(--state-error)]" />
              <AlertDescription className="text-[var(--text-primary)]">
                {error instanceof Error ? error.message : 'Error al cargar productos'}
              </AlertDescription>
            </Alert>
          )}

          {/* Vista de carga */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-t-[var(--accent-primary)] border-r-[var(--accent-tertiary)] border-b-[var(--accent-quaternary)] border-l-[var(--background-card)] rounded-full animate-spin mb-4"></div>
              <p className="text-[var(--text-primary)]">Cargando productos...</p>
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
                  <div className="absolute inset-0 bg-[var(--gradient-main)] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-5"></div>
                    <div className="absolute -inset-[10px] bg-[var(--accent-primary)]/30 blur-3xl animate-pulse"></div>
                  </div>

                  <div className="relative z-10 w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-white leading-tight"
                    >
                      Bienvenido a la tienda de <span className="text-[var(--accent-quaternary)] font-bold">Lyme S.A</span>
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--accent-primary)]" />
                    <Input
                      type="text"
                      placeholder="Buscar productos..."
                      className="pl-10 bg-[var(--background-card)] border-[var(--accent-primary)] focus:border-[var(--accent-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex-shrink-0">
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setSelectedSubcategory('all'); // Reset subcategory when category changes
                      }}
                    >
                      <SelectTrigger className="w-full md:w-auto bg-[var(--background-card)] border-[var(--accent-primary)] text-[var(--text-primary)]">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--background-card)] border-[var(--accent-primary)]">
                        <SelectItem value="all" className="text-[var(--text-primary)]">Todas las categorías</SelectItem>
                        
                        {/* Solo mostrar categorías según permisos */}
                        {(userSecciones === 'limpieza' || userSecciones === 'ambos') && (
                          <SelectItem value="limpieza" className="text-[var(--text-primary)]">Limpieza</SelectItem>
                        )}
                        
                        {(userSecciones === 'mantenimiento' || userSecciones === 'ambos') && (
                          <SelectItem value="mantenimiento" className="text-[var(--text-primary)]">Mantenimiento</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Solo mostrar subcategorías si hay una categoría seleccionada */}
                  {selectedCategory !== 'all' && (
                    <div className="flex-shrink-0">
                      <Select
                        value={selectedSubcategory}
                        onValueChange={setSelectedSubcategory}
                      >
                        <SelectTrigger className="w-full md:w-auto bg-[var(--background-card)] border-[var(--accent-primary)] text-[var(--text-primary)]">
                          <SelectValue placeholder="Subcategoría" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--background-card)] border-[var(--accent-primary)]">
                          <SelectItem value="all" className="text-[var(--text-primary)]">Todas las subcategorías</SelectItem>
                          
                          {/* Listar subcategorías disponibles */}
                          {getSubcategories().map((subcategory) => (
                            <SelectItem 
                              key={subcategory} 
                              value={subcategory} 
                              className="text-[var(--text-primary)]"
                            >
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Trigger de filtros avanzados */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                        {activeFiltersCount > 0 && (
                          <Badge className="ml-2 bg-[var(--accent-primary)] text-white">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-[var(--background-card)] border-[var(--accent-primary)]">
                      <SheetHeader>
                        <SheetTitle className="text-[var(--text-primary)]">Filtros avanzados</SheetTitle>
                      </SheetHeader>
                      
                      <div className="py-4 space-y-6">
                        {/* Filtro por marca */}
                        {marcas.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-[var(--text-primary)] font-medium">Marcas</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {marcas.map(marca => (
                                <div key={marca} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`marca-${marca}`}
                                    checked={selectedMarcas.includes(marca)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedMarcas(prev => [...prev, marca]);
                                      } else {
                                        setSelectedMarcas(prev => prev.filter(m => m !== marca));
                                      }
                                    }}
                                    className="border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)]"
                                  />
                                  <Label 
                                    htmlFor={`marca-${marca}`}
                                    className="text-[var(--text-primary)] cursor-pointer"
                                  >
                                    {marca}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Filtro por proveedor */}
                        {proveedores.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-[var(--text-primary)] font-medium">Proveedores</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {proveedores.map(proveedor => (
                                <div key={proveedor} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`proveedor-${proveedor}`}
                                    checked={selectedProveedores.includes(proveedor)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedProveedores(prev => [...prev, proveedor]);
                                      } else {
                                        setSelectedProveedores(prev => prev.filter(p => p !== proveedor));
                                      }
                                    }}
                                    className="border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)]"
                                  />
                                  <Label 
                                    htmlFor={`proveedor-${proveedor}`}
                                    className="text-[var(--text-primary)] cursor-pointer"
                                  >
                                    {proveedor}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Filtro por rango de precio */}
                        <div className="space-y-4">
                          <h3 className="text-[var(--text-primary)] font-medium">Rango de precio</h3>
                          <Slider
                            value={precioRange}
                            min={0}
                            max={maxPrecio}
                            step={100}
                            onValueChange={setPrecioRange}
                            className="my-6"
                          />
                          <div className="flex justify-between">
                            <span className="text-[var(--text-primary)]">
                              ${precioRange[0].toLocaleString()}
                            </span>
                            <span className="text-[var(--text-primary)]">
                              ${precioRange[1].toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Filtro por stock */}
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="show-only-stock"
                            checked={showOnlyStock}
                            onCheckedChange={(checked) => setShowOnlyStock(!!checked)}
                            className="border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)]"
                          />
                          <Label 
                            htmlFor="show-only-stock"
                            className="text-[var(--text-primary)] cursor-pointer"
                          >
                            Mostrar solo productos con stock
                          </Label>
                        </div>
                        
                        {/* Acciones de filtros */}
                        <div className="flex justify-between pt-4">
                          <Button
                            variant="outline"
                            onClick={clearAllFilters}
                            className="border-[var(--state-error)] text-[var(--state-error)] hover:bg-[var(--state-error)]/10"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Limpiar filtros
                          </Button>
                          
                          <SheetTrigger asChild>
                            <Button className="bg-[var(--accent-primary)] hover:bg-[var(--accent-tertiary)] text-white">
                              Aplicar filtros
                            </Button>
                          </SheetTrigger>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  
                  {/* Selector de ordenamiento */}
                  <Select
                    value={sortOrder}
                    onValueChange={(value: any) => setSortOrder(value)}
                  >
                    <SelectTrigger className="w-full md:w-44 bg-[var(--background-card)] border-[var(--accent-primary)] text-[var(--text-primary)]">
                      <div className="flex items-center">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        <span>Ordenar por</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--background-card)] border-[var(--accent-primary)]">
                      <SelectItem value="newest" className="text-[var(--text-primary)]">Más recientes</SelectItem>
                      <SelectItem value="price-asc" className="text-[var(--text-primary)]">Precio: menor a mayor</SelectItem>
                      <SelectItem value="price-desc" className="text-[var(--text-primary)]">Precio: mayor a menor</SelectItem>
                      <SelectItem value="name-asc" className="text-[var(--text-primary)]">Nombre: A-Z</SelectItem>
                      <SelectItem value="name-desc" className="text-[var(--text-primary)]">Nombre: Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isLoading}
                    className="border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
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
                      ? "bg-[var(--accent-quaternary)] hover:bg-[var(--accent-quaternary)]/90 text-white"
                      : "bg-[var(--background-card)] hover:bg-[var(--accent-quaternary)]/10 border-[var(--accent-quaternary)] text-[var(--accent-quaternary)]"
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
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-quaternary)]/20 rounded-full mb-4">
                      <Heart className="h-8 w-8 text-[var(--accent-quaternary)]" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-[var(--text-primary)]">No tienes favoritos</h3>
                    <p className="text-[var(--text-secondary)] mb-6">
                      Agrega productos a tus favoritos para encontrarlos rápidamente
                    </p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--accent-primary)]/30 mb-6">
                      <Package className="h-10 w-10 text-[var(--text-primary)]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2 text-[var(--text-primary)]">No se encontraron productos</h2>
                    <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
                      {showFavorites
                        ? "No tienes productos favoritos guardados. Explora nuestra tienda y agrega algunos."
                        : "No hay productos que coincidan con tu búsqueda. Intenta con otros términos o filtros."}
                    </p>
                    <Button
                      onClick={clearAllFilters}
                      className="bg-[var(--accent-primary)] hover:bg-[var(--accent-tertiary)] text-white"
                    >
                      Ver todos los productos
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6 flex items-center text-[var(--text-primary)]">
                      {showFavorites ? (
                        <>
                          <Heart className="w-5 h-5 mr-2 text-[var(--accent-quaternary)] fill-[var(--accent-quaternary)]" />
                          Tus Favoritos
                        </>
                      ) : selectedCategory !== 'all' ? (
                        <>
                          {selectedCategory === 'limpieza' ? (
                            <Sparkles className="w-5 h-5 mr-2 text-[var(--accent-primary)]" />
                          ) : selectedCategory === 'mantenimiento' ? (
                            <Wrench className="w-5 h-5 mr-2 text-[var(--accent-secondary)]" />
                          ) : (
                            <Package className="w-5 h-5 mr-2 text-[var(--accent-quaternary)]" />
                          )}
                          Productos: {selectedCategory === 'limpieza' ? 'Limpieza' :
                            selectedCategory === 'mantenimiento' ? 'Mantenimiento' :
                              selectedCategory}
                          
                          {selectedSubcategory !== 'all' && (
                            <span className="ml-2 text-[var(--text-tertiary)]">
                              {' › '}{selectedSubcategory}
                            </span>
                          )}
                        </>
                      ) : (
                        <>Todos los Productos</>
                      )}
                      <Badge variant="outline" className="ml-3 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]">
                        {filteredProducts.length} productos
                      </Badge>
                      
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="ml-2 text-[var(--text-tertiary)] hover:text-[var(--state-error)]"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Limpiar filtros
                        </Button>
                      )}
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
                          className="text-[var(--text-primary)]"
                        />
                        
                        {/* Información sobre la visualización */}
                        <div className="mt-4 text-center text-sm text-[var(--text-tertiary)]">
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
    </div>
  );
};