// src/hooks/useTemporalUsers.ts
import { useEffect, useCallback } from 'react';
import type { User } from '../types/users';
import { userService } from '../services/userService';

export const useTemporalUsers = (users: User[], onUserUpdate: (users: User[]) => void) => {
  const checkTemporalUsers = useCallback(async () => {
    const now = new Date();
    
    for (const user of users) {
      if (user.role === 'temporal' && user.isActive && user.expiresAt) {
        const expirationDate = new Date(user.expiresAt);
        
        if (now >= expirationDate) {
          try {
            await userService.deactivateUser(user.id);
            // Actualizar la lista de usuarios
            const updatedUsers = users.map(u => 
              u.id === user.id ? { ...u, isActive: false } : u
            );
            onUserUpdate(updatedUsers);
          } catch (error) {
            console.error('Error al desactivar usuario temporal:', error);
          }
        }
      }
    }
  }, [users, onUserUpdate]);

  useEffect(() => {
    // Verificar usuarios temporales cada minuto
    const interval = setInterval(checkTemporalUsers, 60000);
    
    // Verificar inmediatamente al montar el componente
    checkTemporalUsers();

    return () => clearInterval(interval);
  }, [checkTemporalUsers]);
};