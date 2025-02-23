// src/types/client.ts
export interface Client {
    _id: string;
    servicio: string;
    seccionDelServicio: string;
    userId: string;
  }
  
  export interface CreateClientData {
    servicio: string;
    seccionDelServicio: string;
    userId: string;
  }
  
  export interface UpdateClientData {
    id: string;
    servicio?: string;
    seccionDelServicio?: string;
    userId?: string;
  }
