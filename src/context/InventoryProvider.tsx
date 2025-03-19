import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useInventory } from '@/hooks/useInventory';
import type { Product, ProductFilters, CreateProductData, UpdateProductData } from '@/types/inventory';

// Tipo para el contexto
interface InventoryContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  currentProduct: Product | null;
  loadProducts: (searchFilters?: ProductFilters) => Promise<Product[]>;
  getProduct: (id: string) => Promise<Product | null>;
  createProduct: (data: CreateProductData) => Promise<Product | null>;
  updateProduct: (data: UpdateProductData) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateFilters: (filters: ProductFilters) => void;
  filters?: ProductFilters;
  refreshInventory: () => Promise<void>;
}

// Crear el contexto
export const InventoryContext = createContext<InventoryContextType | null>(null);

// Hook para usar el contexto
export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryContext debe ser usado dentro de un InventoryProvider');
  }
  return context;
};

// Props para el proveedor
interface InventoryProviderProps {
  children: ReactNode;
  initialFilters?: ProductFilters;
}

// Componente proveedor de inventario
export const InventoryProvider: React.FC<InventoryProviderProps> = ({ 
  children, 
  initialFilters 
}) => {
  // Usar el hook de inventario
  const inventory = useInventory(initialFilters);
  
  // Función para refrescar el inventario
  const refreshInventory = async () => {
    await inventory.loadProducts();
  };

  // Creamos el valor del contexto
  const contextValue: InventoryContextType = {
    ...inventory,
    refreshInventory
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};