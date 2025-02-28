import React, { useState, useEffect } from 'react';
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  Search,
  Filter,
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
    servicio: '',
    fechaInicio: '',
    fechaFin: '',
  });
  
  // Estado compartido
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [debugMode, setDebugMode] = useState(true); // Para diagnóstico

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        console.log("⚡ Obteniendo clientes...");
        
        // IMPORTANTE: Quitamos el prefijo /api porque ya está en baseURL
        const response = await api.getClient().get('/cliente');
        
        // Log detallado para depuración
        if (debugMode) {
          console.log("Respuesta completa:", response);
          console.log("Status:", response.status);
          console.log("Headers:", response.headers);
        }
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ Clientes cargados: ${response.data.length}`);
          if (debugMode && response.data.length > 0) {
            console.log("Primer cliente:", response.data[0]);
          }
          
          // Si los clientes vienen con la estructura correcta, usarlos directamente
          setClientes(response.data);
        } else {
          console.error('❌ Respuesta de clientes inválida:', response.data);
          setClientes([]);
        }
      } catch (err) {
        console.error('❌ Error al cargar clientes:', err);
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
        console.log(`⚡ Obteniendo pedidos para cliente ID: ${selectedCliente}`);
        
        // Primero debemos obtener el cliente para acceder a su userId
        const clienteResponse = await api.getClient().get(`/cliente/${selectedCliente}`);
        
        if (!clienteResponse.data) {
          console.error('❌ Cliente no encontrado:', selectedCliente);
          setPedidos([]);
          setError('Cliente no encontrado');
          return;
        }
        
        // Extraer userId del cliente
        const userId = typeof clienteResponse.data.userId === 'object' 
          ? clienteResponse.data.userId._id 
          : clienteResponse.data.userId;
          
        if (!userId) {
          console.error('❌ Cliente sin userId asociado:', clienteResponse.data);
          setPedidos([]);
          setError('Este cliente no tiene un usuario asociado');
          return;
        }
        
        console.log(`ℹ️ Usando userId: ${userId} para obtener pedidos`);
        
        // Ahora buscamos los pedidos por userId
        const pedidosResponse = await api.getClient().get(`/pedido/user/${userId}`);
        
        if (pedidosResponse.data && Array.isArray(pedidosResponse.data)) {
          console.log(`✅ Pedidos cargados: ${pedidosResponse.data.length}`);
          setPedidos(pedidosResponse.data);
          if (pedidosResponse.data.length === 0) {
            setError('No se encontraron pedidos para este cliente');
          } else {
            setError('');
          }
        } else {
          console.error('❌ Respuesta de pedidos inválida:', pedidosResponse.data);
          setPedidos([]);
          setError('Formato de respuesta inválido al cargar pedidos');
        }
      } catch (err) {
        console.error('❌ Error al cargar pedidos:', err);
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
        console.log("⚡ Obteniendo todos los pedidos...");
        
        // IMPORTANTE: Quitamos el prefijo /api porque ya está en baseURL
        const response = await api.getClient().get('/pedido');
        
        if (debugMode) {
          console.log("Respuesta todos pedidos:", response);
        }
        
        // Verificar que response.data exista y sea un array
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ Todos los pedidos cargados: ${response.data.length}`);
          
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
        } else {
          // Si la respuesta no es un array, inicializar con array vacío
          console.error('❌ Respuesta de pedidos inválida:', response.data);
          setAllPedidos([]);
          setFilteredPedidos([]);
        }
      } catch (err) {
        console.error('❌ Error al cargar todos los pedidos:', err);
        setAllPedidos([]);
        setFilteredPedidos([]);
      } finally {
        setLoadingPedidos(false);
      }
    };
    
    fetchAllPedidos();
  }, []);
  
  // Aplicar filtros a pedidos
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...allPedidos];
      
      // Filtrar por servicio
      if (filterOptions.servicio) {
        filtered = filtered.filter(pedido => 
          pedido.servicio === filterOptions.servicio
        );
      }
      
      // Filtrar por fecha inicio
      if (filterOptions.fechaInicio) {
        const fechaInicio = new Date(filterOptions.fechaInicio);
        filtered = filtered.filter(pedido => 
          new Date(pedido.fecha) >= fechaInicio
        );
      }
      
      // Filtrar por fecha fin
      if (filterOptions.fechaFin) {
        const fechaFin = new Date(filterOptions.fechaFin);
        fechaFin.setHours(23, 59, 59);
        filtered = filtered.filter(pedido => 
          new Date(pedido.fecha) <= fechaFin
        );
      }
      
      setFilteredPedidos(filtered);
    };
    
    applyFilters();
  }, [filterOptions, allPedidos]);

  // Función para descargar Excel
  const handleExcelDownload = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // IMPORTANTE: Quitamos el prefijo /api porque ya está en baseURL
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
      setError(err.response?.data?.message || 'Error al descargar el Excel');
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

      // IMPORTANTE: Quitamos el prefijo /api porque ya está en baseURL
      const response = await api.getClient().get(`/downloads/remito/${pedidoId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const pedido = pedidos.find(p => p._id === pedidoId) || 
                    allPedidos.find(p => p._id === pedidoId);
      const fileName = `remito_${pedido?.numero || pedidoId}.pdf`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('Remito descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al descargar el remito');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para restablecer filtros
  const resetFilters = () => {
    setFilterOptions({
      servicio: '',
      fechaInicio: '',
      fechaFin: '',
    });
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

  // Función para verificar si clientes están vacíos para depuración
  const checkClientsEmpty = () => {
    console.log("🔍 Verificando estado de clientes:");
    console.log("  - Total clientes en estado:", clientes.length);
    console.log("  - Total clientes filtrados:", filteredClientes.length);
    console.log("  - Término de búsqueda:", searchTerm || "(vacío)");
    
    if (clientes.length === 0) {
      console.log("❌ No hay clientes cargados. Posibles causas:");
      console.log("  1. La API no devolvió datos");
      console.log("  2. La respuesta no tiene el formato esperado");
      console.log("  3. Hubo un error en la petición");
    }
    
    if (clientes.length > 0 && filteredClientes.length === 0) {
      console.log("⚠️ Hay clientes cargados pero ninguno coincide con el filtro");
      console.log("  - Primer cliente:", clientes[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Botón de diagnóstico (solo visible en desarrollo) */}
      {debugMode && (
        <div className="mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkClientsEmpty}
            className="text-xs"
          >
            Diagnosticar Clientes
          </Button>
          <div className="text-xs text-gray-500 mt-1">
            {`Clientes cargados: ${clientes.length}, Filtrados: ${filteredClientes.length}`}
          </div>
        </div>
      )}

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="excel">Reportes Excel</TabsTrigger>
          <TabsTrigger value="remitos">Remitos por Cliente</TabsTrigger>
          <TabsTrigger value="tabla">Tabla de Pedidos</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Excel */}
        <TabsContent value="excel">
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
        </TabsContent>
        
        {/* Pestaña de Remitos */}
        <TabsContent value="remitos">
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

              {/* Debug info */}
              {debugMode && clientes.length === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                  <p>No se encontraron clientes. Verifica:</p>
                  <ul className="list-disc pl-5 mt-1 text-xs">
                    <li>Que la API esté respondiendo correctamente</li>
                    <li>Que la ruta del endpoint sea correcta</li>
                    <li>Que estés autenticado correctamente</li>
                  </ul>
                </div>
              )}

              {/* Selector de cliente */}
              <div className="space-y-2">
                <Label>Seleccionar Cliente</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger>
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
                  <Label>Seleccionar Pedido</Label>
                  <Select value={selectedPedido} onValueChange={setSelectedPedido}>
                    <SelectTrigger>
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
            <CardFooter>
              <Button
                onClick={() => handleRemitoDownload()}
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
        </TabsContent>
        
        {/* Pestaña de Tabla de Pedidos */}
        <TabsContent value="tabla">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Todos los Pedidos</CardTitle>
                  <CardDescription>
                    Visualiza y descarga remitos de cualquier pedido
                  </CardDescription>
                </div>
                
                {/* Filtros */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filtros
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Filtrar Pedidos</DialogTitle>
                      <DialogDescription>
                        Ajusta los filtros para encontrar pedidos específicos
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="servicio-filter">Servicio</Label>
                        <Select 
                          value={filterOptions.servicio} 
                          onValueChange={(value) => setFilterOptions({...filterOptions, servicio: value})}
                        >
                          <SelectTrigger id="servicio-filter">
                            <SelectValue placeholder="Todos los servicios" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todos los servicios</SelectItem>
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
                          <Label htmlFor="fecha-inicio-filter">Desde</Label>
                          <Input
                            id="fecha-inicio-filter"
                            type="date"
                            value={filterOptions.fechaInicio}
                            onChange={(e) => setFilterOptions({...filterOptions, fechaInicio: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="fecha-fin-filter">Hasta</Label>
                          <Input
                            id="fecha-fin-filter"
                            type="date"
                            value={filterOptions.fechaFin}
                            onChange={(e) => setFilterOptions({...filterOptions, fechaFin: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={resetFilters}>
                        Restablecer
                      </Button>
                      <Button type="submit">Aplicar filtros</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="hidden md:table-cell">Sección</TableHead>
                      <TableHead className="text-right">Productos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPedidos ? (
                      // Esqueleto de carga
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 6 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPedidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                          No se encontraron pedidos con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPedidos.map((pedido) => (
                        <TableRow key={pedido._id}>
                          <TableCell>{pedido.numero || 'S/N'}</TableCell>
                          <TableCell>{formatDisplayDate(pedido.fecha)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pedido.servicio || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{pedido.seccionDelServicio || '-'}</TableCell>
                          <TableCell className="text-right">
                            {pedido.productos?.length || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemitoDownload(pedido._id)}
                              disabled={isLoading}
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
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
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