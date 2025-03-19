import React, { useEffect } from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ShopHome } from './ShopHome';

export const ShopWrapper: React.FC = () => {

  // Agregar clase shop-theme al body cuando se monta el componente
  useEffect(() => {
    // Definir variables CSS para la nueva paleta de colores
    const applyModernTheme = () => {
      // Soft, sophisticated background colors
      document.documentElement.style.setProperty('--background-primary', '#F4F7FA');
      document.documentElement.style.setProperty('--background-secondary', '#E9EEF3');
      document.documentElement.style.setProperty('--background-component', '#FFFFFF');
      document.documentElement.style.setProperty('--background-card', '#FFFFFF');
      
      // Modern, muted accent colors with depth
      document.documentElement.style.setProperty('--accent-primary', '#3A7CA5');
      document.documentElement.style.setProperty('--accent-secondary', '#2C5F8D');
      document.documentElement.style.setProperty('--accent-tertiary', '#5B9DB3');
      document.documentElement.style.setProperty('--accent-quaternary', '#E6A957');
      
      // Refined state colors
      document.documentElement.style.setProperty('--state-success', '#4CAF50');
      document.documentElement.style.setProperty('--state-warning', '#FF9800');
      document.documentElement.style.setProperty('--state-error', '#F44336');
      document.documentElement.style.setProperty('--state-info', '#2196F3');
      
      // Elegant text hierarchy
      document.documentElement.style.setProperty('--text-primary', '#1F2937');
      document.documentElement.style.setProperty('--text-secondary', '#4B5563');
      document.documentElement.style.setProperty('--text-tertiary', '#6B7280');
      document.documentElement.style.setProperty('--text-disabled', '#9CA3AF');
      
      // Sophisticated gradients
      document.documentElement.style.setProperty('--gradient-main', 'linear-gradient(90deg, var(--accent-primary), var(--accent-tertiary))');
      document.documentElement.style.setProperty('--gradient-promo', 'linear-gradient(135deg, var(--accent-quaternary), var(--accent-secondary))');
      document.documentElement.style.setProperty('--gradient-featured', 'linear-gradient(90deg, var(--accent-tertiary), var(--state-info))');
      document.documentElement.style.setProperty('--gradient-offers', 'linear-gradient(90deg, var(--accent-quaternary), #5A6B7D)');
    };

    // Verificar token en localStorage antes de renderizar
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return false;
      }
      return true;
    };

    // Solo continuar si está autenticado
    if (checkAuth()) {
      // Agregar la clase al body para aplicar estilos globales
      document.body.classList.add('shop-theme');
      
      // Aplicar fondo claro y variables CSS de paleta turquesa
      applyModernTheme();
      document.body.style.backgroundColor = 'var(--background-primary)';
      
      // Agregar también clases para efectos especiales
      document.body.classList.add('turquoise-theme');
    }
    
    // Limpiar cuando se desmonte
    return () => {
      document.body.classList.remove('shop-theme');
      document.body.classList.remove('turquoise-theme');
      document.body.style.backgroundColor = '';
      
      // Limpiar variables CSS también
      const variables = [
        '--background-primary', '--background-secondary', '--background-component', '--background-card',
        '--accent-primary', '--accent-secondary', '--accent-tertiary', '--accent-quaternary',
        '--state-success', '--state-warning', '--state-error', '--state-info',
        '--text-primary', '--text-secondary', '--text-tertiary', '--text-disabled',
        '--gradient-main', '--gradient-promo', '--gradient-featured', '--gradient-offers'
      ];
      
      variables.forEach(variable => {
        document.documentElement.style.removeProperty(variable);
      });
    };
  }, []);

  // Verificar si hay secciones permitidas para el usuario
  useEffect(() => {
    const userSecciones = localStorage.getItem('userSecciones');
    // Si no hay secciones definidas, configurar como 'ambos' por defecto para evitar problemas
    if (!userSecciones) {
      localStorage.setItem('userSecciones', 'ambos');
    }
  }, []);

  return (
    <div className="shop-theme min-h-screen bg-[#b2dddd] bg-gradient-to-br from-[#6da89c] via-[#d5fff2] to-[#cbfae7]">
      <AuthProvider>
        <ProtectedRoute>
          <QueryProvider>
            <CartProvider>
              <ShopHome />
            </CartProvider>
          </QueryProvider>
        </ProtectedRoute>
      </AuthProvider>
    </div>
  );
};