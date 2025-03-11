import React from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { OrdersPage } from './OrdersPage';
import { Label } from "@/components/ui/label";

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