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
import { DEFAULT_VALUES } from '../constants/clients';
import type { Client, SubServicio, SubUbicacion, CreateSubUbicacionData } from '../types/clients';

interface SubUbicacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubUbicacionData) => Promise<void>;
  client: Client | null;
  subservicio: SubServicio | null;
  sububicacion: SubUbicacion | null;
  isLoading: boolean;
}

/**
 * Formulario para crear o editar una sububicación
 */
const SubUbicacionForm: React.FC<SubUbicacionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  subservicio,
  sububicacion,
  isLoading
}) => {
  // Estado local del formulario
  const [formData, setFormData] = useState<CreateSubUbicacionData>(DEFAULT_VALUES.SUBUBICACION_FORM);

  // Actualizar formulario cuando se recibe una sububicación para edición
  useEffect(() => {
    if (sububicacion) {
      setFormData({
        nombre: sububicacion.nombre,
        descripcion: sububicacion.descripcion || '',
      });
    } else {
      // Restablecer al valor predeterminado para una nueva sububicación
      setFormData(DEFAULT_VALUES.SUBUBICACION_FORM);
    }
  }, [sububicacion, isOpen]);

  // Manejar cambios en los campos del formulario
  const handleChange = (field: keyof CreateSubUbicacionData, value: any) => {
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

  // Verificar si el formulario es válido para habilitar/deshabilitar el botón de envío
  const isFormValid = formData.nombre.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
        <DialogHeader>
          <DialogTitle className="text-[#29696B]">
            {sububicacion ? 'Editar Sububicación' : 'Nueva Sububicación'}
          </DialogTitle>
          {client && subservicio && (
            <DialogDescription className="text-[#7AA79C]">
              Cliente: <span className="text-[#29696B]">{client.nombre}</span>
              <br />
              Subservicio: <span className="text-[#29696B]">{subservicio.nombre}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="sububicacion-nombre" className="text-sm text-[#29696B]">
              Nombre de la Sububicación*
            </Label>
            <Input
              id="sububicacion-nombre"
              name="nombre"
              placeholder="Ej: Piso 3, Sector B"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              required
              aria-required="true"
              className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
            />
          </div>

          <div>
            <Label htmlFor="sububicacion-descripcion" className="text-sm text-[#29696B]">
              Descripción
            </Label>
            <Textarea
              id="sububicacion-descripcion"
              name="descripcion"
              placeholder="Descripción opcional de la sububicación"
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              className="mt-1 border-[#91BEAD] focus:border-[#29696B] resize-none"
              rows={3}
            />
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
              ) : sububicacion
                ? 'Guardar Cambios'
                : 'Crear Sububicación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubUbicacionForm;