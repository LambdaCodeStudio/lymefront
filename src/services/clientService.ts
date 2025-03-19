// src/services/clientService.ts
import { BaseService, PaginationParams } from './baseService';
import api from './api';
import type { Client } from '@/types/client';

class ClientService extends BaseService<Client> {
  constructor() {
    super('/clientes');
  }

  // Métodos específicos para clientes
  async searchClients(term: string): Promise<Client[]> {
    return await api.get<Client[]>(`${this.endpoint}/search`, { term });
  }

  async getClientsWithActiveOrders(): Promise<Client[]> {
    return await api.get<Client[]>(`${this.endpoint}/with-active-orders`);
  }

  async getClientStats(clientId: string): Promise<any> {
    return await api.get<any>(`${this.endpoint}/${clientId}/stats`);
  }
}

// Exportar instancia singleton
export const clientService = new ClientService();