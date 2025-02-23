import type { Order, CreateOrderData, UpdateOrderData, OrderFilters } from '../types/order';
import api from './api';

export const orderService = {
  getOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    const { data } = await api.get('/pedido', { params: filters });
    return data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const { data } = await api.get(`/pedido/${id}`);
    return data;
  },

  getOrdersByUser: async (userId: string): Promise<Order[]> => {
    const { data } = await api.get(`/pedido/user/${userId}`);
    return data;
  },

  getOrdersByService: async (servicio: string): Promise<Order[]> => {
    const { data } = await api.get(`/pedido/servicio/${servicio}`);
    return data;
  },

  getOrdersByDate: async (fechaInicio: string, fechaFin: string): Promise<Order[]> => {
    const { data } = await api.get('/pedido/fecha', {
      params: { fechaInicio, fechaFin }
    });
    return data;
  },

  getOrderedOrders: async (): Promise<Order[]> => {
    const { data } = await api.get('/pedido/ordenados');
    return data;
  },

  createOrder: async (orderData: CreateOrderData): Promise<Order> => {
    const { data } = await api.post('/pedido', orderData);
    return data;
  },

  updateOrder: async (data: UpdateOrderData): Promise<Order> => {
    const { id, ...updateData } = data;
    const response = await api.put(`/pedido/${id}`, updateData);
    return response.data;
  },

  deleteOrder: async (id: string): Promise<void> => {
    await api.delete(`/pedido/${id}`);
  }
};