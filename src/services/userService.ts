// src/services/userService.js
import api from './api';

export const userService = {
  // Obtener usuario actual
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Obtener todos los usuarios
  getAllUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  // Crear usuario
  createUser: async (userData) => {
    const endpoint = userData.role === 'temporal' ? '/auth/temporary' : '/auth/register';
    const response = await api.post(endpoint, userData);
    return response.data;
  },

  // Actualizar usuario
  updateUser: async (userId, userData) => {
    const response = await api.put(`/auth/users/${userId}`, userData);
    return response.data;
  },

  // Eliminar usuario
  deleteUser: async (userId) => {
    const response = await api.delete(`/auth/users/${userId}`);
    return response.data;
  },

  // Activar/Desactivar usuario
  toggleUserStatus: async (userId, isActive) => {
    const action = isActive ? 'activate' : 'deactivate';
    const response = await api.put(`/auth/users/${userId}/toggle-status`);
    return response.data;
  }
};