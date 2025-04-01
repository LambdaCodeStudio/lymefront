import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Shield } from 'lucide-react';
import { DEFAULT_VALUES } from '../constants/clients';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, SubServicio, CreateSubServicioData, SupervisorData } from '../types/clients';

interface SubservicioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubServicioData) => Promise<void>;
  client: Client | null;
  subservicio: SubServicio | null;
  supervisors: SupervisorData[];
  isLoading: boolean;
}

/**
 * Formulario para crear o editar un subservicio
 */
const SubservicioForm: React.FC<SubservicioFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  subservicio,
  supervisors,
  isLoading
}) => {
  // Estado local del formulario
  const [formData, setFormData] = useState<CreateSubServicioData>(DEFAULT_VALUES.SUBSERVICIO_FORM);

  // Actualizar formulario cuando se recibe un subservicio para edición
  useEffect(() => {
    if (subservicio) {
      setFormData({
        nombre: subservicio.nombre,
        descripcion: subservicio.descripcion || '',
        supervisorId: typeof subservicio.supervisorId === 'object' && subservicio.supervisorId
          ? subservicio.supervisorId._id
          : typeof subservicio.supervisorId === 'string'
            ? subservicio.supervisorId
            : ''
      });
    } else {
      // Restablecer al valor predeterminado para un nuevo subservicio
      setFormData(DEFAULT_VALUES.SUBSERVICIO_FORM);
    }
  }, [subservicio, isOpen]);

  // Manejar cambios en los campos del formulario
  const handleChange = (field: keyof CreateSubServicioData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Obtener supervisores disponibles para este cliente
  const clientSupervisors = client && Array.isArray(client.userId)
    ? supervisors.filter(supervisor => 
        client.userId.some(userId => 
          typeof userId === 'object' && userId !== null && userId._id 
            ? userId._id === supervisor._id
            : userId === supervisor._id
        )
      )
    : [];

  // Verificar si el formulario es válido para habilitar/deshabilitar el botón de envío
  const isFormValid = formData.nombre.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
        <DialogHeader>
          <DialogTitle className="text-[#29696B]">
            {subservicio ? 'Editar Subservicio' : 'Nuevo Subservicio'}
          </DialogTitle>
          {client && (
            <DialogDescription className="text-[#7AA79C]">
              Cliente: <span className="text-[#29696B]">{client.nombre}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="subservicio-nombre" className="text-sm text-[#29696B]">
              Nombre del Subservicio*
            </Label>
            <Input
              id="subservicio-nombre"
              name="nombre"
              placeholder="Ej: Sede Central, Edificio A"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              required
              aria-required="true"
              className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
            />
          </div>

          <div>
            <Label htmlFor="subservicio-descripcion" className="text-sm text-[#29696B]">
              Descripción
            </Label>
            <Textarea
              id="subservicio-descripcion"
              name="descripcion"
              placeholder="Descripción opcional del subservicio"
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              className="mt-1 border-[#91BEAD] focus:border-[#29696B] resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="subservicio-supervisor" className="text-sm text-[#29696B]">
              Supervisor Asignado (Opcional)
            </Label>
            <Select
              value={formData.supervisorId || 'all'}
              onValueChange={(value) => handleChange('supervisorId', value === 'all' ? '' : value)}
            >
              <SelectTrigger
                id="subservicio-supervisor"
                className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20"
                data-invalid={!formData.supervisorId}
              >
                <SelectValue placeholder="Seleccionar supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sin supervisor</SelectItem>
                {clientSupervisors.length > 0 ? (
                  clientSupervisors.map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisor._id}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-supervisors" disabled>
                    No hay supervisores asignados al cliente
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Mostrar detalles del supervisor seleccionado */}
            {formData.supervisorId && (
              <div className="mt-2 text-sm text-[#29696B] flex items-center">
                <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
                Supervisor: <strong className="ml-1">
                  {getSupervisorIdentifier(formData.supervisorId, supervisors)}
                </strong>
              </div>
            )}

            <p className="text-xs text-[#7AA79C] mt-1">
              Nota: Solo se muestran los supervisores asignados a este cliente.
            </p>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : subservicio
                ? 'Guardar Cambios'
                : 'Crear Subservicio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubservicioForm;