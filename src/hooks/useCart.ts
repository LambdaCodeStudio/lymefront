import { useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  subcategory?: string;
}

interface CartHook {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

// Custom hook para gestionar el carrito de compras con localStorage
export const useCart = (): CartHook => {
  // Estado inicial del carrito
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Cargar carrito desde localStorage al montar el componente
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        console.error('Error al cargar el carrito desde localStorage:', error);
        // Si hay error, limpiar el localStorage
        localStorage.removeItem('cart');
      }
    }
  }, []);
  
  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);
  
  // Agregar o actualizar un producto en el carrito
  const addItem = (item: CartItem) => {
    setItems(prevItems => {
      // Verificar si el producto ya está en el carrito
      const existingItemIndex = prevItems.findIndex(i => i.id === item.id);
      
      if (existingItemIndex >= 0) {
        // Si existe, incrementar la cantidad
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + item.quantity
        };
        return updatedItems;
      } else {
        // Si no existe, agregarlo al carrito
        return [...prevItems, item];
      }
    });
  };
  
  // Eliminar un producto del carrito
  const removeItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };
  
  // Actualizar la cantidad de un producto en el carrito
  const updateQuantity = (id: string, quantity: number) => {
    // No permitir cantidades negativas o cero
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };
  
  // Limpiar el carrito
  const clearCart = () => {
    setItems([]);
  };
  
  // Calcular totales
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice
  };
};