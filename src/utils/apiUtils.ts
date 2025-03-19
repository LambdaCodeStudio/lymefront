export const getApiUrl = (endpoint: string): string => {
    const baseUrl = '/api';
    return `${baseUrl}/${endpoint}`;
  };