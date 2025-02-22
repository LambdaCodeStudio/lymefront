import api from "./api";

// src/services/downloadService.ts
export const downloadService = {
  downloadRemitos: async (from: Date, to: Date): Promise<Blob> => {
    const response = await api.get('/api/downloads/remito', {
      params: { from, to },
      responseType: 'blob'
    });
    return response.data;
  },

  downloadExcel: async (from: Date, to: Date): Promise<Blob> => {
    const response = await api.get('/api/downloads/excel', {
      params: { from, to },
      responseType: 'blob'
    });
    return response.data;
  }
};