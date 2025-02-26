import type { Client, CreateClientData, UpdateClientData } from '../types/backend-types';
import api from './api';

export const clientService = {
  getClients: async (): Promise<Client[]> => {
    const { data } = await api.get('/cliente');
    return data;
  },

  getClient: async (id: string): Promise<Client> => {
    const { data } = await api.get(`/cliente/${id}`);
    return data;
  },

  getClientsByUser: async (userId: string): Promise<Client[]> => {
    const { data } = await api.get(`/cliente/user/${userId}`);
    return data;
  },

  createClient: async (clientData: CreateClientData): Promise<Client> => {
    const { data } = await api.post('/cliente', clientData);
    return data;
  },

  updateClient: async (data: UpdateClientData): Promise<Client> => {
    const { id, ...updateData } = data;
    const response = await api.put(`/cliente/${id}`, updateData);
    return response.data;
  },

  deleteClient: async (id: string): Promise<void> => {
    await api.delete(`/cliente/${id}`);
  }
};