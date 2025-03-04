import React, { useState, useEffect } from 'react';
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  Search,
  SlidersHorizontal
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import api from '../../services/api';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Cliente {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: {
    _id: string;
    nombre?: string;
    email?: string;
  } | string;
}

interface Pedido {
  _id: string;
  fecha: string;
  numero: string;
  servicio: string;
  seccionDelServicio: string;
  productos: any[];
  total?: number;
}

interface FilterOptions {
  servicio: string;
  fechaInicio: string;
  fechaFin: string;
}

const DownloadsManagement: React.FC = () => {
  // Estados para Excel
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  
  // Estados para Remitos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedPedido, setSelectedPedido] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para tabla de pedidos
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    servicio: 'todos',
    fechaInicio: '',
    fechaFin: '',
  });
  
  // Estado temporal para formulario de filtros
  const [tempFilterOptions, setTempFilterOptions] = useState<FilterOptions>({
    servicio: 'todos',
    fechaInicio: '',
    fechaFin: '',
  });
  
  // Estado para controlar el diálogo de filtros
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  // Estado compartido
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.getClient().get('/cliente');
        if (response.data && Array.isArray(response.data)) {
          setClientes(response.data);
        } else {
          setClientes([]);
        }
      } catch (err) {
        console.error('Error al cargar clientes:', err);
        setClientes([]);
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
        setError('');
        
        // Obtener información del cliente seleccionado
        const clienteResponse = await api.getClient().get(`/cliente/${selectedCliente}`);
        
        if (!clienteResponse.data) {
          setPedidos([]);
          setError('Cliente no encontrado');
          return;
        }
        
        // Obtener servicio y sección del cliente seleccionado para filtrar pedidos
        const servicio = clienteResponse.data.servicio;
        const seccionDelServicio = clienteResponse.data.seccionDelServicio;
        
        // Extraer userId del cliente como respaldo
        const userId = typeof clienteResponse.data.userId === 'object' 
          ? clienteResponse.data.userId._id 
          : clienteResponse.data.userId;
        
        // Obtener todos los pedidos (podríamos optimizar esto más adelante)
        const pedidosResponse = await api.getClient().get('/pedido');
        
        if (!pedidosResponse.data || !Array.isArray(pedidosResponse.data)) {
          setPedidos([]);
          setError('Formato de respuesta inválido al cargar pedidos');
          return;
        }
        
        // Filtrar pedidos que coincidan con el servicio y sección del cliente
        // o con el userId si los criterios anteriores no funcionan
        const pedidosFiltrados = pedidosResponse.data.filter(pedido => {
          // Opción 1: Coincidir por servicio y sección
          const coincideServicio = pedido.servicio === servicio;
          const coincideSeccion = !seccionDelServicio || pedido.seccionDelServicio === seccionDelServicio;
          
          // Opción 2: Coincidir por userId como respaldo
          const pedidoUserId = typeof pedido.userId === 'object' 
            ? pedido.userId._id 
            : pedido.userId;
          const coincideUserId = userId && pedidoUserId === userId;
          
          return (coincideServicio && coincideSeccion) || coincideUserId;
        });
        
        setPedidos(pedidosFiltrados);
        if (pedidosFiltrados.length === 0) {
          setError('No se encontraron pedidos para este cliente');
        }
      } catch (err) {
        console.error('Error al cargar pedidos:', err);
        setPedidos([]);
        setError('Error al cargar pedidos para este cliente');
      }
    };
    
    fetchPedidos();
  }, [selectedCliente]);
  
  // Cargar todos los pedidos para la tabla
  useEffect(() => {
    const fetchAllPedidos = async () => {
      setLoadingPedidos(true);
      try {
        const response = await api.getClient().get('/pedido');
        
        // Verificar que response.data exista y sea un array
        if (response.data && Array.isArray(response.data)) {
          // Calcular total para cada pedido
          const pedidosConTotal = response.data.map((pedido: any) => {
            let total = 0;
            if (pedido.productos && Array.isArray(pedido.productos)) {
              total = pedido.productos.reduce((sum: number, prod: any) => {
                const precio = prod.productoId?.precio || 0;
                const cantidad = prod.cantidad || 0;
                return sum + (precio * cantidad);
              }, 0);
            }
            return { ...pedido, total };
          });
          
          setAllPedidos(pedidosConTotal);
          setFilteredPedidos(pedidosConTotal);
          
          // Inicializar las opciones de filtro temporales
          setTempFilterOptions({
            servicio: 'todos',
            fechaInicio: '',
            fechaFin: '',
          });
        } else {
          // Si la respuesta no es un array, inicializar con array vacío
          setAllPedidos([]);
          setFilteredPedidos([]);
        }
      } catch (err) {
        console.error('Error al cargar todos los pedidos:', err);
        setAllPedidos([]);
        setFilteredPedidos([]);
      } finally {
        setLoadingPedidos(false);
      }
    };
    
    fetchAllPedidos();
  }, []);
  
  // Función para aplicar filtros manualmente
  const applyFilters = () => {
    let filtered = [...allPedidos];
    
    // Filtrar por servicio
    if (filterOptions.servicio && filterOptions.servicio !== 'todos') {
      filtered = filtered.filter(pedido => 
        pedido.servicio === filterOptions.servicio
      );
    }
    
    // Filtrar por fecha inicio
    if (filterOptions.fechaInicio) {
      const fechaInicio = new Date(filterOptions.fechaInicio);
      filtered = filtered.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido >= fechaInicio;
      });
    }
    
    // Filtrar por fecha fin
    if (filterOptions.fechaFin) {
      const fechaFin = new Date(filterOptions.fechaFin);
      fechaFin.setHours(23, 59, 59);
      filtered = filtered.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido <= fechaFin;
      });
    }
    
    setFilteredPedidos(filtered);
  };
  
  // Reaccionar a cambios en filterOptions
  useEffect(() => {
    applyFilters();
  }, [filterOptions]);
  
  // Manejar confirmación de filtros
  const handleApplyFilters = () => {
    // Aplicar los filtros temporales
    setFilterOptions(tempFilterOptions);
    // Cerrar el diálogo
    setIsFilterDialogOpen(false);
  };

  // Función para descargar Excel
  const handleExcelDownload = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await api.getClient().get('/downloads/excel', {
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
      
      setSuccessMessage('Excel descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading Excel:', err);
      setError(err.response?.data?.mensaje || 'Error al descargar el Excel');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para descargar Remito
  const handleRemitoDownload = async (pedidoId = selectedPedido) => {
    if (!pedidoId) {
      setError('Por favor selecciona un pedido');
      return;
    }
  
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
  
      console.log(`Iniciando descarga de remito para pedido: ${pedidoId}`);
      
      // Add a longer timeout to give the server time to generate the PDF
      const response = await api.getClient().get(`/downloads/remito/${pedidoId}`, {
        responseType: 'blob',
        timeout: 30000 // 30 seconds timeout
      });
      
      // Check if response is valid
      if (!response.data || response.data.size === 0) {
        throw new Error('La respuesta del servidor está vacía');
      }
  
      // Check MIME type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/pdf')) {
        console.warn(`Tipo de contenido inesperado: ${contentType}`);
      }
  
      console.log(`PDF recibido: ${response.data.size} bytes`);
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const pedido = pedidos.find(p => p._id === pedidoId) || 
                    allPedidos.find(p => p._id === pedidoId);
      const fileName = `remito_${pedido?.numero || pedidoId}.pdf`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setSuccessMessage('Remito descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading remito:', err);
      
      // Provide more specific error message
      let errorMessage = 'Error al descargar el remito';
      
      if (err.response) {
        // Server responded with error
        if (err.response.data && typeof err.response.data === 'object') {
          errorMessage = err.response.data.mensaje || errorMessage;
        } else if (err.response.status === 404) {
          errorMessage = 'No se encontró el pedido solicitado';
        } else if (err.response.status === 500) {
          errorMessage = 'Error en el servidor al generar el PDF';
        }
      } else if (err.request) {
        // No response received
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión.';
      } else {
        // Other error
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para restablecer filtros
  const resetFilters = () => {
    const emptyFilters = {
      servicio: 'todos',
      fechaInicio: '',
      fechaFin: '',
    };
    setTempFilterOptions(emptyFilters);
    setFilterOptions(emptyFilters);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para obtener el nombre del cliente
  const getClientName = (cliente: Cliente): string => {
    if (!cliente) return "Cliente no disponible";
    
    // Mostrar el servicio y la sección si está disponible
    const servicioCompleto = cliente.seccionDelServicio 
      ? `${cliente.servicio} - ${cliente.seccionDelServicio}` 
      : cliente.servicio;
    
    return servicioCompleto;
  };

  // Filtrar clientes por búsqueda
  const filteredClientes = clientes.filter(cliente => {
    // Verificar que cliente tenga la estructura esperada
    if (!cliente || typeof cliente !== 'object') return false;
    
    // Obtener el nombre completo del cliente (servicio + sección)
    const nombreCompleto = getClientName(cliente);
    
    // Filtrar si el término de búsqueda está en el nombre
    return nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Obtener servicios únicos para filtro
  const serviciosUnicos = [...new Set(allPedidos.map(p => p.servicio).filter(Boolean))];

  return (
    <div className="space-y-6 bg-[#DFEFE6]/20 p-4 md:p-6 rounded-xl">
      {/* Alertas */}
      {error && (
        <Alert className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <AlertDescription className="text-[#29696B]">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4 bg-[#DFEFE6]/50 p-1">
          <TabsTrigger 
            value="excel" 
            className="data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
          >
            Reportes Excel
          </TabsTrigger>
          <TabsTrigger 
            value="remitos" 
            className="data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
          >
            Remitos por Cliente
          </TabsTrigger>
          <TabsTrigger 
            value="tabla" 
            className="data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
          >
            Tabla de Pedidos
          </TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Excel */}
        <TabsContent value="excel">
          <Card className="border border-[#91BEAD]/20 shadow-sm">
            <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#29696B]">Exportar a Excel</CardTitle>
                <FileSpreadsheet className="w-6 h-6 text-[#7AA79C]" />
              </div>
              <CardDescription className="text-[#7AA79C]">
                Exporta los datos del período seleccionado a una planilla de Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date-from" className="text-[#29696B]">Desde</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                    <Input
                      id="date-from"
                      type="date"
                      value={dateRange.from ? formatDate(dateRange.from) : ''}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        from: e.target.value ? new Date(e.target.value) : undefined
                      })}
                      className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="date-to" className="text-[#29696B]">Hasta</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                    <Input
                      id="date-to"
                      type="date"
                      value={dateRange.to ? formatDate(dateRange.to) : ''}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        to: e.target.value ? new Date(e.target.value) : undefined
                      })}
                      className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20">
              <Button
                onClick={handleExcelDownload}
                disabled={isLoading || !dateRange.from || !dateRange.to}
                className="w-full bg-[#29696B] hover:bg-[#29696B]/90 text-white"
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
        </TabsContent>
        
        {/* Pestaña de Remitos */}
        <TabsContent value="remitos">
          <Card className="border border-[#91BEAD]/20 shadow-sm">
            <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#29696B]">Descargar Remito</CardTitle>
                <FileText className="w-6 h-6 text-[#7AA79C]" />
              </div>
              <CardDescription className="text-[#7AA79C]">
                Descarga el remito de un pedido específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Buscador de clientes */}
              <div className="space-y-2">
                <Label className="text-[#29696B]">Buscar Cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                  />
                </div>
              </div>

              {/* Selector de cliente */}
              <div className="space-y-2">
                <Label className="text-[#29696B]">Seleccionar Cliente</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClientes.length > 0 ? (
                      filteredClientes.map((cliente) => (
                        <SelectItem key={cliente._id} value={cliente._id}>
                          {getClientName(cliente)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-clientes" disabled>
                        No hay clientes disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de pedido */}
              {selectedCliente && (
                <div className="space-y-2">
                  <Label className="text-[#29696B]">Seleccionar Pedido</Label>
                  <Select value={selectedPedido} onValueChange={setSelectedPedido}>
                    <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Selecciona un pedido" />
                    </SelectTrigger>
                    <SelectContent>
                      {pedidos.length > 0 ? (
                        pedidos.map((pedido) => (
                          <SelectItem key={pedido._id} value={pedido._id}>
                            {`Pedido ${pedido.numero || 'S/N'} - ${
                              pedido.fecha ? new Date(pedido.fecha).toLocaleDateString() : 'Sin fecha'
                            }`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-pedidos" disabled>
                          No hay pedidos disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20">
              <Button
                onClick={() => handleRemitoDownload()}
                disabled={isLoading || !selectedCliente || !selectedPedido}
                className="w-full bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
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
        </TabsContent>
        
        {/* Pestaña de Tabla de Pedidos */}
        <TabsContent value="tabla">
          <Card className="border border-[#91BEAD]/20 shadow-sm">
            <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-[#29696B]">Todos los Pedidos</CardTitle>
                  <CardDescription className="text-[#7AA79C]">
                    Visualiza y descarga remitos de cualquier pedido
                  </CardDescription>
                </div>
                
                {/* Filtros */}
                <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/40"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Filtros
                      {(filterOptions.servicio || filterOptions.fechaInicio || filterOptions.fechaFin) && (
                        <Badge className="ml-1 bg-[#29696B] text-white">
                          Activos
                        </Badge>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-[#91BEAD]/20">
                    <DialogHeader>
                      <DialogTitle className="text-[#29696B]">Filtrar Pedidos</DialogTitle>
                      <DialogDescription className="text-[#7AA79C]">
                        Ajusta los filtros para encontrar pedidos específicos
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="servicio-filter" className="text-[#29696B]">Servicio</Label>
                        <Select 
                          value={tempFilterOptions.servicio} 
                          onValueChange={(value) => setTempFilterOptions({...tempFilterOptions, servicio: value})}
                        >
                          <SelectTrigger 
                            id="servicio-filter" 
                            className="border-[#91BEAD] focus:ring-[#29696B]/20"
                          >
                            <SelectValue placeholder="Todos los servicios" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos los servicios</SelectItem>
                            {serviciosUnicos.map((servicio) => (
                              <SelectItem key={servicio} value={servicio}>
                                {servicio}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fecha-inicio-filter" className="text-[#29696B]">Desde</Label>
                          <Input
                            id="fecha-inicio-filter"
                            type="date"
                            value={tempFilterOptions.fechaInicio}
                            onChange={(e) => setTempFilterOptions({...tempFilterOptions, fechaInicio: e.target.value})}
                            className="border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="fecha-fin-filter" className="text-[#29696B]">Hasta</Label>
                          <Input
                            id="fecha-fin-filter"
                            type="date"
                            value={tempFilterOptions.fechaFin}
                            onChange={(e) => setTempFilterOptions({...tempFilterOptions, fechaFin: e.target.value})}
                            className="border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setTempFilterOptions({
                            servicio: '',
                            fechaInicio: '',
                            fechaFin: '',
                          });
                        }}
                        className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/40"
                      >
                        Restablecer
                      </Button>
                      <Button
                        type="button"
                        onClick={handleApplyFilters}
                        className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                      >
                        Aplicar filtros
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Barra de filtros activos */}
              {(filterOptions.servicio || filterOptions.fechaInicio || filterOptions.fechaFin) && (
                <div className="flex flex-wrap items-center gap-2 mt-2 p-2 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/20">
                  <span className="text-xs text-[#29696B] font-medium">Filtros activos:</span>
                  
                  {filterOptions.servicio && (
                    <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B]">
                      Servicio: {filterOptions.servicio}
                    </Badge>
                  )}
                  
                  {filterOptions.fechaInicio && (
                    <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B]">
                      Desde: {new Date(filterOptions.fechaInicio).toLocaleDateString()}
                    </Badge>
                  )}
                  
                  {filterOptions.fechaFin && (
                    <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B]">
                      Hasta: {new Date(filterOptions.fechaFin).toLocaleDateString()}
                    </Badge>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetFilters} 
                    className="ml-auto text-xs h-7 px-2 text-[#29696B]"
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-[#91BEAD]/20">
                <Table>
                  <TableHeader className="bg-[#DFEFE6]/30">
                    <TableRow>
                      <TableHead className="text-[#29696B]">Nº</TableHead>
                      <TableHead className="text-[#29696B]">Fecha</TableHead>
                      <TableHead className="text-[#29696B]">Servicio</TableHead>
                      <TableHead className="hidden md:table-cell text-[#29696B]">Sección</TableHead>
                      <TableHead className="text-right text-[#29696B]">Productos</TableHead>
                      <TableHead className="text-right text-[#29696B]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPedidos ? (
                      // Esqueleto de carga
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 6 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-6 w-full bg-[#DFEFE6]/40" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPedidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-[#7AA79C]">
                          No se encontraron pedidos con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPedidos.map((pedido) => (
                        <TableRow 
                          key={pedido._id} 
                          className="hover:bg-[#DFEFE6]/10 transition-colors"
                        >
                          <TableCell className="text-[#29696B] font-medium">{pedido.numero || 'S/N'}</TableCell>
                          <TableCell className="text-[#7AA79C]">{formatDisplayDate(pedido.fecha)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                              {pedido.servicio || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-[#7AA79C]">
                            {pedido.seccionDelServicio || '-'}
                          </TableCell>
                          <TableCell className="text-right text-[#29696B] font-medium">
                            {pedido.productos?.length || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemitoDownload(pedido._id)}
                              disabled={isLoading}
                              className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20 justify-between">
              <div className="text-sm text-[#7AA79C]">
                Mostrando {filteredPedidos.length} de {allPedidos.length} pedidos
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DownloadsManagement;