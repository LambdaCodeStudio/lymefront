import React, { createContext, useContext} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/users';
import LoadingScreen from '@/components/ui/loading-screen';

// Custom themed loading overlay
const ThemedLoadingScreen = () => (
  <LoadingScreen 
    // The loading screen component should accept these props to be themeable
    // If it doesn't, you may need to modify it separately
    bgColor="bg-[#29696B]/95"
    spinnerColor="border-t-[#DFEFE6]"
    textColor="text-[#DFEFE6]"
  />
);

// Tipo para el contexto de autenticación
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  register: (email: string, password: string, role?: string) => Promise<any>;
  hasRole: (role: string | string[]) => boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | null>(null);

// Hook para usar el contexto
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Props para el proveedor
interface AuthProviderProps {
  children: ReactNode;
}

// Componente proveedor de autenticación
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {auth.loading ? <ThemedLoadingScreen /> : children}
    </AuthContext.Provider>
  );
};

// Componente para rutas protegidas por autenticación
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = <ThemedLoadingScreen /> 
}) => {
  // Verificar que estamos en el cliente
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const { isAuthenticated, loading } = useAuthContext();
    
    if (loading) {
      return <ThemedLoadingScreen />;
    }
    
    if (!isAuthenticated) {
      // Redirigir a login
      window.location.href = '/login';
      return fallback;
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error("Error en ProtectedRoute:", error);
    window.location.href = '/login';
    return fallback;
  }
};

// Componente para rutas protegidas por rol
interface RoleProtectedRouteProps {
  children: ReactNode;
  roles: string | string[];
  fallback?: ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  roles,
  fallback = <ThemedLoadingScreen /> 
}) => {
  // Verificar que estamos en el cliente
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const { hasRole, loading } = useAuthContext();
    
    if (loading) {
      return <ThemedLoadingScreen />;
    }
    
    if (!hasRole(roles)) {
      // Redirigir a página no autorizada
      window.location.href = '/unauthorized';
      return fallback;
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error("Error en RoleProtectedRoute:", error);
    window.location.href = '/unauthorized';
    return fallback;
  }
};