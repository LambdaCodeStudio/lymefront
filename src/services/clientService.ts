// src/services/clientService.ts
import { BaseService, PaginationParams } from './baseService';
import api from './api';
import type { Client } from '@/types/client';
import { Cliente, SubServicio } from '@/types/users';

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

  // -------- Métodos nuevos para gestión de clientes y subservicios --------

  /**
   * Obtiene los clientes asignados a un supervisor específico
   * @param supervisorId ID del supervisor
   * @returns Lista de clientes del supervisor
   */
  async getClientesBySupervisorId(supervisorId: string): Promise<Cliente[]> {
    try {
      const response = await api.get<Cliente[]>(`/cliente/supervisor/${supervisorId}`);
      return response;
    } catch (error) {
      console.error(`Error al obtener clientes del supervisor ${supervisorId}:`, error);
      throw new Error("No se pudieron cargar los clientes del supervisor");
    }
  }

  /**
   * Obtiene los subservicios asignados a un supervisor específico
   * @param supervisorId ID del supervisor
   * @returns Lista de subservicios del supervisor agrupados por cliente
   */
  async getSubserviciosBySupervisorId(supervisorId: string): Promise<any[]> {
    try {
      const response = await api.get<any[]>(`/cliente/subservicios/supervisor/${supervisorId}`);
      return response;
    } catch (error) {
      console.error(`Error al obtener subservicios del supervisor ${supervisorId}:`, error);
      throw new Error("No se pudieron cargar los subservicios del supervisor");
    }
  }

  /**
   * Obtiene los subservicios sin supervisor asignado
   * @returns Lista de subservicios sin supervisor
   */
  async getSubserviciosSinSupervisor(): Promise<any[]> {
    try {
      const response = await api.get<any[]>('/cliente/subservicios/sin-supervisor');
      return response;
    } catch (error) {
      console.error('Error al obtener subservicios sin supervisor:', error);
      throw new Error("No se pudieron cargar los subservicios sin supervisor");
    }
  }

  /**
   * Obtiene los subservicios asignados a un operario específico.
   * Fallback para cuando editamos un operario, y necesitamos cargar sus subservicios.
   * 
   * @param operarioId ID del operario
   * @returns Lista de subservicios del operario agrupados por cliente, o un array vacío si falla
   */
  async getSubserviciosByOperarioId(operarioId: string): Promise<any[]> {
    try {
      // En el backend actual, esta ruta es la que existe según el código proporcionado
      // Verificado en src/routes/clienteRoutes.js
      const response = await api.get<any[]>(`/cliente/subservicios/operario/${operarioId}`);
      return response;
    } catch (error) {
      console.error(`Error al obtener subservicios del operario: ${operarioId}`, error);
      // En caso de error, devolvemos un array vacío para evitar romper el flujo
      // y permitir al usuario asignar nuevos subservicios
      return [];
    }
  }

  /**
   * Obtiene los subservicios asignados al operario actual
   * @returns Lista de subservicios del operario actual
   */
  async getMisSubservicios(): Promise<any[]> {
    try {
      // Esta es la ruta correcta según el código del backend
      const response = await api.get<any[]>('/cliente/mis-subservicios');
      return response;
    } catch (error) {
      console.error('Error al obtener mis subservicios:', error);
      throw new Error("No se pudieron cargar tus subservicios");
    }
  }

  /**
   * Asigna un operario a un subservicio
   * @param clienteId ID del cliente
   * @param subServicioId ID del subservicio
   * @param operarioId ID del operario
   * @returns Resultado de la operación
   */
  async assignOperarioToSubservicio(clienteId: string, subServicioId: string, operarioId: string): Promise<any> {
    try {
      const response = await api.post<any>(`/cliente/${clienteId}/subservicio/${subServicioId}/operario`, {
        operarioId
      });
      return response;
    } catch (error) {
      console.error(`Error al asignar operario a subservicio:`, error);
      throw new Error("No se pudo asignar el subservicio al operario");
    }
  }

  /**
   * Elimina la asignación de un operario a un subservicio
   * @param clienteId ID del cliente
   * @param subServicioId ID del subservicio
   * @param operarioId ID del operario
   * @returns Resultado de la operación
   */
  async removeOperarioFromSubservicio(clienteId: string, subServicioId: string, operarioId: string): Promise<any> {
    try {
      const response = await api.delete<any>(`/cliente/${clienteId}/subservicio/${subServicioId}/operario/${operarioId}`);
      return response;
    } catch (error) {
      console.error(`Error al remover operario de subservicio:`, error);
      throw new Error("No se pudo eliminar la asignación del subservicio");
    }
  }
}

// Exportar instancia singleton
export const clientService = new ClientService();