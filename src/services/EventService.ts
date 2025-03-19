// src/services/EventService.ts

type EventCallback = (...args: any[]) => void;

class EventService {
  on(arg0: string, handleUserUpdated: () => void) {
    throw new Error('Method not implemented.');
  }
  private events: Record<string, EventCallback[]> = {};

  // Suscribirse a un evento
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Devolver función para desuscribirse
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  // Publicar un evento
  publish(event: string, ...args: any[]): void {
    if (!this.events[event]) return;

    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error al ejecutar callback para evento ${event}:`, error);
      }
    });
  }

  // Alias para publish, para mantener compatibilidad con otros sistemas de eventos
  emit(event: string, ...args: any[]): void {
    this.publish(event, ...args);
  }
}

// Singleton para usar en toda la aplicación
const eventService = new EventService();
export default eventService;