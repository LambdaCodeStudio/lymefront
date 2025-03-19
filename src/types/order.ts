export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface OrderProduct {
    productoId: string;
    cantidad: number;
  }
  
  export interface Order {
    id: any;
    _id: string;
    servicio: string;
    seccionDelServicio: string;
    userId: string;
    fecha: string;
    productos: OrderProduct[];
    status?: OrderStatus; 
  }
  
  export interface CreateOrderData {
    servicio: string;
    seccionDelServicio: string;
    userId: string;
    productos: OrderProduct[];
  }
  
  export interface UpdateOrderData extends Partial<CreateOrderData> {
    id: string;
  }
  
  export interface OrderFilters {
    fechaInicio?: string;
    fechaFin?: string;
    servicio?: string;
  }