import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileEdit, 
  Trash2, 
  Loader2, 
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { clientService } from '../../services/clientService';
import type { Client, CreateClientData, UpdateClientData } from '../../types/client';

const ClientsSection = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<CreateClientData>({
    servicio: '',
    seccionDelServicio: '',
    userId: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClients();
      setClients(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los clientes: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientService.createClient(formData);
      await fetchClients();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError('Error al crear cliente: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient?._id) return;

    try {
      await clientService.updateClient({
        id: currentClient._id,
        ...formData
      });
      await fetchClients();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError('Error al actualizar cliente: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
      await clientService.deleteClient(id);
      await fetchClients();
    } catch (err) {
      setError('Error al eliminar cliente: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleEditClient = (client: Client) => {
    setCurrentClient(client);
    setFormData({
      servicio: client.servicio,
      seccionDelServicio: client.seccionDelServicio,
      userId: client.userId
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      servicio: '',
      seccionDelServicio: '',
      userId: ''
    });
    setCurrentClient(null);
  };

  const filteredClients = clients.filter(client => 
    client.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.seccionDelServicio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {client.userId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.servicio}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.seccionDelServicio}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FileEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <form onSubmit={currentClient ? handleUpdateClient : handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Servicio</label>
                  <input
                    type="text"
                    value={formData.servicio}
                    onChange={(e) => setFormData({...formData, servicio: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Sección del Servicio</label>
                  <input
                    type="text"
                    value={formData.seccionDelServicio}
                    onChange={(e) => setFormData({...formData, seccionDelServicio: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">ID de Usuario</label>
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {currentClient ? 'Actualizar Cliente' : 'Crear Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsSection;