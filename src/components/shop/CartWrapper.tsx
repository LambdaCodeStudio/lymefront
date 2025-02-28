import React from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { Cart } from './Cart';

export const CartWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <CartProvider>
          <Cart />
        </CartProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};