import React, { useEffect } from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ShopHome } from './ShopHome';

export const ShopWrapper: React.FC = () => {

  // Aplicar tema cuando se monta el componente
  useEffect(() => {
    // Definir variables CSS para la nueva paleta de colores
    const applyModernTheme = () => {
      // Colores principales de la paleta
      document.documentElement.style.setProperty('--primary', '#3a8fb7');
      document.documentElement.style.setProperty('--primary-light', '#5baed1');
      document.documentElement.style.setProperty('--primary-dark', '#2a7a9f');
      
      document.documentElement.style.setProperty('--secondary', '#a8e6cf');
      document.documentElement.style.setProperty('--secondary-light', '#c4f0de');
      document.documentElement.style.setProperty('--secondary-dark', '#8dd4b9');
      
      document.documentElement.style.setProperty('--accent', '#d4f1f9');
      document.documentElement.style.setProperty('--accent-light', '#e8f7fc');
      document.documentElement.style.setProperty('--accent-dark', '#b8e6f2');
      
      // Colores de fondo
      document.documentElement.style.setProperty('--background-primary', '#f2f2f2');
      document.documentElement.style.setProperty('--background-secondary', '#e8f0f3');
      document.documentElement.style.setProperty('--background-tertiary', '#ffffff');
      document.documentElement.style.setProperty('--background-card', '#ffffff');
      
      // Colores de texto
      document.documentElement.style.setProperty('--text-primary', '#333333');
      document.documentElement.style.setProperty('--text-secondary', '#4a4a4a');
      document.documentElement.style.setProperty('--text-tertiary', '#5c5c5c');
      document.documentElement.style.setProperty('--text-inverted', '#ffffff');
      document.documentElement.style.setProperty('--text-disabled', '#878787');
      
      // Colores de estado
      document.documentElement.style.setProperty('--state-success', '#4CAF50');
      document.documentElement.style.setProperty('--state-warning', '#FF9800');
      document.documentElement.style.setProperty('--state-error', '#F44336');
      document.documentElement.style.setProperty('--state-info', '#2196F3');
      
      // Gradientes elegantes
      document.documentElement.style.setProperty('--gradient-primary', 'linear-gradient(135deg, var(--primary), var(--primary-dark))');
      document.documentElement.style.setProperty('--gradient-secondary', 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))');
      document.documentElement.style.setProperty('--gradient-accent', 'linear-gradient(135deg, var(--accent), var(--accent-dark))');
      document.documentElement.style.setProperty('--gradient-primary-to-secondary', 'linear-gradient(135deg, var(--primary), var(--secondary))');
      
      // Sombras
      document.documentElement.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.05)');
      document.documentElement.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.07)');
      document.documentElement.style.setProperty('--shadow-lg', '0 10px 15px rgba(0, 0, 0, 0.1)');
      document.documentElement.style.setProperty('--shadow-xl', '0 20px 25px rgba(0, 0, 0, 0.15)');
      
      // Bordes redondeados
      document.documentElement.style.setProperty('--radius-sm', '0.25rem');
      document.documentElement.style.setProperty('--radius-md', '0.5rem');
      document.documentElement.style.setProperty('--radius-lg', '0.75rem');
      document.documentElement.style.setProperty('--radius-xl', '1rem');
      document.documentElement.style.setProperty('--radius-full', '9999px');
    };

    // Verify token in localStorage before rendering
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return false;
      }
      return true;
    };

    // Only continue if authenticated
    if (checkAuth()) {
      // Add class to body to apply global styles
      document.body.classList.add('shop-theme');
      
      // Apply light background and CSS palette variables
      applyModernTheme();
      document.body.style.backgroundColor = 'var(--background-primary)';
      
      // Add special effect classes
      document.body.classList.add('modern-theme');
    }
    
    // Cleanup when unmounted
    return () => {
      document.body.classList.remove('shop-theme');
      document.body.classList.remove('modern-theme');
      document.body.style.backgroundColor = '';
      
      // Clean up CSS variables
      const variables = [
        // Main palette
        '--primary', '--primary-light', '--primary-dark',
        '--secondary', '--secondary-light', '--secondary-dark',
        '--accent', '--accent-light', '--accent-dark',
        
        // Backgrounds
        '--background-primary', '--background-secondary', '--background-tertiary', '--background-card',
        
        // Text
        '--text-primary', '--text-secondary', '--text-tertiary', '--text-inverted', '--text-disabled',
        
        // States
        '--state-success', '--state-warning', '--state-error', '--state-info',
        
        // Gradients
        '--gradient-primary', '--gradient-secondary', '--gradient-accent', '--gradient-primary-to-secondary',
        
        // Shadows
        '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl',
        
        // Border radius
        '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full'
      ];
      
      variables.forEach(variable => {
        document.documentElement.style.removeProperty(variable);
      });
    };
  }, []);

  // Verify if there are allowed sections for the user
  useEffect(() => {
    const userSecciones = localStorage.getItem('userSecciones');
    // If no sections are defined, set as 'ambos' by default to avoid issues
    if (!userSecciones) {
      localStorage.setItem('userSecciones', 'ambos');
    }
  }, []);

  return (
    <div className="shop-theme min-h-screen bg-gradient-to-br from-[#d4f1f9] via-[#f2f2f2] to-[#a8e6cf]">
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