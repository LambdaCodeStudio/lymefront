import React, { useState, useEffect } from 'react';
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  Search,
  User
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from '../../services/api';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Cliente {
  _id: string;
  nombre: string;
}

interface Pedido {
  _id: string;
  fecha: string;
  numero: string;
  total: number;
}

const DownloadsManagement = () => {
  // Estados
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedPedido, setSelectedPedido] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.get('/clientes');
        setClientes(response.data);
      } catch (err) {
        console.error('Error al cargar clientes:', err);
      }
    };
    fetchClientes();
  }, []);

  // Cargar pedidos cuando se selecciona un cliente
  useEffect(() => {
    const fetchPedidos = async () => {
      if (!selectedCliente) {
        setPedidos([]);
        return;
      }
      try {
        const response = await api.get(`/pedidos/cliente/${selectedCliente}`);
        setPedidos(response.data);
      } catch (err) {
        console.error('Error al cargar pedidos:', err);
      }
    };
    fetchPedidos();
  }, [selectedCliente]);

  // Función para descargar Excel
  const handleExcelDownload = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await api.get('/downloads/excel', {
        params: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${formatDate(dateRange.from)}_${formatDate(dateRange.to)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al descargar el Excel');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para descargar Remito
  const handleRemitoDownload = async () => {
    if (!selectedCliente || !selectedPedido) {
      setError('Por favor selecciona un cliente y un pedido');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await api.get(`/downloads/remito/${selectedPedido}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const pedido = pedidos.find(p => p._id === selectedPedido);
      const fileName = `remito_${pedido?.numero || selectedPedido}.pdf`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al descargar el remito');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrar clientes por búsqueda
  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sección de Excel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Exportar a Excel</CardTitle>
            <FileSpreadsheet className="w-6 h-6 text-gray-500" />
          </div>
          <CardDescription>
            Exporta los datos del período seleccionado a una planilla de Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date-from">Desde</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="date-from"
                  type="date"
                  value={dateRange.from ? formatDate(dateRange.from) : ''}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    from: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="date-to">Hasta</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="date-to"
                  type="date"
                  value={dateRange.to ? formatDate(dateRange.to) : ''}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    to: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleExcelDownload}
            disabled={isLoading || !dateRange.from || !dateRange.to}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Descargar Excel
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Sección de Remitos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Descargar Remito</CardTitle>
            <FileText className="w-6 h-6 text-gray-500" />
          </div>
          <CardDescription>
            Descarga el remito de un pedido específico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscador de clientes */}
          <div className="space-y-2">
            <Label>Buscar Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selector de cliente */}
          <div className="space-y-2">
            <Label>Seleccionar Cliente</Label>
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {filteredClientes.map((cliente) => (
                  <SelectItem key={cliente._id} value={cliente._id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de pedido */}
          {selectedCliente && (
            <div className="space-y-2">
              <Label>Seleccionar Pedido</Label>
              <Select value={selectedPedido} onValueChange={setSelectedPedido}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un pedido" />
                </SelectTrigger>
                <SelectContent>
                  {pedidos.map((pedido) => (
                    <SelectItem key={pedido._id} value={pedido._id}>
                      {`Pedido ${pedido.numero} - ${new Date(pedido.fecha).toLocaleDateString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleRemitoDownload}
            disabled={isLoading || !selectedCliente || !selectedPedido}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Descargar Remito
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DownloadsManagement;