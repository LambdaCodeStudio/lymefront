// src/hooks/useClients.ts
import { useState, useEffect, useCallback } from 'react';
import { clientService } from '@/services/clientService';
import type { Client } from '@/types/client';

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  currentClient: Client | null;
}

export const useClients = () => {
  const [state, setState] = useState<ClientsState>({
    clients: [],
    loading: true,
    error: null,
    currentClient: null
  });

  // Cargar todos los clientes
  const loadClients = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const clients = await clientService.getAll();
      
      setState(prev => ({
        ...prev,
        clients,
        loading: false
      }));
      
      return clients;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar clientes'
      }));
      
      return [];
    }
  }, []);

  // Efecto para cargar clientes al montar
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Buscar clientes
  const searchClients = async (term: string): Promise<Client[]> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const clients = await clientService.searchClients(term);
      
      setState(prev => ({
        ...prev,
        clients,
        loading: false
      }));
      
      return clients;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al buscar clientes'
      }));
      
      return [];
    }
  };

  // Obtener un cliente por ID
  const getClient = async (id: string): Promise<Client | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const client = await clientService.getById(id);
      
      setState(prev => ({
        ...prev,
        currentClient: client,
        loading: false
      }));
      
      return client;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al obtener el cliente'
      }));
      
      return null;
    }
  };

  // Crear un nuevo cliente
  const createClient = async (clientData: Partial<Client>): Promise<Client | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const client = await clientService.create(clientData);
      
      // Actualizar la lista de clientes
      setState(prev => ({
        ...prev,
        clients: [client, ...prev.clients],
        loading: false
      }));
      
      return client;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al crear el cliente'
      }));
      
      return null;
    }
  };

  // Actualizar un cliente
  const updateClient = async (id: string, clientData: Partial<Client>): Promise<Client | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const client = await clientService.update(id, clientData);
      
      // Actualizar la lista de clientes
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c.id === client.id ? client : c),
        currentClient: client,
        loading: false
      }));
      
      return client;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al actualizar el cliente'
      }));
      
      return null;
    }
  };

  // Eliminar un cliente
  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await clientService.delete(id);
      
      // Eliminar de la lista
      setState(prev => ({
        ...prev,
        clients: prev.clients.filter(c => c.id !== id),
        loading: false
      }));
      
      return true;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al eliminar el cliente'
      }));
      
      return false;
    }
  };

  // Obtener clientes con órdenes activas
  const getClientsWithActiveOrders = async (): Promise<Client[]> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const clients = await clientService.getClientsWithActiveOrders();
      
      setState(prev => ({
        ...prev,
        loading: false
      }));
      
      return clients;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al obtener clientes con órdenes activas'
      }));
      
      return [];
    }
  };

  return {
    ...state,
    loadClients,
    searchClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getClientsWithActiveOrders
  };
};