import React from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { ShopHome } from './ShopHome';

export const ShopWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <CartProvider>
          <ShopHome />
        </CartProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};