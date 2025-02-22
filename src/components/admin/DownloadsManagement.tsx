import React, { useState } from 'react';
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2
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
import api from '../../services/api';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const DownloadsManagement = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (type: 'remito' | 'excel') => {
    if (!dateRange.from || !dateRange.to) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await api.get(`/downloads/${type}`, {
        params: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `${type}_${formatDate(dateRange.from)}_${formatDate(dateRange.to)}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || `Error al descargar ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const DownloadCard = ({ 
    title, 
    description, 
    icon: Icon, 
    type 
  }: { 
    title: string;
    description: string;
    icon: any;
    type: 'remito' | 'excel';
  }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Icon className="w-6 h-6 text-gray-500" />
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {dateRange.from && dateRange.to && (
          <p className="text-sm text-gray-500">
            Período seleccionado: {formatDisplayDate(dateRange.from)} - {formatDisplayDate(dateRange.to)}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => handleDownload(type)}
          disabled={isLoading || !dateRange.from || !dateRange.to}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Descargar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Selector de fechas */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar período</CardTitle>
          <CardDescription>
            Selecciona el rango de fechas para la descarga de documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date-from">Desde</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
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
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
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
      </Card>

      {/* Opciones de descarga */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DownloadCard
          title="Descargar Remitos"
          description="Descarga los remitos generados en el período seleccionado en formato PDF."
          icon={FileText}
          type="remito"
        />
        <DownloadCard
          title="Descargar Excel"
          description="Exporta los datos a una planilla de Excel para su análisis detallado."
          icon={FileSpreadsheet}
          type="excel"
        />
      </div>
    </div>
  );
};

export default DownloadsManagement;