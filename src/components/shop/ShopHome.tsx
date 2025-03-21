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
  X,
  ChevronRight,
  Check,
  Trash2,
  Menu
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
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Safe import of useNotification
let useNotification;
try {
  useNotification = require('@/context/NotificationContext').useNotification;
} catch (e) {
  console.warn('NotificationContext not available, notifications will be disabled');
  // Create a replacement hook that returns an object with an empty function
  useNotification = () => ({
    addNotification: (message, type) => {
      console.log(`Notification (${type}): ${message}`);
    }
  });
}

// Type for products
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

// Main component
export const ShopHome: React.FC = () => {
  const { addItem } = useCartContext();
  const queryClient = useQueryClient();

  // Safe use of notifications
  let notificationHook;
  try {
    notificationHook = typeof useNotification === 'function' ? useNotification() : { addNotification: null };
  } catch (e) {
    console.warn('Error using useNotification:', e);
    notificationHook = { addNotification: null };
  }

  const { addNotification } = notificationHook;

  // Main states
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortOrder, setSortOrder] = useState<'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'>('newest');
  const [activeTab, setActiveTab] = useState('all');
  
  // States for advanced filters
  const [marcas, setMarcas] = useState<string[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [selectedProveedores, setSelectedProveedores] = useState<string[]>([]);
  const [precioRange, setPrecioRange] = useState<[number, number]>([0, 100000]);
  const [maxPrecio, setMaxPrecio] = useState<number>(100000);
  const [showOnlyStock, setShowOnlyStock] = useState<boolean>(false);
  
  // States for local pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // States for user information
  const [userSecciones, setUserSecciones] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // State for filter sidebar on mobile
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Effect to retrieve user information and favorites
  useEffect(() => {
    const storedSecciones = localStorage.getItem('userSecciones');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedSecciones) {
      setUserSecciones(storedSecciones);
    } else {
      // If not in localStorage, we try to get it from the API
      fetchUserData();
    }
    
    if (storedRole) {
      setUserRole(storedRole);
    }
    
    // Load favorites from localStorage
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (error) {
        console.error('Error loading favorites:', error);
        localStorage.removeItem('favorites');
      }
    }

    // Check if there is a category filter in the URL
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      
      // If there's a category in the URL, set it as the active tab too
      if (categoryParam === 'limpieza' || categoryParam === 'mantenimiento') {
        setActiveTab(categoryParam);
      }
    }

    const subcategoryParam = params.get('subcategory');
    if (subcategoryParam) {
      setSelectedSubcategory(subcategoryParam);
    }

    const viewParam = params.get('view');
    if (viewParam === 'favorites') {
      setShowFavorites(true);
      setActiveTab('favorites');
    }
    
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, []);

  // Get user data
  const fetchUserData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Save to localStorage and state
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
      console.error('Error getting user data:', error);
    }
  };

  // Function to get ALL products at once
  const fetchAllProducts = async () => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }
  
    // Determine category filters according to user permissions
    let categoryFilter = '';
    if (userSecciones && userSecciones !== 'ambos') {
      categoryFilter = `&category=${userSecciones}`;
    }
    
    // Use a large limit to try to get all products
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
        throw new Error('Session expired');
      }
      throw new Error(`Error loading products (${response.status})`);
    }
  
    const data = await response.json();
    
    // Process the response according to its format
    if (data && data.items && Array.isArray(data.items)) {
      return procesarProductos(data.items);
    } else if (Array.isArray(data)) {
      return procesarProductos(data);
    } else {
      console.error('Unexpected response format:', data);
      throw new Error('Unexpected response format');
    }
  };

  // Use React Query to get all products
  const { data: allProducts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['allProducts', userSecciones],
    queryFn: fetchAllProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Extract unique brands and suppliers for filters
  useEffect(() => {
    if (allProducts.length) {
      // Extract unique brands
      const uniqueMarcas = Array.from(
        new Set(
          allProducts
            .filter(p => p.marca)
            .map(p => p.marca)
        )
      ) as string[];
      
      setMarcas(uniqueMarcas.sort());
      
      // Extract unique suppliers
      const uniqueProveedores = Array.from(
        new Set(
          allProducts
            .filter(p => p.proveedor?.nombre)
            .map(p => p.proveedor?.nombre)
        )
      ) as string[];
      
      setProveedores(uniqueProveedores.sort());
      
      // Determine maximum price for the slider
      const maxPrice = Math.max(
        ...allProducts.map(p => p.precio), 
        100 // Minimum default value
      );
      
      setMaxPrecio(maxPrice);
      setPrecioRange([0, maxPrice]);
    }
  }, [allProducts]);

  // Process products according to permissions
  const procesarProductos = (data: Product[]): Product[] => {
    // Filter by section according to permissions
    let filteredProducts = data;
    
    if (userSecciones && userSecciones !== 'ambos') {
      filteredProducts = data.filter(product => 
        product.categoria === userSecciones
      );
    }
    
    return filteredProducts;
  };

  // Effect to filter products when filters or products change
  useEffect(() => {
    if (!allProducts.length) return;

    let result = [...allProducts];

    // Filter by search
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

    // Filter by tab (category)
    if (activeTab !== 'all' && activeTab !== 'favorites') {
      result = result.filter(product => product.categoria === activeTab);
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.categoria === selectedCategory);
    }
    
    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      result = result.filter(product => product.subCategoria === selectedSubcategory);
    }
    
    // Filter by selected brands
    if (selectedMarcas.length > 0) {
      result = result.filter(product => 
        product.marca && selectedMarcas.includes(product.marca)
      );
    }
    
    // Filter by selected suppliers
    if (selectedProveedores.length > 0) {
      result = result.filter(product => 
        product.proveedor?.nombre && selectedProveedores.includes(product.proveedor.nombre)
      );
    }
    
    // Filter by price range
    result = result.filter(product => 
      product.precio >= precioRange[0] && product.precio <= precioRange[1]
    );
    
    // Filter by available stock
    if (showOnlyStock) {
      result = result.filter(product => product.stock > 0);
    }

    // Filter by favorites
    if (showFavorites || activeTab === 'favorites') {
      result = result.filter(product => favorites.includes(product._id));
    }

    // Only products with stock for cleaning, maintenance has no restriction
    if (!showOnlyStock) {
      result = result.filter(product => 
        // For maintenance products, we don't filter by stock
        product.categoria === 'mantenimiento' || product.stock > 0
      );
    }
    
    // Sort according to the selected criteria
    result = sortProducts(result, sortOrder);

    setFilteredProducts(result);
    setCurrentPage(1); // Reset to the first page when changing filters
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
    sortOrder,
    activeTab
  ]);

  // Function to sort products
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
          // If we have creation dates, use them to sort
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return 0; // No changes if there are no dates
        });
    }
  };

  // Manually update products
  const handleManualRefresh = () => {
    // Clear cache and reload
    queryClient.invalidateQueries(['allProducts']);
    refetch();
  };

  // Toggle favorite
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
  
  // Clean all filters
  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedMarcas([]);
    setSelectedProveedores([]);
    setPrecioRange([0, maxPrecio]);
    setShowOnlyStock(false);
    setSearchTerm('');
    setSortOrder('newest');
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === 'favorites') {
      setShowFavorites(true);
    } else {
      setShowFavorites(false);
      
      if (value !== 'all') {
        setSelectedCategory(value);
      } else {
        setSelectedCategory('all');
      }
    }
    
    // Reset subcategory when changing tabs
    setSelectedSubcategory('all');
  };

  // Get subcategories for the selected category
  const getSubcategories = () => {
    // If viewing all categories or favorites, return an empty array
    if (activeTab === 'all' || activeTab === 'favorites') return [];
    
    // Otherwise, get subcategories for the active tab (category)
    const subcategories = Array.from(
      new Set(
        allProducts
          .filter(p => p.categoria === activeTab)
          .map(p => p.subCategoria)
      )
    );
    
    return subcategories.sort();
  };
  
  // Calculate products for current page (local pagination)
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Calculate total pages for filtered products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  // Number of active filters
  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedSubcategory !== 'all',
    selectedMarcas.length > 0,
    selectedProveedores.length > 0,
    precioRange[0] > 0 || precioRange[1] < maxPrecio,
    showOnlyStock,
  ].filter(Boolean).length;

  // Animation variants for framer-motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05 
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  };
  
  // Determine which tabs to show based on user permissions
  const renderTabs = () => {
    const tabs = [
      { value: 'all', label: 'Todos', icon: <Package className="w-4 h-4 mr-1" /> }
    ];
    
    // Add category tabs based on permissions
    if (userSecciones === 'limpieza' || userSecciones === 'ambos') {
      tabs.push({ 
        value: 'limpieza', 
        label: 'Limpieza', 
        icon: <Sparkles className="w-4 h-4 mr-1" /> 
      });
    }
    
    if (userSecciones === 'mantenimiento' || userSecciones === 'ambos') {
      tabs.push({ 
        value: 'mantenimiento', 
        label: 'Mantenimiento', 
        icon: <Wrench className="w-4 h-4 mr-1" /> 
      });
    }
    
    // Always add favorites tab
    tabs.push({ 
      value: 'favorites', 
      label: 'Favoritos', 
      icon: <Heart className="w-4 h-4 mr-1" /> 
    });
    
    return tabs;
  };

  // Render filters sidebar
  const renderFiltersSidebar = () => {
    return (
      <div className="space-y-4 max-h-[85vh] overflow-y-auto px-1">
        {/* Filtro de subcategoría */}
        {getSubcategories().length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[#333333] font-medium flex items-center">
              <ChevronRight className="w-4 h-4 mr-1 text-[#3a8fb7]" />
              Subcategorías
            </h3>
            <Select
              value={selectedSubcategory}
              onValueChange={setSelectedSubcategory}
            >
              <SelectTrigger className="w-full bg-white border-[#d4f1f9] text-[#333333]">
                <SelectValue placeholder="Todas las subcategorías" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#d4f1f9]">
                <SelectItem value="all" className="text-[#333333]">Todas las subcategorías</SelectItem>
                
                {/* Listar subcategorías disponibles */}
                {getSubcategories().map((subcategory) => (
                  <SelectItem 
                    key={subcategory} 
                    value={subcategory} 
                    className="text-[#333333]"
                  >
                    {subcategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Filtro por marca */}
        {marcas.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[#333333] font-medium flex items-center">
              <ChevronRight className="w-4 h-4 mr-1 text-[#3a8fb7]" />
              Marcas
            </h3>
            <div className="max-h-36 overflow-y-auto space-y-2 bg-white border border-[#d4f1f9] rounded-md p-2">
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
                    className="border-[#3a8fb7] data-[state=checked]:bg-[#3a8fb7]"
                  />
                  <Label 
                    htmlFor={`marca-${marca}`}
                    className="text-[#333333] cursor-pointer text-sm"
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
            <h3 className="text-[#333333] font-medium flex items-center">
              <ChevronRight className="w-4 h-4 mr-1 text-[#3a8fb7]" />
              Proveedores
            </h3>
            <div className="max-h-36 overflow-y-auto space-y-2 bg-white border border-[#d4f1f9] rounded-md p-2">
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
                    className="border-[#3a8fb7] data-[state=checked]:bg-[#3a8fb7]"
                  />
                  <Label 
                    htmlFor={`proveedor-${proveedor}`}
                    className="text-[#333333] cursor-pointer text-sm"
                  >
                    {proveedor}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Price range filter */}
        <div className="space-y-3">
          <h3 className="text-[#333333] font-medium flex items-center">
            <ChevronRight className="w-4 h-4 mr-1 text-[#3a8fb7]" />
            Rango de Precio
          </h3>
          <Slider
            value={precioRange}
            min={0}
            max={maxPrecio}
            step={100}
            onValueChange={setPrecioRange}
            className="my-6"
          />
          <div className="flex justify-between">
            <span className="text-[#333333] text-sm font-medium">
              ${precioRange[0].toLocaleString()}
            </span>
            <span className="text-[#333333] text-sm font-medium">
              ${precioRange[1].toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Filtro de stock */}
        <div className="pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="show-only-stock"
              checked={showOnlyStock}
              onCheckedChange={(checked) => setShowOnlyStock(!!checked)}
              className="border-[#3a8fb7] data-[state=checked]:bg-[#3a8fb7]"
            />
            <Label 
              htmlFor="show-only-stock"
              className="text-[#333333] cursor-pointer"
            >
              Mostrar solo productos en stock
            </Label>
          </div>
        </div>
        
        {/* Orden */}
        <div className="space-y-2 pt-2">
          <h3 className="text-[#333333] font-medium flex items-center">
            <ChevronRight className="w-4 h-4 mr-1 text-[#3a8fb7]" />
            Ordenar Por
          </h3>
          <Select
            value={sortOrder}
            onValueChange={(value: any) => setSortOrder(value)}
          >
            <SelectTrigger className="w-full bg-white border-[#d4f1f9] text-[#333333]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#d4f1f9]">
              <SelectItem value="newest" className="text-[#333333]">Más recientes</SelectItem>
              <SelectItem value="price-asc" className="text-[#333333]">Precio: Menor a Mayor</SelectItem>
              <SelectItem value="price-desc" className="text-[#333333]">Precio: Mayor a Menor</SelectItem>
              <SelectItem value="name-asc" className="text-[#333333]">Nombre: A-Z</SelectItem>
              <SelectItem value="name-desc" className="text-[#333333]">Nombre: Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Filter actions */}
        {activeFiltersCount > 0 && (
          <div className="pt-4">
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="w-full border-[#F44336] text-[#F44336] hover:bg-[#F44336]/10 flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="shop-theme min-h-screen bg-gradient-to-br from-[#d4f1f9] via-[#f2f2f2] to-[#a8e6cf]">
      <ShopNavbar />
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">

          {/* Error view */}
          {error && (
            <Alert variant="destructive" className="bg-[#f8d7da] border border-[#f5c2c7]">
              <AlertCircle className="h-4 w-4 text-[#842029]" />
              <AlertDescription className="text-[#842029]">
                {error instanceof Error ? error.message : 'Error loading products'}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading view */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-t-[#3a8fb7] border-r-[#a8e6cf] border-b-[#d4f1f9] border-l-[#f2f2f2] rounded-full animate-spin mb-4"></div>
              <p className="text-[#333333]">Loading products...</p>
            </div>
          ) : (
            <>
              {/* Hero Banner - More responsive and mobile friendly */}
              <section className="relative mb-4 sm:mb-6 overflow-hidden rounded-xl mx-auto max-w-7xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative min-h-[180px] sm:h-48 md:h-64 lg:h-72 flex items-center z-10 p-3 sm:p-6 md:p-12"
                >
                  {/* Background with gradient - improved for responsiveness */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#3a8fb7] to-[#5baed1] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10"></div>
                    <div className="absolute right-0 bottom-0 w-32 sm:w-64 h-32 sm:h-64 bg-[#a8e6cf] rounded-full filter blur-3xl opacity-20 -mr-10 sm:-mr-20 -mb-10 sm:-mb-20"></div>
                    <div className="absolute left-1/2 top-0 w-20 sm:w-40 h-20 sm:h-40 bg-[#d4f1f9] rounded-full filter blur-3xl opacity-20 -ml-10 sm:-ml-20 -mt-10 sm:-mt-20"></div>
                  </div>

                  <div className="relative z-10 w-full max-w-4xl">
                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-white leading-tight"
                    >
                      Bienvenido a <span className="text-[#a8e6cf] font-bold">LYME S.A</span>
                    </motion.h1>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 max-w-xl"
                    >
                      {userSecciones === 'limpieza' 
                        ? 'Encuentra todos los productos de limpieza que necesitas.'
                        : userSecciones === 'mantenimiento'
                        ? 'Explora nuestra selección de productos para mantenimiento.'
                        : 'Encuentra todo lo que necesitas para limpieza y mantenimiento en un solo lugar.'}
                    </motion.p>
                    
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        <a 
                          href="/cart" 
                          className="bg-white hover:bg-[#f2f2f2] text-[#3a8fb7] px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium flex items-center transition-all shadow-lg shadow-[#3a8fb7]/10"
                        >
                          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                          Ver Carrito
                        </a>
                        <button 
                          onClick={handleManualRefresh}
                          className="bg-[#a8e6cf] hover:bg-[#8dd4b9] text-[#474747] px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium flex items-center transition-all shadow-lg shadow-[#3a8fb7]/10"
                        >
                          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                          Actualizar
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </section>

              {/* Top search bar */}
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6 transition-all duration-200 hover:shadow-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3a8fb7]" />
                  <Input
                    type="text"
                    placeholder="Buscar productos..."
                    className="pl-10 bg-white border-[#d4f1f9] focus:border-[#3a8fb7] text-[#333333] placeholder-[#5c5c5c]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Pestañas de categorías - más responsive */}
              <Tabs 
                defaultValue="all" 
                value={activeTab}
                onValueChange={handleTabChange}
                className="mb-4 sm:mb-6"
              >
                <TabsList className="grid grid-cols-4 bg-[#FFFF] p-1">
                  {renderTabs().map(tab => (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value}
                      className="data-[state=active]:bg-white data-[state=active]:text-[#3a8fb7] data-[state=active]:shadow-md"
                    >
                      <span className="flex items-center justify-center sm:justify-start">
                        {tab.icon}
                        <span className="hidden xs:inline text-xs sm:text-sm">{tab.label}</span>
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Main content */}
                <div className="mt-4 sm:mt-6">
                  <div className="flex flex-col gap-4 sm:gap-6">
                    {/* Mobile Filter Button - Only visible on small screens */}
                    <div className="lg:hidden">
                      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full flex items-center justify-center bg-white gap-2 border-[#d4f1f9] text-[#3a8fb7]"
                          >
                            <Filter className="h-4 w-4" />
                            Filtros
                            {activeFiltersCount > 0 && (
                              <Badge className="ml-2 bg-[#3a8fb7] text-white">
                                {activeFiltersCount}
                              </Badge>
                            )}
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85vw] sm:w-[385px] bg-white">
                          <SheetHeader className="border-b pb-4 mb-4">
                            <SheetTitle className="flex items-center justify-between">
                              <div className="flex items-center text-[#3a8fb7]">
                                <Filter className="w-5 h-5 mr-2" />
                                Filtros
                              </div>
                              {activeFiltersCount > 0 && (
                                <Badge className="bg-[#a8e6cf] text-[#333333]">
                                  {activeFiltersCount}
                                </Badge>
                              )}
                            </SheetTitle>
                          </SheetHeader>
                          {renderFiltersSidebar()}
                          <SheetFooter className="mt-4 pt-4 border-t">
                            <SheetClose asChild>
                              <Button className="w-full bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white">
                                Aplicar Filtros
                              </Button>
                            </SheetClose>
                          </SheetFooter>
                        </SheetContent>
                      </Sheet>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                      {/* Sidebar filters - Hidden on mobile, visible on large screens */}
                      <div className="hidden lg:block w-64 shrink-0">
                        <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-20">
                          <div className="p-4 bg-[#3a8fb7] text-white font-medium flex items-center justify-between">
                            <span className="flex items-center">
                              <Filter className="w-4 h-4 mr-2" />
                              Filtros
                            </span>
                            {activeFiltersCount > 0 && (
                              <Badge className="bg-[#a8e6cf] text-[#333333]">
                                {activeFiltersCount}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {renderFiltersSidebar()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Cuadrícula de productos */}
                      <div className="flex-1">
                        {/* Encabezado de productos con contador de resultados */}
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg sm:text-xl font-bold text-[#333333] flex items-center">
                            {activeTab === 'favorites' ? (
                              <>
                                <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-[#3a8fb7]" />
                                <span className="hidden xs:inline">Mis Favoritos</span>
                                <span className="xs:hidden">Favoritos</span>
                              </>
                            ) : activeTab !== 'all' ? (
                              <>
                                {activeTab === 'limpieza' ? (
                                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-[#3a8fb7]" />
                                ) : activeTab === 'mantenimiento' ? (
                                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-[#3a8fb7]" />
                                ) : (
                                  <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-[#3a8fb7]" />
                                )}
                                <span className="hidden xs:inline">
                                  {activeTab === 'limpieza' ? 'Productos de Limpieza' :
                                  activeTab === 'mantenimiento' ? 'Productos de Mantenimiento' :
                                  activeTab}
                                </span>
                                <span className="xs:hidden">
                                  {activeTab === 'limpieza' ? 'Limpieza' :
                                  activeTab === 'mantenimiento' ? 'Manten.' :
                                  activeTab}
                                </span>
                                
                                {selectedSubcategory !== 'all' && (
                                  <span className="ml-1 sm:ml-2 text-[#5c5c5c] text-xs sm:text-sm">
                                    {' › '}{selectedSubcategory}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>Todos los Productos</>
                            )}
                            <Badge className="ml-2 sm:ml-3 text-xs bg-[#3a8fb7]/10 text-[#3a8fb7] border-[#3a8fb7] font-normal">
                              {filteredProducts.length}
                            </Badge>
                          </h2>
                        </div>

                        {/* Estados vacíos */}
                        {activeTab === 'favorites' && favorites.length === 0 ? (
                          <div className="bg-white rounded-lg shadow-md p-5 sm:p-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-[#3a8fb7]/10 rounded-full mb-3 sm:mb-4">
                              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-[#3a8fb7]" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-medium mb-2 text-[#333333]">Aún no tienes favoritos</h3>
                            <p className="text-sm sm:text-base text-[#5c5c5c] mb-4 sm:mb-6">
                              Agrega productos a tus favoritos para encontrarlos rápidamente
                            </p>
                            <Button
                              onClick={() => handleTabChange('all')}
                              className="bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white"
                            >
                              Ver Productos
                            </Button>
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="bg-white rounded-lg shadow-md p-5 sm:p-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#3a8fb7]/10 mb-4 sm:mb-6">
                              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-[#3a8fb7]" />
                            </div>
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-[#333333]">No se encontraron productos</h2>
                            <p className="text-sm sm:text-base text-[#5c5c5c] mb-4 sm:mb-6 max-w-lg mx-auto">
                              {activeTab === 'favorites'
                                ? "No tienes productos favoritos guardados. Explora nuestra tienda y agrega algunos."
                                : "No hay productos que coincidan con tu búsqueda. Intenta con otros términos o filtros."}
                            </p>
                            <Button
                              onClick={clearAllFilters}
                              className="bg-[#3a8fb7] hover:bg-[#2a7a9f] text-white"
                            >
                              Restablecer Filtros
                            </Button>
                          </div>
                        ) : (
                          <>
                            {/* Product grid - Adjusted for mobile to show 4 products (2x2) */}
                            <motion.div 
                              className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4"
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              {getCurrentPageItems().map((product) => (
                                <motion.div key={product._id} variants={itemVariants}>
                                  <ProductCard
                                    product={product}
                                    isFavorite={favorites.includes(product._id)}
                                    onToggleFavorite={() => toggleFavorite(product._id)}
                                    onAddToCart={(quantity) => handleAddToCart(product, quantity)}
                                    compact={true}
                                  />
                                </motion.div>
                              ))}
                            </motion.div>
                            
                            {/* Pagination - More responsive */}
                            {filteredProducts.length > 0 && (
                              <div className="mt-6 sm:mt-8 flex flex-col items-center">
                                <EnhancedPagination
                                  totalItems={filteredProducts.length}
                                  itemsPerPage={itemsPerPage}
                                  currentPage={currentPage}
                                  onPageChange={setCurrentPage}
                                  onItemsPerPageChange={setItemsPerPage}
                                  className="text-[#333333] text-xs sm:text-sm"
                                />
                                
                                {/* Information about display */}
                                <div className="mt-2 sm:mt-4 text-center text-xs sm:text-sm text-[#5c5c5c]">
                                  <p>
                                    Mostrando {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} 
                                    - {Math.min(filteredProducts.length, currentPage * itemsPerPage)} 
                                    &nbsp;de {filteredProducts.length}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};