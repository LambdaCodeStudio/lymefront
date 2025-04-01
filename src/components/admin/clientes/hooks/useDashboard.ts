import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Tipo para el contexto del dashboard
 */
interface DashboardContextType {
  selectedUserId: string | undefined;
  setSelectedUserId: (id: string | undefined) => void;
  selectedSection: string | undefined;
  setSelectedSection: (section: string | undefined) => void;
  menuIsOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
}

/**
 * Props para el proveedor del contexto
 */
interface DashboardProviderProps {
  children: ReactNode;
}

/**
 * Valores por defecto para el contexto
 */
const defaultContext: DashboardContextType = {
  selectedUserId: undefined,
  setSelectedUserId: () => {},
  selectedSection: undefined,
  setSelectedSection: () => {},
  menuIsOpen: false,
  toggleMenu: () => {},
  closeMenu: () => {}
};

/**
 * Creación del contexto con valores por defecto
 */
const DashboardContext = createContext<DashboardContextType>(defaultContext);

/**
 * Proveedor del contexto del dashboard
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
  // Estados del dashboard
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedSection, setSelectedSection] = useState<string | undefined>(undefined);
  const [menuIsOpen, setMenuIsOpen] = useState<boolean>(false);

  // Función para alternar el estado del menú
  const toggleMenu = () => setMenuIsOpen(prev => !prev);
  
  // Función para cerrar el menú
  const closeMenu = () => setMenuIsOpen(false);

  // Persistir y recuperar el selectedUserId en localStorage
  useEffect(() => {
    // Recuperar al montar
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('selectedUserId');
      if (savedUserId) {
        setSelectedUserId(savedUserId);
      }
    }
  }, []);

  // Actualizar localStorage cuando cambia selectedUserId
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedUserId) {
      localStorage.setItem('selectedUserId', selectedUserId);
    }
  }, [selectedUserId]);

  // Cerrar menú al cambiar de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && menuIsOpen) {
        setMenuIsOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [menuIsOpen]);

  // Valores proporcionados por el contexto
  const value: DashboardContextType = {
    selectedUserId,
    setSelectedUserId,
    selectedSection,
    setSelectedSection,
    menuIsOpen,
    toggleMenu,
    closeMenu
  };

  return React.createElement(
    DashboardContext.Provider,
    { value },
    children
  );
}

/**
 * Hook personalizado para usar el contexto del dashboard
 * @returns Contexto del dashboard
 */
export function useDashboard(): DashboardContextType {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error('useDashboard debe ser usado dentro de un DashboardProvider');
  }
  
  return context;
}

export default useDashboard;