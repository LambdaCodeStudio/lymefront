import React, { createContext, useState, useContext, useEffect } from 'react';
import { imageService } from '@/services/imageService';

// Definir el tipo de un ítem del carrito
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string; // Imagen en base64
  category?: string;
  subcategory?: string;
}

// Definir el contexto del carrito
interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

// Crear el contexto
const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};

// Proveedor del contexto
export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Estado inicial desde localStorage si existe
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });
  
  // Calcular totales
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Guardar en localStorage cuando cambie el carrito
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items]);
  
  // Agregar un ítem al carrito
  const addItem = async (item: CartItem) => {
    // Verificar si ya existe el ítem
    const existingIndex = items.findIndex(i => i.id === item.id);
    
    // Si el ítem no tiene imagen, intentamos cargarla
    if (!item.image) {
      try {
        const base64Image = await imageService.getImageBase64(item.id);
        if (base64Image) {
          item.image = base64Image;
        }
      } catch (error) {
        console.error('Error al cargar imagen para el carrito:', error);
      }
    }
    
    if (existingIndex !== -1) {
      // Actualizar cantidad del ítem existente
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += item.quantity;
      setItems(updatedItems);
    } else {
      // Agregar nuevo ítem
      setItems([...items, item]);
    }
  };
  
  // Eliminar un ítem del carrito
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  // Actualizar la cantidad de un ítem
  const updateQuantity = (id: string, quantity: number) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, quantity } : item
    );
    setItems(updatedItems);
  };
  
  // Limpiar el carrito
  const clearCart = () => {
    setItems([]);
  };
  
  return (
    <CartContext.Provider 
      value={{ 
        items, 
        addItem, 
        removeItem, 
        updateQuantity, 
        clearCart,
        totalItems,
        totalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
};