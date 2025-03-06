import React from 'react';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { TemporalUsersPage } from './TemporalUsersPage';

export const TemporalUsersWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <CartProvider>
          <TemporalUsersPage />
        </CartProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};