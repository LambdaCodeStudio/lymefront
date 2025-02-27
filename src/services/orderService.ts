// src/services/orderService.ts
import { BaseService } from './baseService';
import api from './api';
import type { Order, OrderStatus, CreateOrderData } from '@/types/order';

class OrderService extends BaseService<Order> {
  constructor() {
    super('/ordenes');
  }

  // Métodos específicos para órdenes
  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return await api.get<Order[]>(`${this.endpoint}/status/${status}`);
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return await api.get<Order[]>(`${this.endpoint}/client/${clientId}`);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return await api.put<Order>(`${this.endpoint}/${orderId}/status`, { status });
  }

  async createOrderWithItems(orderData: CreateOrderData): Promise<Order> {
    return await api.post<Order>(this.endpoint, orderData);
  }
}

// Exportar instancia singleton
export const orderService = new OrderService();