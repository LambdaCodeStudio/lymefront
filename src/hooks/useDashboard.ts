// src/hooks/useDashboard.ts
import { useState, createContext, useContext } from 'react';

// Tipos para el contexto del dashboard
interface DashboardContextType {
  currentSection: string | null;
  changeSection: (sectionId: string | null, entityId?: string) => void;
  selectedEntityId: string | null;
  selectedUserId: string | null;  // Nuevo: para almacenar el ID del usuario seleccionado
  setSelectedUserId: (userId: string | null) => void;  // Nuevo: para cambiar el usuario seleccionado
}

// Contexto por defecto
const defaultContext: DashboardContextType = {
  currentSection: null,
  changeSection: () => {},
  selectedEntityId: null,
  selectedUserId: null,
  setSelectedUserId: () => {}
};

// Crear el contexto
export const DashboardContext = createContext<DashboardContextType>(defaultContext);

// Hook para usar el contexto
export const useDashboard = () => useContext(DashboardContext);

// Hook para crear el contexto (renombrado para evitar confusión)
export const useDashboardState = (initialSection?: string) => {
  const [currentSection, setCurrentSection] = useState<string | null>(initialSection || null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Función para cambiar de sección
  const changeSection = (sectionId: string | null, entityId?: string) => {
    setCurrentSection(sectionId);
    if (entityId) {
      setSelectedEntityId(entityId);
    } else {
      // Solo limpiar el ID si cambiamos a una sección diferente
      if (currentSection !== sectionId) {
        setSelectedEntityId(null);
      }
    }
    
    // Guardar la sección actual en localStorage
    if (sectionId) {
      localStorage.setItem('currentDashboardSection', sectionId);
    } else {
      localStorage.removeItem('currentDashboardSection');
    }
    
    // Si hay un ID de entidad, guardarlo también
    if (entityId) {
      localStorage.setItem('selectedEntityId', entityId);
    } else if (currentSection !== sectionId) {
      localStorage.removeItem('selectedEntityId');
    }
  };
  
  // Nueva función para establecer el usuario seleccionado
  const handleSetSelectedUserId = (userId: string | null) => {
    setSelectedUserId(userId);
    
    // Opcional: Persistir el ID de usuario en localStorage
    if (userId) {
      localStorage.setItem('selectedUserId', userId);
    } else {
      localStorage.removeItem('selectedUserId');
    }
  };
  
  return {
    currentSection,
    selectedEntityId,
    selectedUserId,
    changeSection,
    setSelectedUserId: handleSetSelectedUserId
  };
};