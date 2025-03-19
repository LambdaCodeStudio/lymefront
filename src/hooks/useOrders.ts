// src/hooks/useOrders.ts
import { useState, useEffect, useCallback } from 'react';
import { orderService } from '@/services/orderService';
import type { Order, OrderStatus, CreateOrderData } from '@/types/order';

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  currentOrder: Order | null;
}

export const useOrders = (initialStatus?: OrderStatus) => {
  const [state, setState] = useState<OrdersState>({
    orders: [],
    loading: true,
    error: null,
    currentOrder: null
  });

  const [currentStatus, setCurrentStatus] = useState<OrderStatus | undefined>(initialStatus);

  // Cargar todas las órdenes
  const loadOrders = useCallback(async (status?: OrderStatus) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const statusToUse = status || currentStatus;
      const orders = statusToUse 
        ? await orderService.getOrdersByStatus(statusToUse)
        : await orderService.getAll();
      
      setState(prev => ({
        ...prev,
        orders,
        loading: false
      }));
      
      return orders;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar órdenes'
      }));
      
      return [];
    }
  }, [currentStatus]);

  // Cargar órdenes al montar y cuando cambie el estado
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Obtener órdenes de un cliente
  const getOrdersByClient = async (clientId: string): Promise<Order[]> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const orders = await orderService.getOrdersByClient(clientId);
      
      setState(prev => ({
        ...prev,
        orders,
        loading: false
      }));
      
      return orders;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al obtener órdenes del cliente'
      }));
      
      return [];
    }
  };

  // Obtener una orden por ID
  const getOrder = async (id: string): Promise<Order | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const order = await orderService.getById(id);
      
      setState(prev => ({
        ...prev,
        currentOrder: order,
        loading: false
      }));
      
      return order;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al obtener la orden'
      }));
      
      return null;
    }
  };

  // Crear una nueva orden
  const createOrder = async (orderData: CreateOrderData): Promise<Order | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const order = await orderService.createOrderWithItems(orderData);
      
      // Actualizar la lista de órdenes
      setState(prev => ({
        ...prev,
        orders: [order, ...prev.orders],
        loading: false
      }));
      
      return order;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al crear la orden'
      }));
      
      return null;
    }
  };

  // Actualizar el estado de una orden
  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const order = await orderService.updateOrderStatus(orderId, status);
      
      // Actualizar la lista de órdenes
      setState(prev => ({
        ...prev,
        orders: prev.orders.map(o => o.id === order.id ? order : o),
        currentOrder: order,
        loading: false
      }));
      
      return order;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al actualizar el estado de la orden'
      }));
      
      return null;
    }
  };

  // Cambiar el filtro de estado
  const changeStatusFilter = (status?: OrderStatus) => {
    setCurrentStatus(status);
  };

  return {
    ...state,
    currentStatus,
    loadOrders,
    getOrdersByClient,
    getOrder,
    createOrder,
    updateOrderStatus,
    changeStatusFilter
  };
};