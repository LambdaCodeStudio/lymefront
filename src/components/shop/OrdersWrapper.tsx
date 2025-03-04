import React from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { OrdersPage } from './OrdersPage';

export const OrdersWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <CartProvider>
          <OrdersPage />
        </CartProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};