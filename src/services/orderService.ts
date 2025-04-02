import { BaseService } from './baseService';
import api from './api';
import type { Order, CreateOrderData } from '@/types/order';
import eventService from './EventService';

// Constantes para eventos relacionados con pedidos
export const PEDIDO_EVENTS = {
  UPDATED: 'pedido_updated',
  CREATED: 'pedido_created',
  DELETED: 'pedido_deleted'
};

class PedidoService extends BaseService<Order> {
  constructor() {
    super('/pedido'); // Usando el endpoint correcto '/pedido'
  }

  // Método para obtener todos los pedidos
  async getPedidos(): Promise<Order[]> {
    return await api.get<Order[]>(this.endpoint);
  }

  // Método para obtener pedidos por fecha
  async getPedidosByDate(fechaInicio: string, fechaFin: string): Promise<Order[]> {
    return await api.get<Order[]>(`${this.endpoint}/fecha`, { 
      fechaInicio, 
      fechaFin 
    });
  }

  // Método para obtener pedido por ID
  async getPedidoById(id: string): Promise<Order> {
    return await api.get<Order>(`${this.endpoint}/${id}`);
  }

  // Método para crear pedido
  async createPedido(pedidoData: CreateOrderData): Promise<Order> {
    const result = await api.post<Order>(this.endpoint, pedidoData);
    // Notificar la creación del pedido
    eventService.publish(PEDIDO_EVENTS.CREATED, result);
    return result;
  }

  // Método para actualizar pedido
  async updatePedido(id: string, pedidoData: any): Promise<Order> {
    const result = await api.put<Order>(`${this.endpoint}/${id}`, pedidoData);
    // Notificar la actualización del pedido
    eventService.publish(PEDIDO_EVENTS.UPDATED, result);
    return result;
  }

  // Método para eliminar pedido
  async deletePedido(id: string): Promise<void> {
    await api.delete(`${this.endpoint}/${id}`);
    // Notificar la eliminación del pedido
    eventService.publish(PEDIDO_EVENTS.DELETED, id);
  }

  // Método para descargar remito en PDF
  async downloadRemito(id: string): Promise<string> {
    // Devuelve la URL para descargar el remito
    return `${api.getBaseUrl()}http://localhost:3000/api/downloads/remito/${id}`;
  }
}

// Exportar instancia singleton
export const pedidoService = new PedidoService();