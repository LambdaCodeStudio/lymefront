import React, { useEffect } from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ShopHome } from './ShopHome';

export const ShopWrapper: React.FC = () => {
  // Agregar clase shop-theme al body cuando se monta el componente
  useEffect(() => {
    // Definir variables CSS para la nueva paleta de colores
    const applyTurquoiseTheme = () => {
      // Variables de colores para la nueva paleta turquesa
      document.documentElement.style.setProperty('--background-primary', '#F8FDFC');
      document.documentElement.style.setProperty('--background-secondary', '#CFF2E4');
      document.documentElement.style.setProperty('--background-component', '#E8F8F3');
      document.documentElement.style.setProperty('--background-card', '#FFFFFF');
      
      document.documentElement.style.setProperty('--accent-primary', '#1B9C96');
      document.documentElement.style.setProperty('--accent-secondary', '#29696B');
      document.documentElement.style.setProperty('--accent-tertiary', '#139692');
      document.documentElement.style.setProperty('--accent-quaternary', '#F2A516');
      
      document.documentElement.style.setProperty('--state-success', '#1B9C96');
      document.documentElement.style.setProperty('--state-warning', '#F2A516');
      document.documentElement.style.setProperty('--state-error', '#E74C3C');
      document.documentElement.style.setProperty('--state-info', '#84D6C8');
      
      document.documentElement.style.setProperty('--text-primary', '#0D4E4B');
      document.documentElement.style.setProperty('--text-secondary', '#29696B');
      document.documentElement.style.setProperty('--text-tertiary', '#4A7C79');
      document.documentElement.style.setProperty('--text-disabled', '#A0ABA9');
      
      document.documentElement.style.setProperty('--gradient-main', 'linear-gradient(90deg, var(--accent-primary), var(--accent-tertiary))');
      document.documentElement.style.setProperty('--gradient-promo', 'linear-gradient(90deg, var(--accent-quaternary), var(--accent-primary))');
      document.documentElement.style.setProperty('--gradient-featured', 'linear-gradient(90deg, var(--accent-tertiary), var(--state-info))');
      document.documentElement.style.setProperty('--gradient-offers', 'linear-gradient(90deg, var(--accent-quaternary), var(--accent-secondary))');
    };

    // Agregar la clase al body para aplicar estilos globales
    document.body.classList.add('shop-theme');
    
    // Aplicar fondo claro y variables CSS de paleta turquesa
    applyTurquoiseTheme();
    document.body.style.backgroundColor = 'var(--background-primary)';
    
    // Agregar también clases para efectos especiales
    document.body.classList.add('turquoise-theme');
    
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